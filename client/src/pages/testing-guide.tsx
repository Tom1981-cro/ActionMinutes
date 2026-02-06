import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Terminal, CheckCircle, AlertCircle, Play, FileText, Settings } from "lucide-react";

export default function TestingGuidePage() {
  return (
    <div className="min-h-screen bg-muted p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/settings">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Testing Guide</h1>
            <p className="text-muted-foreground">How to run automated tests in ActionMinutes</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-indigo-500" />
                Test Commands
              </CardTitle>
              <CardDescription>
                Run these commands in the Replit Shell or terminal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-card rounded-lg p-4 font-mono text-sm text-foreground space-y-3">
                <div>
                  <span className="text-muted-foreground"># Run all unit and API tests</span>
                  <div className="text-green-400">npx vitest run</div>
                </div>
                <div>
                  <span className="text-muted-foreground"># Run unit tests only</span>
                  <div className="text-green-400">npx vitest run server/**/*.test.ts</div>
                </div>
                <div>
                  <span className="text-muted-foreground"># Run API tests only</span>
                  <div className="text-green-400">npx vitest run tests/api/**/*.test.ts</div>
                </div>
                <div>
                  <span className="text-muted-foreground"># Run E2E smoke tests (Playwright)</span>
                  <div className="text-green-400">npx playwright test</div>
                </div>
                <div>
                  <span className="text-muted-foreground"># Run tests with coverage report</span>
                  <div className="text-green-400">npx vitest run --coverage</div>
                </div>
                <div>
                  <span className="text-muted-foreground"># Run tests in watch mode</span>
                  <div className="text-green-400">npx vitest</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple-500" />
                Environment Variables for Tests
              </CardTitle>
              <CardDescription>
                Configure these to control test behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium text-foreground">Variable</th>
                      <th className="text-left py-2 font-medium text-foreground">Purpose</th>
                      <th className="text-left py-2 font-medium text-foreground">Default</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="py-2 font-mono text-indigo-600">AI_FEATURE_ENABLED</td>
                      <td className="py-2 text-foreground">Disable real AI calls in tests</td>
                      <td className="py-2 text-muted-foreground">false (in tests)</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono text-indigo-600">INTEGRATIONS_FEATURE_ENABLED</td>
                      <td className="py-2 text-foreground">Disable Gmail/Outlook OAuth</td>
                      <td className="py-2 text-muted-foreground">false (in tests)</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono text-indigo-600">FIXED_CLOCK</td>
                      <td className="py-2 text-foreground">Freeze time for deterministic tests</td>
                      <td className="py-2 text-muted-foreground">false</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono text-indigo-600">NODE_ENV</td>
                      <td className="py-2 text-foreground">Set to 'test' for test environment</td>
                      <td className="py-2 text-muted-foreground">test</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-500" />
                Test Structure
              </CardTitle>
              <CardDescription>
                Where to find and add tests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-4 font-mono text-sm space-y-1">
                <div className="text-foreground">
                  <span className="text-purple-600">server/</span>
                  <span className="text-muted-foreground"> - Unit tests co-located with source</span>
                </div>
                <div className="text-foreground pl-4">
                  ├── ai/ai.test.ts <span className="text-muted-foreground">(19 tests)</span>
                </div>
                <div className="text-foreground pl-4">
                  ├── rbac.test.ts <span className="text-muted-foreground">(20 tests)</span>
                </div>
                <div className="text-foreground pl-4">
                  ├── reminders/reminders.test.ts <span className="text-muted-foreground">(26 tests)</span>
                </div>
                <div className="text-foreground pl-4">
                  ├── journal-ai/journal-ai.test.ts <span className="text-muted-foreground">(45 tests)</span>
                </div>
                <div className="text-foreground pl-4">
                  └── ocr/ocr.test.ts <span className="text-muted-foreground">(10 tests)</span>
                </div>
                <div className="mt-3 text-foreground">
                  <span className="text-purple-600">tests/</span>
                  <span className="text-muted-foreground"> - Integration and E2E tests</span>
                </div>
                <div className="text-foreground pl-4">
                  ├── api/auth.test.ts <span className="text-muted-foreground">(auth schemas)</span>
                </div>
                <div className="text-foreground pl-4">
                  ├── api/meetings.test.ts <span className="text-muted-foreground">(meeting logic)</span>
                </div>
                <div className="text-foreground pl-4">
                  ├── api/extraction.test.ts <span className="text-muted-foreground">(AI extraction)</span>
                </div>
                <div className="text-foreground pl-4">
                  ├── api/drafts.test.ts <span className="text-muted-foreground">(draft generation)</span>
                </div>
                <div className="text-foreground pl-4">
                  └── e2e/smoke.spec.ts <span className="text-muted-foreground">(Playwright)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-green-500" />
                Running Playwright E2E Tests
              </CardTitle>
              <CardDescription>
                Browser-based smoke tests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-card rounded-lg p-4 font-mono text-sm text-foreground space-y-3">
                <div>
                  <span className="text-muted-foreground"># Install Playwright browsers (first time only)</span>
                  <div className="text-green-400">npx playwright install chromium</div>
                </div>
                <div>
                  <span className="text-muted-foreground"># Run all E2E tests headless</span>
                  <div className="text-green-400">npx playwright test</div>
                </div>
                <div>
                  <span className="text-muted-foreground"># Run with browser UI visible</span>
                  <div className="text-green-400">npx playwright test --headed</div>
                </div>
                <div>
                  <span className="text-muted-foreground"># View test report after running</span>
                  <div className="text-green-400">npx playwright show-report</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                E2E tests automatically start the dev server if it's not running. 
                They use data-testid attributes for stable element selection.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Mock AI Mode
              </CardTitle>
              <CardDescription>
                Tests use deterministic mock responses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-foreground">
                When <code className="bg-muted px-1 rounded">AI_FEATURE_ENABLED=false</code>, 
                the extraction and draft generation endpoints use deterministic mock functions:
              </p>
              <ul className="list-disc list-inside text-sm text-foreground space-y-1">
                <li><strong>generateMockExtraction()</strong> - Parses notes for TODO, @mentions, and action keywords</li>
                <li><strong>generateMockDrafts()</strong> - Generates group and individual follow-up drafts</li>
                <li>Confidence scores are deterministic for consistent status mapping</li>
                <li>No network calls to OpenAI or other providers</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Deploy Gate
              </CardTitle>
              <CardDescription>
                Ensure tests pass before deployment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-foreground">
                Before deploying to production, run the full test suite:
              </p>
              <div className="bg-card rounded-lg p-4 font-mono text-sm text-foreground">
                <span className="text-muted-foreground"># Full test suite (unit + API + E2E)</span>
                <div className="text-green-400">npx vitest run && npx playwright test</div>
              </div>
              <p className="text-sm text-muted-foreground">
                If any test fails, review the output and fix the issues before deploying.
                The deploy process should only proceed when all tests pass.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
