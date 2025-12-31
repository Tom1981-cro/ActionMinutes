import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Send, Loader2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDrafts, useUpdateDraft, useIntegrations, useCreateGmailDraft, useCreateOutlookDraft } from "@/lib/hooks";

export default function DraftsPage() {
  const { data: drafts = [], isLoading } = useDrafts();
  const { data: integrations } = useIntegrations();
  const updateDraft = useUpdateDraft();
  const createGmailDraft = useCreateGmailDraft();
  const createOutlookDraft = useCreateOutlookDraft();
  const { toast } = useToast();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const handleCreateGmailDraft = async (draftId: string) => {
    try {
      await createGmailDraft.mutateAsync(draftId);
      toast({ title: "Gmail draft created", description: "Check your Gmail drafts folder." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to create Gmail draft.", variant: "destructive" });
    }
  };

  const handleCreateOutlookDraft = async (draftId: string) => {
    try {
      await createOutlookDraft.mutateAsync(draftId);
      toast({ title: "Outlook draft created", description: "Check your Outlook drafts folder." });
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

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Drafts</h1>
        <p className="text-stone-500">Ready-to-send follow-up emails.</p>
      </div>

      {(gmailConnected || outlookConnected) && (
        <div className="flex gap-2 items-center">
          {gmailConnected && (
            <Badge variant="outline" className="rounded-full bg-green-50 text-green-700 border-green-200">
              <Mail className="h-3 w-3 mr-1" />
              Gmail connected
            </Badge>
          )}
          {outlookConnected && (
            <Badge variant="outline" className="rounded-full bg-green-50 text-green-700 border-green-200">
              <Mail className="h-3 w-3 mr-1" />
              Outlook connected
            </Badge>
          )}
        </div>
      )}

      <div className="grid gap-6">
        {drafts.length === 0 && (
           <Card className="bg-stone-50/50 border-dashed border-stone-300 rounded-3xl">
             <CardContent className="py-12 text-center">
               <p className="text-stone-500">No drafts yet. Open a meeting and tap "View Drafts".</p>
             </CardContent>
           </Card>
        )}

        {drafts.map((draft: any) => (
          <Card key={draft.id} className="max-w-3xl bg-white border-stone-200 rounded-3xl" data-testid={`card-draft-${draft.id}`}>
            <CardHeader className="bg-stone-50 pb-4 border-b border-stone-200">
              <div className="space-y-3">
                <div className="grid gap-2">
                   <Label className="text-slate-700">Subject</Label>
                   <Input 
                     value={draft.subject} 
                     onChange={(e) => updateDraft.mutate({ id: draft.id, updates: { subject: e.target.value } })}
                     className="bg-white border-stone-200 rounded-2xl"
                     data-testid={`input-subject-${draft.id}`}
                   />
                </div>
                <div className="grid gap-2">
                   <Label className="text-slate-700">To</Label>
                   <Input 
                     value={draft.recipientEmail || ""} 
                     placeholder="Recipient..."
                     onChange={(e) => updateDraft.mutate({ id: draft.id, updates: { recipientEmail: e.target.value } })}
                     className="bg-white border-stone-200 rounded-2xl"
                     data-testid={`input-recipient-${draft.id}`}
                   />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <Textarea 
                value={draft.body} 
                onChange={(e) => updateDraft.mutate({ id: draft.id, updates: { body: e.target.value } })}
                className="min-h-[300px] font-mono text-sm leading-relaxed border-stone-200 rounded-2xl"
                data-testid={`textarea-body-${draft.id}`}
              />
            </CardContent>
            <CardFooter className="bg-stone-50 border-t border-stone-200 flex flex-wrap justify-end gap-2 py-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleCopy(`${draft.subject}\n\n${draft.body}`)}
                className="rounded-full border-stone-300"
                data-testid={`button-copy-${draft.id}`}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              
              {gmailConnected && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleCreateGmailDraft(draft.id)}
                  disabled={createGmailDraft.isPending}
                  className="rounded-full border-red-200 text-red-600 hover:bg-red-50"
                  data-testid={`button-gmail-${draft.id}`}
                >
                  {createGmailDraft.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Create Gmail Draft
                </Button>
              )}

              {outlookConnected && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleCreateOutlookDraft(draft.id)}
                  disabled={createOutlookDraft.isPending}
                  className="rounded-full border-blue-200 text-blue-600 hover:bg-blue-50"
                  data-testid={`button-outlook-${draft.id}`}
                >
                  {createOutlookDraft.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Create Outlook Draft
                </Button>
              )}

              <Button 
                variant="default" 
                size="sm" 
                onClick={() => toast({ title: "Marked as sent" })}
                className="rounded-full bg-teal-500 hover:bg-teal-600"
                data-testid={`button-send-${draft.id}`}
              >
                <Send className="mr-2 h-4 w-4" />
                Mark Sent
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
