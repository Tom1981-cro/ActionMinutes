# ActionMinutes iOS Build Guide

A complete step-by-step guide to build and publish ActionMinutes for iOS.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Setup on Your Mac](#setup-on-your-mac)
3. [Build Process](#build-process)
4. [Configure in Xcode](#configure-in-xcode)
5. [Testing](#testing)
6. [App Store Submission](#app-store-submission)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **macOS 12.0+** (Monterey or later)
- **Xcode 14+** (download from App Store - ~12GB)
- **Node.js 18+** and npm
- **CocoaPods** (Ruby gem for iOS dependencies)

### Required Accounts
- **Apple Developer Account** ($99/year) - https://developer.apple.com/programs/
- **App Store Connect** access - https://appstoreconnect.apple.com

### Hardware
- Mac computer (Intel or Apple Silicon)
- iPhone/iPad for testing (or use Xcode Simulator)

---

## Setup on Your Mac

### Step 1: Clone the Repository

```bash
# Clone your repository
git clone <your-repo-url> actionminutes
cd actionminutes
```

### Step 2: Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install CocoaPods (if not installed)
sudo gem install cocoapods

# Install iOS dependencies
cd ios/App
pod install
cd ../..
```

### Step 3: Configure Environment

Create a `.env` file in the root with your production settings:

```bash
# .env (example)
DATABASE_URL="your_production_database_url"
NODE_ENV="production"
CLERK_SECRET_KEY="your_clerk_secret_key"
OPENAI_API_KEY="your_openai_key"
```

---

## Build Process

### Step 1: Build Web Assets

```bash
# Build the production web application
npm run build
```

This creates the `dist/public` folder with your web assets.

### Step 2: Sync to iOS

```bash
# Sync web assets to iOS project
npx cap sync ios
```

### Step 3: Open in Xcode

```bash
# Open the iOS project in Xcode
npx cap open ios
```

---

## Configure in Xcode

### 1. Select Development Team

1. Click on "App" in the project navigator (left sidebar)
2. Select "App" under TARGETS
3. Go to **Signing & Capabilities** tab
4. Under "Signing", select your **Team**
5. The **Bundle Identifier** should be: `com.actionminutes.app`

### 2. Update App Version

1. In the same screen, update:
   - **Version**: `1.0.0` (user-facing version)
   - **Build**: `1` (increment for each build)

### 3. Configure Capabilities

The following capabilities are pre-configured:

| Capability | Purpose |
|------------|---------|
| Camera | Scan handwritten notes |
| Photo Library | Import images |
| Push Notifications | Reminders and alerts |
| Background Modes | Background refresh |

### 4. App Icons

App icons are located at: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

**Required sizes:**
- 1024x1024 (App Store)
- Already configured in the project

To update icons, replace the image in the asset catalog.

### 5. Launch Screen

The launch screen is configured at: `ios/App/App/Base.lproj/LaunchScreen.storyboard`

Current configuration:
- Background color: Violet (#6366f1)
- Displays splash image during load

---

## Testing

### Test on Simulator

1. In Xcode, select an iPhone simulator from the device dropdown
2. Click the **Play** button (▶) or press `Cmd + R`
3. The app will build and launch in the simulator

### Test on Physical Device

1. Connect your iPhone via USB
2. Select your device from the device dropdown
3. You may need to trust your Mac on the device
4. Click **Play** to build and install

### Testing Features

Test these key features:
- [ ] User authentication (Clerk)
- [ ] Meeting capture and notes
- [ ] Camera for note scanning
- [ ] Local notifications/reminders
- [ ] Share functionality
- [ ] Deep links (`actionminutes://`)

---

## App Store Submission

### Step 1: Create App in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Click **My Apps** → **+** → **New App**
3. Fill in:
   - **Platform**: iOS
   - **Name**: ActionMinutes
   - **Primary Language**: English (US)
   - **Bundle ID**: com.actionminutes.app
   - **SKU**: actionminutes-001

### Step 2: Archive the App

1. In Xcode, select **Any iOS Device** as the build target
2. Go to **Product** → **Archive**
3. Wait for the build to complete
4. The Organizer window will open

### Step 3: Upload to App Store Connect

1. In the Organizer, select your archive
2. Click **Distribute App**
3. Select **App Store Connect**
4. Click **Upload**
5. Follow the prompts to upload

### Step 4: Complete App Store Listing

In App Store Connect, fill in:

#### App Information
- **Subtitle**: Turn meetings into action items
- **Category**: Productivity
- **Content Rights**: No third-party content

#### Pricing
- Set your pricing (Free, Paid, or Freemium)

#### Screenshots Required
| Device | Sizes |
|--------|-------|
| iPhone 6.7" | 1290 x 2796 (iPhone 14 Pro Max) |
| iPhone 6.5" | 1284 x 2778 (iPhone 11 Pro Max) |
| iPhone 5.5" | 1242 x 2208 (iPhone 8 Plus) |
| iPad Pro 12.9" | 2048 x 2732 |

#### App Description (Example)
```
ActionMinutes transforms your meetings from time-wasters into productivity powerhouses.

KEY FEATURES:
• Capture meeting notes with AI-powered action extraction
• Scan handwritten notes with your camera
• Get smart reminders for your action items
• Track meeting outcomes and deadlines
• Export to your favorite tools

Never leave a meeting without clear next steps again!
```

#### Keywords
`meeting notes, action items, productivity, meetings, notes, todo, task management`

#### Privacy Policy URL
`https://your-domain.com/privacy-policy`

#### Support URL
`https://your-domain.com/support`

### Step 5: Submit for Review

1. Complete all required information
2. Click **Add for Review**
3. Click **Submit to App Review**

Review typically takes 24-48 hours.

---

## Troubleshooting

### Common Issues

#### "Signing requires a development team"
- Select your Apple Developer team in Signing & Capabilities

#### Pod install fails
```bash
cd ios/App
pod repo update
pod install --repo-update
```

#### Build fails with module errors
```bash
# Clean and rebuild
cd ios/App
rm -rf Pods Podfile.lock
pod install
# Then rebuild in Xcode: Product → Clean Build Folder
```

#### App crashes on launch
- Check Xcode console for errors
- Verify all permissions are in Info.plist
- Ensure web assets are synced (`npx cap sync ios`)

#### Push notifications not working
- Enable Push Notifications capability in Xcode
- Configure in Apple Developer portal
- Add APNs key to your server

### Useful Commands

```bash
# Rebuild everything from scratch
npm run build
npx cap sync ios
cd ios/App && pod install && cd ../..
npx cap open ios

# Check Capacitor configuration
npx cap doctor

# Update Capacitor plugins
npx cap update ios
```

---

## App Configuration Reference

### capacitor.config.ts
```typescript
{
  appId: 'com.actionminutes.app',
  appName: 'ActionMinutes',
  webDir: 'dist/public',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#6366f1',
    },
    LocalNotifications: {
      smallIcon: 'ic_launcher_foreground',
      iconColor: '#6366f1',
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#6366f1',
    },
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'actionminutes',
  },
}
```

### Permissions Configured
| Permission | Usage Description |
|------------|-------------------|
| Camera | Scan and import handwritten notes |
| Photo Library | Import images of notes |
| Photo Library Add | Save captured images |
| Microphone | Voice recording (future) |
| Face ID | Secure app authentication |
| Notifications | Reminders and alerts |

---

## Quick Reference Commands

```bash
# One-liner to build and sync
npm run build && npx cap sync ios && npx cap open ios

# Update after code changes
npm run build && npx cap copy ios

# Full clean rebuild
rm -rf node_modules dist ios/App/Pods
npm install
npm run build
cd ios/App && pod install && cd ../..
npx cap sync ios
```

---

## Support

For issues with:
- **Capacitor**: https://capacitorjs.com/docs
- **Xcode**: https://developer.apple.com/documentation/xcode
- **App Store Connect**: https://developer.apple.com/app-store-connect/

---

*Last updated: August 2025*
