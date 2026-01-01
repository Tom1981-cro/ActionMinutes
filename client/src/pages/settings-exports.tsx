import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Download } from "lucide-react";
import { useCalendarExports } from "@/lib/hooks";
import { format } from "date-fns";

export default function SettingsExportsPage() {
  const { data: exports = [], isLoading } = useCalendarExports();

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
        <h2 className="text-xl font-semibold text-slate-800">Calendar Exports</h2>
        <p className="text-muted-foreground">History of your exported calendar files.</p>
      </div>

      {exports.length === 0 ? (
        <Card className="bg-muted/50 border-dashed border-border rounded-3xl">
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">No exports yet. Open a meeting and tap "Export to Calendar (.ics)".</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {exports.map((exp: any) => (
            <Card key={exp.id} className="bg-card border-border rounded-2xl" data-testid={`export-${exp.id}`}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{exp.filename}</p>
                    <p className="text-sm text-muted-foreground">
                      Exported {format(new Date(exp.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {exp.options?.includeActionItems && (
                    <Badge variant="outline" className="rounded-full text-xs bg-muted text-muted-foreground border-border">
                      Includes actions
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-muted border-border rounded-3xl">
        <CardContent className="py-4">
          <h3 className="font-medium text-slate-800 mb-2">How to Export</h3>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Open any meeting from the Meetings page</li>
            <li>Click "Export to Calendar (.ics)" button</li>
            <li>Choose whether to include action items as tasks</li>
            <li>Download the .ics file and import into your calendar app</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
