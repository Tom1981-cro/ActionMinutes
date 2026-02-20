import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Smartphone, Apple, Monitor, Terminal, Package, Shield, 
  Upload, CheckCircle, AlertCircle, Copy, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";

export default function MobileBuildGuidePage() {
  const { copy, version, buildNumber, platform, isNative } = useMobile();
  const { toast } = useToast();

  const copyCommand = async (cmd: string) => {
    const success = await copy(cmd);
    if (success) {
      toast({ title: "Copied to clipboard" });
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Mobile Build Guide
        </h1>
        <p className="text-muted-foreground">
          Build ActionMinutes for iOS App Store and Google Play Store
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs">
            Version {version}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Build {buildNumber}
          </Badge>
          <Badge variant="secondary" className="text-xs capitalize">
            {platform}
          </Badge>
          {isNative && (
            <Badge className="bg-green-100 text-green-700 text-xs">
              Native
            </Badge>
          )}
        </div>
      </div>

      <Card className="bg-accent border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-foreground">
            <Package className="h-5 w-5 text-primary" />
            App Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">App ID</p>
              <p className="font-mono text-foreground">com.actionminutes.app</p>
            </div>
            <div>
              <p className="text-muted-foreground">App Name</p>
              <p className="font-medium text-foreground">ActionMinutes</p>
            </div>
            <div>
              <p className="text-muted-foreground">Version</p>
              <p className="font-mono text-foreground">{version}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Build Number</p>
              <p className="font-mono text-foreground">{buildNumber}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-foreground">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Prerequisites
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              <Apple className="h-4 w-4" />
              For iOS
            </h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
              <li>Mac computer with macOS 12+</li>
              <li>Xcode 14+ installed from App Store</li>
              <li>Apple Developer account ($99/year)</li>
              <li>iOS device or simulator for testing</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              For Android
            </h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
              <li>Any computer (Mac, Windows, Linux)</li>
              <li>Android Studio installed</li>
              <li>Google Play Developer account ($25 one-time)</li>
              <li>Android device or emulator for testing</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-foreground">
            <Terminal className="h-5 w-5 text-primary" />
            Step 1: Build Web Assets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            First, build the web application. This creates the files that will be bundled into the native apps.
          </p>
          <div className="bg-secondary rounded-lg p-4 font-mono text-sm text-green-400 relative group">
            <code>npm run build</code>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              onClick={() => copyCommand('npm run build')}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-foreground">
            <Monitor className="h-5 w-5 text-blue-500" />
            Step 2: Sync to Native Platforms
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Copy the web assets to the native iOS and Android projects.
          </p>
          <div className="bg-secondary rounded-lg p-4 font-mono text-sm text-green-400 relative group">
            <code>npx cap sync</code>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              onClick={() => copyCommand('npx cap sync')}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-foreground">
            <Apple className="h-5 w-5" />
            Step 3a: Build for iOS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Open in Xcode:</p>
            <div className="bg-secondary rounded-lg p-4 font-mono text-sm text-green-400 relative group">
              <code>npx cap open ios</code>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                onClick={() => copyCommand('npx cap open ios')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">In Xcode:</p>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2 ml-2">
              <li>Select your target device or "Any iOS Device"</li>
              <li>Go to <span className="font-mono bg-muted px-1 rounded">Signing & Capabilities</span></li>
              <li>Select your Apple Developer Team</li>
              <li>Update Bundle Identifier if needed</li>
              <li>For App Store: <span className="font-mono bg-muted px-1 rounded">Product → Archive</span></li>
              <li>Use Xcode Organizer to upload to App Store Connect</li>
            </ol>
          </div>

          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
            <p className="text-sm text-violet-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                For App Store submission, you'll need to create an app in 
                <a href="https://appstoreconnect.apple.com" target="_blank" rel="noopener noreferrer" className="underline ml-1 inline-flex items-center gap-1">
                  App Store Connect <ExternalLink className="h-3 w-3" />
                </a>
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-foreground">
            <Smartphone className="h-5 w-5 text-green-600" />
            Step 3b: Build for Android
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Open in Android Studio:</p>
            <div className="bg-secondary rounded-lg p-4 font-mono text-sm text-green-400 relative group">
              <code>npx cap open android</code>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                onClick={() => copyCommand('npx cap open android')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">In Android Studio:</p>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2 ml-2">
              <li>Wait for Gradle sync to complete</li>
              <li>Go to <span className="font-mono bg-muted px-1 rounded">Build → Generate Signed Bundle/APK</span></li>
              <li>Select "Android App Bundle" for Play Store</li>
              <li>Create or select your keystore</li>
              <li>Choose "release" build variant</li>
              <li>Upload the .aab file to Google Play Console</li>
            </ol>
          </div>

          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
            <p className="text-sm text-violet-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Store your keystore file securely. You'll need the same keystore for all future updates.
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-foreground">
            <Shield className="h-5 w-5 text-red-500" />
            Signing & Environment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Production Environment Variables:</p>
            <p className="text-sm text-muted-foreground">
              Set these in your build environment or CI/CD pipeline:
            </p>
            <div className="bg-secondary rounded-lg p-4 font-mono text-xs text-muted-foreground space-y-1">
              <div><span className="text-primary">DATABASE_URL</span>=<span className="text-green-400">"your_production_db_url"</span></div>
              <div><span className="text-primary">NODE_ENV</span>=<span className="text-green-400">"production"</span></div>
              <div><span className="text-primary">AI_FEATURE_ENABLED</span>=<span className="text-green-400">"true"</span></div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Versioning Strategy:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
              <li><span className="font-medium">Version</span> (e.g., 1.2.3): Semantic versioning for user-facing releases</li>
              <li><span className="font-medium">Build Number</span>: Incrementing integer for each build</li>
              <li>Update in <span className="font-mono bg-muted px-1 rounded">client/src/lib/mobile.ts</span></li>
              <li>iOS: Also update in Xcode project settings</li>
              <li>Android: Also update in <span className="font-mono bg-muted px-1 rounded">android/app/build.gradle</span></li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-foreground">
            <Upload className="h-5 w-5 text-primary" />
            Store Submission Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <Apple className="h-4 w-4" />
                App Store (iOS)
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  App icon (1024x1024)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Screenshots for all device sizes
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Privacy policy URL
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  App description
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Keywords
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Support URL
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Play Store (Android)
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  App icon (512x512)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Feature graphic (1024x500)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Screenshots
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Privacy policy URL
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  App descriptions (short/full)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Content rating questionnaire
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted">
        <CardContent className="py-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Need help? Check the official Capacitor documentation.
            </p>
            <a
              href="https://capacitorjs.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:text-primary font-medium text-sm"
            >
              Capacitor Documentation
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
