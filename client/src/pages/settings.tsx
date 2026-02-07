import { useState, useEffect, type ReactNode } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useStore } from "@/lib/store";
import { useUpdateUser } from "@/lib/hooks";
import { Link, useSearch } from "wouter";
import { 
  GearSix, Plug, CalendarBlank, Sparkle, UsersThree, ChatCircle, ShieldCheck, 
  User, BookOpen, Clock, FileText, Scales, CaretDown, CaretRight, Info, Lifebuoy,
  CreditCard, Crown, Rocket, CheckCircle, Warning, Sun, Moon, Palette, ArrowCounterClockwise
} from "@phosphor-icons/react";
import { useGeoData } from "@/components/stripe-pricing-table";
import { authenticatedFetch } from "@/hooks/use-auth";
import SettingsIntegrationsPage from "./settings-integrations";
import SettingsExportsPage from "./settings-exports";
import SettingsPrivacyPage from "./settings-privacy";
import SettingsTermsPage from "./settings-terms";
import { FeedbackModal } from "@/components/feedback-modal";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme/useTheme";
import { THEMES, DEFAULT_THEME, type ThemeId } from "@/theme/theme-types";
import { ThemePreview } from "@/theme/ThemePreview";

const ADMIN_EMAIL = "tomi.vida@gmail.com";

interface ExpandableSectionProps {
  title: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  forceOpen?: boolean;
  children: ReactNode;
  testId?: string;
}

