import { useState, useEffect } from "react";
import logoIcon from "@assets/am_logo_1767300370565.png";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { useUpdateUser, useIntegrations, useDisconnectIntegration, useAppConfig } from "@/lib/hooks";
import { Link } from "wouter";
import {
  User,
  Crown,
  Sparkle,
  ListBullets,
  Bell,
  Clock,
  Palette,
  DotsThreeCircle,
  Plug,
  UsersThree,
  Keyboard,
  Info,
  Envelope,
  Lock,
  ShieldCheck,
  GoogleLogo,
  AppleLogo,
  DeviceMobile,
  Key,
  CloudArrowUp,
  Trash,
  CheckCircle,
  Rocket,
  CalendarBlank,
  Globe,
  Tag,
  Funnel,
  Tray,
  ListChecks,
  Sun,
  Moon,
  ArrowCounterClockwise,
  ChatCircle,
  TwitterLogo,
  Lifebuoy,
  AndroidLogo,
  DesktopTower,
  Scales,
  EnvelopeSimple,
  Warning,
  CreditCard,
  Lightning,
  MicrophoneStage,
  Robot,
  Note,
  Headset,
} from "@phosphor-icons/react";
import { useGeoData } from "@/components/stripe-pricing-table";
import { authenticatedFetch } from "@/hooks/use-auth";
import { FeedbackModal } from "@/components/feedback-modal";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme/useTheme";
import { useToast } from "@/hooks/use-toast";
import { usePlan } from "@/hooks/use-plan";
import { format } from "date-fns";

const ADMIN_EMAIL = "tomi.vida@gmail.com";

export function openSettingsModal(tab?: TabId) {
  window.dispatchEvent(new CustomEvent("open-settings", { detail: { tab } }));
}

export type TabId =
  | "account"
  | "premium"
  | "features"
  | "smartlist"
  | "notifications"
  | "datetime"
  | "appearance"
  | "more"
  | "integrations"
  | "collaborate"
  | "shortcuts"
  | "about";

const SIDEBAR_ITEMS: { id: TabId; label: string; icon: any }[] = [
  { id: "account", label: "Account", icon: User },
  { id: "premium", label: "Premium", icon: Crown },
  { id: "features", label: "Features", icon: Sparkle },
  { id: "smartlist", label: "Smart List", icon: ListBullets },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "datetime", label: "Date & Time", icon: Clock },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "more", label: "More", icon: DotsThreeCircle },
  { id: "integrations", label: "Integrations & Import", icon: Plug },
  { id: "collaborate", label: "Collaborate", icon: UsersThree },
  { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
  { id: "about", label: "About", icon: Info },
];

function getLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch {}
  return defaultValue;
}

function setLocalStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function SettingRow({
  label,
  description,
  children,
  last,
  testId,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  last?: boolean;
  testId?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-2 px-3",
        !last && "border-b border-border"
      )}
      data-testid={testId}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="ml-4 shrink-0">{children}</div>
    </div>
  );
}

function SettingCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {children}
    </div>
  );
}

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: TabId;
}

