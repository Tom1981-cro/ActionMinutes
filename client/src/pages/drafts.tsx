import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EnvelopeSimple, Copy, PaperPlaneTilt, SpinnerGap, Check, CaretDown, CaretLeft, CaretRight } from "@phosphor-icons/react";
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
        <SpinnerGap className="h-8 w-8 animate-spin text-primary" weight="bold" />
      </div>
    );
  }

  const gmailConnected = integrations?.google?.connected;
  const outlookConnected = integrations?.microsoft?.connected;

  if (drafts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Drafts</h1>
          <p className="text-muted-foreground text-base">Ready-to-send follow-up emails.</p>
        </div>
        <div className="glass-panel rounded-2xl border-dashed border-border py-12 text-center">
          <div className="mx-auto h-16 w-16 bg-accent rounded-2xl flex items-center justify-center mb-4">
            <EnvelopeSimple className="h-8 w-8 text-primary" weight="duotone" />
          </div>
          <p className="text-foreground text-base">No drafts yet.</p>
          <p className="text-muted-foreground text-sm mt-1">Process a meeting to generate follow-up emails.</p>
        </div>
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
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Drafts</h1>
              <p className="text-muted-foreground text-sm">Ready-to-send emails</p>
            </div>
            
            {drafts.length > 1 && (
              <div className="flex items-center gap-2 md:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setActiveDraftIndex(Math.max(0, activeDraftIndex - 1))}
                  disabled={activeDraftIndex === 0}
                  className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent"
                  data-testid="button-prev-draft"
                  aria-label="Previous draft"
                >
                  <CaretLeft className="h-5 w-5" weight="bold" />
                </Button>
                <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
                  {activeDraftIndex + 1} / {drafts.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setActiveDraftIndex(Math.min(drafts.length - 1, activeDraftIndex + 1))}
                  disabled={activeDraftIndex === drafts.length - 1}
                  className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent"
                  data-testid="button-next-draft"
                  aria-label="Next draft"
                >
                  <CaretRight className="h-5 w-5" weight="bold" />
                </Button>
              </div>
            )}
          </div>

          {(gmailConnected || outlookConnected) && (
            <div className="flex gap-2 items-center flex-wrap">
              {gmailConnected && (
                <Badge variant="outline" className="rounded-full bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                  <Check className="h-3 w-3 mr-1" weight="bold" />
                  Gmail connected
                </Badge>
              )}
              {outlookConnected && (
                <Badge variant="outline" className="rounded-full bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                  <Check className="h-3 w-3 mr-1" weight="bold" />
                  Outlook connected
                </Badge>
              )}
            </div>
          )}

          <div className="md:hidden">
            {activeDraft && (
              <Card className="glass-panel rounded-2xl overflow-hidden" data-testid={`card-draft-${activeDraft.id}`}>
                <CardHeader className="space-y-4 px-4 pt-4 pb-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Subject</Label>
                    <Input 
                      value={activeDraft.subject} 
                      onChange={(e) => updateDraft.mutate({ id: activeDraft.id, updates: { subject: e.target.value } })}
                      className="bg-muted border-border rounded-xl h-12 text-base text-foreground placeholder:text-muted-foreground focus:bg-accent focus:border-ring"
                      data-testid={`input-subject-${activeDraft.id}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">To</Label>
                    <Input 
                      value={activeDraft.recipientEmail || ""} 
                      placeholder="recipient@email.com"
                      onChange={(e) => updateDraft.mutate({ id: activeDraft.id, updates: { recipientEmail: e.target.value } })}
                      className="bg-muted border-border rounded-xl h-12 text-base text-foreground placeholder:text-muted-foreground focus:bg-accent focus:border-ring"
                      data-testid={`input-recipient-${activeDraft.id}`}
                    />
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Message</Label>
                    <Textarea 
                      value={activeDraft.body} 
                      onChange={(e) => updateDraft.mutate({ id: activeDraft.id, updates: { body: e.target.value } })}
                      className="min-h-[280px] text-base leading-relaxed bg-muted border-border rounded-xl p-4 text-foreground placeholder:text-muted-foreground focus:bg-accent focus:border-ring"
                      data-testid={`textarea-body-${activeDraft.id}`}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="hidden md:grid gap-5">
            {drafts.map((draft: any) => (
              <Card key={draft.id} className="glass-panel rounded-2xl overflow-hidden" data-testid={`card-draft-${draft.id}`}>
                <CardHeader className="bg-muted pb-4 border-b border-border space-y-4 px-6 pt-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Subject</Label>
                      <Input 
                        value={draft.subject} 
                        onChange={(e) => updateDraft.mutate({ id: draft.id, updates: { subject: e.target.value } })}
                        className="bg-muted border-border rounded-xl h-12 text-base text-foreground placeholder:text-muted-foreground focus:bg-accent focus:border-ring"
                        data-testid={`input-subject-${draft.id}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">To</Label>
                      <Input 
                        value={draft.recipientEmail || ""} 
                        placeholder="Recipient email..."
                        onChange={(e) => updateDraft.mutate({ id: draft.id, updates: { recipientEmail: e.target.value } })}
                        className="bg-muted border-border rounded-xl h-12 text-base text-foreground placeholder:text-muted-foreground focus:bg-accent focus:border-ring"
                        data-testid={`input-recipient-${draft.id}`}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 pb-4 px-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Message</Label>
                    <Textarea 
                      value={draft.body} 
                      onChange={(e) => updateDraft.mutate({ id: draft.id, updates: { body: e.target.value } })}
                      className="min-h-[300px] text-base leading-relaxed bg-muted border-border rounded-xl p-4 text-foreground placeholder:text-muted-foreground focus:bg-accent focus:border-ring"
                      data-testid={`textarea-body-${draft.id}`}
                    />
                  </div>
                </CardContent>
                <div className="bg-muted border-t border-border flex gap-3 py-4 px-6 items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="rounded-full border-border text-foreground hover:bg-accent hover:text-foreground h-11"
                        data-testid={`button-copy-${draft.id}`}
                      >
                        {copiedType?.startsWith('body-' + draft.id) || copiedType?.startsWith('all-' + draft.id) ? (
                          <Check className="mr-2 h-4 w-4 text-emerald-400" weight="bold" />
                        ) : (
                          <Copy className="mr-2 h-4 w-4" weight="duotone" />
                        )}
                        Copy
                        <CaretDown className="ml-2 h-4 w-4" weight="bold" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="rounded-xl glass-panel border-border">
                      <DropdownMenuItem 
                        onClick={() => handleCopyBody(draft.body, draft.id)}
                        className="py-3 text-foreground focus:bg-accent focus:text-foreground"
                        data-testid={`menu-copy-body-${draft.id}`}
                      >
                        <Copy className="mr-2 h-4 w-4" weight="duotone" />
                        Copy body only
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleCopyAll(draft.subject, draft.body, draft.id)}
                        className="py-3 text-foreground focus:bg-accent focus:text-foreground"
                        data-testid={`menu-copy-all-${draft.id}`}
                      >
                        <Copy className="mr-2 h-4 w-4" weight="duotone" />
                        Copy subject + body
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {gmailConnected && (
                    <Button 
                      variant="outline" 
                      onClick={() => handleCreateGmailDraft(draft.id)}
                      disabled={createGmailDraft.isPending}
                      className="rounded-full border-red-500/30 text-red-400 hover:bg-red-500/10 h-11"
                      data-testid={`button-gmail-${draft.id}`}
                    >
                      {createGmailDraft.isPending ? (
                        <SpinnerGap className="mr-2 h-4 w-4 animate-spin" weight="bold" />
                      ) : (
                        <EnvelopeSimple className="mr-2 h-4 w-4" weight="duotone" />
                      )}
                      Gmail
                    </Button>
                  )}

                  {outlookConnected && (
                    <Button 
                      variant="outline" 
                      onClick={() => handleCreateOutlookDraft(draft.id)}
                      disabled={createOutlookDraft.isPending}
                      className="rounded-full border-sky-500/30 text-sky-400 hover:bg-sky-500/10 h-11"
                      data-testid={`button-outlook-${draft.id}`}
                    >
                      {createOutlookDraft.isPending ? (
                        <SpinnerGap className="mr-2 h-4 w-4 animate-spin" weight="bold" />
                      ) : (
                        <EnvelopeSimple className="mr-2 h-4 w-4" weight="duotone" />
                      )}
                      Outlook
                    </Button>
                  )}

                  <Button 
                    onClick={() => toast({ title: "Marked as sent!" })}
                    className="rounded-full btn-gradient h-11 ml-auto"
                    data-testid={`button-send-${draft.id}`}
                  >
                    <PaperPlaneTilt className="mr-2 h-4 w-4" weight="fill" />
                    Mark Sent
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {activeDraft && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 glass-panel border-t border-border p-4 pb-safe z-50">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="h-12 px-4 rounded-xl border-border text-foreground hover:bg-accent"
                  data-testid="button-copy-mobile"
                >
                  {copiedType ? (
                    <Check className="h-5 w-5 text-emerald-400" weight="bold" />
                  ) : (
                    <Copy className="h-5 w-5" weight="duotone" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="rounded-xl glass-panel border-border w-48">
                <DropdownMenuItem 
                  onClick={() => handleCopyBody(activeDraft.body, activeDraft.id)}
                  className="py-3 text-foreground focus:bg-accent focus:text-foreground"
                  data-testid="menu-copy-body-mobile"
                >
                  <Copy className="mr-2 h-4 w-4" weight="duotone" />
                  Copy body only
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleCopyAll(activeDraft.subject, activeDraft.body, activeDraft.id)}
                  className="py-3 text-foreground focus:bg-accent focus:text-foreground"
                  data-testid="menu-copy-all-mobile"
                >
                  <Copy className="mr-2 h-4 w-4" weight="duotone" />
                  Copy subject + body
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {gmailConnected && (
              <Button 
                variant="outline" 
                onClick={() => handleCreateGmailDraft(activeDraft.id)}
                disabled={createGmailDraft.isPending}
                className="h-12 px-4 rounded-xl border-red-500/30 text-red-400 hover:bg-red-500/10"
                data-testid="button-gmail-mobile"
              >
                {createGmailDraft.isPending ? (
                  <SpinnerGap className="h-5 w-5 animate-spin" weight="bold" />
                ) : (
                  <EnvelopeSimple className="h-5 w-5" weight="duotone" />
                )}
              </Button>
            )}

            {outlookConnected && (
              <Button 
                variant="outline" 
                onClick={() => handleCreateOutlookDraft(activeDraft.id)}
                disabled={createOutlookDraft.isPending}
                className="h-12 px-4 rounded-xl border-sky-500/30 text-sky-400 hover:bg-sky-500/10"
                data-testid="button-outlook-mobile"
              >
                {createOutlookDraft.isPending ? (
                  <SpinnerGap className="h-5 w-5 animate-spin" weight="bold" />
                ) : (
                  <EnvelopeSimple className="h-5 w-5" weight="duotone" />
                )}
              </Button>
            )}

            <Button 
              size="lg" 
              onClick={() => toast({ title: "Marked as sent!", description: "Draft moved to sent." })}
              className="flex-1 text-base h-12 rounded-xl btn-gradient"
              data-testid="button-send-mobile"
            >
              <PaperPlaneTilt className="mr-2 h-5 w-5" weight="fill" />
              Mark Sent
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
