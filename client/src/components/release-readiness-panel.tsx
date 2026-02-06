import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useAppConfig } from "@/lib/hooks";
import { CheckCircle2, XCircle, Loader2, Sparkles, Mail, Database, Smartphone, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusItemProps = {
  label: string;
  configured: boolean;
  icon: React.ReactNode;
};

function StatusItem({ label, configured, icon }: StatusItemProps) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-xl",
          configured ? "bg-indigo-50 text-indigo-600" : "bg-muted text-muted-foreground"
        )}>
          {icon}
        </div>
        <span className="text-foreground">{label}</span>
      </div>
      {configured ? (
        <div className="flex items-center gap-1.5 text-indigo-600">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">Ready</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <XCircle className="h-4 w-4" />
          <span className="text-sm">Not configured</span>
        </div>
      )}
    </div>
  );
}

export function ReleaseReadinessPanel() {
  const { data: config, isLoading, error } = useAppConfig();

  if (isLoading) {
    return (
      <Card className="bg-card border-border rounded-xl">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !config) {
    return (
      <Card className="bg-card border-border rounded-xl">
        <CardContent className="py-6">
          <div className="flex items-center gap-3 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Unable to check configuration status</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { status, features } = config;
  const readyCount = Object.values(status).filter(Boolean).length;
  const totalCount = Object.keys(status).length;

  return (
    <Card className="bg-card border-border rounded-xl">
      <CardHeader className="px-4 pt-4 pb-3 md:px-6 md:pt-5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-foreground">Release Readiness</CardTitle>
            <CardDescription className="text-muted-foreground text-base">
              Configuration status for production deployment
            </CardDescription>
          </div>
          <div className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium",
            readyCount === totalCount 
              ? "bg-indigo-100 text-indigo-700" 
              : readyCount > 2 
                ? "bg-amber-100 text-amber-700"
                : "bg-muted text-foreground"
          )}>
            {readyCount}/{totalCount} ready
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 md:px-6 md:pb-5">
        <div className="space-y-1">
          <StatusItem 
            label="AI configured" 
            configured={status.aiConfigured} 
            icon={<Sparkles className="h-4 w-4" />}
          />
          <StatusItem 
            label="Gmail configured" 
            configured={status.gmailConfigured} 
            icon={<Mail className="h-4 w-4" />}
          />
          <StatusItem 
            label="Outlook configured" 
            configured={status.outlookConfigured} 
            icon={<Mail className="h-4 w-4" />}
          />
          <StatusItem 
            label="Database connected" 
            configured={status.databaseConnected} 
            icon={<Database className="h-4 w-4" />}
          />
          <StatusItem 
            label="Mobile build enabled" 
            configured={status.mobileBuildEnabled} 
            icon={<Smartphone className="h-4 w-4" />}
          />
        </div>

        <div className="mt-5 pt-4 border-t border-border">
          <h4 className="text-sm font-medium text-foreground mb-3">Feature Flags</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(features).map(([key, enabled]) => (
              <div 
                key={key}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium",
                  enabled 
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200" 
                    : "bg-muted text-muted-foreground border border-border"
                )}
              >
                {key.replace(/Enabled$/, '').replace(/([A-Z])/g, ' $1').trim()}
                {enabled ? ' ON' : ' OFF'}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
