# ActionMinutes iOS - Quick Reference Card

## 📱 Quick Build Commands

```bash
# One-liner: Build and prepare everything
npm run build && npx cap sync ios && npx cap open ios

# Just sync after code changes
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
| `/ios/App/Podfile` | iOS dependencies |
| `/client/src/lib/mobile.ts` | Mobile-specific code |

## 🔐 Configured Permissions

- ✅ Camera (note scanning)
- ✅ Photo Library (import/export)
- ✅ Microphone (voice notes)
- ✅ Face ID (secure auth)
- ✅ Push Notifications (reminders)
- ✅ Background Refresh

## 📲 Capacitor Plugins

- `@capacitor/app` - App lifecycle
- `@capacitor/camera` - Camera/photo access
- `@capacitor/local-notifications` - Local notifications
- `@capacitor/share` - Native share sheet
- `@capacitor/splash-screen` - Launch screen
- `@capacitor/status-bar` - Status bar styling

## 🛠 Troubleshooting

### Pod install issues
```bash
cd ios/App
pod repo update
pod install --repo-update
```

### Clean rebuild
```bash
rm -rf ios/App/Pods ios/App/Podfile.lock
cd ios/App && pod install
```

### Capacitor issues
```bash
npx cap doctor
npx cap update ios
```

## 📖 Full Documentation

See `/IOS_BUILD_GUIDE.md` for complete build instructions.
