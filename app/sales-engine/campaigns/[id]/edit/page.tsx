'use client';

/**
 * Edit Campaign Page - M67 Campaign Edit Wizard
 * 
 * This is a WRITE + OBSERVE surface for editing existing campaigns.
 * Loads campaign data and pre-populates the wizard form.
 * 
 * GOVERNANCE CONSTRAINTS:
 * - All campaigns can be edited (DRAFT campaigns primarily)
 * - Editing does NOT change governance state
 * - No execution or sourcing occurs from this page
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Icon } from '../../../../../design/components/Icon';
import { WizardStep, WizardNav, FormField, TagInput } from '../../../components/wizard';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../../lib/design-tokens';
import { updateCampaign } from '../../../lib/api';
import { featureFlags } from '../../../../../config/appConfig';

/**
 * Fetch campaign from Supabase with retry logic.
 * 
 * Retry is needed because after campaign duplication, there may be a brief
 * delay before the new campaign is visible in the database (race condition).
 * 
 * @param campaignId - The campaign ID to fetch
 * @param retries - Number of retry attempts (default: 3)
 */
async function fetchCampaignFromSupabase(campaignId: string, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const response = await fetch(`/api/campaign-get/${campaignId}`);
    const result = await response.json();
    
    if (response.ok && result.success) {
      return result.data.campaign;
    }
    
    // If not found and we have retries left, wait and try again
    if (response.status === 404 && attempt < retries) {
      console.log(`[EditCampaign] Campaign not found, retrying (${attempt}/${retries})...`);
      // Exponential backoff: 500ms, 1000ms, 1500ms
      await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      continue;
    }
    
    throw new Error(result.error || 'Failed to load campaign');
  }
  
  throw new Error('Failed to load campaign after retries');
}

const WIZARD_STEPS = [
  { id: 'identity', label: 'Campaign Identity' },
  { id: 'icp', label: 'ICP Definition' },
  { id: 'targeting', label: 'Contact Targeting' },
  { id: 'outreach', label: 'Outreach Context' },
  { id: 'targets', label: 'Targets (Optional)' },
];

type FormData = {
  name: string;
  description: string;
  industries: string[];
  geographies: string[];
  keywords: string[];
  companySizeMin: number;
  companySizeMax: number;
  // Consolidated contact targeting fields
  jobTitles: string[];      // Maps to both icp.job_titles AND contact_targeting.roles
  seniorityLevels: string[]; // Maps to both icp.seniority_levels AND contact_targeting.seniority
  maxContactsPerOrg: number;
  requireVerifiedEmail: boolean;
  // Outreach context
  tone: string;
  valuePropositions: string[];
  painPoints: string[];
  callToAction: string;
  // Targets
  targetLeads: number | null;
  targetEmails: number | null;
  targetReplyRate: number | null;
  planningOnly: boolean;
};

