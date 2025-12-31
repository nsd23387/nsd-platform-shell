'use client';

/**
 * New Campaign Page - M67-14 CampaignCreate UI Submission
 * 
 * This is a WRITE + OBSERVE surface only.
 * No execution, sourcing, learning, or analytics behavior is allowed.
 * 
 * Campaign is created in governance_state = DRAFT.
 * No execution or sourcing occurs.
 * 
 * M67.9-01: Campaign creation is disabled when API mode is disabled.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '../../../../design/components/Icon';
import { WizardStep, WizardNav, FormField, TagInput } from '../../components/wizard';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import type {
  CampaignCreatePayload,
  CampaignCreateResponse,
  ValidationError,
  isCampaignCreateSuccess,
} from '../../types/campaign-create';
import { isApiDisabled, featureFlags, getDisabledMessage } from '../../../../config/appConfig';

const WIZARD_STEPS = [
  { id: 'identity', label: 'Campaign Identity' },
  { id: 'icp', label: 'ICP Definition' },
  { id: 'sourcing', label: 'Organization Sourcing' },
  { id: 'targeting', label: 'Contact Targeting' },
  { id: 'qualification', label: 'Lead Qualification' },
  { id: 'outreach', label: 'Outreach Context' },
  { id: 'readiness', label: 'Readiness' },
  { id: 'targets', label: 'Targets (Optional)' },
];

type FormData = {
  name: string;
  description: string;
  industries: string[];
  geographies: string[];
  jobTitles: string[];
  seniorityLevels: string[];
  technologies: string[];
  keywords: string[];
  companySizeMin: number;
  companySizeMax: number;
  sourceType: 'manual' | 'list' | 'criteria';
  maxOrganizations: number;
  roles: string[];
  seniority: string[];
  maxContactsPerOrg: number;
  requireVerifiedEmail: boolean;
  minimumSignals: number;
  tone: string;
  valuePropositions: string[];
  painPoints: string[];
  callToAction: string;
  mailboxHealthRequired: boolean;
  deliverabilityThreshold: number;
  targetOrganizations: number | null;
  targetContacts: number | null;
  targetLeads: number | null;
  targetEmails: number | null;
  targetReplies: number | null;
};

const initialFormData: FormData = {
  name: '',
  description: '',
  industries: [],
  geographies: [],
  jobTitles: [],
  seniorityLevels: [],
  technologies: [],
  keywords: [],
  companySizeMin: 0,
  companySizeMax: 10000,
  sourceType: 'criteria',
  maxOrganizations: 100,
  roles: [],
  seniority: [],
  maxContactsPerOrg: 3,
  requireVerifiedEmail: true,
  minimumSignals: 1,
  tone: 'professional',
  valuePropositions: [],
  painPoints: [],
  callToAction: '',
  mailboxHealthRequired: true,
  deliverabilityThreshold: 80,
  targetOrganizations: null,
  targetContacts: null,
  targetLeads: null,
  targetEmails: null,
  targetReplies: null,
};

export default function NewCampaignPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    campaignId?: string;
    governanceState?: string;
    sourceEligible?: boolean;
    icpSnapshotId?: string;
    error?: string;
  } | null>(null);

  // M67.9-01: Show disabled state when API mode is disabled
  if (!featureFlags.canCreateCampaign) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: NSD_COLORS.surface,
          padding: '32px',
        }}
      >
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <Link
              href="/sales-engine"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: NSD_COLORS.secondary,
                textDecoration: 'none',
              }}
            >
              <Icon name="arrow-left" size={16} color={NSD_COLORS.secondary} />
              Back to Campaigns
            </Link>
          </div>

          <div
            style={{
              backgroundColor: NSD_COLORS.background,
              borderRadius: NSD_RADIUS.lg,
              border: `1px solid ${NSD_COLORS.border.light}`,
              padding: '48px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '64px',
                height: '64px',
                backgroundColor: '#FEF3C7',
                borderRadius: '50%',
                margin: '0 auto 24px',
              }}
            >
              <Icon name="warning" size={32} color="#92400E" />
            </div>

            <h1
              style={{
                margin: '0 0 16px 0',
                fontSize: '24px',
                fontWeight: 600,
                color: NSD_COLORS.primary,
                fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              }}
            >
              Campaign Creation Disabled
            </h1>

            <p
              style={{
                margin: '0 0 24px 0',
                fontSize: '15px',
                color: NSD_COLORS.text.secondary,
                lineHeight: 1.6,
              }}
            >
              {getDisabledMessage('create')}
            </p>

            <p
              style={{
                margin: '0',
                fontSize: '13px',
                color: NSD_COLORS.text.muted,
              }}
            >
              Runtime will be enabled in Milestone M68.
            </p>
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

  const buildPayload = (): CampaignCreatePayload => ({
    campaign_identity: {
      name: formData.name,
      description: formData.description || undefined,
    },
    icp: {
      company_size: {
        min: formData.companySizeMin,
        max: formData.companySizeMax,
      },
      industries: formData.industries,
      geographies: formData.geographies,
      job_titles: formData.jobTitles,
      seniority_levels: formData.seniorityLevels,
      technologies: formData.technologies,
      keywords: formData.keywords,
    },
    organization_sourcing: {
      source_type: formData.sourceType,
      max_organizations: formData.maxOrganizations,
      criteria: formData.sourceType === 'criteria' ? {
        industries: formData.industries,
        geographies: formData.geographies,
      } : undefined,
    },
    contact_targeting: {
      roles: formData.roles,
      seniority: formData.seniority,
      max_contacts_per_org: formData.maxContactsPerOrg,
      email_requirements: {
        require_verified: formData.requireVerifiedEmail,
        exclude_generic: true,
      },
    },
    lead_qualification: {
      minimum_signals: formData.minimumSignals,
    },
    outreach_context: {
      tone: formData.tone,
      value_propositions: formData.valuePropositions,
      pain_points: formData.painPoints,
      call_to_action: formData.callToAction,
    },
    readiness_requirements: {
      mailbox_health_required: formData.mailboxHealthRequired,
      deliverability_threshold: formData.deliverabilityThreshold,
    },
    campaign_targets: {
      target_organizations: formData.targetOrganizations,
      target_contacts: formData.targetContacts,
      target_leads: formData.targetLeads,
      target_emails: formData.targetEmails,
      target_replies: formData.targetReplies,
    },
  });

  const validateAllSteps = (): boolean => {
    const allErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      allErrors['campaign_identity.name'] = 'Campaign name is required';
    }
    if (formData.industries.length === 0) {
      allErrors['icp.industries'] = 'At least one industry is required';
    }
    if (!formData.sourceType) {
      allErrors['organization_sourcing.source_type'] = 'Source type is required';
    }

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateAllSteps()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = buildPayload();
      const response = await fetch('/api/campaign-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result: CampaignCreateResponse = await response.json();

      if (result.success) {
        setSubmitResult({
          success: true,
          campaignId: result.data.campaign.id,
          governanceState: result.data.campaign.governance_state,
          sourceEligible: result.data.campaign.source_eligible,
          icpSnapshotId: result.data.icp_snapshot.id,
        });
      } else {
        if (result.validation_errors) {
          const fieldErrors: Record<string, string> = {};
          result.validation_errors.forEach((err: ValidationError) => {
            fieldErrors[err.field] = err.message;
          });
          setErrors(fieldErrors);
        }
        setSubmitResult({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      setSubmitResult({
        success: false,
        error: 'Failed to submit campaign. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateCurrentStep = (): boolean => {
    const stepErrors: Record<string, string> = {};

    switch (currentStep) {
      case 0:
        if (!formData.name.trim()) {
          stepErrors['campaign_identity.name'] = 'Campaign name is required';
        }
        break;
      case 1:
        if (formData.industries.length === 0) {
          stepErrors['icp.industries'] = 'At least one industry is required';
        }
        break;
      case 2:
        if (!formData.sourceType) {
          stepErrors['organization_sourcing.source_type'] = 'Source type is required';
        }
        break;
      default:
        break;
    }

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!validateCurrentStep()) {
      return;
    }
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
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: NSD_COLORS.surface,
          padding: '32px',
        }}
      >
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div
            style={{
              backgroundColor: NSD_COLORS.background,
              borderRadius: NSD_RADIUS.lg,
              border: `1px solid ${NSD_COLORS.border.light}`,
              padding: '48px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '64px',
                height: '64px',
                backgroundColor: '#D1FAE5',
                borderRadius: '50%',
                margin: '0 auto 24px',
              }}
            >
              <Icon name="check" size={32} color="#065F46" />
            </div>

            <h1
              style={{
                margin: '0 0 16px 0',
                fontSize: '24px',
                fontWeight: 600,
                color: NSD_COLORS.primary,
                fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              }}
            >
              Campaign Created
            </h1>

            <p
              style={{
                margin: '0 0 24px 0',
                fontSize: '15px',
                color: NSD_COLORS.text.secondary,
                lineHeight: 1.6,
              }}
            >
              Campaign created in Draft state. No sourcing or execution has started.
            </p>

            <div
              style={{
                backgroundColor: '#EEF2FF',
                borderRadius: NSD_RADIUS.md,
                padding: '20px',
                marginBottom: '24px',
                textAlign: 'left',
              }}
            >
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: NSD_COLORS.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Campaign ID
                </span>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: 500, color: NSD_COLORS.primary, fontFamily: 'monospace' }}>
                  {submitResult.campaignId}
                </p>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: NSD_COLORS.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Governance State
                </span>
                <p style={{ margin: '4px 0 0 0' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      backgroundColor: NSD_COLORS.status.draft.bg,
                      color: NSD_COLORS.status.draft.text,
                      borderRadius: NSD_RADIUS.full,
                      fontSize: '12px',
                      fontWeight: 500,
                    }}
                  >
                    {submitResult.governanceState}
                  </span>
                </p>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: NSD_COLORS.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Source Eligible
                </span>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: NSD_COLORS.text.secondary }}>
                  {submitResult.sourceEligible ? 'Yes' : 'No'} — Campaign is not eligible for sourcing in DRAFT state
                </p>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#FFFBEB',
                borderRadius: NSD_RADIUS.md,
                padding: '16px',
                marginBottom: '32px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <Icon name="info" size={20} color="#92400E" />
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: '#92400E',
                  lineHeight: 1.5,
                  textAlign: 'left',
                }}
              >
                This UI is read-only for campaign lifecycle. Governance transitions, approvals, and execution are managed by backend systems.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <Link
                href="/sales-engine"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  backgroundColor: NSD_COLORS.primary,
                  color: NSD_COLORS.text.inverse,
                  fontSize: '14px',
                  fontWeight: 500,
                  borderRadius: NSD_RADIUS.md,
                  textDecoration: 'none',
                }}
              >
                View Campaigns
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: NSD_COLORS.surface,
        padding: '32px',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link
            href="/sales-engine"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: NSD_COLORS.secondary,
              textDecoration: 'none',
            }}
          >
            <Icon name="arrow-left" size={16} color={NSD_COLORS.secondary} />
            Back to Campaigns
          </Link>
        </div>

        <h1
          style={{
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: 600,
            color: NSD_COLORS.primary,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
          }}
        >
          Create Campaign
        </h1>
        <p
          style={{
            margin: '0 0 24px 0',
            fontSize: '14px',
            color: NSD_COLORS.text.secondary,
          }}
        >
          Configure a new campaign. It will be created in Draft state.
        </p>

        <WizardNav
          steps={stepsWithCompletion}
          currentStep={currentStep}
          onStepClick={(step) => {
            if (step > currentStep) {
              if (!validateCurrentStep()) {
                return;
              }
            }
            setErrors({});
            setCurrentStep(step);
          }}
        />

        {(submitResult?.error || Object.keys(errors).length > 0) && (
          <div
            style={{
              backgroundColor: '#FEE2E2',
              borderRadius: NSD_RADIUS.md,
              padding: '16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
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

        <WizardStep
          title="Campaign Identity"
          description="Basic information about your campaign"
          isActive={currentStep === 0}
          stepNumber={1}
          totalSteps={WIZARD_STEPS.length}
        >
          <FormField
            label="Campaign Name"
            name="name"
            value={formData.name}
            onChange={(v) => updateField('name', String(v))}
            placeholder="Enter campaign name"
            required
            error={errors['campaign_identity.name']}
          />
          <FormField
            label="Description"
            name="description"
            type="textarea"
            value={formData.description}
            onChange={(v) => updateField('description', String(v))}
            placeholder="Describe the campaign objectives and target audience"
          />
        </WizardStep>

        <WizardStep
          title="ICP Definition"
          description="Define your Ideal Customer Profile"
          isActive={currentStep === 1}
          stepNumber={2}
          totalSteps={WIZARD_STEPS.length}
        >
          <TagInput
            label="Industries"
            name="industries"
            values={formData.industries}
            onChange={(v) => updateField('industries', v)}
            placeholder="Type and press Enter (required)"
            helpText="Target industries for this campaign"
            error={errors['icp.industries']}
          />
          <TagInput
            label="Geographies"
            name="geographies"
            values={formData.geographies}
            onChange={(v) => updateField('geographies', v)}
            placeholder="e.g., United States, Europe"
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <FormField
              label="Company Size (Min)"
              name="companySizeMin"
              type="number"
              value={formData.companySizeMin}
              onChange={(v) => updateField('companySizeMin', Number(v))}
            />
            <FormField
              label="Company Size (Max)"
              name="companySizeMax"
              type="number"
              value={formData.companySizeMax}
              onChange={(v) => updateField('companySizeMax', Number(v))}
            />
          </div>
          <TagInput
            label="Job Titles"
            name="jobTitles"
            values={formData.jobTitles}
            onChange={(v) => updateField('jobTitles', v)}
            placeholder="e.g., VP of Sales, CRO"
          />
          <TagInput
            label="Technologies"
            name="technologies"
            values={formData.technologies}
            onChange={(v) => updateField('technologies', v)}
            placeholder="e.g., Salesforce, HubSpot"
          />
          <TagInput
            label="Keywords"
            name="keywords"
            values={formData.keywords}
            onChange={(v) => updateField('keywords', v)}
            placeholder="Relevant keywords"
          />
        </WizardStep>

        <WizardStep
          title="Organization Sourcing"
          description="How organizations will be sourced for this campaign"
          isActive={currentStep === 2}
          stepNumber={3}
          totalSteps={WIZARD_STEPS.length}
        >
          <FormField
            label="Source Type"
            name="sourceType"
            type="select"
            value={formData.sourceType}
            onChange={(v) => updateField('sourceType', v as 'manual' | 'list' | 'criteria')}
            options={[
              { value: 'criteria', label: 'By Criteria (ICP-based)' },
              { value: 'list', label: 'From List' },
              { value: 'manual', label: 'Manual Selection' },
            ]}
            required
            error={errors['organization_sourcing.source_type']}
          />
          <FormField
            label="Max Organizations"
            name="maxOrganizations"
            type="number"
            value={formData.maxOrganizations}
            onChange={(v) => updateField('maxOrganizations', Number(v))}
            helpText="Maximum number of organizations to source"
          />
        </WizardStep>

        <WizardStep
          title="Contact Targeting"
          description="Define how contacts are selected within organizations"
          isActive={currentStep === 3}
          stepNumber={4}
          totalSteps={WIZARD_STEPS.length}
        >
          <TagInput
            label="Target Roles"
            name="roles"
            values={formData.roles}
            onChange={(v) => updateField('roles', v)}
            placeholder="e.g., Sales, Marketing"
          />
          <TagInput
            label="Seniority Levels"
            name="seniority"
            values={formData.seniority}
            onChange={(v) => updateField('seniority', v)}
            placeholder="e.g., Director, VP, C-Level"
          />
          <FormField
            label="Max Contacts per Organization"
            name="maxContactsPerOrg"
            type="number"
            value={formData.maxContactsPerOrg}
            onChange={(v) => updateField('maxContactsPerOrg', Number(v))}
          />
        </WizardStep>

        <WizardStep
          title="Lead Qualification"
          description="Criteria for qualifying leads"
          isActive={currentStep === 4}
          stepNumber={5}
          totalSteps={WIZARD_STEPS.length}
        >
          <FormField
            label="Minimum Signals Required"
            name="minimumSignals"
            type="number"
            value={formData.minimumSignals}
            onChange={(v) => updateField('minimumSignals', Number(v))}
            helpText="Number of intent signals required for qualification"
          />
        </WizardStep>

        <WizardStep
          title="Outreach Context"
          description="Messaging and positioning for outreach"
          isActive={currentStep === 5}
          stepNumber={6}
          totalSteps={WIZARD_STEPS.length}
        >
          <FormField
            label="Tone"
            name="tone"
            type="select"
            value={formData.tone}
            onChange={(v) => updateField('tone', String(v))}
            options={[
              { value: 'professional', label: 'Professional' },
              { value: 'casual', label: 'Casual' },
              { value: 'friendly', label: 'Friendly' },
              { value: 'formal', label: 'Formal' },
            ]}
          />
          <TagInput
            label="Value Propositions"
            name="valuePropositions"
            values={formData.valuePropositions}
            onChange={(v) => updateField('valuePropositions', v)}
            placeholder="Key value propositions"
          />
          <TagInput
            label="Pain Points"
            name="painPoints"
            values={formData.painPoints}
            onChange={(v) => updateField('painPoints', v)}
            placeholder="Pain points to address"
          />
          <FormField
            label="Call to Action"
            name="callToAction"
            value={formData.callToAction}
            onChange={(v) => updateField('callToAction', String(v))}
            placeholder="e.g., Book a demo"
          />
        </WizardStep>

        <WizardStep
          title="Readiness Requirements"
          description="Prerequisites for campaign execution"
          isActive={currentStep === 6}
          stepNumber={7}
          totalSteps={WIZARD_STEPS.length}
        >
          <FormField
            label="Deliverability Threshold (%)"
            name="deliverabilityThreshold"
            type="number"
            value={formData.deliverabilityThreshold}
            onChange={(v) => updateField('deliverabilityThreshold', Number(v))}
            helpText="Minimum deliverability score required"
          />
        </WizardStep>

        <WizardStep
          title="Campaign Targets (Optional)"
          description="Benchmarks only — do not affect campaign execution"
          isActive={currentStep === 7}
          stepNumber={8}
          totalSteps={WIZARD_STEPS.length}
        >
          <div
            style={{
              backgroundColor: '#EFF6FF',
              borderRadius: NSD_RADIUS.md,
              padding: '16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <Icon name="info" size={20} color="#1E40AF" />
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: '#1E40AF',
                lineHeight: 1.5,
              }}
            >
              Targets are benchmarks only. They do not enforce minimums, caps, or affect campaign execution in any way.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <FormField
              label="Target Organizations"
              name="targetOrganizations"
              type="number"
              value={formData.targetOrganizations ?? ''}
              onChange={(v) => updateField('targetOrganizations', v ? Number(v) : null)}
            />
            <FormField
              label="Target Contacts"
              name="targetContacts"
              type="number"
              value={formData.targetContacts ?? ''}
              onChange={(v) => updateField('targetContacts', v ? Number(v) : null)}
            />
            <FormField
              label="Target Leads"
              name="targetLeads"
              type="number"
              value={formData.targetLeads ?? ''}
              onChange={(v) => updateField('targetLeads', v ? Number(v) : null)}
            />
            <FormField
              label="Target Emails"
              name="targetEmails"
              type="number"
              value={formData.targetEmails ?? ''}
              onChange={(v) => updateField('targetEmails', v ? Number(v) : null)}
            />
            <FormField
              label="Target Replies"
              name="targetReplies"
              type="number"
              value={formData.targetReplies ?? ''}
              onChange={(v) => updateField('targetReplies', v ? Number(v) : null)}
            />
          </div>
        </WizardStep>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '24px',
          }}
        >
          <button
            onClick={goPrev}
            disabled={currentStep === 0}
            style={{
              padding: '12px 24px',
              backgroundColor: NSD_COLORS.background,
              color: currentStep === 0 ? NSD_COLORS.text.muted : NSD_COLORS.text.primary,
              fontSize: '14px',
              fontWeight: 500,
              borderRadius: NSD_RADIUS.md,
              border: `1px solid ${NSD_COLORS.border.default}`,
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              opacity: currentStep === 0 ? 0.5 : 1,
            }}
          >
            Previous
          </button>

          {currentStep < WIZARD_STEPS.length - 1 ? (
            <button
              onClick={goNext}
              style={{
                padding: '12px 24px',
                backgroundColor: NSD_COLORS.primary,
                color: NSD_COLORS.text.inverse,
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: NSD_RADIUS.md,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.name.trim()}
              style={{
                padding: '12px 32px',
                backgroundColor: isSubmitting || !formData.name.trim() ? NSD_COLORS.text.muted : NSD_COLORS.cta,
                color: NSD_COLORS.text.inverse,
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: NSD_RADIUS.md,
                border: 'none',
                cursor: isSubmitting || !formData.name.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Create Campaign'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
