import Stripe from 'stripe';
import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import { getPlanFromPriceId } from './stripeConfig';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const stripe = await getUncachableStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event: Stripe.Event;
    try {
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      } else {
        event = JSON.parse(payload.toString()) as Stripe.Event;
      }
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      throw new Error('Webhook signature verification failed');
    }

    const sync = await getStripeSync();
    try {
      await sync.processWebhook(payload, signature);
    } catch (syncErr) {
      console.log('StripeSync processing (non-critical):', syncErr);
    }

    await WebhookHandlers.handleEvent(event);
  }

  static async handleEvent(event: Stripe.Event): Promise<void> {
    const eventType = event.type;
    const data = event.data.object;

    console.log(`Processing Stripe event: ${eventType}`);

    switch (eventType) {
      case 'checkout.session.completed':
        await WebhookHandlers.handleCheckoutCompleted(data as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await WebhookHandlers.handleSubscriptionUpdated(data as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await WebhookHandlers.handleSubscriptionDeleted(data as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await WebhookHandlers.handlePaymentSucceeded(data as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await WebhookHandlers.handlePaymentFailed(data as Stripe.Invoice);
        break;
      default:
        break;
    }
  }

  static async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    const userId = session.client_reference_id || session.metadata?.userId;

    if (!userId) {
      console.error('No userId found in checkout session');
      return;
    }

    await storage.updateUserStripeInfo(userId, {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: 'active',
    });

    console.log(`User ${userId} checkout completed, subscription ${subscriptionId}`);
  }

  static async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;
    const user = await storage.getUserByStripeCustomerId(customerId);

    if (!user) {
      console.error(`No user found for Stripe customer ${customerId}`);
      return;
    }

    const priceId = subscription.items.data[0]?.price?.id;
    let plan = 'pro';
    
    if (priceId) {
      const planInfo = getPlanFromPriceId(priceId);
      if (planInfo) {
        plan = planInfo.plan;
      }
    }

    await storage.updateUserStripeInfo(user.id, {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionPlan: plan,
    });

    console.log(`Updated subscription for user ${user.id}: status=${subscription.status}, plan=${plan}`);
  }

  static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;
    const user = await storage.getUserByStripeCustomerId(customerId);

    if (!user) {
      console.error(`No user found for Stripe customer ${customerId}`);
      return;
    }

    await storage.updateUserStripeInfo(user.id, {
      stripeSubscriptionId: null,
      subscriptionStatus: 'canceled',
      subscriptionPlan: null,
    });

    console.log(`Subscription canceled for user ${user.id}`);
  }

  static async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    const user = await storage.getUserByStripeCustomerId(customerId);

    if (!user) {
      return;
    }

    if (user.subscriptionStatus === 'past_due') {
      await storage.updateUserStripeInfo(user.id, {
        subscriptionStatus: 'active',
      });
      console.log(`Payment succeeded, reactivated subscription for user ${user.id}`);
    }
  }

  static async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    const user = await storage.getUserByStripeCustomerId(customerId);

    if (!user) {
      return;
    }

    await storage.updateUserStripeInfo(user.id, {
      subscriptionStatus: 'past_due',
    });

    console.log(`Payment failed for user ${user.id}, status set to past_due`);
  }
}
