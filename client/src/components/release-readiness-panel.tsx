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
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-xl",
          configured ? "bg-indigo-50 text-indigo-600" : "bg-gray-100 text-gray-400"
        )}>
          {icon}
        </div>
        <span className="text-slate-700">{label}</span>
      </div>
      {configured ? (
        <div className="flex items-center gap-1.5 text-indigo-600">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">Ready</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-gray-400">
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
      <Card className="bg-white border-gray-200 rounded-xl">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (error || !config) {
    return (
      <Card className="bg-white border-gray-200 rounded-xl">
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
    <Card className="bg-white border-gray-200 rounded-xl">
      <CardHeader className="px-4 pt-4 pb-3 md:px-6 md:pt-5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-slate-800">Release Readiness</CardTitle>
            <CardDescription className="text-gray-500 text-base">
              Configuration status for production deployment
            </CardDescription>
          </div>
          <div className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium",
            readyCount === totalCount 
              ? "bg-indigo-100 text-indigo-700" 
              : readyCount > 2 
                ? "bg-amber-100 text-amber-700"
                : "bg-gray-100 text-gray-600"
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

        <div className="mt-5 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Feature Flags</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(features).map(([key, enabled]) => (
              <div 
                key={key}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium",
                  enabled 
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200" 
                    : "bg-gray-100 text-gray-500 border border-gray-200"
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
