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
import { isApiDisabled, featureFlags } from '../../../../config/appConfig';

/**
 * M67-14 CampaignCreate Wizard Steps
 * 
 * GOVERNANCE: Lead Qualification step removed (minimumSignals is forbidden)
 * Organization Sourcing is read-only (derived from ICP)
 */
const WIZARD_STEPS = [
  { id: 'identity', label: 'Campaign Identity' },
  { id: 'icp', label: 'ICP Definition' },
  { id: 'sourcing', label: 'Organization Sourcing' },
  { id: 'targeting', label: 'Contact Targeting' },
  { id: 'outreach', label: 'Outreach Context' },
  { id: 'targets', label: 'Targets (Optional)' },
];

/**
 * M67-14 CampaignCreate FormData
 * 
 * REMOVED FIELDS (per governance):
 * - technologies (forbidden)
 * - sourceType (forbidden - derived from ICP)
 * - maxOrganizations (forbidden)
 * - minimumSignals (forbidden)
 * - targetOrganizations (forbidden)
 * - targetContacts (forbidden)
 * 
 * REQUIRED FIELDS:
 * - name
 * - keywords[] (non-empty)
 * - geographies[] (non-empty)
 */
type FormData = {
  name: string;
  description: string;
  industries: string[];
  geographies: string[];
  jobTitles: string[];
  seniorityLevels: string[];
  keywords: string[];
  companySizeMin: number;
  companySizeMax: number;
  roles: string[];
  seniority: string[];
  maxContactsPerOrg: number;
  requireVerifiedEmail: boolean;
  tone: string;
  valuePropositions: string[];
  painPoints: string[];
  callToAction: string;
  // Targets (benchmarks only - do not affect execution)
  targetLeads: number | null;
  targetEmails: number | null;
  targetReplyRate: number | null;
  // Planning-only campaign flag
  planningOnly: boolean;
};

