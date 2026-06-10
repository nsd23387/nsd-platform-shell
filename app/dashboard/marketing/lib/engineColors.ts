import { magenta, indigo, violet } from '../../../../design/tokens/colors';

export const ENGINE_COLORS = {
  warm_outreach: {
    accent: magenta[500],
    label: 'Warm Outreach',
    href: '/dashboard/marketing/warm-outreach',
  },
  cold_outreach: {
    accent: indigo[600],
    label: 'Cold Outreach',
    href: '/dashboard/marketing/cold-outreach',
  },
  post_free_content: {
    accent: violet[500],
    label: 'SEO Summary',
    href: '/dashboard/marketing/seo',
  },
  run_paid_ads: {
    accent: magenta[700],
    label: 'Paid Summary',
    href: '/dashboard/marketing/paid-ads',
  },
} as const;

export type EngineKey = keyof typeof ENGINE_COLORS;
