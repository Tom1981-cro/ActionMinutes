import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { useIntegrations, useDisconnectIntegration } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";

export default function SettingsIntegrationsPage() {
  const { data: integrations, isLoading } = useIntegrations();
  const disconnectIntegration = useDisconnectIntegration();
  const { toast } = useToast();

  const handleConnect = async (provider: 'google' | 'microsoft') => {
    toast({ title: "OAuth Integration", description: "OAuth setup requires environment variables. See Settings > Help for details." });
  };

  const handleDisconnect = async (provider: string) => {
    await disconnectIntegration.mutateAsync(provider);
    toast({ title: "Disconnected", description: `${provider === 'google' ? 'Gmail' : 'Outlook'} has been disconnected.` });
  };

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
        <h2 className="text-xl font-semibold text-slate-800">Email Integrations</h2>
        <p className="text-muted-foreground">Connect your email to create drafts directly from ActionMinutes.</p>
      </div>

      <div className="grid gap-4">
        <Card className="bg-card border-border rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-xl">
                <Mail className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-800">Gmail</CardTitle>
                <CardDescription className="text-muted-foreground">Create drafts in your Gmail inbox</CardDescription>
              </div>
            </div>
            {integrations?.google?.connected ? (
              <Badge variant="outline" className="rounded-full bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="rounded-full bg-muted text-muted-foreground border-border">
                <XCircle className="h-3 w-3 mr-1" />
                Not connected
              </Badge>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            {integrations?.google?.connected ? (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Connected as <span className="font-medium">{integrations.google.connected.accountEmail}</span>
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDisconnect('google')}
                  className="rounded-full border-border"
                  data-testid="button-disconnect-gmail"
                >
                  Disconnect
                </Button>
              </div>
            ) : integrations?.google?.configured ? (
              <Button 
                onClick={() => handleConnect('google')}
                className="rounded-full bg-primary hover:bg-primary/90"
                data-testid="button-connect-gmail"
              >
                Connect Gmail
              </Button>
            ) : (
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-2xl">
                Gmail integration requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-xl">
                <Mail className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-800">Outlook</CardTitle>
                <CardDescription className="text-muted-foreground">Create drafts in your Outlook inbox</CardDescription>
              </div>
            </div>
            {integrations?.microsoft?.connected ? (
              <Badge variant="outline" className="rounded-full bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="rounded-full bg-muted text-muted-foreground border-border">
                <XCircle className="h-3 w-3 mr-1" />
                Not connected
              </Badge>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            {integrations?.microsoft?.connected ? (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Connected as <span className="font-medium">{integrations.microsoft.connected.accountEmail}</span>
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDisconnect('microsoft')}
                  className="rounded-full border-border"
                  data-testid="button-disconnect-outlook"
                >
                  Disconnect
                </Button>
              </div>
            ) : integrations?.microsoft?.configured ? (
              <Button 
                onClick={() => handleConnect('microsoft')}
                className="rounded-full bg-primary hover:bg-primary/90"
                data-testid="button-connect-outlook"
              >
                Connect Outlook
              </Button>
            ) : (
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-2xl">
                Outlook integration requires MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET environment variables.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted border-border rounded-3xl">
        <CardContent className="py-4">
          <h3 className="font-medium text-slate-800 mb-2">Environment Variables Required</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li><code className="bg-card px-1 rounded">GOOGLE_CLIENT_ID</code> / <code className="bg-card px-1 rounded">GOOGLE_CLIENT_SECRET</code></li>
            <li><code className="bg-card px-1 rounded">MICROSOFT_CLIENT_ID</code> / <code className="bg-card px-1 rounded">MICROSOFT_CLIENT_SECRET</code></li>
            <li><code className="bg-card px-1 rounded">TOKEN_ENCRYPTION_KEY</code> (for secure token storage)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