export default function SettingsModal({ open, onOpenChange, initialTab }: SettingsModalProps) {
  const { user, updateUser: updateLocalUser } = useStore();
  const updateUser = useUpdateUser();
  const { geoData } = useGeoData();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>(initialTab || "account");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [_appearanceSubTab, _setAppearanceSubTab] = useState<"theme" | "display">("theme");
  const [smartListSettings, setSmartListSettings] = useState(() =>
    getLocalStorage("am.smartListSettings", {
      all: "show", today: "show", tomorrow: "show", next7Days: "show", assignedToMe: "show",
      inbox: "show", summary: "show", tags: "show", filters: "show", completed: "show", wontDo: "show", trash: "show",
    })
  );
  const [notificationSettings, setNotificationSettings] = useState(() =>
    getLocalStorage("am.notificationSettings", {
      dailyNotifications: true, dailyAlertTime: "09:00", webReminder: true, emailNotifications: false,
    })
  );
  const [dateTimeSettings, setDateTimeSettings] = useState(() =>
    getLocalStorage("am.dateTimeSettings", {
      timeFormat: "12", startWeekOn: "sunday", additionalCalendar: "none", showWeekNumbers: false, timeZone: true,
    })
  );
  const [displaySettings, setDisplaySettings] = useState(() =>
    getLocalStorage("am.displaySettings", { interfaceStyle: "card", fontSize: "normal" })
  );
  const [moreSettings, setMoreSettings] = useState(() =>
    getLocalStorage("am.moreSettings", {
      language: "en", dateRecognition: true, removeDateText: false, tagRecognition: true, removeTagText: false,
      urlParsing: true, defaultDate: "none", defaultDateMode: "date", defaultDuration: "none",
      defaultRemindersDueTime: "none", defaultRemindersAllDay: "none", defaultPriority: "none",
      defaultTag: "none", defaultList: "inbox", defaultAddTo: "bottom", overdueSection: "top", showMiniCalendar: true,
    })
  );
  const [collaborateSettings, setCollaborateSettings] = useState(() =>
    getLocalStorage("am.collaborateSettings", {
      autoAcceptInvites: false, notifyComplete: true, notifyAdd: true, notifyDelete: true,
    })
  );

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const isAdmin = user.email === ADMIN_EMAIL;
  const currencySymbol = geoData?.isEU ? "€" : "$";
  const prices = geoData?.isEU ? { monthly: 8, yearly: 76 } : { monthly: 10, yearly: 96 };
  const currentPrice = billingInterval === "yearly" ? prices.yearly : prices.monthly;
  const monthlyEquivalent = billingInterval === "yearly" ? Math.round((prices.yearly / 12) * 10) / 10 : null;

  const isPro = isAdmin || user.subscriptionPlan === "pro";
  const subscriptionStatus = isAdmin ? "active" : user.subscriptionStatus || "none";
  const isActive = subscriptionStatus === "active" || subscriptionStatus === "trialing";
  const isPastDue = subscriptionStatus === "past_due";
  const hasExistingSubscription = user.stripeSubscriptionId && subscriptionStatus !== "canceled";

  const handleUpgrade = async () => {
    if (hasExistingSubscription) {
      setSubscriptionError('You already have an active subscription. Use "Manage Subscription" to make changes.');
      return;
    }
    setIsUpgrading(true);
    setSubscriptionError(null);
    try {
      const response = await authenticatedFetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro", interval: billingInterval }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create checkout session");
      if (data.url) window.location.href = data.url;
      else throw new Error("No checkout URL returned");
    } catch (error) {
      setSubscriptionError(error instanceof Error ? error.message : "Failed to start upgrade.");
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsManaging(true);
    setSubscriptionError(null);
    try {
      const response = await authenticatedFetch("/api/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create portal session");
      if (data.url) window.location.href = data.url;
      else throw new Error("No portal URL returned");
    } catch (error) {
      setSubscriptionError(error instanceof Error ? error.message : "Failed to open subscription portal.");
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

  const setTab = (tab: TabId) => {
    setActiveTab(tab);
  };

  const comingSoon = (feature: string) => {
    toast({ title: "Coming Soon", description: `${feature} will be available in a future update.` });
  };

  const { data: integrationsData, isLoading: integrationsLoading, refetch: refetchIntegrations } = useIntegrations();
  const { data: appConfig } = useAppConfig();
  const disconnectIntegration = useDisconnectIntegration();
  const { canUseEmailIntegrations, isFree } = usePlan();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");
    if (success === "google") {
      toast({ title: "Gmail Connected", description: "You can now send emails directly from ActionMinutes." });
      refetchIntegrations();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (success === "microsoft") {
      toast({ title: "Outlook Connected", description: "You can now send emails directly from ActionMinutes." });
      refetchIntegrations();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (error) {
      toast({ title: "Connection Failed", description: "Could not connect to your email account.", variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const renderAccountTab = () => {
    const googleConnected = integrationsData?.google?.connected;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary" data-testid="avatar-user">
            {user.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground" data-testid="text-user-name">{user.name || "User"}</h2>
            <p className="text-xs text-muted-foreground" data-testid="text-user-email">{user.email}</p>
            {isPro && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs" data-testid="badge-pro">
                  <Crown className="h-3 w-3 mr-1" weight="fill" />
                  Pro
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Expire Date: {isActive ? "Active" : "—"}
                </span>
                <button className="text-xs text-primary hover:underline cursor-pointer" onClick={() => setTab("premium")} data-testid="link-renew">
                  Renew
                </button>
              </div>
            )}
          </div>
        </div>

        <SettingCard>
          <SettingRow label="Email" testId="row-email">
            <span className="text-sm text-muted-foreground">{user.email}</span>
          </SettingRow>
          <SettingRow label="Password" testId="row-password">
            <button className="text-sm text-primary hover:underline cursor-pointer" onClick={() => comingSoon("Password settings")} data-testid="link-set-password">
              Set Password
            </button>
          </SettingRow>
          <SettingRow label="2-Step Verification" testId="row-2fa">
            <button className="text-sm text-primary hover:underline cursor-pointer" onClick={() => comingSoon("2-Step Verification")} data-testid="link-2fa-setting">
              Setting
            </button>
          </SettingRow>
          <SettingRow label="Google" testId="row-google">
            {googleConnected ? (
              <span className="text-sm text-emerald-500 font-medium">Linked</span>
            ) : (
              <button className="text-sm text-primary hover:underline cursor-pointer" onClick={() => comingSoon("Google linking")} data-testid="link-google">
                Link
              </button>
            )}
          </SettingRow>
          <SettingRow label="Apple" testId="row-apple">
            <span className="text-sm text-muted-foreground">Linked</span>
          </SettingRow>
          <SettingRow label="Login Devices" testId="row-devices">
            <button className="text-sm text-primary hover:underline cursor-pointer" onClick={() => comingSoon("Login Devices")} data-testid="link-manage-devices">
              Manage
            </button>
          </SettingRow>
          <SettingRow label="API Token" testId="row-api-token">
            <button className="text-sm text-primary hover:underline cursor-pointer" onClick={() => comingSoon("API Token")} data-testid="link-manage-api">
              Manage
            </button>
          </SettingRow>
          <SettingRow label="Backup & Restore" testId="row-backup">
            <div className="flex items-center gap-3">
              <button className="text-sm text-primary hover:underline cursor-pointer" onClick={() => comingSoon("Generate Backup")} data-testid="link-generate-backup">
                Generate Backup
              </button>
              <button className="text-sm text-primary hover:underline cursor-pointer" onClick={() => comingSoon("Import Backups")} data-testid="link-import-backup">
                Import Backups
              </button>
            </div>
          </SettingRow>
          <SettingRow label="Manage Account" last testId="row-manage-account">
            <button className="text-sm text-red-500 hover:underline cursor-pointer" onClick={() => comingSoon("Delete Account confirmation")} data-testid="link-delete-account">
              Delete Account
            </button>
          </SettingRow>
        </SettingCard>
      </div>
    );
  };

  const renderPremiumTab = () => {
    if (isPro) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border">
            <Crown className="h-8 w-8 text-amber-400" weight="fill" />
            <div>
              <h2 className="text-sm font-semibold text-foreground" data-testid="text-premium-status">You are already a Premium user!</h2>
              <p className="text-sm text-muted-foreground">
                Status: {isActive ? "Active" : subscriptionStatus} {isPastDue && <span className="text-amber-400">— Payment past due</span>}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="text-sm text-primary hover:underline cursor-pointer" onClick={handleManageSubscription} data-testid="link-order-history">
              {isManaging ? "Redirecting..." : "Order History"}
            </button>
            <button className="text-sm text-primary hover:underline cursor-pointer" onClick={() => setTab("account")} data-testid="link-renew-premium">
              Renew
            </button>
          </div>

          {subscriptionError && (
            <div className="p-3 bg-red-500/10 text-red-400 rounded-xl text-sm border border-red-500/30" data-testid="subscription-error">
              {subscriptionError}
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Premium Features</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { title: "AI Meeting Extraction", desc: "Automatically extract action items, decisions, and follow-ups from meeting notes." },
                { title: "Unlimited Transcription", desc: "Convert audio recordings to text with no monthly limits." },
                { title: "Calendar Sync", desc: "Sync your meetings and tasks with Google Calendar and Outlook." },
                { title: "Email Integrations", desc: "Send follow-up emails directly from ActionMinutes via Gmail & Outlook." },
                { title: "Advanced Templates", desc: "Access premium meeting templates for various use cases." },
                { title: "Priority Support", desc: "Get faster responses and dedicated support channels." },
              ].map((f) => (
                <div key={f.title} className="p-3 bg-card rounded-xl border border-border" data-testid={`card-feature-${f.title.toLowerCase().replace(/\s/g, "-")}`}>
                  <p className="text-sm font-medium text-foreground">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {subscriptionError && (
          <div className="p-3 bg-red-500/10 text-red-400 rounded-xl text-sm border border-red-500/30" data-testid="subscription-error">
            {subscriptionError}
          </div>
        )}
        <div className="bg-card rounded-xl border border-border p-4 max-w-md">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-foreground">Pro</h2>
            <span className="bg-accent text-primary text-xs font-medium px-2 py-1 rounded-full">Recommended</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Unlock your full productivity</p>

          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setBillingInterval("monthly")}
              className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all", billingInterval === "monthly" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}
              data-testid="settings-billing-monthly"
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("yearly")}
              className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5", billingInterval === "yearly" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}
              data-testid="settings-billing-yearly"
            >
              Yearly
              <span className="bg-emerald-500/20 text-emerald-400 text-xs px-1.5 py-0.5 rounded-full">-20%</span>
            </button>
          </div>

          <div className="mb-4">
            <span className="text-3xl font-bold text-foreground">{currencySymbol}{currentPrice}</span>
            <span className="text-muted-foreground ml-1">/{billingInterval === "yearly" ? "year" : "month"}</span>
            {monthlyEquivalent && <p className="text-sm text-primary mt-1">{currencySymbol}{monthlyEquivalent}/month</p>}
          </div>

          <ul className="space-y-2 text-sm text-foreground mb-4">
            {["Unlimited transcription", "Unlimited AI extractions", "Gmail and Outlook Integration"].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" weight="duotone" />
                {f}
              </li>
            ))}
          </ul>

          <Button onClick={handleUpgrade} disabled={isUpgrading} className="w-full h-11 rounded-xl font-semibold" data-testid="button-upgrade-pro">
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
        </div>
      </div>
    );
  };

  const renderFeaturesTab = () => (
    <div className="space-y-3">
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground" data-testid="text-features-title">Hi, welcome to ActionMinutes! 👋</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          ActionMinutes transforms your messy meeting notes into actionable outputs.
          Simply capture your notes, and we'll extract clear action items with owners and due dates,
          key decisions, and ready-to-send follow-up emails — all in under 60 seconds.
        </p>
      </div>

      <SettingCard>
        <SettingRow label="Help Center" testId="row-help-center">
          <Link href="/support">
            <span className="text-sm text-primary hover:underline cursor-pointer">Open</span>
          </Link>
        </SettingRow>
        <SettingRow label="Feedback & Suggestions" last testId="row-feedback">
          <button className="text-sm text-primary hover:underline cursor-pointer" onClick={() => setFeedbackOpen(true)} data-testid="link-feedback">
            Send
          </button>
        </SettingRow>
      </SettingCard>

      <SettingCard>
        <SettingRow label="Help Center" testId="row-support-help">
          <Lifebuoy className="h-4 w-4 text-muted-foreground" />
        </SettingRow>
        <SettingRow label="Twitter" testId="row-twitter">
          <TwitterLogo className="h-4 w-4 text-muted-foreground" />
        </SettingRow>
        <SettingRow label="Support" last testId="row-support-link">
          <ChatCircle className="h-4 w-4 text-muted-foreground" />
        </SettingRow>
      </SettingCard>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">Get App</h3>
        <SettingCard>
          <SettingRow label="Android" testId="row-android">
            <AndroidLogo className="h-4 w-4 text-muted-foreground" />
          </SettingRow>
          <SettingRow label="iOS" testId="row-ios">
            <AppleLogo className="h-4 w-4 text-muted-foreground" />
          </SettingRow>
          <SettingRow label="Web" last testId="row-web">
            <DesktopTower className="h-4 w-4 text-muted-foreground" />
          </SettingRow>
        </SettingCard>
        <p className="text-xs text-muted-foreground">Available on Android, iOS, and Web — your data syncs across all platforms.</p>
      </div>

      <p className="text-xs text-muted-foreground text-center pt-4">
        ActionMinutes v1.0.1 by{" "}
        <a href="https://relay-labs.app" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          Relay Labs
        </a>
      </p>
    </div>
  );

  const renderSmartListTab = () => {
    const settings = smartListSettings;

    const updateSetting = (key: string, value: string) => {
      const next = { ...settings, [key]: value };
      setSmartListSettings(next);
      setLocalStorage("am.smartListSettings", next);
    };

    const SmartListSelect = ({ settingKey, label, last }: { settingKey: string; label: string; last?: boolean }) => (
      <SettingRow label={label} last={last} testId={`row-smartlist-${settingKey}`}>
        <Select value={(settings as any)[settingKey]} onValueChange={(v) => updateSetting(settingKey, v)}>
          <SelectTrigger className="w-[160px]" data-testid={`select-smartlist-${settingKey}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="show">Show</SelectItem>
            <SelectItem value="hide">Hide</SelectItem>
            <SelectItem value="showIfNotEmpty">Show if not empty</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
    );

    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground" data-testid="text-smartlist-title">Smart List</h2>

        <SettingCard>
          <SmartListSelect settingKey="all" label="All" />
          <SmartListSelect settingKey="today" label="Today" />
          <SmartListSelect settingKey="tomorrow" label="Tomorrow" />
          <SmartListSelect settingKey="next7Days" label="Next 7 Days" />
          <SmartListSelect settingKey="assignedToMe" label="Assigned to Me" />
          <SmartListSelect settingKey="inbox" label="Inbox" />
          <SmartListSelect settingKey="summary" label="Summary" last />
        </SettingCard>

        <SettingCard>
          <SmartListSelect settingKey="tags" label="Tags" />
          <SmartListSelect settingKey="filters" label="Filters" last />
        </SettingCard>

        <SettingCard>
          <SmartListSelect settingKey="completed" label="Completed" />
          <SmartListSelect settingKey="wontDo" label="Won't Do" />
          <SmartListSelect settingKey="trash" label="Trash" last />
        </SettingCard>
      </div>
    );
  };

  const renderNotificationsTab = () => {
    const settings = notificationSettings;

    const updateSetting = (key: string, value: any) => {
      const next = { ...settings, [key]: value };
      setNotificationSettings(next);
      setLocalStorage("am.notificationSettings", next);
    };

    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground" data-testid="text-notifications-title">Notifications</h2>

        <SettingCard>
          <SettingRow label="Daily Notifications" description="ActionMinutes can remind you of today's tasks at a specific time every day." testId="row-daily-notifications">
            <Switch checked={settings.dailyNotifications} onCheckedChange={(v) => updateSetting("dailyNotifications", v)} data-testid="switch-daily-notifications" />
          </SettingRow>
          <SettingRow label="Daily Alert Time" testId="row-daily-alert-time">
            <Input
              type="time"
              value={settings.dailyAlertTime}
              onChange={(e) => updateSetting("dailyAlertTime", e.target.value)}
              className="w-[120px]"
              data-testid="input-daily-alert-time"
            />
          </SettingRow>
          <SettingRow label="Web Reminder" testId="row-web-reminder">
            <Switch checked={settings.webReminder} onCheckedChange={(v) => updateSetting("webReminder", v)} data-testid="switch-web-reminder" />
          </SettingRow>
          <SettingRow label="Email Notifications" description={`Receive email notifications at ${user.email}`} last testId="row-email-notifications">
            <Switch checked={settings.emailNotifications} onCheckedChange={(v) => updateSetting("emailNotifications", v)} data-testid="switch-email-notifications" />
          </SettingRow>
        </SettingCard>
      </div>
    );
  };

  const renderDateTimeTab = () => {
    const settings = dateTimeSettings;

    const updateSetting = (key: string, value: any) => {
      const next = { ...settings, [key]: value };
      setDateTimeSettings(next);
      setLocalStorage("am.dateTimeSettings", next);
    };

    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground" data-testid="text-datetime-title">Date & Time</h2>

        <SettingCard>
          <SettingRow label="Time Format" testId="row-time-format">
            <Select value={settings.timeFormat} onValueChange={(v) => updateSetting("timeFormat", v)}>
              <SelectTrigger className="w-[140px]" data-testid="select-time-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12 Hour</SelectItem>
                <SelectItem value="24">24 Hour</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow label="Start Week on" testId="row-start-week">
            <Select value={settings.startWeekOn} onValueChange={(v) => updateSetting("startWeekOn", v)}>
              <SelectTrigger className="w-[140px]" data-testid="select-start-week">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sunday">Sunday</SelectItem>
                <SelectItem value="monday">Monday</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow label="Additional Calendar" testId="row-additional-calendar">
            <Select value={settings.additionalCalendar} onValueChange={(v) => updateSetting("additionalCalendar", v)}>
              <SelectTrigger className="w-[140px]" data-testid="select-additional-calendar">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="lunar">Lunar</SelectItem>
                <SelectItem value="hijri">Hijri</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow label="Show Week Numbers" testId="row-week-numbers">
            <Switch checked={settings.showWeekNumbers} onCheckedChange={(v) => updateSetting("showWeekNumbers", v)} data-testid="switch-week-numbers" />
          </SettingRow>
          <SettingRow label="Time Zone" description="Automatically adjust for your local time zone" last testId="row-timezone">
            <Switch checked={settings.timeZone} onCheckedChange={(v) => updateSetting("timeZone", v)} data-testid="switch-timezone" />
          </SettingRow>
        </SettingCard>
      </div>
    );
  };

  const renderAppearanceTab = () => {
    const updateDisplay = (key: string, value: string) => {
      const next = { ...displaySettings, [key]: value };
      setDisplaySettings(next);
      setLocalStorage("am.displaySettings", next);
    };

    return (
      <div className="space-y-3">
        <SettingCard>
          <SettingRow label="Interface Style" testId="row-interface-style">
            <Select value={displaySettings.interfaceStyle} onValueChange={(v) => updateDisplay("interfaceStyle", v)}>
              <SelectTrigger className="w-[140px]" data-testid="select-interface-style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="list">List</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow label="Font Size" last testId="row-font-size">
            <Select value={displaySettings.fontSize} onValueChange={(v) => updateDisplay("fontSize", v)}>
              <SelectTrigger className="w-[140px]" data-testid="select-font-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </SettingCard>
      </div>
    );
  };

  const renderMoreTab = () => {
    const settings = moreSettings;

    const updateSetting = (key: string, value: any) => {
      const next = { ...settings, [key]: value };
      setMoreSettings(next);
      setLocalStorage("am.moreSettings", next);
    };

    const resetDefaults = () => {
      const defaults = {
        ...settings,
        defaultDate: "none",
        defaultDateMode: "date",
        defaultDuration: "none",
        defaultRemindersDueTime: "none",
        defaultRemindersAllDay: "none",
        defaultPriority: "none",
        defaultTag: "none",
        defaultList: "inbox",
        defaultAddTo: "bottom",
        overdueSection: "top",
      };
      setMoreSettings(defaults);
      setLocalStorage("am.moreSettings", defaults);
      toast({ title: "Defaults Reset", description: "Task defaults have been reset." });
    };

    return (
      <div className="space-y-3">
        <SettingCard>
          <SettingRow label="Language" last testId="row-language">
            <Select value={settings.language} onValueChange={(v) => updateSetting("language", v)}>
              <SelectTrigger className="w-[140px]" data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </SettingCard>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Smart Recognition</h3>
          <SettingCard>
            <SettingRow label="Date Recognition" testId="row-date-recognition">
              <Switch checked={settings.dateRecognition} onCheckedChange={(v) => updateSetting("dateRecognition", v)} data-testid="switch-date-recognition" />
            </SettingRow>
            <div className="px-4 py-2 border-b border-border">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <Checkbox checked={settings.removeDateText} onCheckedChange={(v) => updateSetting("removeDateText", v)} data-testid="checkbox-remove-date-text" />
                Remove text in tasks
              </label>
            </div>
            <SettingRow label="Tag Recognition" testId="row-tag-recognition">
              <Switch checked={settings.tagRecognition} onCheckedChange={(v) => updateSetting("tagRecognition", v)} data-testid="switch-tag-recognition" />
            </SettingRow>
            <div className="px-4 py-2 border-b border-border">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <Checkbox checked={settings.removeTagText} onCheckedChange={(v) => updateSetting("removeTagText", v)} data-testid="checkbox-remove-tag-text" />
                Remove tags from task name
              </label>
            </div>
            <SettingRow label="URL Parsing" last testId="row-url-parsing">
              <Switch checked={settings.urlParsing} onCheckedChange={(v) => updateSetting("urlParsing", v)} data-testid="switch-url-parsing" />
            </SettingRow>
          </SettingCard>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Task Default</h3>
            <button className="text-xs text-primary hover:underline cursor-pointer" onClick={resetDefaults} data-testid="link-reset-defaults">
              Reset Default
            </button>
          </div>
          <SettingCard>
            <SettingRow label="Default Date" testId="row-default-date">
              <Select value={settings.defaultDate} onValueChange={(v) => updateSetting("defaultDate", v)}>
                <SelectTrigger className="w-[140px]" data-testid="select-default-date"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="tomorrow">Tomorrow</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow label="Default Date Mode" testId="row-default-date-mode">
              <Select value={settings.defaultDateMode} onValueChange={(v) => updateSetting("defaultDateMode", v)}>
                <SelectTrigger className="w-[140px]" data-testid="select-default-date-mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="dateTime">Date & Time</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow label="Default Duration" testId="row-default-duration">
              <Select value={settings.defaultDuration} onValueChange={(v) => updateSetting("defaultDuration", v)}>
                <SelectTrigger className="w-[140px]" data-testid="select-default-duration"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow label="Default Reminders (Due time task)" testId="row-default-reminders-due">
              <Select value={settings.defaultRemindersDueTime} onValueChange={(v) => updateSetting("defaultRemindersDueTime", v)}>
                <SelectTrigger className="w-[140px]" data-testid="select-default-reminders-due"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="atTime">At time</SelectItem>
                  <SelectItem value="5min">5 min before</SelectItem>
                  <SelectItem value="15min">15 min before</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow label="Default Reminders (All day task)" testId="row-default-reminders-allday">
              <Select value={settings.defaultRemindersAllDay} onValueChange={(v) => updateSetting("defaultRemindersAllDay", v)}>
                <SelectTrigger className="w-[140px]" data-testid="select-default-reminders-allday"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="9am">9:00 AM</SelectItem>
                  <SelectItem value="dayBefore">Day before</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow label="Default Priority" testId="row-default-priority">
              <Select value={settings.defaultPriority} onValueChange={(v) => updateSetting("defaultPriority", v)}>
                <SelectTrigger className="w-[140px]" data-testid="select-default-priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow label="Default Tag" testId="row-default-tag">
              <Select value={settings.defaultTag} onValueChange={(v) => updateSetting("defaultTag", v)}>
                <SelectTrigger className="w-[140px]" data-testid="select-default-tag"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow label="Default List" testId="row-default-list">
              <Select value={settings.defaultList} onValueChange={(v) => updateSetting("defaultList", v)}>
                <SelectTrigger className="w-[140px]" data-testid="select-default-list"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbox">Inbox</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow label="Default Add to" testId="row-default-add-to">
              <Select value={settings.defaultAddTo} onValueChange={(v) => updateSetting("defaultAddTo", v)}>
                <SelectTrigger className="w-[140px]" data-testid="select-default-add-to"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Top of List</SelectItem>
                  <SelectItem value="bottom">Bottom of List</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow label="Overdue Section shows at" last testId="row-overdue-section">
              <Select value={settings.overdueSection} onValueChange={(v) => updateSetting("overdueSection", v)}>
                <SelectTrigger className="w-[140px]" data-testid="select-overdue-section"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="bottom">Bottom</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
          </SettingCard>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Mini Calendar</h3>
          <SettingCard>
            <SettingRow label="Show Mini Calendar in Sidebar" last testId="row-mini-calendar">
              <Switch checked={settings.showMiniCalendar} onCheckedChange={(v) => updateSetting("showMiniCalendar", v)} data-testid="switch-mini-calendar" />
            </SettingRow>
          </SettingCard>
        </div>
      </div>
    );
  };

  const renderIntegrationsTab = () => {
    const integrations = integrationsData;
    const config = appConfig;

    const handleConnect = async (provider: "google" | "microsoft") => {
      try {
        const endpoint = provider === "google" ? `/api/oauth/google/start?userId=${user.id}` : `/api/oauth/microsoft/start?userId=${user.id}`;
        const response = await fetch(endpoint);
        const data = await response.json();
        if (data.authUrl) window.location.href = data.authUrl;
        else if (data.error) toast({ title: "Error", description: data.error, variant: "destructive" });
      } catch {
        toast({ title: "Error", description: "Failed to start connection process.", variant: "destructive" });
      }
    };

    const handleDisconnect = async (provider: string) => {
      await disconnectIntegration.mutateAsync(provider);
      toast({ title: "Disconnected", description: `${provider === "google" ? "Gmail" : "Outlook"} has been disconnected.` });
    };

    const googleConnected = integrations?.google?.connected;
    const microsoftConnected = integrations?.microsoft?.connected;
    const googleConfigured = integrations?.google?.configured;
    const microsoftConfigured = integrations?.microsoft?.configured;

    const IntegrationCard = ({ name, desc, onAction, actionLabel }: { name: string; desc: string; onAction: () => void; actionLabel: string }) => (
      <div className="flex items-center justify-between p-2.5 border-b border-border last:border-b-0">
        <div>
          <p className="text-sm font-medium text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
        <button className="text-sm text-primary hover:underline cursor-pointer" onClick={onAction} data-testid={`link-integration-${name.toLowerCase().replace(/\s/g, "-")}`}>
          {actionLabel}
        </button>
      </div>
    );

    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Calendar</h3>
          <SettingCard>
            <IntegrationCard name="Google Calendar" desc="Sync events with Google Calendar" onAction={() => comingSoon("Google Calendar sync")} actionLabel="Connect" />
            <IntegrationCard name="Outlook Calendar" desc="Sync events with Outlook Calendar" onAction={() => comingSoon("Outlook Calendar sync")} actionLabel="Connect" />
          </SettingCard>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Integrate</h3>
          <SettingCard>
            <IntegrationCard name="Google Calendar" desc="Two-way calendar sync" onAction={() => comingSoon("Google Calendar integration")} actionLabel="Setup" />
            <IntegrationCard name="Notion" desc="Sync tasks with Notion databases" onAction={() => comingSoon("Notion integration")} actionLabel="Setup" />
            <IntegrationCard name="Zapier" desc="Connect with 5000+ apps via Zapier" onAction={() => comingSoon("Zapier integration")} actionLabel="Setup" />
            <IntegrationCard name="IFTTT" desc="Automate workflows with IFTTT" onAction={() => comingSoon("IFTTT integration")} actionLabel="Setup" />
          </SettingCard>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Import</h3>
          <SettingCard>
            {["Todoist", "Microsoft Todo", "Things", "OmniFocus", "Toodledo", "iCal"].map((name, i, arr) => (
              <IntegrationCard key={name} name={name} desc={`Import tasks from ${name}`} onAction={() => comingSoon(`${name} import`)} actionLabel="Import" />
            ))}
          </SettingCard>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Email</h3>
          {config && !config.features.integrationsEnabled ? (
            <div className="p-4 bg-amber-500/10 text-amber-400 rounded-xl text-sm border border-amber-500/30">
              Email integrations are currently disabled.
            </div>
          ) : isFree && !canUseEmailIntegrations ? (
            <div className="p-3 bg-card rounded-xl border border-border">
              <p className="text-sm text-muted-foreground mb-3">Email integrations require a Pro plan.</p>
              <Button size="sm" onClick={() => setTab("premium")} data-testid="button-upgrade-for-email">
                <Crown className="h-4 w-4 mr-1" weight="fill" /> Upgrade
              </Button>
            </div>
          ) : (
            <SettingCard>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-red-500/20 rounded-lg">
                    <EnvelopeSimple className="h-4 w-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Gmail</p>
                    <p className="text-xs text-muted-foreground">Send follow-ups from Gmail</p>
                  </div>
                </div>
                {googleConnected ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Connected</Badge>
                    <Button variant="ghost" size="sm" onClick={() => handleDisconnect("google")} className="text-red-400 text-xs" disabled={disconnectIntegration.isPending} data-testid="button-disconnect-gmail">
                      Disconnect
                    </Button>
                  </div>
                ) : googleConfigured ? (
                  <Button variant="outline" size="sm" onClick={() => handleConnect("google")} data-testid="button-connect-gmail">
                    Connect
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Not configured</span>
                )}
              </div>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-amber-500/20 rounded-lg">
                    <EnvelopeSimple className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Spark</p>
                    <p className="text-xs text-muted-foreground">Email integration with Spark</p>
                  </div>
                </div>
                <button className="text-sm text-primary hover:underline cursor-pointer" onClick={() => comingSoon("Spark integration")} data-testid="link-spark">
                  Connect
                </button>
              </div>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-blue-500/20 rounded-lg">
                    <EnvelopeSimple className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Outlook Email</p>
                    <p className="text-xs text-muted-foreground">Send follow-ups from Outlook</p>
                  </div>
                </div>
                {microsoftConnected ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Connected</Badge>
                    <Button variant="ghost" size="sm" onClick={() => handleDisconnect("microsoft")} className="text-red-400 text-xs" disabled={disconnectIntegration.isPending} data-testid="button-disconnect-outlook">
                      Disconnect
                    </Button>
                  </div>
                ) : microsoftConfigured ? (
                  <Button variant="outline" size="sm" onClick={() => handleConnect("microsoft")} data-testid="button-connect-outlook">
                    Connect
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Not configured</span>
                )}
              </div>
            </SettingCard>
          )}
        </div>
      </div>
    );
  };

  const renderCollaborateTab = () => {
    const settings = collaborateSettings;

    const updateSetting = (key: string, value: any) => {
      const next = { ...settings, [key]: value };
      setCollaborateSettings(next);
      setLocalStorage("am.collaborateSettings", next);
    };

    return (
      <div className="space-y-3">
        <SettingCard>
          <SettingRow label="Auto Accept Invites" description="Automatically accept invitations to shared lists" last testId="row-auto-accept">
            <Switch checked={settings.autoAcceptInvites} onCheckedChange={(v) => updateSetting("autoAcceptInvites", v)} data-testid="switch-auto-accept" />
          </SettingRow>
        </SettingCard>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Default Notifications for Shared Lists</h3>
          <SettingCard>
            <div className="p-4 space-y-3">
              <label className="flex items-center gap-3 text-sm text-foreground cursor-pointer">
                <Checkbox checked={settings.notifyComplete} onCheckedChange={(v) => updateSetting("notifyComplete", v)} data-testid="checkbox-notify-complete" />
                Complete/Undo a task
              </label>
              <label className="flex items-center gap-3 text-sm text-foreground cursor-pointer">
                <Checkbox checked={settings.notifyAdd} onCheckedChange={(v) => updateSetting("notifyAdd", v)} data-testid="checkbox-notify-add" />
                Add a task/note
              </label>
              <label className="flex items-center gap-3 text-sm text-foreground cursor-pointer">
                <Checkbox checked={settings.notifyDelete} onCheckedChange={(v) => updateSetting("notifyDelete", v)} data-testid="checkbox-notify-delete" />
                Delete/Move a task/note
              </label>
            </div>
          </SettingCard>
        </div>
      </div>
    );
  };

  const renderShortcutsTab = () => {
    const shortcuts = [
      {
        group: "General",
        items: [
          { keys: ["Ctrl", "F"], action: "Search" },
          { keys: ["Ctrl", "N"], action: "New task" },
          { keys: ["Ctrl", ","], action: "Settings" },
        ],
      },
      {
        group: "Navigation",
        items: [
          { keys: ["G", "then", "I"], action: "Inbox" },
          { keys: ["G", "then", "C"], action: "Calendar" },
          { keys: ["G", "then", "J"], action: "Journal" },
          { keys: ["G", "then", "N"], action: "Notes" },
        ],
      },
      {
        group: "Task",
        items: [
          { keys: ["Enter"], action: "Open" },
          { keys: ["Delete"], action: "Delete" },
          { keys: ["E"], action: "Edit" },
        ],
      },
    ];

    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground" data-testid="text-shortcuts-title">Keyboard Shortcuts</h2>

        {shortcuts.map((group) => (
          <div key={group.group} className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">{group.group}</h3>
            <SettingCard>
              {group.items.map((item, i) => (
                <div
                  key={item.action}
                  className={cn("flex items-center justify-between py-3 px-4", i < group.items.length - 1 && "border-b border-border")}
                  data-testid={`shortcut-${item.action.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <span className="text-sm text-foreground">{item.action}</span>
                  <div className="flex items-center gap-1">
                    {item.keys.map((key, ki) =>
                      key === "then" ? (
                        <span key={ki} className="text-xs text-muted-foreground mx-1">then</span>
                      ) : (
                        <kbd key={ki} className="px-2 py-1 text-xs font-mono bg-muted border border-border rounded text-muted-foreground">
                          {key}
                        </kbd>
                      )
                    )}
                  </div>
                </div>
              ))}
            </SettingCard>
          </div>
        ))}
      </div>
    );
  };

  const renderAboutTab = () => (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground" data-testid="text-about-title">About ActionMinutes</h2>

      <div className="p-3 bg-card rounded-xl border border-border">
        <p className="text-sm text-foreground leading-relaxed">
          ActionMinutes transforms your messy meeting notes into actionable outputs.
          Simply capture your notes, and we'll extract clear action items with owners and due dates,
          key decisions, and ready-to-send follow-up emails — all in under 60 seconds.
        </p>
        <p className="text-xs text-muted-foreground mt-3">Minutes → Actions → Follow-ups</p>
      </div>

      <div className="text-sm text-muted-foreground" data-testid="text-version">
        Version: v1.0.1
      </div>

      <SettingCard>
        <SettingRow label="Privacy Policy" testId="row-privacy-policy">
          <Link href="/privacy-policy">
            <span className="text-sm text-primary hover:underline cursor-pointer" data-testid="link-privacy-policy">View</span>
          </Link>
        </SettingRow>
        <SettingRow label="Terms of Service" last testId="row-terms">
          <Link href="/terms">
            <span className="text-sm text-primary hover:underline cursor-pointer" data-testid="link-terms">View</span>
          </Link>
        </SettingRow>
      </SettingCard>

      <Button variant="outline" onClick={() => setFeedbackOpen(true)} className="w-full rounded-xl" data-testid="button-send-feedback">
        <ChatCircle className="h-4 w-4 mr-2" weight="regular" />
        Send Feedback
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        by{" "}
        <a href="https://relay-labs.app" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          Relay Labs
        </a>
      </p>
    </div>
  );

  const renderTab = () => {
    switch (activeTab) {
      case "account": return renderAccountTab();
      case "premium": return renderPremiumTab();
      case "features": return renderFeaturesTab();
      case "smartlist": return renderSmartListTab();
      case "notifications": return renderNotificationsTab();
      case "datetime": return renderDateTimeTab();
      case "appearance": return renderAppearanceTab();
      case "more": return renderMoreTab();
      case "integrations": return renderIntegrationsTab();
      case "collaborate": return renderCollaborateTab();
      case "shortcuts": return renderShortcutsTab();
      case "about": return renderAboutTab();
      default: return renderAccountTab();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl w-[90vw] h-[80vh] p-0 gap-0 overflow-hidden flex flex-row bg-white" data-testid="settings-modal">
          <DialogTitle className="sr-only">Settings</DialogTitle>
          <aside className="w-[200px] bg-[#FAFAF8] border-r border-[#E5E5E0] overflow-y-auto shrink-0 py-2" data-testid="settings-sidebar">
            <div className="flex items-center gap-2.5 px-4 py-2 mb-1">
              <img src={logoIcon} alt="ActionMinutes" className="w-6 h-6 rounded-lg" />
              <span className="text-xs font-semibold text-[#1A1A1A]">Settings</span>
            </div>
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActiveItem = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-4 py-1.5 text-xs transition-colors",
                    isActiveItem ? "bg-amber-50 text-amber-700 font-medium" : "text-[#6B7280] hover:bg-[#F5F5F0]"
                  )}
                  data-testid={`sidebar-${item.id}`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" weight={isActiveItem ? "fill" : "regular"} />
                  {item.label}
                </button>
              );
            })}
          </aside>

          <main className="flex-1 p-4 overflow-y-auto" data-testid="settings-content">
            <div className="max-w-2xl">
              {renderTab()}
            </div>
          </main>
        </DialogContent>
      </Dialog>

      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}
