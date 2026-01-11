export const STRIPE_PRICES = {
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
    yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || '',
  },
  team: {
    monthly: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID || '',
    yearly: process.env.STRIPE_TEAM_YEARLY_PRICE_ID || '',
  },
} as const;

export type PlanType = 'pro' | 'team';
export type BillingInterval = 'monthly' | 'yearly';

export function getPriceId(plan: PlanType, interval: BillingInterval = 'monthly'): string {
  const priceId = STRIPE_PRICES[plan]?.[interval];
  if (!priceId) {
    throw new Error(`No price ID configured for ${plan} ${interval} plan`);
  }
  return priceId;
}

export function getPlanFromPriceId(priceId: string): { plan: PlanType; interval: BillingInterval } | null {
  for (const [plan, intervals] of Object.entries(STRIPE_PRICES)) {
    for (const [interval, id] of Object.entries(intervals)) {
      if (id === priceId) {
        return { plan: plan as PlanType, interval: interval as BillingInterval };
      }
    }
  }
  return null;
}
