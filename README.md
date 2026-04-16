# Mobi - Advanced Student Transport Solution

Mobi is a premium, real-time mobile application designed to bridge the gap between students and transport providers. Borrowing design cues from industry leaders like **inDrive**, Mobi offers a state-of-the-art experience focused on reliability, transparency, and safety.

## 🚀 Core Features

### 👨‍🎓 Student Experience
*   **Intuitive Booking Form**: High-precision map integration for selecting pickup locations.
*   **Intelligent Trip Discovery**: Automatic matching with scheduled trips based on school arrival times.
*   **Real-time Trip Status**: Dynamic booking cards that update instantly (Pending → Assigned → In Progress → Completed) using Supabase Realtime.
*   **Live Driver Tracking**: A premium "Live Trip" view featuring:
    *   Real-time driver arrival countdown.
    *   Premium Driver Cards with ratings, photos, and vehicle details.
    *   Interactive Mapbox route visualization showing current driver position.
*   **Automatic Notifications**: Instant on-screen alerts when a driver starts a trip.

### 👨‍✈️ Driver Experience
*   **Streamlined Registration**: A multi-step onboarding flow with vehicle verification and automated credential management.
*   **Trip Management**: Dedicated dashboard for viewing assigned student lists and trip schedules.
*   **Live Journey Interface**:
    *   Interactive navigation map.
    *   Seamless "Start Trip" and "Complete Trip" synchronization.
    *   Automated student pickup sequencing.
*   **Profile Management**: Premium profile cards showing performance ratings and total trips completed.

---

## 🛠 Tech Stack

*   **Frontend**: React Native with Expo (Cross-platform iOS & Android).
*   **Backend & Database**: **Supabase** (PostgreSQL) for secure, scalable data storage.
*   **Real-time Engine**: Supabase PostgREST & Channels for sub-second UI updates.
*   **Maps & Geodata**: Mapbox SDK for high-performance route rendering and location intelligence.
*   **Authentication**: Integrated Supabase Auth with custom role-based redirection.

---

## 🎨 Design Philosophy

Mobi isn't just an MVP; it's a **Premium Experience**.
*   **Vibrant Color Palette**: Using Mobi's signature blue paired with a refined dark-mode aesthetic.
*   **Micro-Animations**: Pulsing "Captain Search" states and smooth transitions for a modern feel.
*   **Accessibility**: Full support for both **LTR (English)** and **RTL (Arabic)** layouts.
*   **Glassmorphism**: Elegant card designs with subtle shadows and blur effects for a depth-first UI.

---

## 🔐 Security & Architecture

*   **Row Level Security (RLS)**: Fine-grained database policies ensuring students only see their relevant driver and trip data.
*   **Source of Truth**: The `trips` table acts as the master record, ensuring that if a driver starts a trip, the student's app reflects that status immediately across all screens.
*   **Reliable Data Enrichment**: Advanced service layer that bridges disparate data (Bus, Driver, User) into a single, cohesive "Enriched Trip" object for the UI.

---

## 🏗 Setup & Deployment

1.  **Install Dependencies**: `npm install`
2.  **Environment Setup**: Configure `.env` with your Supabase URL and Anon Key.
3.  **Database Migration**: Ensure the `trips`, `bookings`, `drivers`, and `students` tables are provisioned in Supabase.
4.  **Launch App**: `npm start`

---

*Developed with a focus on visual excellence and real-time reliability.*
