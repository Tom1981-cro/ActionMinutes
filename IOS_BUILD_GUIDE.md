# ActionMinutes iOS Build Guide

Complete step-by-step guide to build and publish ActionMinutes for iOS.

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
- **macOS 13.0+** (Ventura or later recommended)
- **Xcode 15+** (download from App Store - ~12GB)
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

# Or with Homebrew:
brew install cocoapods

# Install iOS dependencies
cd ios/App
pod install --repo-update
cd ../..
```

### Step 3: Configure Environment

Ensure your environment variables are set for production in your deployment.

---

## Build Process

### Quick Build (One Command)

```bash
# Run the build script
./scripts/build-ios.sh
```

### Manual Build Steps

```bash
# Step 1: Build web assets
npm run build

# Step 2: Sync to iOS
npx cap sync ios

# Step 3: Open in Xcode
npx cap open ios
```

---

## Configure in Xcode

### 1. Select Development Team

1. Click on **"App"** in the project navigator (left sidebar)
2. Select **"App"** under TARGETS
3. Go to **Signing & Capabilities** tab
4. Under "Signing", select your **Team** from the dropdown
5. Verify **Bundle Identifier** is: `com.actionminutes.app`

### 2. Update App Version

In the same General tab:
- **Version**: `1.0.0` (user-facing version)
- **Build**: `1` (increment for each build)

### 3. Configured Capabilities

The following are already configured:

| Capability | Purpose | Status |
|------------|---------|--------|
| Camera | Scan handwritten notes | ✅ Configured |
| Photo Library | Import/save images | ✅ Configured |
| Microphone | Voice notes (future) | ✅ Configured |
| Face ID | Secure authentication | ✅ Configured |
| Push Notifications | Reminders & alerts | ✅ Configured |
| Background Modes | Background refresh | ✅ Configured |
| Deep Linking | `actionminutes://` URL scheme | ✅ Configured |

### 4. App Icons & Launch Screen

- **App Icon**: Located at `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
  - 1024x1024 icon is included
- **Launch Screen**: Configured with violet (#6366f1) background
  - Storyboard at `ios/App/App/Base.lproj/LaunchScreen.storyboard`

---

## Testing

### Test on Simulator

1. In Xcode, select an iPhone simulator from the device dropdown (top bar)
2. Click the **Play** button (▶) or press `Cmd + R`
3. The app will build and launch in the simulator

### Test on Physical Device

1. Connect your iPhone via USB cable
2. Select your device from the device dropdown
3. On first connection, trust your Mac on the device:
   - Go to **Settings > General > Device Management** on iPhone
4. Click **Play** to build and install

### Features to Test

- [ ] User authentication (Clerk login)
- [ ] Meeting capture and note creation
- [ ] Camera for scanning handwritten notes
- [ ] Photo gallery import
- [ ] Local notifications / reminders
- [ ] Share functionality
- [ ] Deep links (`actionminutes://`)
- [ ] App lifecycle (background/foreground)

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
   - **SKU**: actionminutes-001 (or your unique ID)

### Step 2: Archive the App

1. In Xcode, select **Any iOS Device (arm64)** as the build target
2. Go to **Product** → **Archive**
3. Wait for the build to complete (~2-5 minutes)
4. The Organizer window will open automatically

### Step 3: Upload to App Store Connect

1. In the Organizer, select your archive
2. Click **Distribute App**
3. Select **App Store Connect** → **Upload**
4. Follow the prompts (signing, entitlements review)
5. Click **Upload**

### Step 4: Complete App Store Listing

In App Store Connect, fill in:

#### App Information
- **Subtitle**: Turn meetings into action items
- **Category**: Productivity
- **Secondary Category**: Business (optional)

#### Screenshots Required

| Device | Size | Count |
|--------|------|-------|
| iPhone 6.7" | 1290 x 2796 | 3-10 |
| iPhone 6.5" | 1284 x 2778 | 3-10 |
| iPhone 5.5" | 1242 x 2208 | 3-10 |
| iPad Pro 12.9" | 2048 x 2732 | 3-10 |

