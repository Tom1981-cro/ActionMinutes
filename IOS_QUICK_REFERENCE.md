# ActionMinutes iOS - Quick Reference Card

## 📱 Quick Build Commands

```bash
# Automated build script (recommended)
./scripts/build-ios.sh

# Manual one-liner
npm run build && npx cap sync ios && npx cap open ios

# After code changes only (faster)
npm run build && npx cap copy ios
```

## 🔧 Project Info

| Property | Value |
|----------|-------|
| **App Name** | ActionMinutes |
| **Bundle ID** | com.actionminutes.app |
| **Version** | 1.0.0 |
| **Min iOS** | 14.0 |
| **URL Scheme** | actionminutes:// |

## 📁 Key Files

| File | Purpose |
|------|---------|
| `/capacitor.config.ts` | Capacitor configuration |
| `/ios/App/App/Info.plist` | iOS permissions & settings |
| `/ios/App/Podfile` | iOS CocoaPods dependencies |
| `/client/src/lib/mobile.ts` | Mobile-specific utilities |

## 🔐 Configured Permissions

- ✅ Camera (note scanning)
- ✅ Photo Library (import/export images)
- ✅ Microphone (voice recording)
- ✅ Face ID (biometric auth)
- ✅ Push Notifications (reminders)
- ✅ Background Refresh
- ✅ Deep Linking (actionminutes://)

## 📲 Capacitor Plugins (v8.0.0)

| Plugin | Purpose |
|--------|---------|
| @capacitor/app | App lifecycle events |
| @capacitor/camera | Camera & photo access |
| @capacitor/local-notifications | Local notifications |
| @capacitor/share | Native share sheet |
| @capacitor/splash-screen | Launch screen |
| @capacitor/status-bar | Status bar styling |

## 🛠 Troubleshooting

### Pod install issues
```bash
cd ios/App
pod repo update
pod deintegrate
pod install --repo-update
```

### Clean rebuild
```bash
rm -rf ios/App/Pods ios/App/Podfile.lock
cd ios/App && pod install && cd ../..
npm run build && npx cap sync ios
```

### Xcode build issues
```bash
# Clean derived data
rm -rf ~/Library/Developer/Xcode/DerivedData/*
# In Xcode: Product → Clean Build Folder (Cmd+Shift+K)
```

### Check Capacitor status
```bash
npx cap doctor
```

## 📖 Full Documentation

See **`/IOS_BUILD_GUIDE.md`** for complete build instructions.

---

## Xcode Quick Steps

1. **Open**: `npx cap open ios`
2. **Sign**: Select team in Signing & Capabilities
3. **Run**: Select device → Cmd+R
4. **Archive**: Product → Archive (for App Store)
