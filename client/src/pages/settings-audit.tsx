import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Sparkles, CheckCircle, XCircle, ChevronRight, AlertTriangle } from "lucide-react";
import { useAiAuditLogs, useAppConfig } from "@/lib/hooks";
import { format } from "date-fns";
import { useState } from "react";

export default function SettingsAuditPage() {
  const { data: logs = [], isLoading } = useAiAuditLogs();
  const { data: config } = useAppConfig();
  const [selectedLog, setSelectedLog] = useState<any>(null);

  if (config && !config.features.aiEnabled) {
    return (
      <Card className="bg-violet-50 border-violet-200 rounded-xl">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-10 w-10 text-violet-500 mx-auto mb-4" />
          <h3 className="font-semibold text-violet-800 mb-2">AI Features Disabled</h3>
          <p className="text-violet-700 text-sm">
            AI audit logging is unavailable because AI features are disabled. Set AI_FEATURE_ENABLED=true to enable.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-foreground">AI Audit Log</h2>
        <p className="text-muted-foreground">Track AI model runs, prompts, and outputs.</p>
      </div>

      {logs.length === 0 ? (
        <Card className="bg-muted border-dashed border-border rounded-xl">
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No AI runs recorded yet. Extract a meeting to see audit logs.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log: any) => (
            <Dialog key={log.id}>
              <DialogTrigger asChild>
                <Card 
                  className="bg-card border-border rounded-xl cursor-pointer hover:border-primary transition-colors" 
                  data-testid={`audit-log-${log.id}`}
                  onClick={() => setSelectedLog(log)}
                >
                  <CardContent className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-xl ${log.validJson ? 'bg-green-50' : 'bg-red-50'}`}>
                        {log.validJson ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{log.provider}</p>
                          <Badge variant="outline" className="rounded-full text-xs bg-muted text-muted-foreground border-border">
                            {log.model}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(log.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          {log.promptVersion && ` • v${log.promptVersion}`}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl rounded-xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-foreground">AI Run Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Provider</p>
                      <p className="font-medium text-foreground">{log.provider}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Model</p>
                      <p className="font-medium text-foreground">{log.model}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Prompt Version</p>
                      <p className="font-medium text-foreground">{log.promptVersion || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
                      <Badge variant={log.validJson ? "default" : "destructive"} className="rounded-full">
                        {log.validJson ? "Valid" : "Error"}
                      </Badge>
                    </div>
                  </div>
                  
                  {log.inputHash && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Input Hash</p>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{log.inputHash}</code>
                    </div>
                  )}

                  {log.errorText && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Error</p>
                      <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{log.errorText}</p>
                    </div>
                  )}

                  {log.outputJson && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Output</p>
                      <pre className="text-xs bg-muted p-3 rounded-xl overflow-x-auto max-h-60">
                        {JSON.stringify(log.outputJson, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      )}
    </div>
  );
}
