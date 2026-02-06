import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Lightning, Sparkle, Crown, ArrowRight, Lock } from "@phosphor-icons/react";

interface UpgradePromptProps {
  feature: 'ai_extraction' | 'transcription' | 'email_integration' | 'workspaces' | 'analytics';
  usagePercent?: number;
  currentUsage?: number;
  limit?: number;
  variant?: 'inline' | 'card' | 'modal';
  onUpgrade?: () => void;
}

const featureMessages: Record<string, { title: string; description: string }> = {
  ai_extraction: {
    title: "AI Extraction Limit Reached",
    description: "You've used all your AI extractions for this month. Upgrade to Pro for unlimited extractions.",
  },
  transcription: {
    title: "Transcription Minutes Used Up",
    description: "You've used all your transcription minutes this month. Upgrade to Pro for unlimited transcription.",
  },
  email_integration: {
    title: "Email Integrations",
    description: "Connect Gmail and Outlook to send follow-up emails directly from ActionMinutes.",
  },
  workspaces: {
    title: "Workspaces",
    description: "Create workspaces to organize your meetings and action items.",
  },
  analytics: {
    title: "Advanced Analytics",
    description: "Get insights into meeting patterns, action item completion rates, and productivity.",
  }
};

export function UpgradePrompt({ 
  feature, 
  usagePercent, 
  currentUsage, 
  limit,
  variant = 'card',
  onUpgrade 
}: UpgradePromptProps) {
  const [, navigate] = useLocation();
  const message = featureMessages[feature];
  
  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      navigate("/app/settings?tab=subscription");
    }
  };
  
  const PlanIcon = Sparkle;
  
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-accent border border-border">
        <Lock weight="duotone" className="w-5 h-5 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground">{message.description}</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleUpgrade}
          className="flex-shrink-0 border-border hover:bg-accent"
          data-testid="upgrade-button-inline"
        >
          Upgrade
        </Button>
      </div>
    );
  }
  
  return (
    <Card className="bg-accent border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <PlanIcon weight="duotone" className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">{message.title}</CardTitle>
          <Badge variant="secondary" className="ml-auto bg-accent text-primary border-border">
            Pro
          </Badge>
        </div>
        <CardDescription className="text-muted-foreground">
          {message.description}
        </CardDescription>
      </CardHeader>
      
      {(usagePercent !== undefined || (currentUsage !== undefined && limit !== undefined)) && (
        <CardContent className="pb-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Monthly usage</span>
              <span className="text-foreground font-medium">
                {currentUsage ?? 0} / {limit ?? '?'}
              </span>
            </div>
            <Progress 
              value={usagePercent ?? ((currentUsage ?? 0) / (limit ?? 1)) * 100} 
              className="h-2 bg-muted [&>div]:bg-primary"
            />
          </div>
        </CardContent>
      )}
      
      <CardFooter>
        <Button 
          onClick={handleUpgrade}
          className="w-full bg-primary hover:bg-primary/90"
          data-testid="upgrade-button-card"
        >
          <Lightning weight="fill" className="w-4 h-4 mr-2" />
          Upgrade to Pro
          <ArrowRight weight="bold" className="w-4 h-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}

interface UsageBadgeProps {
  used: number;
  limit: number;
  unlimited?: boolean;
  label?: string;
}

export function UsageBadge({ used, limit, unlimited, label }: UsageBadgeProps) {
  if (unlimited) {
    return (
      <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30">
        {label ? `${label}: ` : ''}Unlimited
      </Badge>
    );
  }
  
  const percent = Math.round((used / limit) * 100);
  const isWarning = percent >= 80;
  const isExceeded = percent >= 100;
  
  return (
    <Badge 
      variant="secondary" 
      className={`
        ${isExceeded ? 'bg-red-500/20 text-red-300 border-red-500/30' : ''}
        ${isWarning && !isExceeded ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : ''}
        ${!isWarning ? 'bg-green-500/20 text-green-300 border-green-500/30' : ''}
      `}
    >
      {label ? `${label}: ` : ''}{used}/{limit}
    </Badge>
  );
}

interface FeatureGateProps {
  feature: 'ai_extraction' | 'transcription' | 'email_integration' | 'workspaces' | 'analytics';
  hasAccess: boolean;
  usagePercent?: number;
  currentUsage?: number;
  limit?: number;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ 
  feature, 
  hasAccess, 
  usagePercent,
  currentUsage,
  limit,
  children, 
  fallback 
}: FeatureGateProps) {
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  return (
    <UpgradePrompt 
      feature={feature} 
      usagePercent={usagePercent}
      currentUsage={currentUsage}
      limit={limit}
    />
  );
}