function ExpandableSection({ title, icon, defaultOpen = false, forceOpen, children, testId }: ExpandableSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen || forceOpen);
  
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
    }
  }, [forceOpen]);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            className="w-full flex items-center justify-between px-4 py-4 md:px-6 hover:bg-accent transition-colors"
            data-testid={testId}
          >
            <div className="flex items-center gap-3">
              {icon}
              <span className="text-sm font-semibold text-foreground">{title}</span>
            </div>
            {isOpen ? (
              <CaretDown className="h-4 w-4 text-muted-foreground" weight="duotone" />
            ) : (
              <CaretRight className="h-4 w-4 text-muted-foreground" weight="duotone" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 md:px-6 md:pb-6 border-t border-border pt-4">
            {children}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function SettingsPage() {
  const { user, updateUser: updateLocalUser } = useStore();
  const updateUser = useUpdateUser();
  const { geoData } = useGeoData();
  const search = useSearch();
  const tabParam = new URLSearchParams(search).get("tab");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');

  const isAdmin = user.email === ADMIN_EMAIL;
  const currencySymbol = geoData?.isEU ? "€" : "$";
  const prices = geoData?.isEU 
    ? { monthly: 8, yearly: 76 } 
    : { monthly: 10, yearly: 96 };
  const currentPrice = billingInterval === 'yearly' ? prices.yearly : prices.monthly;
  const monthlyEquivalent = billingInterval === 'yearly' ? Math.round(prices.yearly / 12 * 10) / 10 : null;
  const openSubscription = tabParam === "subscription";
  
  const isPro = isAdmin || user.subscriptionPlan === 'pro';
  const subscriptionStatus = isAdmin ? 'active' : (user.subscriptionStatus || 'none');
  const isActive = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
  const isPastDue = subscriptionStatus === 'past_due';
  const hasExistingSubscription = user.stripeSubscriptionId && subscriptionStatus !== 'canceled';

  const handleUpgrade = async () => {
    const plan = 'pro';
    if (hasExistingSubscription) {
      setSubscriptionError('You already have an active subscription. Use "Manage Subscription" to make changes.');
      return;
    }
    
    setIsUpgrading(true);
    setSubscriptionError(null);
    try {
      const response = await authenticatedFetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval: billingInterval })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      setSubscriptionError(error instanceof Error ? error.message : 'Failed to start upgrade. Please try again.');
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsManaging(true);
    setSubscriptionError(null);
    try {
      const response = await authenticatedFetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session');
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error) {
      console.error('Failed to create portal session:', error);
      setSubscriptionError(error instanceof Error ? error.message : 'Failed to open subscription portal. Please try again.');
    } finally {
      setIsManaging(false);
    }
  };

  const handleToggle = (field: string, value: boolean) => {
    updateLocalUser({ [field]: value });
    updateUser.mutate({ [field]: value });
  };

  const handleToneChange = (tone: string) => {
    updateLocalUser({ tone });
    updateUser.mutate({ tone });
  };

  const { theme: currentTheme, mode, setTheme: applyTheme, setMode, resetTheme } = useTheme();

  return (
    <div className="space-y-4 md:space-y-5">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>

      {/* Appearance Section */}
      <ExpandableSection
        title="Appearance"
        icon={<Palette className="h-4 w-4 text-primary" weight="duotone" />}
        defaultOpen
        testId="section-appearance"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">Theme</h3>
              {currentTheme !== DEFAULT_THEME && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetTheme}
                  className="text-xs text-muted-foreground hover:text-foreground"
                  data-testid="button-reset-theme"
                >
                  <ArrowCounterClockwise className="h-3.5 w-3.5 mr-1.5" weight="bold" />
                  Reset to default
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => applyTheme(t.id)}
                  className={cn(
                    "relative p-4 rounded-xl text-left transition-all border",
                    currentTheme === t.id
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                      : "border-border bg-card hover:bg-accent/50"
                  )}
                  data-testid={`theme-card-${t.id}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex gap-1">
                      <div
                        className="h-4 w-4 rounded-full border border-border"
                        style={{ background: t.preview.primary }}
                      />
                      <div
                        className="h-4 w-4 rounded-full border border-border"
                        style={{ background: t.preview.accent }}
                      />
                      <div
                        className="h-4 w-4 rounded-full border border-border"
                        style={{ background: t.preview.bg }}
                      />
                    </div>
                    {t.id === DEFAULT_THEME && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Default</Badge>
                    )}
                  </div>
                  <p className="font-semibold text-sm text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{t.bestFor}</p>
                  {currentTheme === t.id && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle className="h-5 w-5 text-primary" weight="fill" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="font-medium text-foreground">Mode</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setMode("light")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all border",
                  mode === "light"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-accent/50"
                )}
                data-testid="button-mode-light"
              >
                <Sun className="h-4 w-4" weight={mode === "light" ? "fill" : "duotone"} />
                Light
              </button>
              <button
                onClick={() => setMode("dark")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all border",
                  mode === "dark"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-accent/50"
                )}
                data-testid="button-mode-dark"
              >
                <Moon className="h-4 w-4" weight={mode === "dark" ? "fill" : "duotone"} />
                Dark
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <ThemePreview />
          </div>
        </div>
      </ExpandableSection>

      {/* AI Preferences Section */}
      <ExpandableSection
        title="AI Preferences"
        icon={<Sparkle className="h-4 w-4 text-primary" weight="duotone" />}
        testId="section-ai-preferences"
      >
        <div className="space-y-6">
          {/* AI Settings */}
          <div className="space-y-4">
            <h3 className="font-medium text-foreground">AI Extraction</h3>
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4 py-2">
                <div className="space-y-1 flex-1">
                  <Label className="text-base text-foreground">Enable AI Extraction</Label>
                  <p className="text-sm text-muted-foreground">Process notes to find actions automatically.</p>
                </div>
                <Switch 
                  checked={user.aiEnabled} 
                  onCheckedChange={(c) => handleToggle('aiEnabled', c)}
                  className="mt-1 shrink-0"
                  data-testid="switch-ai-enabled"
                />
              </div>
              <div className="flex items-start justify-between gap-4 py-2">
                <div className="space-y-1 flex-1">
                  <Label className="text-base text-foreground">Auto-generate Drafts</Label>
                  <p className="text-sm text-muted-foreground">Create follow-up emails immediately.</p>
                </div>
                <Switch 
                  checked={user.autoGenerateDrafts} 
                  onCheckedChange={(c) => handleToggle('autoGenerateDrafts', c)}
                  className="mt-1 shrink-0"
                  data-testid="switch-auto-drafts"
                />
              </div>
              <div className="flex items-start justify-between gap-4 py-2">
                <div className="space-y-1 flex-1">
                  <Label className="text-base text-foreground">Personal AI</Label>
                  <p className="text-sm text-muted-foreground">Enable AI suggestions and summaries in your private journal.</p>
                </div>
                <Switch 
                  checked={user.personalAiEnabled !== false} 
                  onCheckedChange={(c) => handleToggle('personalAiEnabled', c)}
                  className="mt-1 shrink-0"
                  data-testid="switch-personal-ai-enabled"
                />
              </div>
            </div>
          </div>

          {/* Work Style */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="font-medium text-foreground">Work Style</h3>
            <div className="space-y-3">
              <Label className="text-base text-foreground">Tone</Label>
              <div className="flex flex-wrap gap-2">
                {['direct', 'friendly', 'formal'].map((t) => (
                  <Button 
                    key={t}
                    variant="ghost"
                    onClick={() => handleToneChange(t)}
                    className={cn(
                      "capitalize rounded-xl h-11 px-5 flex-1 sm:flex-none",
                      user.tone === t 
                        ? 'bg-accent text-primary border border-primary/30' 
                        : 'text-muted-foreground border border-border'
                    )}
                    data-testid={`button-tone-${t}`}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 bg-amber-500/10 text-amber-400 rounded-xl text-sm border border-amber-500/30">
            <strong>Note:</strong> Your notes will be processed by an AI service to generate outputs. You can disable AI anytime.
          </div>
        </div>
      </ExpandableSection>

      {/* Subscription Section */}
      <ExpandableSection
        title="Subscription"
        icon={<CreditCard className="h-4 w-4 text-amber-400" weight="duotone" />}
        testId="section-subscription"
        forceOpen={openSubscription}
      >
        <div className="space-y-6">
          {/* Error Display */}
          {subscriptionError && (
            <div className="p-4 bg-red-500/10 text-red-400 rounded-xl text-sm border border-red-500/30" data-testid="subscription-error">
              <strong>Error:</strong> {subscriptionError}
            </div>
          )}

          {/* Current Plan Status */}
          <div className="flex items-center justify-between p-4 bg-accent rounded-xl border border-border">
            <div className="flex items-center gap-3">
              {isPro ? (
                <div className="p-2 bg-accent rounded-lg">
                  <Crown className="h-6 w-6 text-amber-400" weight="duotone" />
                </div>
              ) : (
                <div className="p-2 bg-muted rounded-lg">
                  <Rocket className="h-6 w-6 text-muted-foreground" weight="duotone" />
                </div>
              )}
              <div>
                <p className="font-semibold text-foreground" data-testid="text-current-plan">
                  {isPro ? 'Pro Plan' : 'Free Plan'}
                </p>
                <div className="flex items-center gap-2">
                  {isPro && isActive && (
                    <span className="flex items-center gap-1 text-sm text-emerald-400" data-testid="status-active">
                      <CheckCircle className="h-4 w-4" weight="duotone" />
                      Active
                    </span>
                  )}
                  {isPro && isPastDue && (
                    <span className="flex items-center gap-1 text-sm text-amber-400" data-testid="status-past-due">
                      <Warning className="h-4 w-4" weight="duotone" />
                      Past Due
                    </span>
                  )}
                  {!isPro && (
                    <span className="text-sm text-muted-foreground" data-testid="status-free">
                      300 min/month • 5 AI extractions
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Upgrade Section - Show for Free users */}
          {!isPro && (
            <div className="space-y-6">
              <Card className="bg-accent border-border hover:bg-accent/80 transition-all max-w-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-foreground">Pro</CardTitle>
                    <span className="bg-accent text-primary text-xs font-medium px-2 py-1 rounded-full">Recommended</span>
                  </div>
                  <CardDescription className="text-muted-foreground">Unlock your full productivity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => setBillingInterval('monthly')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        billingInterval === 'monthly' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground hover:bg-accent'
                      }`}
                      data-testid="settings-billing-monthly"
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setBillingInterval('yearly')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                        billingInterval === 'yearly' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground hover:bg-accent'
                      }`}
                      data-testid="settings-billing-yearly"
                    >
                      Yearly
                      <span className="bg-emerald-500/20 text-emerald-400 text-xs px-1.5 py-0.5 rounded-full">-20%</span>
                    </button>
                  </div>
                  <div>
                    <span className="text-3xl font-bold text-foreground">{currencySymbol}{currentPrice}</span>
                    <span className="text-muted-foreground ml-1">/{billingInterval === 'yearly' ? 'year' : 'month'}</span>
                    {monthlyEquivalent && (
                      <p className="text-sm text-primary mt-1">{currencySymbol}{monthlyEquivalent}/month</p>
                    )}
                  </div>
                  <ul className="space-y-2 text-sm text-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400" weight="duotone" />
                      Unlimited transcription
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400" weight="duotone" />
                      Unlimited AI extractions
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400" weight="duotone" />
                      Gmail and Outlook Integration
                    </li>
                  </ul>
                  <Button
                    onClick={() => handleUpgrade()}
                    disabled={isUpgrading}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 rounded-xl font-semibold"
                    data-testid="button-upgrade-pro"
                  >
                    {isUpgrading ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Redirecting...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Rocket className="h-4 w-4" weight="duotone" />
                        Upgrade to Pro
                      </span>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Manage Subscription - Show for Pro users */}
          {isPro && (
            <div className="space-y-4">
              <div className="p-4 bg-accent rounded-xl border border-border">
                <p className="text-sm text-foreground mb-4">
                  Manage your subscription, update payment methods, or cancel your plan through the Stripe Customer Portal.
                </p>
                <Button
                  onClick={handleManageSubscription}
                  disabled={isManaging}
                  variant="outline"
                  className="w-full h-11 rounded-xl text-foreground border-border hover:bg-accent"
                  data-testid="button-manage-subscription"
                >
                  {isManaging ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                      Redirecting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" weight="duotone" />
                      Manage Subscription
                    </span>
                  )}
                </Button>
              </div>

              {isPastDue && (
                <div className="p-4 bg-amber-500/10 text-amber-400 rounded-xl text-sm border border-amber-500/30">
                  <strong>Payment Issue:</strong> Your subscription payment is past due. Please update your payment method to continue enjoying Pro features.
                </div>
              )}
            </div>
          )}
        </div>
      </ExpandableSection>

      {/* Integrations Section */}
      <ExpandableSection
        title="Integrations"
        icon={<Plug className="h-4 w-4 text-emerald-400" weight="duotone" />}
        testId="section-integrations"
      >
        <SettingsIntegrationsPage />
      </ExpandableSection>

      {/* Exports Section */}
      <ExpandableSection
        title="Exports"
        icon={<CalendarBlank className="h-4 w-4 text-sky-400" weight="duotone" />}
        testId="section-exports"
      >
        <SettingsExportsPage />
      </ExpandableSection>

      {/* Support & Legal Section */}
      <ExpandableSection
        title="Support & Legal"
        icon={<ChatCircle className="h-4 w-4 text-amber-400" weight="duotone" />}
        testId="section-support"
      >
        <div className="space-y-4">
          {/* About ActionMinutes */}
          <div className="space-y-3">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" weight="duotone" />
              About ActionMinutes
            </h3>
            <div className="p-4 bg-accent rounded-xl border border-primary/20">
              <p className="text-sm text-foreground leading-relaxed">
                ActionMinutes transforms your messy meeting notes into actionable outputs. 
                Simply capture your notes, and we'll extract clear action items with owners and due dates, 
                key decisions, and ready-to-send follow-up emails — all in under 60 seconds.
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                Minutes → Actions → Follow-ups
              </p>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" weight="duotone" />
              Privacy Settings
            </h3>
            <div className="flex items-start justify-between gap-4 py-2 pl-2">
              <div className="space-y-1 flex-1">
                <Label className="text-base text-foreground">Allow storing uploaded images</Label>
                <p className="text-sm text-muted-foreground">When off, uploaded photos of handwritten notes are processed and immediately deleted.</p>
                <p className="text-xs text-amber-400">Images can contain sensitive information.</p>
              </div>
              <Switch 
                checked={user.allowImageStorage ?? false} 
                onCheckedChange={(c) => handleToggle('allowImageStorage', c)}
                className="mt-1 shrink-0"
                data-testid="switch-allow-image-storage"
              />
            </div>
          </div>

          {/* Legal Links */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h3 className="font-medium text-foreground">Legal</h3>
            <div className="space-y-2">
              <Link href="/privacy-policy">
                <Button variant="outline" className="w-full justify-start h-11 rounded-xl" data-testid="link-privacy-policy">
                  <ShieldCheck className="h-4 w-4 mr-3 text-muted-foreground" weight="duotone" />
                  Privacy Policy
                </Button>
              </Link>
              <Link href="/terms">
                <Button variant="outline" className="w-full justify-start h-11 rounded-xl" data-testid="link-terms">
                  <Scales className="h-4 w-4 mr-3 text-muted-foreground" weight="duotone" />
                  Terms of Service
                </Button>
              </Link>
            </div>
          </div>

          {/* Help & Feedback */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h3 className="font-medium text-foreground">Help & Feedback</h3>
            <Link href="/support">
              <Button variant="outline" className="w-full justify-start h-11 rounded-xl" data-testid="link-support">
                <Lifebuoy className="h-4 w-4 mr-3 text-amber-400" weight="duotone" />
                Support
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => setFeedbackOpen(true)}
              className="w-full justify-start h-11 rounded-xl"
              data-testid="button-send-feedback"
            >
              <ChatCircle className="h-4 w-4 mr-3 text-primary" weight="duotone" />
              Send Feedback
            </Button>
            
            {/* Admin only - View Feedback */}
            {isAdmin && (
              <Link href="/admin/feedback">
                <Button
                  variant="outline"
                  className="w-full justify-start h-11 rounded-xl"
                  data-testid="button-admin-feedback"
                >
                  <ShieldCheck className="h-4 w-4 mr-3 text-primary" weight="duotone" />
                  Admin: View Feedback
                </Button>
              </Link>
            )}
          </div>
        </div>
      </ExpandableSection>

      {/* Version Number */}
      <div className="text-center py-6">
        <p className="text-xs text-muted-foreground font-medium">
          ActionMinutes v1.0.1. - by <a href="https://relay-labs.app" target="_blank" rel="noopener noreferrer" className="hover:text-primary underline decoration-primary/30 underline-offset-2 transition-all">Relay Labs</a>
        </p>
      </div>

      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </div>
  );
}
