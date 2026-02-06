import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function ThemePreview() {
  return (
    <Card className="overflow-hidden" data-testid="theme-preview-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Preview</CardTitle>
        <CardDescription>How your app looks with this theme.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" data-testid="preview-primary-button">Primary</Button>
          <Button size="sm" variant="secondary" data-testid="preview-secondary-button">Secondary</Button>
          <Button size="sm" variant="outline" data-testid="preview-outline-button">Outline</Button>
          <Button size="sm" variant="destructive" data-testid="preview-destructive-button">Delete</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge data-testid="preview-badge-default">Active</Badge>
          <Badge variant="secondary" data-testid="preview-badge-secondary">Draft</Badge>
          <Badge variant="outline" data-testid="preview-badge-outline">Pending</Badge>
          <Badge variant="destructive" data-testid="preview-badge-destructive">Overdue</Badge>
        </div>
        <Input placeholder="Type something..." className="max-w-xs" data-testid="preview-input" />
        <div className="flex gap-3 text-sm">
          <span className="text-foreground">Foreground</span>
          <span className="text-muted-foreground">Muted</span>
          <span className="text-primary">Primary</span>
          <span className="text-destructive">Destructive</span>
        </div>
      </CardContent>
    </Card>
  );
}