#### App Description
```
ActionMinutes transforms your meetings from time-wasters into productivity powerhouses.

KEY FEATURES:
• AI-powered action item extraction from meeting notes
• Scan handwritten notes with your camera
• Smart reminders for deadlines and follow-ups
• Organize meetings by project or team
• Export and share meeting summaries
• Secure authentication with Face ID

Stop leaving meetings without clear next steps. ActionMinutes ensures every discussion leads to action.
```

#### Keywords (100 characters max)
```
meeting notes,action items,productivity,meetings,notes,todo,task,agenda,minutes,AI,OCR
```

#### Required URLs
- **Privacy Policy**: Your privacy policy URL
- **Support URL**: Your support/contact URL

### Step 5: Submit for Review

1. Complete all required fields
2. Add build from App Store Connect
3. Click **Add for Review**
4. Click **Submit to App Review**

Review typically takes **24-48 hours** (sometimes faster).

---

## Troubleshooting

### Common Issues

#### "Signing requires a development team"
1. Open Xcode → App target → Signing & Capabilities
2. Select your Apple Developer team from dropdown

#### Pod install fails
```bash
cd ios/App
pod repo update
pod deintegrate
pod install --repo-update
```

#### Build fails with module errors
```bash
# Clean everything
cd ios/App
rm -rf Pods Podfile.lock
rm -rf ~/Library/Developer/Xcode/DerivedData/*
pod install

# In Xcode: Product → Clean Build Folder (Cmd+Shift+K)
# Then rebuild
```

#### App crashes on launch
1. Check Xcode console (View → Debug Area → Activate Console)
2. Look for crash logs
3. Verify all permissions are in Info.plist
4. Ensure web assets are synced: `npx cap sync ios`

#### Camera/Photo permissions not working
Verify these keys exist in `ios/App/App/Info.plist`:
- `NSCameraUsageDescription`
- `NSPhotoLibraryUsageDescription`
- `NSPhotoLibraryAddUsageDescription`

#### White screen on app launch
```bash
# Rebuild and resync
npm run build
npx cap sync ios
# Then rebuild in Xcode
```

### Useful Commands

```bash
# Full rebuild from scratch
rm -rf node_modules dist ios/App/Pods
npm install
npm run build
cd ios/App && pod install && cd ../..
npx cap sync ios
npx cap open ios

# Check Capacitor status
npx cap doctor

# Update Capacitor plugins
npx cap update ios

# Copy web assets only (faster than sync)
npx cap copy ios
```

---

## Project Configuration Reference

### capacitor.config.ts
```typescript
{
  appId: 'com.actionminutes.app',
  appName: 'ActionMinutes',
  webDir: 'dist/public',
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'actionminutes',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#6366f1',
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#6366f1',
    },
  },
}
```

### Capacitor Plugins Included
| Plugin | Version | Purpose |
|--------|---------|---------|
| @capacitor/app | 8.0.0 | App lifecycle |
| @capacitor/camera | 8.0.0 | Camera & photo access |
| @capacitor/local-notifications | 8.0.0 | Local notifications |
| @capacitor/share | 8.0.0 | Native share sheet |
| @capacitor/splash-screen | 8.0.0 | Launch screen control |
| @capacitor/status-bar | 8.0.0 | Status bar styling |

### iOS Permissions (Info.plist)
| Key | Description |
|-----|-------------|
| NSCameraUsageDescription | Camera for scanning notes |
| NSPhotoLibraryUsageDescription | Photo library access |
| NSPhotoLibraryAddUsageDescription | Save photos to library |
| NSMicrophoneUsageDescription | Voice recording |
| NSFaceIDUsageDescription | Biometric authentication |

---

## Quick Reference

```bash
# Quick build and open
npm run build && npx cap sync ios && npx cap open ios

# After code changes only
npm run build && npx cap copy ios

# Update after dependency changes
npm install && npx cap sync ios
```

---

## Support Resources

- **Capacitor Docs**: https://capacitorjs.com/docs
- **Xcode Help**: https://developer.apple.com/documentation/xcode
- **App Store Connect**: https://developer.apple.com/app-store-connect/
- **Apple Developer Forums**: https://developer.apple.com/forums/

---

*Last updated: January 2025*
