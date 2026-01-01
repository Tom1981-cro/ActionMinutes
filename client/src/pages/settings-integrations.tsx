import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, ExternalLink, CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";
import { useIntegrations, useDisconnectIntegration, useAppConfig } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useLocation } from "wouter";
import { format } from "date-fns";

export default function SettingsIntegrationsPage() {
  const { data: integrations, isLoading, refetch } = useIntegrations();
  const { data: config } = useAppConfig();
  const disconnectIntegration = useDisconnectIntegration();
  const { user } = useStore();
  const { toast } = useToast();
  const [location] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');
    
    if (success === 'google') {
      toast({ title: "Gmail Connected", description: "You can now create drafts directly in Gmail." });
      refetch();
      window.history.replaceState({}, '', '/settings?tab=integrations');
    } else if (success === 'microsoft') {
      toast({ title: "Outlook Connected", description: "You can now create drafts directly in Outlook." });
      refetch();
      window.history.replaceState({}, '', '/settings?tab=integrations');
    } else if (error) {
      toast({ title: "Connection Failed", description: "Could not connect to your email account. Please try again.", variant: "destructive" });
      window.history.replaceState({}, '', '/settings?tab=integrations');
    }
  }, [location]);

  if (config && !config.features.integrationsEnabled) {
    return (
      <Card className="bg-amber-50 border-amber-200 rounded-xl">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
          <h3 className="font-semibold text-amber-800 mb-2">Integrations Disabled</h3>
          <p className="text-amber-700 text-sm">
            Email integrations are currently disabled. Set INTEGRATIONS_FEATURE_ENABLED=true to enable this feature.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleConnect = async (provider: 'google' | 'microsoft') => {
    try {
      const endpoint = provider === 'google' 
        ? `/api/oauth/google/start?userId=${user.id}`
        : `/api/oauth/microsoft/start?userId=${user.id}`;
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to start connection process.", variant: "destructive" });
    }
  };

  const handleDisconnect = async (provider: string) => {
    await disconnectIntegration.mutateAsync(provider);
    toast({ title: "Disconnected", description: `${provider === 'google' ? 'Gmail' : 'Outlook'} has been disconnected.` });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-800">Email Integrations</h2>
        <p className="text-gray-500">Connect your email to create drafts directly from ActionMinutes.</p>
      </div>

      <div className="grid gap-4">
        <Card className="bg-white border-gray-200 rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-xl">
                <Mail className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-800">Gmail</CardTitle>
                <CardDescription className="text-gray-500">Create drafts in your Gmail inbox</CardDescription>
              </div>
            </div>
            {integrations?.google?.connected ? (
              <Badge variant="outline" className="rounded-full bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="rounded-full bg-gray-50 text-gray-500 border-gray-200">
                <XCircle className="h-3 w-3 mr-1" />
                Not connected
              </Badge>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            {integrations?.google?.connected ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      Connected as <span className="font-medium">{integrations.google.connected.accountEmail}</span>
                    </p>
                    {integrations.google.connected.lastUsedAt && (
                      <p className="text-xs text-gray-400 flex items-center mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        Last used {format(new Date(integrations.google.connected.lastUsedAt), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDisconnect('google')}
                    className="rounded-full border-gray-300"
                    data-testid="button-disconnect-gmail"
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : integrations?.google?.configured ? (
              <Button 
                onClick={() => handleConnect('google')}
                className="rounded-full btn-gradient text-white font-semibold"
                data-testid="button-connect-gmail"
              >
                Connect Gmail
              </Button>
            ) : (
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-xl">
                Gmail integration needs to be set up. Use Replit's Gmail connector or add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET manually.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-xl">
                <Mail className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-800">Outlook</CardTitle>
                <CardDescription className="text-gray-500">Create drafts in your Outlook inbox</CardDescription>
              </div>
            </div>
            {integrations?.microsoft?.connected ? (
              <Badge variant="outline" className="rounded-full bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="rounded-full bg-gray-50 text-gray-500 border-gray-200">
                <XCircle className="h-3 w-3 mr-1" />
                Not connected
              </Badge>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            {integrations?.microsoft?.connected ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      Connected as <span className="font-medium">{integrations.microsoft.connected.accountEmail}</span>
                    </p>
                    {integrations.microsoft.connected.lastUsedAt && (
                      <p className="text-xs text-gray-400 flex items-center mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        Last used {format(new Date(integrations.microsoft.connected.lastUsedAt), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDisconnect('microsoft')}
                    className="rounded-full border-gray-300"
                    data-testid="button-disconnect-outlook"
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : integrations?.microsoft?.configured ? (
              <Button 
                onClick={() => handleConnect('microsoft')}
                className="rounded-full btn-gradient text-white font-semibold"
                data-testid="button-connect-outlook"
              >
                Connect Outlook
              </Button>
            ) : (
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-xl">
                Outlook integration needs to be set up. Use Replit's Outlook connector or add MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET manually.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-50 border-gray-200 rounded-xl">
        <CardContent className="py-4">
          <h3 className="font-medium text-slate-800 mb-2">Setup Options</h3>
          <p className="text-sm text-gray-600 mb-3">
            Use Replit's built-in connectors (recommended) or configure manually with OAuth credentials.
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li><strong>Replit Connectors:</strong> Set up Gmail or Outlook from the Integrations panel</li>
            <li><strong>Manual:</strong> Add <code className="bg-white px-1 rounded">GOOGLE_CLIENT_ID</code> / <code className="bg-white px-1 rounded">GOOGLE_CLIENT_SECRET</code> or <code className="bg-white px-1 rounded">MICROSOFT_CLIENT_ID</code> / <code className="bg-white px-1 rounded">MICROSOFT_CLIENT_SECRET</code></li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
