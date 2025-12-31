import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Send, Trash2, Archive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DraftsPage() {
  const { drafts, updateDraft } = useStore();
  const { toast } = useToast();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Drafts</h1>
        <p className="text-muted-foreground">Ready-to-send follow-up emails.</p>
      </div>

      <div className="grid gap-6">
        {drafts.length === 0 && (
           <Card className="bg-muted/30 border-dashed">
             <CardContent className="py-12 text-center">
               <p className="text-muted-foreground">No drafts yet. Open a meeting and tap "View Drafts".</p>
             </CardContent>
           </Card>
        )}

        {drafts.map((draft) => (
          <Card key={draft.id} className="max-w-3xl">
            <CardHeader className="bg-muted/30 pb-4 border-b">
              <div className="space-y-3">
                <div className="grid gap-2">
                   <Label>Subject</Label>
                   <Input 
                     value={draft.subject} 
                     onChange={(e) => updateDraft(draft.id, { subject: e.target.value })}
                     className="bg-background"
                   />
                </div>
                <div className="grid gap-2">
                   <Label>To</Label>
                   <Input 
                     value={draft.recipientEmail || ""} 
                     placeholder="Recipient..."
                     onChange={(e) => updateDraft(draft.id, { recipientEmail: e.target.value })}
                     className="bg-background"
                   />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <Textarea 
                value={draft.body} 
                onChange={(e) => updateDraft(draft.id, { body: e.target.value })}
                className="min-h-[300px] font-mono text-sm leading-relaxed"
              />
            </CardContent>
            <CardFooter className="bg-muted/10 border-t flex justify-end gap-2 py-3">
              <Button variant="outline" size="sm" onClick={() => handleCopy(`${draft.subject}\n\n${draft.body}`)}>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              <Button variant="default" size="sm" onClick={() => toast({ title: "Marked as sent" })}>
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
