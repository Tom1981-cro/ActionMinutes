import { Router } from 'express';
import { z } from 'zod';
import { getUncachableStripeClient } from '../stripeClient';
import { storage } from '../storage';
import { getPriceId, type PlanType, type BillingInterval } from '../stripeConfig';
import { requireAuth } from '../jwt';

const router = Router();

const createCheckoutSchema = z.object({
  plan: z.enum(['pro']).default('pro'),
  interval: z.enum(['monthly', 'yearly']).default('monthly'),
});

router.post('/api/create-checkout-session', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { plan, interval } = createCheckoutSchema.parse(req.body);

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.stripeSubscriptionId && user.subscriptionStatus && 
        !['canceled', 'incomplete_expired'].includes(user.subscriptionStatus)) {
      return res.status(400).json({ error: 'You already have an active subscription. Use the customer portal to manage it.' });
    }

    let priceId: string;
    try {
      priceId = getPriceId(plan as PlanType, interval as BillingInterval);
    } catch (err) {
      return res.status(400).json({ error: 'Stripe price IDs not configured. Please contact support.' });
    }

    const stripe = await getUncachableStripeClient();

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await storage.updateUserStripeInfo(userId, { stripeCustomerId: customerId });
    }

    const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
    const protocol = domain.includes('localhost') ? 'http' : 'https';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${protocol}://${domain}/app/settings?success=true`,
      cancel_url: `${protocol}://${domain}/app/settings?canceled=true`,
      client_reference_id: userId,
      metadata: {
        userId,
        plan,
        interval,
      },
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: error.message || 'Failed to create checkout session' });
  }
});

router.post('/api/create-portal-session', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await storage.getUser(userId);
    if (!user || !user.stripeCustomerId) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    const stripe = await getUncachableStripeClient();
    
    const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
    const protocol = domain.includes('localhost') ? 'http' : 'https';

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${protocol}://${domain}/app/settings`,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Portal session error:', error);
    res.status(500).json({ error: error.message || 'Failed to create portal session' });
  }
});

router.get('/api/subscription', async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      subscription: user.stripeSubscriptionId ? {
        id: user.stripeSubscriptionId,
        status: user.subscriptionStatus,
        plan: user.subscriptionPlan,
      } : null,
    });
  } catch (error: any) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: error.message || 'Failed to get subscription' });
  }
});

router.get('/api/stripe/publishable-key', async (_req, res) => {
  try {
    const { getStripePublishableKey } = await import('../stripeClient');
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch (error: any) {
    console.error('Get publishable key error:', error);
    res.status(500).json({ error: 'Failed to get Stripe publishable key' });
  }
});

export default router;
