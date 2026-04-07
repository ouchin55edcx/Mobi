# Mobi — Student Transport App

A React Native (Expo) mobile application for student transportation management.

## 📋 Features

- ✅ Student registration with OTP email verification
- ✅ Driver registration and approval workflow
- ✅ Trip booking and real-time tracking
- ✅ Group ride optimization
- ✅ Live location updates via Supabase Realtime
- ✅ Map integration with Mapbox
- ✅ Multi-language support (English/Arabic)
- ✅ Push notifications
- ✅ Profile management

## 🚀 Quick Start

### Prerequisites

- Node.js >= 16
- npm or yarn
- Expo CLI
- iOS Simulator / Android Emulator / Physical device

### Installation

```bash
# Install dependencies
npm install

# Create .env file (see .env.example)
cp .env.example .env

# Start the app
npx expo start
```

### Environment Setup

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your-anon-key-here
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=your-mapbox-token-here
```

Get your Supabase credentials from **Project Settings → API**.

## 📧 OTP Email Verification

Student registration uses **6-digit OTP code** verification via email.

### Setup Guide

See **[OTP_VERIFICATION_SETUP.md](OTP_VERIFICATION_SETUP.md)** for complete setup instructions:

1. Configure Supabase OTP settings
2. Update email template
3. Run database migrations
4. Apply RLS policies
5. Test the OTP flow

### OTP Flow

```
Registration Form → OTP Email → Enter Code → Student Profile Created → StudentHome
```

**Features:**
- Auto-advances input on each digit
- Auto-submits on 6th digit
- Auto-focuses previous on backspace
- Resend button with 60s cooldown
- 10-minute code expiry

## 🗄️ Database

### Migrations

All database migrations are in `supabase/migrations/`:

- `add_user_id_to_students.sql` — Links students to Supabase auth
- `COMPLETE_DATABASE_SETUP.sql` — Full schema setup

Run migrations in Supabase SQL Editor.

### RLS Policies

See `supabase-rls-policies.sql` for Row Level Security configuration.

## 📁 Project Structure

```
mobi-app-mvp/
├── src/
│   ├── screens/          # Screen components
│   │   ├── student/      # Student screens
│   │   ├── driver/       # Driver screens
│   │   ├── auth/         # Authentication screens
│   │   └── public/       # Public screens (splash, onboarding)
│   ├── shared/
│   │   ├── components/   # Reusable components
│   │   ├── services/     # API/Supabase services
│   │   ├── hooks/        # Custom React hooks
│   │   └── utils/        # Utilities (validation, fonts, etc.)
│   ├── navigation/       # Navigation components
│   └── lib/              # Supabase client config
├── supabase/
│   └── migrations/       # SQL migration files
├── assets/               # Images, icons, fonts
└── App.js                # Root app component
```

## 🔐 Authentication

### Student Auth Flow

1. **Registration**: Email + form data → OTP email → Verify code → Profile created
2. **Login**: Email + OTP code → Verify → Session created
3. **Session**: Persisted via AsyncStorage, auto-refreshed

### Driver Auth Flow

1. **Registration**: Email + vehicle details → Pending approval
2. **Approval**: Admin approves in Supabase dashboard
3. **Login**: Email + password → Check approval status → Access granted

##  Design System

- **Primary Color**: `#3185FC` (Blue)
- **Fonts**: Ubuntu (via Google Fonts)
- **Icons**: Material Icons (via @expo/vector-icons)
- **Maps**: Mapbox GL
- **UI Framework**: React Native + custom components

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run with coverage
npm test -- --coverage
```

## 📱 Platforms

- ✅ iOS (tested on iOS 15+)
- ✅ Android (tested on Android 12+)
- ✅ Web (limited features)

##  Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 👥 Team

- Mustapha — Lead Developer
- Rachid — Backend & Database

##  Support

For issues or questions:

1. Check documentation in `docs/` folder
2. Review setup guides:
   - [OTP_VERIFICATION_SETUP.md](OTP_VERIFICATION_SETUP.md)
   - [EMAIL_VERIFICATION_SETUP.md](EMAIL_VERIFICATION_SETUP.md) (legacy)
3. Open an issue on GitHub
4. Contact the development team

## 🔗 Links

- [Supabase Dashboard](https://app.supabase.com)
- [Mapbox Studio](https://studio.mapbox.com)
- [Expo Documentation](https://docs.expo.dev)
- [React Native Documentation](https://reactnative.dev)

---

**Built with ❤️ using React Native, Expo, and Supabase**
