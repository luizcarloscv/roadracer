# AI Development Rules - Road Racer App

This document outlines the technical stack and development standards for the Road Racer Moto Clube application.

## 🚀 Tech Stack

- **Frontend Framework:** React 19 with Vite and TypeScript.
- **Styling:** Tailwind CSS 4 for utility-first styling.
- **UI Components:** Shadcn/UI (Radix UI primitives) for accessible, consistent components.
- **Icons:** Lucide React for all system iconography.
- **Animations:** Motion (formerly Framer Motion) for fluid transitions and interactions.
- **Backend & Database:** Firebase (Firestore for NoSQL, Authentication for users, Storage for images).
- **Mobile Integration:** Capacitor for wrapping the web app into native Android/iOS.
- **Notifications:** Sonner for in-app toasts and Firebase Cloud Messaging (FCM) for push notifications.
- **Date Handling:** date-fns for all date formatting and manipulation.

## 🛠️ Library Usage Rules

### 1. UI & Styling
- **Shadcn/UI:** Always check `src/components/ui/` before creating a new UI component. Use these as the foundation.
- **Tailwind CSS:** Use utility classes for all layouts and spacing. Avoid custom CSS files unless absolutely necessary (use `src/index.css` for globals).
- **Icons:** Exclusively use `lucide-react`. Do not install other icon libraries.

### 2. State & Data
- **Firebase:** Use the modular Firebase SDK (v10+). All database operations must go through `src/lib/firebase.ts`.
- **Auth:** Use the `AuthProvider` context for accessing user data and permissions. Do not call `auth.currentUser` directly in components; use `useAuth()`.
- **Types:** All data structures must have a corresponding interface in `src/types/index.ts`.

### 3. Interaction & Feedback
- **Toasts:** Use `toast` from `sonner` for user feedback (success, error, info).
- **Animations:** Use `motion` components for any element that moves or fades. Keep animations subtle and "mechanical" to fit the biker theme.
- **Modals:** Use the Shadcn `Dialog` component for complex forms or settings.

### 4. Mobile Specifics
- **Capacitor:** Use `Capacitor.isNativePlatform()` to gate native-only features like Haptics or Push Notifications.
- **Permissions:** Always use the `PermissionGuard` for features requiring GPS or Notifications on mobile.

## 🎨 Design Language
- **Theme:** Dark mode by default (`neutral-950`).
- **Accent:** Red (`red-600`) for primary actions and branding.
- **Typography:** Geist Variable font for a modern, technical look.
- **Vibe:** High-contrast, "tough" aesthetic using checkerboard patterns and tire-tread borders.

---
*Follow these rules to maintain consistency and performance across the Road Racer ecosystem.*