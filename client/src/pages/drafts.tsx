import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Copy, Send, Loader2, Mail, Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDrafts, useUpdateDraft, useIntegrations, useCreateGmailDraft, useCreateOutlookDraft } from "@/lib/hooks";

export default function DraftsPage() {
  const { data: drafts = [], isLoading } = useDrafts();
  const { data: integrations } = useIntegrations();
  const updateDraft = useUpdateDraft();
  const createGmailDraft = useCreateGmailDraft();
  const createOutlookDraft = useCreateOutlookDraft();
  const { toast } = useToast();
  const [activeDraftIndex, setActiveDraftIndex] = useState(0);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const handleCopyBody = (body: string, draftId: string) => {
    navigator.clipboard.writeText(body);
    setCopiedType(`body-${draftId}`);
    toast({ 
      title: "Body copied!", 
      description: "Email body is ready to paste.",
    });
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyAll = (subject: string, body: string, draftId: string) => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopiedType(`all-${draftId}`);
    toast({ 
      title: "Copied!", 
      description: "Subject + body ready to paste.",
    });
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCreateGmailDraft = async (draftId: string) => {
    try {
      await createGmailDraft.mutateAsync(draftId);
      toast({ 
        title: "Gmail draft created!", 
        description: "Check your Gmail drafts folder.",
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to create Gmail draft.", variant: "destructive" });
    }
  };

  const handleCreateOutlookDraft = async (draftId: string) => {
    try {
      await createOutlookDraft.mutateAsync(draftId);
      toast({ 
        title: "Outlook draft created!", 
        description: "Check your Outlook drafts folder.",
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to create Outlook draft.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  const gmailConnected = integrations?.google?.connected;
  const outlookConnected = integrations?.microsoft?.connected;

  if (drafts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Drafts</h1>
          <p className="text-stone-500 text-base">Ready-to-send follow-up emails.</p>
        </div>
        <Card className="bg-stone-50/50 border-dashed border-stone-300 rounded-2xl">
          <CardContent className="py-12 text-center">
            <Mail className="h-12 w-12 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-500 text-base">No drafts yet.</p>
            <p className="text-stone-400 text-sm mt-1">Process a meeting to generate follow-up emails.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeDraft = drafts[activeDraftIndex];

  return (
    <div className="flex flex-col h-full pb-safe">
      <div className="flex-1 overflow-y-auto pb-28 md:pb-6">
        <div className="space-y-4 md:space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-800">Drafts</h1>
              <p className="text-stone-500 text-sm">Ready-to-send emails</p>
            </div>
            
            {drafts.length > 1 && (
              <div className="flex items-center gap-2 md:hidden">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setActiveDraftIndex(Math.max(0, activeDraftIndex - 1))}
                  disabled={activeDraftIndex === 0}
                  className="h-10 w-10 rounded-full"
                  data-testid="button-prev-draft"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="text-sm text-stone-600 min-w-[3rem] text-center">
                  {activeDraftIndex + 1} / {drafts.length}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setActiveDraftIndex(Math.min(drafts.length - 1, activeDraftIndex + 1))}
                  disabled={activeDraftIndex === drafts.length - 1}
                  className="h-10 w-10 rounded-full"
                  data-testid="button-next-draft"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>

          {(gmailConnected || outlookConnected) && (
            <div className="flex gap-2 items-center flex-wrap">
              {gmailConnected && (
                <Badge variant="outline" className="rounded-full bg-green-50 text-green-700 border-green-200">
                  <Check className="h-3 w-3 mr-1" />
                  Gmail connected
                </Badge>
              )}
              {outlookConnected && (
                <Badge variant="outline" className="rounded-full bg-green-50 text-green-700 border-green-200">
                  <Check className="h-3 w-3 mr-1" />
                  Outlook connected
                </Badge>
              )}
            </div>
          )}

          <div className="md:hidden">
            {activeDraft && (
              <Card className="bg-white border-stone-200 rounded-2xl overflow-hidden" data-testid={`card-draft-${activeDraft.id}`}>
                <CardHeader className="space-y-4 px-4 pt-4 pb-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-600">Subject</Label>
                    <Input 
                      value={activeDraft.subject} 
                      onChange={(e) => updateDraft.mutate({ id: activeDraft.id, updates: { subject: e.target.value } })}
                      className="bg-stone-50 border-stone-200 rounded-xl h-12 text-base focus:bg-white"
                      data-testid={`input-subject-${activeDraft.id}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-600">To</Label>
                    <Input 
                      value={activeDraft.recipientEmail || ""} 
                      placeholder="recipient@email.com"
                      onChange={(e) => updateDraft.mutate({ id: activeDraft.id, updates: { recipientEmail: e.target.value } })}
                      className="bg-stone-50 border-stone-200 rounded-xl h-12 text-base focus:bg-white"
                      data-testid={`input-recipient-${activeDraft.id}`}
                    />
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-600">Message</Label>
                    <Textarea 
                      value={activeDraft.body} 
                      onChange={(e) => updateDraft.mutate({ id: activeDraft.id, updates: { body: e.target.value } })}
                      className="min-h-[280px] text-base leading-relaxed border-stone-200 rounded-xl p-4 bg-stone-50 focus:bg-white"
                      data-testid={`textarea-body-${activeDraft.id}`}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="hidden md:grid gap-5">
            {drafts.map((draft: any) => (
              <Card key={draft.id} className="bg-white border-stone-200 rounded-2xl overflow-hidden" data-testid={`card-draft-${draft.id}`}>
                <CardHeader className="bg-stone-50 pb-4 border-b border-stone-200 space-y-4 px-6 pt-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-600">Subject</Label>
                      <Input 
                        value={draft.subject} 
                        onChange={(e) => updateDraft.mutate({ id: draft.id, updates: { subject: e.target.value } })}
                        className="bg-white border-stone-200 rounded-xl h-12 text-base"
                        data-testid={`input-subject-${draft.id}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-600">To</Label>
                      <Input 
                        value={draft.recipientEmail || ""} 
                        placeholder="Recipient email..."
                        onChange={(e) => updateDraft.mutate({ id: draft.id, updates: { recipientEmail: e.target.value } })}
                        className="bg-white border-stone-200 rounded-xl h-12 text-base"
                        data-testid={`input-recipient-${draft.id}`}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 pb-4 px-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-600">Message</Label>
                    <Textarea 
                      value={draft.body} 
                      onChange={(e) => updateDraft.mutate({ id: draft.id, updates: { body: e.target.value } })}
                      className="min-h-[300px] text-base leading-relaxed border-stone-200 rounded-xl p-4"
                      data-testid={`textarea-body-${draft.id}`}
                    />
                  </div>
                </CardContent>
                <div className="bg-stone-50 border-t border-stone-200 flex gap-3 py-4 px-6 items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="rounded-full border-stone-300 h-11"
                        data-testid={`button-copy-${draft.id}`}
                      >
                        {copiedType?.startsWith('body-' + draft.id) || copiedType?.startsWith('all-' + draft.id) ? (
                          <Check className="mr-2 h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="mr-2 h-4 w-4" />
                        )}
                        Copy
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="rounded-xl">
                      <DropdownMenuItem 
                        onClick={() => handleCopyBody(draft.body, draft.id)}
                        className="py-3"
                        data-testid={`menu-copy-body-${draft.id}`}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy body only
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleCopyAll(draft.subject, draft.body, draft.id)}
                        className="py-3"
                        data-testid={`menu-copy-all-${draft.id}`}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy subject + body
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {gmailConnected && (
                    <Button 
                      variant="outline" 
                      onClick={() => handleCreateGmailDraft(draft.id)}
                      disabled={createGmailDraft.isPending}
                      className="rounded-full border-red-200 text-red-600 hover:bg-red-50 h-11"
                      data-testid={`button-gmail-${draft.id}`}
                    >
                      {createGmailDraft.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="mr-2 h-4 w-4" />
                      )}
                      Gmail
                    </Button>
                  )}

                  {outlookConnected && (
                    <Button 
                      variant="outline" 
                      onClick={() => handleCreateOutlookDraft(draft.id)}
                      disabled={createOutlookDraft.isPending}
                      className="rounded-full border-blue-200 text-blue-600 hover:bg-blue-50 h-11"
                      data-testid={`button-outlook-${draft.id}`}
                    >
                      {createOutlookDraft.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="mr-2 h-4 w-4" />
                      )}
                      Outlook
                    </Button>
                  )}

                  <Button 
                    variant="default" 
                    onClick={() => toast({ title: "Marked as sent!" })}
                    className="rounded-full bg-teal-500 hover:bg-teal-600 h-11 ml-auto"
                    data-testid={`button-send-${draft.id}`}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Mark Sent
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {activeDraft && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-stone-200 p-4 pb-safe z-50">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="h-12 px-4 rounded-xl border-stone-300"
                  data-testid="button-copy-mobile"
                >
                  {copiedType ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="rounded-xl w-48">
                <DropdownMenuItem 
                  onClick={() => handleCopyBody(activeDraft.body, activeDraft.id)}
                  className="py-3"
                  data-testid="menu-copy-body-mobile"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy body only
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleCopyAll(activeDraft.subject, activeDraft.body, activeDraft.id)}
                  className="py-3"
                  data-testid="menu-copy-all-mobile"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy subject + body
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {gmailConnected && (
              <Button 
                variant="outline" 
                onClick={() => handleCreateGmailDraft(activeDraft.id)}
                disabled={createGmailDraft.isPending}
                className="h-12 px-4 rounded-xl border-red-200 text-red-600"
                data-testid="button-gmail-mobile"
              >
                {createGmailDraft.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Mail className="h-5 w-5" />
                )}
              </Button>
            )}

            {outlookConnected && (
              <Button 
                variant="outline" 
                onClick={() => handleCreateOutlookDraft(activeDraft.id)}
                disabled={createOutlookDraft.isPending}
                className="h-12 px-4 rounded-xl border-blue-200 text-blue-600"
                data-testid="button-outlook-mobile"
              >
                {createOutlookDraft.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Mail className="h-5 w-5" />
                )}
              </Button>
            )}

            <Button 
              size="lg" 
              onClick={() => toast({ title: "Marked as sent!", description: "Draft moved to sent." })}
              className="flex-1 text-base h-12 rounded-xl bg-teal-500 hover:bg-teal-600 shadow-lg shadow-teal-500/20"
              data-testid="button-send-mobile"
            >
              <Send className="mr-2 h-5 w-5" />
              Mark Sent
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
