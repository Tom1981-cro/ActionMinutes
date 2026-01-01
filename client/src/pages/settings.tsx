import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { useUpdateUser, useAppConfig } from "@/lib/hooks";
import { Link } from "wouter";
import { ExternalLink, Settings2, Plug, Calendar, Sparkles, Users, MessageSquare, Shield, Rocket, User, BookOpen, Clock } from "lucide-react";
import SettingsIntegrationsPage from "./settings-integrations";
import SettingsExportsPage from "./settings-exports";
import SettingsAuditPage from "./settings-audit";
import WorkspaceSettingsPage from "./workspace-settings";
import { FeedbackModal } from "@/components/feedback-modal";
import { ReleaseReadinessPanel } from "@/components/release-readiness-panel";

export default function SettingsPage() {
  const { user, updateUser: updateLocalUser, currentWorkspaceId } = useStore();
  const updateUser = useUpdateUser();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const handleToggle = (field: string, value: boolean) => {
    updateLocalUser({ [field]: value });
    updateUser.mutate({ [field]: value });
  };

  const handleToneChange = (tone: string) => {
    updateLocalUser({ tone });
    updateUser.mutate({ tone });
  };

  return (
    <div className="space-y-5 md:space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800">Settings</h1>

      <Tabs defaultValue="preferences" className="space-y-5 md:space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="bg-gray-100 rounded-xl p-1 inline-flex min-w-max">
            <TabsTrigger value="preferences" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm h-11 px-3 md:px-4" data-testid="tab-preferences">
              <Settings2 className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Preferences</span>
            </TabsTrigger>
            <TabsTrigger value="personal" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm h-11 px-3 md:px-4" data-testid="tab-personal">
              <User className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Personal</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm h-11 px-3 md:px-4" data-testid="tab-integrations">
              <Plug className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Integrations</span>
            </TabsTrigger>
            <TabsTrigger value="exports" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm h-11 px-3 md:px-4" data-testid="tab-exports">
              <Calendar className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Exports</span>
            </TabsTrigger>
            <TabsTrigger value="ai-audit" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm h-11 px-3 md:px-4" data-testid="tab-ai-audit">
              <Sparkles className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">AI Audit</span>
            </TabsTrigger>
            {currentWorkspaceId && (
              <TabsTrigger value="workspace" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm h-11 px-3 md:px-4" data-testid="tab-workspace">
                <Users className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Workspace</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="release" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm h-11 px-3 md:px-4" data-testid="tab-release">
              <Rocket className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Release</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="preferences" className="space-y-5 md:space-y-6">
          <Card className="bg-white border-gray-200 rounded-xl">
            <CardHeader className="px-4 pt-4 pb-3 md:px-6 md:pt-5">
              <CardTitle className="text-lg text-slate-800">AI Preferences</CardTitle>
              <CardDescription className="text-gray-500 text-base">Control how the AI processes your meetings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 px-4 pb-4 md:px-6 md:pb-5">
               <div className="flex items-start justify-between gap-4 py-2">
                  <div className="space-y-1 flex-1">
                    <Label className="text-base text-slate-700">Enable AI Extraction</Label>
                    <p className="text-sm text-gray-500">Process notes to find actions automatically.</p>
                  </div>
                  <Switch 
                    checked={user.aiEnabled} 
                    onCheckedChange={(c) => handleToggle('aiEnabled', c)}
                    className="mt-1"
                    data-testid="switch-ai-enabled"
                  />
               </div>
               <div className="flex items-start justify-between gap-4 py-2">
                  <div className="space-y-1 flex-1">
                    <Label className="text-base text-slate-700">Auto-generate Drafts</Label>
                    <p className="text-sm text-gray-500">Create follow-up emails immediately.</p>
                  </div>
                  <Switch 
                    checked={user.autoGenerateDrafts} 
                    onCheckedChange={(c) => handleToggle('autoGenerateDrafts', c)}
                    className="mt-1"
                    data-testid="switch-auto-drafts"
                  />
               </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 rounded-xl">
            <CardHeader className="px-4 pt-4 pb-3 md:px-6 md:pt-5">
              <CardTitle className="text-lg text-slate-800">Work Style</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 md:px-6 md:pb-5">
               <div className="grid gap-3">
                  <Label className="text-base text-slate-700">Tone</Label>
                  <div className="flex flex-wrap gap-2">
                    {['direct', 'friendly', 'formal'].map((t) => (
                      <Button 
                        key={t}
                        variant={user.tone === t ? 'default' : 'outline'}
                        onClick={() => handleToneChange(t)}
                        className={`capitalize rounded-xl h-11 px-5 flex-1 sm:flex-none ${user.tone === t ? 'btn-gradient text-white font-semibold' : 'border-gray-300'}`}
                        data-testid={`button-tone-${t}`}
                      >
                        {t}
                      </Button>
                    ))}
                  </div>
               </div>
            </CardContent>
          </Card>
          
          <div className="p-4 bg-amber-50 text-amber-800 rounded-xl text-base border border-amber-200">
            <strong>Note:</strong> Your notes will be processed by an AI service to generate outputs. You can disable AI anytime.
          </div>

          <Card className="bg-white border-gray-200 rounded-xl">
            <CardHeader className="px-4 pt-4 pb-3 md:px-6 md:pt-5">
              <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-500" />
                Privacy
              </CardTitle>
              <CardDescription className="text-gray-500 text-base">Control how your data is handled.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 px-4 pb-4 md:px-6 md:pb-5">
              <div className="flex items-start justify-between gap-4 py-2">
                <div className="space-y-1 flex-1">
                  <Label className="text-base text-slate-700">Allow storing uploaded images</Label>
                  <p className="text-sm text-gray-500">When off, uploaded photos of handwritten notes are processed and immediately deleted.</p>
                  <p className="text-xs text-amber-600">Images can contain sensitive information.</p>
                </div>
                <Switch 
                  checked={user.allowImageStorage ?? false} 
                  onCheckedChange={(c) => handleToggle('allowImageStorage', c)}
                  className="mt-1"
                  data-testid="switch-allow-image-storage"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 rounded-xl">
            <CardHeader className="px-4 pt-4 pb-3 md:px-6 md:pt-5">
              <CardTitle className="text-lg text-slate-800">Support</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 md:px-6 md:pb-5 space-y-3">
              <Button
                variant="outline"
                onClick={() => setFeedbackOpen(true)}
                className="w-full justify-start h-12 rounded-xl border-gray-200 text-slate-700"
                data-testid="button-send-feedback"
              >
                <MessageSquare className="h-4 w-4 mr-3 text-indigo-500" />
                Send Feedback
              </Button>
              <Link href="/admin/feedback">
                <Button
                  variant="outline"
                  className="w-full justify-start h-12 rounded-xl border-gray-200 text-slate-700"
                  data-testid="button-admin-feedback"
                >
                  <Shield className="h-4 w-4 mr-3 text-purple-500" />
                  Admin: View Feedback
                </Button>
              </Link>
            </CardContent>
          </Card>

          <div className="pt-2 flex justify-end">
             <Link href="/blueprint">
               <Button variant="link" className="text-gray-500 h-11">
                 View Blueprint <ExternalLink className="ml-1 h-4 w-4" />
               </Button>
             </Link>
          </div>

          <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
        </TabsContent>

        <TabsContent value="personal" className="space-y-5 md:space-y-6">
          <div className="p-4 bg-indigo-50 rounded-xl text-base border border-indigo-200">
            <h3 className="font-semibold text-indigo-800 mb-1">Your Personal Space</h3>
            <p className="text-indigo-700 text-sm">These features are private to you. No one else can see your personal meetings, journal entries, or reminders.</p>
          </div>

          <Card className="bg-white border-gray-200 rounded-xl">
            <CardHeader className="px-4 pt-4 pb-3 md:px-6 md:pt-5">
              <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-500" />
                Personal Journal
              </CardTitle>
              <CardDescription className="text-gray-500 text-base">Capture private reflections, ideas, and thoughts.</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 md:px-6 md:pb-5">
              <Link href="/journal">
                <Button variant="outline" className="w-full justify-start h-12 rounded-xl border-gray-200" data-testid="link-journal">
                  <BookOpen className="h-4 w-4 mr-3 text-purple-500" />
                  Open Journal
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 rounded-xl">
            <CardHeader className="px-4 pt-4 pb-3 md:px-6 md:pt-5">
              <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-500" />
                Personal Reminders
              </CardTitle>
              <CardDescription className="text-gray-500 text-base">Quick personal to-dos organized by when you need to do them.</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 md:px-6 md:pb-5">
              <Link href="/reminders">
                <Button variant="outline" className="w-full justify-start h-12 rounded-xl border-gray-200" data-testid="link-reminders">
                  <Clock className="h-4 w-4 mr-3 text-indigo-500" />
                  Open Reminders
                </Button>
              </Link>
            </CardContent>
          </Card>

          <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-600 border border-gray-200">
            <strong>Personal vs Team:</strong> Personal meetings are only visible to you. When you join or create a workspace, you can save meetings to that workspace for team visibility.
          </div>
        </TabsContent>

        <TabsContent value="integrations">
          <SettingsIntegrationsPage />
        </TabsContent>

        <TabsContent value="exports">
          <SettingsExportsPage />
        </TabsContent>

        <TabsContent value="ai-audit">
          <SettingsAuditPage />
        </TabsContent>

        {currentWorkspaceId && (
          <TabsContent value="workspace">
            <WorkspaceSettingsPage workspaceId={currentWorkspaceId} />
          </TabsContent>
        )}

        <TabsContent value="release" className="space-y-5 md:space-y-6">
          <ReleaseReadinessPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