const initialFormData: FormData = {
  name: '',
  description: '',
  industries: [],
  geographies: [],
  jobTitles: [],
  seniorityLevels: [],
  keywords: [],
  companySizeMin: 0,
  companySizeMax: 10000,
  roles: [],
  seniority: [],
  maxContactsPerOrg: 3,
  requireVerifiedEmail: true,
  tone: 'professional',
  valuePropositions: [],
  painPoints: [],
  callToAction: '',
  // Targets (benchmarks only)
  targetLeads: null,
  targetEmails: null,
  targetReplyRate: null,
  // Planning-only campaign (default: No)
  planningOnly: false,
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
                backgroundColor: NSD_COLORS.semantic.attention.bg,
                borderRadius: '50%',
                margin: '0 auto 24px',
              }}
            >
              <Icon name="warning" size={32} color={NSD_COLORS.semantic.attention.text} />
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
              Campaign creation is currently unavailable.
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

  /**
   * M67-14 Payload Builder
   * 
   * REMOVED from payload (per governance):
   * - technologies
   * - organization_sourcing.source_type (derived from ICP)
   * - organization_sourcing.max_organizations
   * - lead_qualification.minimum_signals
   * - campaign_targets.target_organizations
   * - campaign_targets.target_contacts
   * - campaign_targets.target_replies
   * 
   * REQUIRED:
   * - name, keywords[], geographies[]
   * 
   * Targets are benchmarks only and do not affect campaign execution.
   */
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
      keywords: formData.keywords,
    },
    contact_targeting: {
      roles: formData.roles.length > 0 ? formData.roles : formData.jobTitles,
      seniority: formData.seniority.length > 0 ? formData.seniority : formData.seniorityLevels,
      max_contacts_per_org: formData.maxContactsPerOrg,
      email_requirements: {
        require_verified: formData.requireVerifiedEmail,
        exclude_generic: true,
      },
    },
    outreach_context: {
      tone: formData.tone,
      value_propositions: formData.valuePropositions,
      pain_points: formData.painPoints,
      call_to_action: formData.callToAction,
    },
    // Targets are benchmarks only - do not affect execution
    campaign_targets: {
      target_leads: formData.targetLeads,
      target_emails: formData.targetEmails,
      target_reply_rate: formData.targetReplyRate,
    },
    // Planning-only campaign flag
    sourcing_config: {
      benchmarks_only: formData.planningOnly,
    },
  });

  /**
   * M67-14 Validation
   * 
   * REQUIRED fields:
   * - name (non-empty)
   * - keywords[] (non-empty array)
   * - geographies[] (non-empty array)
   */
  const validateAllSteps = (): boolean => {
    const allErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      allErrors['campaign_identity.name'] = 'Campaign name is required';
    }
    if (formData.keywords.length === 0) {
      allErrors['icp.keywords'] = 'At least one keyword is required';
    }
    if (formData.geographies.length === 0) {
      allErrors['icp.geographies'] = 'At least one geography is required';
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

  /**
   * M67-14 Step Validation
   * 
   * Step 0 (Identity): name required
   * Step 1 (ICP): keywords[] and geographies[] required
   * Step 2 (Sourcing): read-only, no validation
   */
  const validateCurrentStep = (): boolean => {
    const stepErrors: Record<string, string> = {};

    switch (currentStep) {
      case 0:
        if (!formData.name.trim()) {
          stepErrors['campaign_identity.name'] = 'Campaign name is required';
        }
        break;
      case 1:
        if (formData.keywords.length === 0) {
          stepErrors['icp.keywords'] = 'At least one keyword is required';
        }
        if (formData.geographies.length === 0) {
          stepErrors['icp.geographies'] = 'At least one geography is required';
        }
        break;
      // Step 2 (Organization Sourcing) is read-only - no validation needed
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
                backgroundColor: NSD_COLORS.semantic.positive.bg,
                borderRadius: '50%',
                margin: '0 auto 24px',
              }}
            >
              <Icon name="check" size={32} color={NSD_COLORS.semantic.positive.text} />
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

  /**
   * GOVERNANCE LOCK (M67-14)
   * Campaign creation MUST use vertical left-hand navigation.
   * Horizontal steppers are explicitly forbidden due to UX and governance requirements.
   * Do not reintroduce a horizontal stepper under any condition.
   * 
   * Layout: Two-column with persistent left-hand vertical navigation
   * - Left column: WizardNav (vertical step list, always visible)
   * - Right column: Form content area
   */
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: NSD_COLORS.surface,
        padding: '32px',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header Section */}
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

        {/* Two-column layout: Vertical Nav (left) + Content (right) */}
        <div
          style={{
            display: 'flex',
            gap: '32px',
            alignItems: 'flex-start',
          }}
        >
          {/* Left Column: Vertical Navigation (GOVERNANCE LOCK - must remain vertical) */}
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

          {/* Right Column: Form Content */}
          <div style={{ flex: 1, minWidth: 0 }}>

        {(submitResult?.error || Object.keys(errors).length > 0) && (
          <div
            style={{
              backgroundColor: NSD_COLORS.semantic.critical.bg,
              borderRadius: NSD_RADIUS.md,
              padding: '16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <Icon name="warning" size={20} color={NSD_COLORS.semantic.critical.text} />
            <div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: NSD_COLORS.semantic.critical.text }}>
                {submitResult?.error || 'Please fix the errors below before continuing'}
              </p>
              {Object.keys(errors).length > 0 && (
                <ul style={{ margin: '8px 0 0 0', padding: '0 0 0 16px', fontSize: '13px', color: NSD_COLORS.semantic.critical.text }}>
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

          {/* Planning-Only Campaign Toggle
           *
           * EXECUTION CONTRACT NOTE:
           * platform-shell does NOT execute campaigns.
           * This toggle sets sourcing_config.benchmarks_only at creation time.
           * The value is included in the /api/campaign-create payload and
           * persisted to the database via that endpoint.
           *
           * For EXISTING campaigns, use the PlanningOnlyToggle component
           * on the campaign detail page, which calls:
           *   PATCH /api/campaign-config
           *   → PATCH ${SALES_ENGINE_URL}/api/v1/campaigns/:id/sourcing-config
           *
           * WHY MISLEADING BEFORE:
           * - This toggle only affected local React state during creation
           * - For existing campaigns, there was NO way to change this value
           * - Users could not convert between planning-only and executable modes
           *
           * WHY PLATFORM-SHELL MUST NOT WRITE DIRECTLY:
           * - All campaign mutations must go through nsd-sales-engine
           * - platform-shell is a UI/adapter layer, not a data authority
           * - This ensures consistency and proper audit logging
           */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ marginBottom: '8px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: NSD_COLORS.text.primary,
                  marginBottom: '4px',
                }}
              >
                Planning-Only Campaign?
              </label>
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  color: NSD_COLORS.text.muted,
                  lineHeight: 1.5,
                }}
              >
                Planning-only campaigns are used for forecasting and analysis. They cannot be executed or launched.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  padding: '10px 16px',
                  borderRadius: NSD_RADIUS.md,
                  border: `2px solid ${!formData.planningOnly ? NSD_COLORS.secondary : NSD_COLORS.border.light}`,
                  backgroundColor: !formData.planningOnly ? '#EEF2FF' : NSD_COLORS.background,
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="radio"
                  name="planningOnly"
                  checked={!formData.planningOnly}
                  onChange={() => updateField('planningOnly', false)}
                  style={{ accentColor: NSD_COLORS.secondary }}
                />
                <span style={{ fontSize: '14px', fontWeight: 500, color: NSD_COLORS.text.primary }}>
                  No
                </span>
                <span style={{ fontSize: '12px', color: NSD_COLORS.text.muted }}>
                  — Can be executed
                </span>
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  padding: '10px 16px',
                  borderRadius: NSD_RADIUS.md,
                  border: `2px solid ${formData.planningOnly ? NSD_COLORS.semantic.attention.border : NSD_COLORS.border.light}`,
                  backgroundColor: formData.planningOnly ? NSD_COLORS.semantic.attention.bg : NSD_COLORS.background,
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="radio"
                  name="planningOnly"
                  checked={formData.planningOnly}
                  onChange={() => updateField('planningOnly', true)}
                  style={{ accentColor: NSD_COLORS.semantic.attention.text }}
                />
                <span style={{ fontSize: '14px', fontWeight: 500, color: NSD_COLORS.text.primary }}>
                  Yes
                </span>
                <span style={{ fontSize: '12px', color: NSD_COLORS.text.muted }}>
                  — Forecasting only
                </span>
              </label>
            </div>
          </div>
        </WizardStep>

        <WizardStep
          title="ICP Definition"
          description="Define your Ideal Customer Profile"
          isActive={currentStep === 1}
          stepNumber={2}
          totalSteps={WIZARD_STEPS.length}
        >
          {/* REQUIRED: Keywords */}
          <TagInput
            label="Keywords"
            name="keywords"
            values={formData.keywords}
            onChange={(v) => updateField('keywords', v)}
            placeholder="Type and press Enter (required)"
            helpText="Keywords are required for campaign targeting"
            error={errors['icp.keywords']}
          />
          {/* REQUIRED: Geographies */}
          <TagInput
            label="Geographies"
            name="geographies"
            values={formData.geographies}
            onChange={(v) => updateField('geographies', v)}
            placeholder="e.g., United States, Europe (required)"
            helpText="At least one geography is required"
            error={errors['icp.geographies']}
          />
          <TagInput
            label="Industries"
            name="industries"
            values={formData.industries}
            onChange={(v) => updateField('industries', v)}
            placeholder="e.g., Technology, Healthcare"
            helpText="Target industries for this campaign"
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
        </WizardStep>

        {/* 
          M67-14 GOVERNANCE: Organization Sourcing is READ-ONLY
          - No inputs, toggles, selectors, counts, or limits
          - Derived automatically from ICP
        */}
        <WizardStep
          title="Organization Sourcing"
          description="How organizations will be sourced for this campaign"
          isActive={currentStep === 2}
          stepNumber={3}
          totalSteps={WIZARD_STEPS.length}
        >
          <div
            style={{
              backgroundColor: '#F3F4F6',
              borderRadius: NSD_RADIUS.md,
              padding: '24px',
              border: `1px solid ${NSD_COLORS.border.light}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <Icon name="info" size={20} color={NSD_COLORS.text.secondary} />
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: NSD_COLORS.text.primary,
                }}
              >
                Derived automatically from ICP
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: NSD_COLORS.text.secondary,
                lineHeight: 1.6,
              }}
            >
              Organization sourcing is determined by your ICP definition. 
              Organizations matching your keywords, geographies, and other criteria 
              will be automatically identified during campaign execution.
            </p>
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: NSD_COLORS.background,
                borderRadius: NSD_RADIUS.sm,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  color: NSD_COLORS.text.muted,
                  fontStyle: 'italic',
                }}
              >
                No configuration required. This step is for your awareness only.
              </p>
            </div>
          </div>
        </WizardStep>

        <WizardStep
          title="Contact Targeting"
          description="Define how contacts are selected within organizations"
          isActive={currentStep === 3}
          stepNumber={4}
          totalSteps={WIZARD_STEPS.length}
        >
          {/* Show inheritance notice when ICP values exist */}
          {(formData.jobTitles.length > 0 || formData.seniorityLevels.length > 0) && (
            <div
              style={{
                backgroundColor: NSD_COLORS.semantic.info.bg,
                borderRadius: NSD_RADIUS.md,
                padding: '12px 16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <Icon name="info" size={16} color={NSD_COLORS.semantic.info.text} />
              <span style={{ fontSize: '13px', color: NSD_COLORS.semantic.info.text }}>
                Job Titles and Seniority from ICP Definition are available. Override below if needed.
              </span>
            </div>
          )}
          <TagInput
            label="Target Roles"
            name="roles"
            values={formData.roles.length > 0 ? formData.roles : formData.jobTitles}
            onChange={(v) => updateField('roles', v)}
            placeholder="e.g., Sales, Marketing"
            helpText={formData.roles.length === 0 && formData.jobTitles.length > 0 ? "Using Job Titles from ICP Definition" : undefined}
          />
          <TagInput
            label="Seniority Levels"
            name="seniority"
            values={formData.seniority.length > 0 ? formData.seniority : formData.seniorityLevels}
            onChange={(v) => updateField('seniority', v)}
            placeholder="e.g., Director, VP, C-Level"
            helpText={formData.seniority.length === 0 && formData.seniorityLevels.length > 0 ? "Using Seniority Levels from ICP Definition" : undefined}
          />
          <FormField
            label="Max Contacts per Organization"
            name="maxContactsPerOrg"
            type="number"
            value={formData.maxContactsPerOrg}
            onChange={(v) => updateField('maxContactsPerOrg', Number(v))}
          />
        </WizardStep>

        {/* M67-14: Lead Qualification step REMOVED - minimumSignals is forbidden */}

        <WizardStep
          title="Outreach Context"
          description="Messaging and positioning for outreach"
          isActive={currentStep === 4}
          stepNumber={5}
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

        {/* 
          M67-14 GOVERNANCE: Targets are BENCHMARKS ONLY
          - Do not gate execution, sourcing, or approval
          - Do not affect lifecycle
          - Only target_leads, target_emails, target_reply_rate allowed
          - target_organizations, target_contacts REMOVED
        */}
        <WizardStep
          title="Campaign Targets (Optional)"
          description="Benchmarks only — do not affect campaign execution"
          isActive={currentStep === 5}
          stepNumber={6}
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
              Targets are benchmarks only and do not affect campaign execution.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <FormField
              label="Target Leads"
              name="targetLeads"
              type="number"
              value={formData.targetLeads ?? ''}
              onChange={(v) => updateField('targetLeads', v ? Number(v) : null)}
              helpText="Benchmark only"
            />
            <FormField
              label="Target Emails"
              name="targetEmails"
              type="number"
              value={formData.targetEmails ?? ''}
              onChange={(v) => updateField('targetEmails', v ? Number(v) : null)}
              helpText="Benchmark only"
            />
            <FormField
              label="Target Reply Rate (%)"
              name="targetReplyRate"
              type="number"
              value={formData.targetReplyRate ?? ''}
              onChange={(v) => updateField('targetReplyRate', v ? Number(v) : null)}
              helpText="Benchmark only (e.g., 5 for 5%)"
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
          {/* End Right Column */}
        </div>
        {/* End Two-column layout */}
      </div>
    </div>
  );
}
