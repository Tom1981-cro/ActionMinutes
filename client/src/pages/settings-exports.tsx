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
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-800">Calendar Exports</h2>
        <p className="text-stone-500">History of your exported calendar files.</p>
      </div>

      {exports.length === 0 ? (
        <Card className="bg-stone-50/50 border-dashed border-stone-300 rounded-3xl">
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-500">No exports yet. Open a meeting and tap "Export to Calendar (.ics)".</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {exports.map((exp: any) => (
            <Card key={exp.id} className="bg-white border-stone-200 rounded-2xl" data-testid={`export-${exp.id}`}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-teal-50 rounded-xl">
                    <Calendar className="h-5 w-5 text-teal-500" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{exp.filename}</p>
                    <p className="text-sm text-stone-500">
                      Exported {format(new Date(exp.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {exp.options?.includeActionItems && (
                    <Badge variant="outline" className="rounded-full text-xs bg-stone-50 text-stone-600 border-stone-200">
                      Includes actions
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-stone-50 border-stone-200 rounded-3xl">
        <CardContent className="py-4">
          <h3 className="font-medium text-slate-800 mb-2">How to Export</h3>
          <ol className="text-sm text-stone-600 space-y-1 list-decimal list-inside">
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
