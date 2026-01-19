# ActionMinutes Mobile App

A React Native mobile app for ActionMinutes, built with Expo.

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- EAS CLI (for building): `npm install -g eas-cli`
- Expo Go app on your phone (for testing)

## Setup

1. **Navigate to the mobile app directory:**
   ```bash
   cd mobile-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Update API URL:**
   Edit `src/services/config.ts` and set your API URL:
   ```typescript
   export const API_BASE_URL = 'https://your-actionminutes-app.replit.app';
   ```

4. **Add app assets:**
   Add the following images to the `assets/` folder:
   - `icon.png` - App icon (1024x1024)
   - `splash.png` - Splash screen (1284x2778)
   - `adaptive-icon.png` - Android adaptive icon (1024x1024)
   - `notification-icon.png` - Notification icon (96x96)
   - `favicon.png` - Web favicon (48x48)

## Development

**Start the development server:**
```bash
npm start
```

This will show a QR code. Scan it with:
- **iOS**: Camera app → Opens in Expo Go
- **Android**: Expo Go app → Scan QR Code

## Building for Production

### 1. Configure EAS

```bash
eas login
eas build:configure
```

### 2. Update app.json

Edit `app.json` and update:
- `expo.extra.eas.projectId` with your EAS project ID
- `expo.ios.bundleIdentifier` if needed
- `expo.android.package` if needed

### 3. Build

**Preview build (for testing):**
```bash
npm run build:preview
```

**Production build:**
```bash
# Android
npm run build:android

# iOS
npm run build:ios
```

## Features

- **Inbox**: Central hub for all action items
- **Capture**: Record meeting notes with camera OCR and voice transcription
- **Tasks**: Manage tasks with filters and due dates
- **Notes**: Encrypted notes with tags and rich text
- **Journal**: Daily reflection with AI prompts and mood tracking
- **Calendar**: View and sync events from Google/Outlook
- **Settings**: Profile, subscriptions, and integrations

## API Configuration

The app connects to your existing ActionMinutes backend. Make sure your backend:
1. Has CORS enabled for mobile requests
2. Has all API endpoints implemented
3. Is accessible from the internet

## Tech Stack

- **React Native** with Expo
- **React Navigation** for navigation
- **TanStack Query** for data fetching
- **Zustand** for state management
- **Expo SecureStore** for secure token storage
- **Expo Camera/ImagePicker** for camera features
- **Expo Notifications** for push notifications

## Project Structure

```
mobile-app/
├── App.tsx                 # App entry point
├── app.json               # Expo configuration
├── package.json           # Dependencies
├── src/
│   ├── components/        # Reusable UI components
│   ├── hooks/            # Custom React hooks
│   ├── navigation/       # Navigation configuration
│   ├── screens/          # App screens
│   │   ├── auth/        # Authentication screens
│   │   └── ...          # Feature screens
│   ├── services/         # API and auth services
│   ├── store/           # Zustand store
│   └── utils/           # Colors, helpers
└── assets/              # App icons and images
```

## Troubleshooting

### "Network request failed"
- Check that the API URL is correct in `config.ts`
- Ensure your backend is running and accessible
- Check CORS configuration on the backend

### "Invalid token"
- Clear app data and login again
- Check that your backend JWT secret is configured

### Build fails
- Run `eas build:configure` again
- Check that all assets exist in the `assets/` folder
- Verify `app.json` configuration
