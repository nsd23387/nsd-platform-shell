import { NextRequest, NextResponse } from 'next/server';

const mockCampaigns: Record<string, any> = {
  'camp-001': {
    id: 'camp-001',
    name: 'Q1 Outreach Campaign',
    description: 'Initial outreach to enterprise prospects in the retail and hospitality sectors',
    status: 'DRAFT',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-20T14:30:00Z',
    canEdit: true,
    canSubmit: true,
    canApprove: false,
    isRunnable: false,
    icp: {
      keywords: ['neon signs', 'custom signage', 'LED displays', 'storefront signs'],
      locations: [
        { country: 'United States', state: 'California' },
        { country: 'United States', state: 'Texas' },
      ],
      industries: ['Retail', 'Hospitality', 'Food & Beverage'],
      employeeSize: { min: 10, max: 500 },
      roles: ['Business Owner', 'Marketing Manager', 'Store Manager'],
      painPoints: [
        'Low foot traffic visibility',
        'Outdated storefront signage',
        'High maintenance costs',
      ],
      valuePropositions: [
        'Custom designs that capture brand identity',
        'Energy-efficient LED technology',
        'Professional installation included',
      ],
    },
    personalization: {
      toneOfVoice: 'professional',
      primaryCTA: 'Get a Free Quote',
      uniqueSellingPoints: ['25+ years of experience', 'Nationwide installation'],
      customFields: {},
    },
    readiness: {
      is_ready: false,
      blocking_reasons: ['MISSING_HUMAN_APPROVAL'],
      throughput_blocked: false,
    },
  },
  'camp-002': {
    id: 'camp-002',
    name: 'Product Launch Sequence',
    description: 'Multi-touch campaign for new product launch targeting entertainment venues',
    status: 'PENDING_REVIEW',
    created_at: '2025-01-10T09:00:00Z',
    updated_at: '2025-01-18T16:45:00Z',
    canEdit: false,
    canSubmit: false,
    canApprove: true,
    isRunnable: false,
    submittedBy: 'john.smith@neonsignsdepot.com',
    submittedAt: '2025-01-18T16:45:00Z',
    icp: {
      keywords: ['event lighting', 'stage signs', 'venue signage', 'LED installations'],
      locations: [
        { country: 'United States', state: 'New York' },
        { country: 'United States', state: 'Nevada', city: 'Las Vegas' },
      ],
      industries: ['Entertainment', 'Events', 'Nightlife'],
      employeeSize: { min: 20, max: 1000 },
      roles: ['Venue Manager', 'Events Director', 'Operations Manager'],
      painPoints: [
        'Need eye-catching displays for events',
        'Quick turnaround for installations',
        'Durability for high-traffic areas',
      ],
      valuePropositions: [
        'Stunning visual impact',
        '48-hour rush delivery available',
        'Industrial-grade materials',
      ],
    },
    personalization: {
      toneOfVoice: 'friendly',
      primaryCTA: 'Schedule a Consultation',
      uniqueSellingPoints: ['VIP customer support', 'Custom designs for venues'],
      customFields: {},
    },
    readiness: {
      is_ready: false,
      blocking_reasons: ['MISSING_HUMAN_APPROVAL'],
      throughput_blocked: false,
    },
  },
  'camp-003': {
    id: 'camp-003',
    name: 'Re-engagement Campaign',
    description: 'Targeting dormant leads from previous quarters with special offers',
    status: 'RUNNABLE',
    created_at: '2025-01-05T11:00:00Z',
    updated_at: '2025-01-17T10:00:00Z',
    canEdit: false,
    canSubmit: false,
    canApprove: false,
    isRunnable: true,
    submittedBy: 'sarah.jones@neonsignsdepot.com',
    submittedAt: '2025-01-15T14:00:00Z',
    approvedBy: 'mike.wilson@neonsignsdepot.com',
    approvedAt: '2025-01-17T10:00:00Z',
    icp: {
      keywords: ['sign replacement', 'signage upgrade', 'LED conversion'],
      locations: [
        { country: 'United States' },
      ],
      industries: ['Retail', 'Restaurant', 'Real Estate'],
      employeeSize: { min: 5, max: 200 },
      roles: ['Business Owner', 'Facilities Manager'],
      painPoints: [
        'Existing signs showing wear',
        'Energy costs from old signage',
        'Looking to modernize appearance',
      ],
      valuePropositions: [
        'Trade-in discount on old signs',
        '50% energy savings with LED',
        'Free design consultation',
      ],
    },
    personalization: {
      toneOfVoice: 'casual',
      primaryCTA: 'Claim Your Discount',
      uniqueSellingPoints: ['Limited time 20% off', 'Free removal of old sign'],
      customFields: {},
    },
    readiness: {
      is_ready: true,
      blocking_reasons: [],
      throughput_blocked: false,
    },
  },
};

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;
  const campaign = mockCampaigns[id];
  
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  return NextResponse.json(campaign);
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;
  const campaign = mockCampaigns[id];
  
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  if (!campaign.canEdit) {
    return NextResponse.json({ error: 'Campaign cannot be edited' }, { status: 403 });
  }

  const body = await request.json();
  
  if (body.name) campaign.name = body.name;
  if (body.description !== undefined) campaign.description = body.description;
  if (body.icp) campaign.icp = body.icp;
  if (body.personalization) campaign.personalization = body.personalization;
  campaign.updated_at = new Date().toISOString();

  return NextResponse.json(campaign);
}