const initialFormData: FormData = {
  name: '',
  description: '',
  industries: [],
  geographies: [],
  keywords: [],
  companySizeMin: 0,
  companySizeMax: 10000,
  // Consolidated contact targeting
  jobTitles: [],
  seniorityLevels: [],
  maxContactsPerOrg: 3,
  requireVerifiedEmail: true,
  // Outreach context
  tone: 'professional',
  valuePropositions: [],
  painPoints: [],
  callToAction: '',
  // Targets
  targetLeads: null,
  targetEmails: null,
  targetReplyRate: null,
  planningOnly: false,
};

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);

  useEffect(() => {
    async function loadCampaign() {
      try {
        const campaign = await fetchCampaignFromSupabase(campaignId);
        
        const icp = campaign.icp || {};
        const icpAny = icp as Record<string, unknown>;
        const sourcingConfig = campaign.sourcing_config || {};
        const sourcingAny = sourcingConfig as Record<string, unknown>;
        const outreach = (sourcingAny.outreach_context as Record<string, unknown>) || {};
        const contactTargeting = (sourcingAny.contact_targeting as Record<string, unknown>) || {};
        const targets = (sourcingAny.targets as Record<string, unknown>) || {};
        const companySize = (icpAny.company_size as { min?: number; max?: number }) || {};
        const leadQualConfig = campaign.lead_qualification_config || {};
        const leadQualAny = leadQualConfig as Record<string, unknown>;

        // Load job titles with fallback chain for backward compatibility
        // Prioritize: icp.job_titles → lead_qualification_config.job_titles → contact_targeting.roles
        const loadedJobTitles = 
          (icpAny.job_titles as string[])?.length ? (icpAny.job_titles as string[]) :
          (leadQualAny.job_titles as string[])?.length ? (leadQualAny.job_titles as string[]) :
          (icpAny.roles as string[])?.length ? (icpAny.roles as string[]) :
          (contactTargeting.roles as string[]) || [];

        // Load seniority levels with fallback chain
        // Prioritize: icp.seniority_levels → lead_qualification_config.seniority_levels → contact_targeting.seniority
        const loadedSeniorityLevels = 
          (icpAny.seniority_levels as string[])?.length ? (icpAny.seniority_levels as string[]) :
          (leadQualAny.seniority_levels as string[])?.length ? (leadQualAny.seniority_levels as string[]) :
          (contactTargeting.seniority as string[]) || [];

        setFormData({
          name: campaign.name || '',
          description: campaign.description || '',
          industries: (icpAny.industries as string[]) || [],
          geographies: (icpAny.geographies as string[]) || [],
          keywords: (icpAny.keywords as string[]) || [],
          companySizeMin: companySize.min || 0,
          companySizeMax: companySize.max || 10000,
          // Consolidated fields with fallback chain
          jobTitles: loadedJobTitles,
          seniorityLevels: loadedSeniorityLevels,
          maxContactsPerOrg: (contactTargeting.max_contacts_per_org as number) || (leadQualAny.max_contacts_per_org as number) || 3,
          requireVerifiedEmail: ((contactTargeting.email_requirements as Record<string, unknown>)?.require_verified as boolean) ?? (leadQualAny.require_verified_email as boolean) ?? true,
          tone: (outreach.tone as string) || 'professional',
          valuePropositions: (outreach.value_propositions as string[]) || [],
          painPoints: (outreach.pain_points as string[]) || [],
          callToAction: (outreach.call_to_action as string) || '',
          targetLeads: (targets.target_leads as number) ?? null,
          targetEmails: (targets.target_emails as number) ?? null,
          targetReplyRate: (targets.target_reply_rate as number) ?? null,
          planningOnly: (sourcingAny.benchmarks_only as boolean) ?? false,
        });
        
        setIsLoading(false);
      } catch (err) {
        console.error('[EditCampaign] Failed to load campaign:', err);
        setLoadError(err instanceof Error ? err.message : 'Failed to load campaign');
        setIsLoading(false);
      }
    }

    loadCampaign();
  }, [campaignId]);

  if (!featureFlags.canCreateCampaign) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: NSD_COLORS.surface, padding: '32px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <Link href={`/sales-engine/campaigns/${campaignId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: NSD_COLORS.secondary, textDecoration: 'none' }}>
              <Icon name="arrow-left" size={16} color={NSD_COLORS.secondary} />
              Back to Campaign
            </Link>
          </div>
          <div style={{ backgroundColor: NSD_COLORS.background, borderRadius: NSD_RADIUS.lg, border: `1px solid ${NSD_COLORS.border.light}`, padding: '48px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', backgroundColor: '#FEF3C7', borderRadius: '50%', margin: '0 auto 24px' }}>
              <Icon name="warning" size={32} color="#92400E" />
            </div>
            <h1 style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: 600, color: NSD_COLORS.primary, fontFamily: NSD_TYPOGRAPHY.fontDisplay }}>Campaign Editing Disabled</h1>
            <p style={{ margin: '0 0 24px 0', fontSize: '15px', color: NSD_COLORS.text.secondary, lineHeight: 1.6 }}>Campaign editing is currently unavailable.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: NSD_COLORS.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: `3px solid ${NSD_COLORS.border.light}`, borderTopColor: NSD_COLORS.cta, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: NSD_COLORS.text.secondary }}>Loading campaign...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: NSD_COLORS.surface, padding: '32px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <Link href="/sales-engine" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: NSD_COLORS.secondary, textDecoration: 'none' }}>
              <Icon name="arrow-left" size={16} color={NSD_COLORS.secondary} />
              Back to Campaigns
            </Link>
          </div>
          <div style={{ backgroundColor: '#FEE2E2', borderRadius: NSD_RADIUS.lg, padding: '24px', textAlign: 'center' }}>
            <Icon name="warning" size={32} color="#991B1B" />
            <h2 style={{ margin: '16px 0 8px 0', fontSize: '18px', color: '#991B1B' }}>Failed to Load Campaign</h2>
            <p style={{ margin: 0, color: '#991B1B' }}>{loadError}</p>
          </div>
        </div>
      </div>
    );
  }

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateAllSteps = (): boolean => {
    const allErrors: Record<string, string> = {};
    if (!formData.name.trim()) allErrors['campaign_identity.name'] = 'Campaign name is required';
    if (formData.keywords.length === 0) allErrors['icp.keywords'] = 'At least one keyword is required';
    if (formData.geographies.length === 0) allErrors['icp.geographies'] = 'At least one geography is required';
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateAllSteps()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      // Map consolidated fields to all storage locations for backward compatibility
      // jobTitles → icp.job_titles AND contact_targeting.roles
      // seniorityLevels → icp.seniority_levels AND contact_targeting.seniority
      const result = await updateCampaign({
        campaign_id: campaignId,
        name: formData.name,
        description: formData.description || undefined,
        icp: {
          company_size: { min: formData.companySizeMin, max: formData.companySizeMax },
          industries: formData.industries,
          geographies: formData.geographies,
          keywords: formData.keywords,
          // Consolidated: jobTitles stored in ICP
          job_titles: formData.jobTitles,
          seniority_levels: formData.seniorityLevels,
          roles: formData.jobTitles, // Also store as roles for backward compatibility
        },
        contact_targeting: {
          // Consolidated: jobTitles also stored as roles for contact targeting
          roles: formData.jobTitles,
          seniority: formData.seniorityLevels,
          max_contacts_per_org: formData.maxContactsPerOrg,
          email_requirements: { require_verified: formData.requireVerifiedEmail, exclude_generic: true },
        },
        outreach_context: {
          tone: formData.tone,
          value_propositions: formData.valuePropositions,
          pain_points: formData.painPoints,
          call_to_action: formData.callToAction,
        },
        campaign_targets: {
          target_leads: formData.targetLeads,
          target_emails: formData.targetEmails,
          target_reply_rate: formData.targetReplyRate,
        },
        sourcing_config: { benchmarks_only: formData.planningOnly },
      });

      if (result.success) {
        setSubmitResult({ success: true });
      } else {
        setSubmitResult({ success: false, error: result.error });
      }
    } catch (error) {
      setSubmitResult({ success: false, error: 'Failed to update campaign. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateCurrentStep = (): boolean => {
    const stepErrors: Record<string, string> = {};
    switch (currentStep) {
      case 0:
        if (!formData.name.trim()) stepErrors['campaign_identity.name'] = 'Campaign name is required';
        break;
      case 1:
        if (formData.keywords.length === 0) stepErrors['icp.keywords'] = 'At least one keyword is required';
        if (formData.geographies.length === 0) stepErrors['icp.geographies'] = 'At least one geography is required';
        break;
    }
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!validateCurrentStep()) return;
    if (currentStep < WIZARD_STEPS.length - 1) {
      setErrors({});
      setCurrentStep(currentStep + 1);
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setErrors({});
      setCurrentStep(currentStep - 1);
    }
  };

  const stepsWithCompletion = WIZARD_STEPS.map((step, index) => ({
    ...step,
    completed: index < currentStep,
  }));

  if (submitResult?.success) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: NSD_COLORS.surface, padding: '32px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ backgroundColor: NSD_COLORS.background, borderRadius: NSD_RADIUS.lg, border: `1px solid ${NSD_COLORS.border.light}`, padding: '48px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', backgroundColor: NSD_COLORS.semantic.positive.bg, borderRadius: '50%', margin: '0 auto 24px' }}>
              <Icon name="check" size={32} color={NSD_COLORS.semantic.positive.text} />
            </div>
            <h1 style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: 600, color: NSD_COLORS.primary, fontFamily: NSD_TYPOGRAPHY.fontDisplay }}>Campaign Updated</h1>
            <p style={{ margin: '0 0 24px 0', fontSize: '15px', color: NSD_COLORS.text.secondary, lineHeight: 1.6 }}>Your changes have been saved successfully.</p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <Link href={`/sales-engine/campaigns/${campaignId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: NSD_COLORS.primary, color: NSD_COLORS.text.inverse, fontSize: '14px', fontWeight: 500, borderRadius: NSD_RADIUS.md, textDecoration: 'none' }}>
                View Campaign
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: NSD_COLORS.surface, padding: '32px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link href={`/sales-engine/campaigns/${campaignId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: NSD_COLORS.secondary, textDecoration: 'none' }}>
            <Icon name="arrow-left" size={16} color={NSD_COLORS.secondary} />
            Back to Campaign
          </Link>
        </div>

        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 600, color: NSD_COLORS.primary, fontFamily: NSD_TYPOGRAPHY.fontDisplay }}>Edit Campaign</h1>
        <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: NSD_COLORS.text.secondary }}>Update campaign configuration. Changes will be saved when you click Save Changes.</p>

        <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
          <WizardNav
            steps={stepsWithCompletion}
            currentStep={currentStep}
            onStepClick={(step) => {
              if (step > currentStep && !validateCurrentStep()) return;
              setErrors({});
              setCurrentStep(step);
            }}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            {(submitResult?.error || Object.keys(errors).length > 0) && (
              <div style={{ backgroundColor: '#FEE2E2', borderRadius: NSD_RADIUS.md, padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Icon name="warning" size={20} color="#991B1B" />
                <div>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: '#991B1B' }}>
                    {submitResult?.error || 'Please fix the errors below before continuing'}
                  </p>
                  {Object.keys(errors).length > 0 && (
                    <ul style={{ margin: '8px 0 0 0', padding: '0 0 0 16px', fontSize: '13px', color: '#991B1B' }}>
                      {Object.entries(errors).map(([field, message]) => (
                        <li key={field}>{message}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            <WizardStep title="Campaign Identity" description="Basic information about your campaign" isActive={currentStep === 0} stepNumber={1} totalSteps={WIZARD_STEPS.length}>
              <FormField label="Campaign Name" name="name" value={formData.name} onChange={(v) => updateField('name', String(v))} placeholder="Enter campaign name" required error={errors['campaign_identity.name']} />
              <FormField label="Description" name="description" type="textarea" value={formData.description} onChange={(v) => updateField('description', String(v))} placeholder="Describe the campaign objectives and target audience" />
              <div style={{ marginTop: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: NSD_COLORS.text.primary, marginBottom: '4px' }}>Planning-Only Campaign?</label>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: NSD_COLORS.text.muted, lineHeight: 1.5 }}>Planning-only campaigns are used for forecasting and analysis. They cannot be executed or launched.</p>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="radio" name="planningOnly" checked={!formData.planningOnly} onChange={() => updateField('planningOnly', false)} style={{ accentColor: NSD_COLORS.cta }} />
                    <span style={{ fontSize: '14px', color: NSD_COLORS.text.primary }}>No — Executable campaign</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="radio" name="planningOnly" checked={formData.planningOnly} onChange={() => updateField('planningOnly', true)} style={{ accentColor: NSD_COLORS.cta }} />
                    <span style={{ fontSize: '14px', color: NSD_COLORS.text.primary }}>Yes — Planning only</span>
                  </label>
                </div>
              </div>
            </WizardStep>

            <WizardStep title="ICP Definition" description="Define your Ideal Customer Profile" isActive={currentStep === 1} stepNumber={2} totalSteps={WIZARD_STEPS.length}>
              <TagInput label="Keywords" name="keywords" values={formData.keywords} onChange={(v) => updateField('keywords', v)} placeholder="Add keywords" error={errors['icp.keywords']} helpText="Keywords are required for campaign targeting" />
              <TagInput label="Geographies" name="geographies" values={formData.geographies} onChange={(v) => updateField('geographies', v)} placeholder="e.g., United States, Europe" error={errors['icp.geographies']} helpText="At least one geography is required" />
              <TagInput label="Industries" name="industries" values={formData.industries} onChange={(v) => updateField('industries', v)} placeholder="e.g., Technology, Healthcare" helpText="Target industries for this campaign" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <FormField label="Min Company Size" name="companySizeMin" type="number" value={formData.companySizeMin} onChange={(v) => updateField('companySizeMin', Number(v))} />
                <FormField label="Max Company Size" name="companySizeMax" type="number" value={formData.companySizeMax} onChange={(v) => updateField('companySizeMax', Number(v))} />
              </div>
              {/* Organization Sourcing Info Callout */}
              <div style={{ backgroundColor: '#F0F4FF', borderRadius: NSD_RADIUS.md, padding: '16px', marginTop: '24px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Icon name="info" size={20} color={NSD_COLORS.text.secondary} />
                <div>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: NSD_COLORS.text.primary }}>Organization Sourcing</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: NSD_COLORS.text.secondary }}>Organizations will be automatically identified based on your ICP criteria above.</p>
                </div>
              </div>
            </WizardStep>

            <WizardStep title="Contact Targeting" description="Define how contacts are selected within organizations" isActive={currentStep === 2} stepNumber={3} totalSteps={WIZARD_STEPS.length}>
              <TagInput label="Job Titles / Roles" name="jobTitles" values={formData.jobTitles} onChange={(v) => updateField('jobTitles', v)} placeholder="e.g., VP of Sales, Marketing Director, CRO" helpText="Specific job titles or functional roles to target" />
              <TagInput label="Seniority Levels" name="seniorityLevels" values={formData.seniorityLevels} onChange={(v) => updateField('seniorityLevels', v)} placeholder="e.g., Director, VP, C-Level" helpText="Decision-making level within organizations" />
              <FormField label="Max Contacts per Org" name="maxContactsPerOrg" type="number" value={formData.maxContactsPerOrg} onChange={(v) => updateField('maxContactsPerOrg', Number(v))} />
              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.requireVerifiedEmail} onChange={(e) => updateField('requireVerifiedEmail', e.target.checked)} style={{ accentColor: NSD_COLORS.cta }} />
                  <span style={{ fontSize: '14px', color: NSD_COLORS.text.primary }}>Require verified email</span>
                </label>
              </div>
            </WizardStep>

            <WizardStep title="Outreach Context" description="Configure outreach messaging" isActive={currentStep === 3} stepNumber={4} totalSteps={WIZARD_STEPS.length}>
              <FormField label="Tone" name="tone" value={formData.tone} onChange={(v) => updateField('tone', String(v))} placeholder="e.g., professional, casual, friendly" />
              <TagInput label="Value Propositions" name="valuePropositions" values={formData.valuePropositions} onChange={(v) => updateField('valuePropositions', v)} placeholder="Add value propositions (press Enter)" />
              <TagInput label="Pain Points" name="painPoints" values={formData.painPoints} onChange={(v) => updateField('painPoints', v)} placeholder="Add pain points (press Enter)" />
              <FormField label="Call to Action" name="callToAction" type="textarea" value={formData.callToAction} onChange={(v) => updateField('callToAction', String(v))} placeholder="What action should contacts take?" />
            </WizardStep>

            <WizardStep title="Targets (Optional)" description="Set benchmark targets for this campaign" isActive={currentStep === 4} stepNumber={5} totalSteps={WIZARD_STEPS.length}>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: NSD_COLORS.text.muted }}>Targets are benchmarks only and do not affect campaign execution.</p>
              <FormField label="Target Leads" name="targetLeads" type="number" value={formData.targetLeads ?? ''} onChange={(v) => updateField('targetLeads', v === '' ? null : Number(v))} placeholder="e.g., 100" />
              <FormField label="Target Emails" name="targetEmails" type="number" value={formData.targetEmails ?? ''} onChange={(v) => updateField('targetEmails', v === '' ? null : Number(v))} placeholder="e.g., 500" />
              <FormField label="Target Reply Rate (%)" name="targetReplyRate" type="number" value={formData.targetReplyRate ?? ''} onChange={(v) => updateField('targetReplyRate', v === '' ? null : Number(v))} placeholder="e.g., 5" />
            </WizardStep>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
              <button onClick={goPrev} disabled={currentStep === 0} style={{ padding: '12px 24px', backgroundColor: currentStep === 0 ? NSD_COLORS.border.light : NSD_COLORS.background, color: currentStep === 0 ? NSD_COLORS.text.muted : NSD_COLORS.text.primary, border: `1px solid ${NSD_COLORS.border.light}`, borderRadius: NSD_RADIUS.md, fontSize: '14px', fontWeight: 500, cursor: currentStep === 0 ? 'not-allowed' : 'pointer' }}>
                Previous
              </button>
              {currentStep === WIZARD_STEPS.length - 1 ? (
                <button onClick={handleSubmit} disabled={isSubmitting} style={{ padding: '12px 32px', backgroundColor: isSubmitting ? NSD_COLORS.border.light : NSD_COLORS.cta, color: NSD_COLORS.text.inverse, border: 'none', borderRadius: NSD_RADIUS.md, fontSize: '14px', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              ) : (
                <button onClick={goNext} style={{ padding: '12px 24px', backgroundColor: NSD_COLORS.cta, color: NSD_COLORS.text.inverse, border: 'none', borderRadius: NSD_RADIUS.md, fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
