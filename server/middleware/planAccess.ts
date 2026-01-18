import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { usageTracking, users } from '@shared/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { 
  PlanType, 
  getEffectivePlan, 
  getPlanConfig, 
  hasCapability, 
  getPlanLimit,
  isPlanAtLeast,
  PlanCapabilities,
  PlanLimits
} from '@shared/plans';

// Admin emails that bypass all subscription restrictions
const ADMIN_EMAILS = ['tomi.vida@gmail.com'];

function isAdminUser(user: any): boolean {
  return user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
}

declare global {
  namespace Express {
    interface Request {
      userPlan?: PlanType;
      planConfig?: ReturnType<typeof getPlanConfig>;
      isAdmin?: boolean;
    }
  }
}

export function attachPlanInfo(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (user) {
    req.isAdmin = isAdminUser(user);
    // Admins get Pro plan access regardless of subscription
    const effectivePlan = req.isAdmin ? 'pro' : getEffectivePlan(user.subscriptionPlan, user.subscriptionStatus);
    req.userPlan = effectivePlan;
    req.planConfig = getPlanConfig(effectivePlan);
  }
  next();
}

export function requirePlan(minPlan: PlanType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admins bypass all plan restrictions
    if (isAdminUser(user)) {
      return next();
    }

    const effectivePlan = getEffectivePlan(user.subscriptionPlan, user.subscriptionStatus);
    
    if (!isPlanAtLeast(effectivePlan, minPlan)) {
      const requiredConfig = getPlanConfig(minPlan);
      return res.status(403).json({ 
        error: 'Plan upgrade required',
        requiredPlan: minPlan,
        requiredPlanName: requiredConfig.displayName,
        currentPlan: effectivePlan,
        upgradeUrl: '/app/settings?tab=subscription'
      });
    }

    next();
  };
}

export function requireCapability(capability: keyof PlanCapabilities) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admins bypass all capability restrictions
    if (isAdminUser(user)) {
      return next();
    }

    const effectivePlan = getEffectivePlan(user.subscriptionPlan, user.subscriptionStatus);
    
    if (!hasCapability(effectivePlan, capability)) {
      return res.status(403).json({ 
        error: 'Feature not available on your plan',
        feature: capability,
        currentPlan: effectivePlan,
        upgradeUrl: '/app/settings?tab=subscription'
      });
    }

    next();
  };
}

function getCurrentPeriod(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

async function getOrCreateUsageRecord(userId: string): Promise<typeof usageTracking.$inferSelect> {
  const { start, end } = getCurrentPeriod();
  
  const existing = await db.select()
    .from(usageTracking)
    .where(
      and(
        eq(usageTracking.userId, userId),
        gte(usageTracking.periodStart, start),
        lte(usageTracking.periodEnd, end)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [newRecord] = await db.insert(usageTracking)
    .values({
      userId,
      periodStart: start,
      periodEnd: end,
      aiExtractions: 0,
      transcriptionMinutes: 0,
    })
    .returning();

  return newRecord;
}

export async function getUserUsage(userId: string) {
  const usage = await getOrCreateUsageRecord(userId);
  return {
    aiExtractions: usage.aiExtractions,
    transcriptionMinutes: usage.transcriptionMinutes,
  };
}

export async function incrementAiExtraction(userId: string): Promise<{ success: boolean; current: number; limit: number }> {
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user.length) {
    throw new Error('User not found');
  }

  // Admins have unlimited usage
  const isAdmin = isAdminUser(user[0]);
  const effectivePlan = isAdmin ? 'pro' : getEffectivePlan(user[0].subscriptionPlan, user[0].subscriptionStatus);
  const limit = isAdmin ? -1 : getPlanLimit(effectivePlan, 'aiExtractionsPerMonth');
  
  const usage = await getOrCreateUsageRecord(userId);
  
  if (limit !== -1 && usage.aiExtractions >= limit) {
    return { success: false, current: usage.aiExtractions, limit };
  }

  await db.update(usageTracking)
    .set({ 
      aiExtractions: usage.aiExtractions + 1,
      updatedAt: new Date()
    })
    .where(eq(usageTracking.id, usage.id));

  return { success: true, current: usage.aiExtractions + 1, limit };
}

export async function incrementTranscriptionMinutes(userId: string, minutes: number): Promise<{ success: boolean; current: number; limit: number }> {
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user.length) {
    throw new Error('User not found');
  }

  // Admins have unlimited usage
  const isAdmin = isAdminUser(user[0]);
  const effectivePlan = isAdmin ? 'pro' : getEffectivePlan(user[0].subscriptionPlan, user[0].subscriptionStatus);
  const limit = isAdmin ? -1 : getPlanLimit(effectivePlan, 'transcriptionMinutesPerMonth');
  
  const usage = await getOrCreateUsageRecord(userId);
  
  if (limit !== -1 && usage.transcriptionMinutes + minutes > limit) {
    return { success: false, current: usage.transcriptionMinutes, limit };
  }

  await db.update(usageTracking)
    .set({ 
      transcriptionMinutes: usage.transcriptionMinutes + minutes,
      updatedAt: new Date()
    })
    .where(eq(usageTracking.id, usage.id));

  return { success: true, current: usage.transcriptionMinutes + minutes, limit };
}

export function checkUsageLimit(limitType: 'aiExtractions' | 'transcription') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admins bypass all usage limits
    if (isAdminUser(user)) {
      return next();
    }

    const effectivePlan = getEffectivePlan(user.subscriptionPlan, user.subscriptionStatus);
    const usage = await getUserUsage(user.id);
    
    if (limitType === 'aiExtractions') {
      const limit = getPlanLimit(effectivePlan, 'aiExtractionsPerMonth');
      if (limit !== -1 && usage.aiExtractions >= limit) {
        return res.status(403).json({
          error: 'Monthly AI extraction limit reached',
          limitType: 'aiExtractions',
          current: usage.aiExtractions,
          limit,
          currentPlan: effectivePlan,
          upgradeUrl: '/app/settings?tab=subscription'
        });
      }
    } else if (limitType === 'transcription') {
      const limit = getPlanLimit(effectivePlan, 'transcriptionMinutesPerMonth');
      if (limit !== -1 && usage.transcriptionMinutes >= limit) {
        return res.status(403).json({
          error: 'Monthly transcription limit reached',
          limitType: 'transcription',
          current: usage.transcriptionMinutes,
          limit,
          currentPlan: effectivePlan,
          upgradeUrl: '/app/settings?tab=subscription'
        });
      }
    }

    next();
  };
}
