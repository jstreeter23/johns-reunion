# 🌳 The Johns Reunion - Brownsville 2026

A modern, responsive website built for the upcoming Johns Family Reunion. This project serves as the central hub for family members to view schedules, register for events, share ideas, and see who is attending.

![Project Status](https://img.shields.io/badge/Status-In%20Development-yellow)
![License](https://img.shields.io/badge/License-MIT-green)

## 🚀 Live Demo
**[View the Live Site Here](https://jstreeter23.github.io/johns-reunion/)** 

## ✨ Features

### Core Experience
* **⚡ Simulated SPA Experience:** Fast, app-like navigation without page reloads using a lightweight vanilla JS router.
* **🎨 Custom Design System:** Earthy "Rooted in Love" color palette using Tailwind CSS with custom `brand` and `sand` themes.
* **🌗 Dark Mode:** Fully supported dark mode that respects user system preferences and includes a manual toggle.
* **📱 Mobile-First:** Responsive navigation that adapts from a desktop header to a mobile drawer menu.
* **⏳ Countdown Ticker:** Dynamic countdown showing days until the reunion.
* **🔒 Privacy-Focused:** Birthday collection limited to month/day (no year), with zodiac sign display for fun.

### Photo Gallery
* **📸 Infinite Loop Gallery:** Horizontal snap-scroll gallery with family photos that loops continuously.
* **🖼️ Full Image Preview:** Photos displayed with `object-contain` so faces are never cropped.
* **🔍 Lightbox Modal:** Click any photo to view full-size with navigation arrows and photo counter.
* **↔️ Swipe Navigation:** Swipe or use arrows to browse photos in both directions.

### Calendar & Events
* **📅 Dual View Calendar:** Toggle between timeline view and calendar grid view.
* **🔄 Dynamic Events:** Events load from Supabase in real-time.
* **📋 Event Modals:** Click any event (from timeline or calendar) to see full details in a modal with date, time, location, description, and additional info.
* **📆 Navigation:** "Events" tab in navigation (renamed from "Calendar").

### Attendance Tracking
* **👥 Scrollable Table:** Fixed-height table that scrolls internally (page doesn't scroll).
* **🏷️ Branch Filtering:** Filter attendees by family branch (William Johns, Milton Johns, etc.).
* **📊 Live Count:** Shows total attendees or filtered count dynamically.
* **👤 User Profiles:** Click any attendee to see their profile modal with:
  - Family Branch
  - Birthday (MM/DD format for privacy) and Zodiac Sign
  - Sign-up Date
  - Profile Photo (if provided)
* **🗺️ Interactive Map:** Visual map showing which US states have registered attendees, with hover tooltips showing attendee names.

### Forms & Submissions
* **📝 Registration Form:** Streamlined participant registration with:
  - Contact information (name, email, mobile, address)
  - Family branch selection
  - Birthday (month/day only for privacy - no year)
  - Optional profile photo upload
  - **Multiple Participants:** Register additional family members on the same form - each participant is saved as a separate registration
* **📍 Address Autocomplete:** Free address autocomplete using Photon/Nominatim APIs (no API key required), limited to US addresses only
* **✅ Visual Confirmations:** Beautiful success overlays after form submissions (no browser alerts).
* **💡 Ideas Submission:** Two-tab interface:
  - **Share Idea Tab:** Submit new ideas with name and idea text
  - **View Ideas Tab:** Interactive floating display of all submitted ideas - hover to see full details, helps avoid duplicates
* **🔄 Real-time Sync:** All submissions save to Supabase and appear immediately.

## 🛠️ Tech Stack

**Frontend**
* **Core:** HTML5, Vanilla JavaScript (ES6+)
* **Styling:** Tailwind CSS (via CDN for rapid prototyping)
* **Icons:** Lucide Icons
* **Fonts:** Google Fonts (Merriweather & Inter)
* **Address Autocomplete:** Photon API & Nominatim (OpenStreetMap) - free, no API key required

**Backend**
* **Database:** Supabase (PostgreSQL)
* **API:** Supabase REST API with JavaScript SDK

**Hosting**
* **Frontend:** GitHub Pages

## 📂 Project Structure

```text
johns-reunion/
├── index.html          # Main application shell (nav, footer, modals, container)
├── script.js           # Client-side routing, logic, and event handlers
├── supabase.js         # Supabase configuration and API functions
├── styles.css          # Custom CSS overrides (scrollbar, etc.)
├── home.html           # Landing page with gallery and countdown
├── calendar.html       # Event schedule (timeline + calendar views)
├── ideas.html          # Ideas page with two tabs (Share/View)
├── attendance.html     # Attendee list with map and table views
├── register.html       # Registration form with multiple participants support
├── us-map.svg          # US map SVG for attendance visualization
└── Photos/             # Family photo gallery images
    ├── Curtis and Willie Alice.png
    ├── IMG_9092.jpg
    ├── IMG_9094.jpg
    ├── IMG_9095.jpg
    ├── IMG_9096.jpg
    ├── IMG_9097.jpg
    └── IMG_9098.jpg
```

---

## 🔧 Supabase Backend Setup

The website uses Supabase as its backend for storing registrations, ideas, and events. Follow these steps to set up your own Supabase project.

### Step 1: Create a Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Sign up for a free account
3. Create a new project (choose a name and password)
4. Wait for your project to initialize (~2 minutes)

### Step 2: Create Database Tables

**Important:** The database schema has been updated. Use the SQL below which reflects the current registration form structure.

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Paste the following SQL and click **Run**:

```sql
-- Create registrations table
CREATE TABLE registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    mobile TEXT NOT NULL,
    address TEXT,
    branch TEXT NOT NULL,
    birthday TEXT,  -- Stored as MM/DD format (no year for privacy)
    profile_photo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ideas table
CREATE TABLE ideas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    idea TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create events table
CREATE TABLE events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_time TEXT,
    location TEXT,
    description TEXT,
    extra_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read/write
CREATE POLICY "Allow public read" ON registrations FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON registrations FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read" ON ideas FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON ideas FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read" ON events FOR SELECT USING (true);

-- Insert sample events
INSERT INTO events (title, event_date, event_time, location, description, extra_info) VALUES
    ('Monthly Family Update', '2025-12-14', '4:00 PM', 'Zoom', 'Venue updates & fundraising.', 'Open forum Q&A.'),
    ('Planning Committee', '2025-12-28', '5:00 PM', 'Zoom', 'Logistics & Food planning.', 'Review minutes before joining.'),
    ('Monthly Family Update', '2026-01-11', '4:00 PM', 'Zoom', 'Kick-off 2026 planning.', 'Vote on T-shirts.');
```

### Step 3: Get Your API Credentials

1. In Supabase dashboard, go to **Project Settings** (gear icon)
2. Click **API** in the left sidebar
3. Copy:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

### Step 4: Configure the Website

1. Open `supabase.js` in your project
2. Replace the placeholder values:

```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

3. Save the file and redeploy

### Step 5: Managing Data

#### View/Edit Registrations
1. Go to **Table Editor** in Supabase dashboard
2. Click on `registrations` table
3. View all registrations in a spreadsheet-like interface
4. Click any row to edit details

#### View/Edit Ideas
1. Go to **Table Editor** → `ideas`
2. See all submitted ideas with names and timestamps

#### Add/Edit Events
1. Go to **Table Editor** → `events`
2. Click **Insert row** to add new events
3. Fill in: `title`, `event_date` (YYYY-MM-DD), `event_time`, `location`, `description`, `extra_info`
4. Events will automatically appear on the calendar and timeline
5. Click any event to view full details in a modal

#### Delete Test Ideas
To clear test ideas from the database:
1. Go to **Table Editor** → `ideas`
2. Select rows to delete, or use SQL: `DELETE FROM ideas;`
3. Alternatively, use browser console: `deleteAllIdeas()` (clears both Supabase and localStorage)

---

## 📊 Database Schema

### `registrations` Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (auto-generated) |
| name | TEXT | Full name (required) |
| email | TEXT | Email address (required) |
| mobile | TEXT | Mobile phone (required) |
| address | TEXT | Street address (with autocomplete support) |
| branch | TEXT | Family branch (required) |
| birthday | TEXT | Birthday in MM/DD format (no year for privacy) |
| profile_photo | TEXT | Base64 encoded photo |
| created_at | TIMESTAMP | Registration timestamp |

**Note:** Each registration represents a single participant. When registering multiple family members, each person is saved as a separate registration record.

### `ideas` Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (auto-generated) |
| name | TEXT | Submitter's name |
| idea | TEXT | The idea content |
| created_at | TIMESTAMP | Submission timestamp |

### `events` Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (auto-generated) |
| title | TEXT | Event title |
| event_date | DATE | Date (YYYY-MM-DD format) |
| event_time | TEXT | Time (e.g., "4:00 PM") |
| location | TEXT | Location/venue |
| description | TEXT | Brief description |
| extra_info | TEXT | Additional details |
| created_at | TIMESTAMP | Creation timestamp |

---

## 🚀 Deployment

### GitHub Pages (Frontend)

1. Push your code to GitHub:
```bash
git add .
git commit -m "Add Supabase integration"
git push origin main
```

2. Go to your repository on GitHub
3. Click **Settings** → **Pages**
4. Under **Source**, select **Deploy from a branch**
5. Choose **main** branch and **/ (root)** folder
6. Click **Save**
7. Your site will be live at `https://username.github.io/repository-name/`

---

## 🔒 Security & Privacy Notes

- The current setup uses public (anon) policies for simplicity
- **Privacy Features:**
  - Birthdays stored as MM/DD only (no year) to protect personal information
  - Zodiac signs calculated and displayed for fun without revealing age
- For production, consider adding:
  - Email verification for registrations
  - Rate limiting on form submissions
  - More restrictive RLS policies
  - Admin authentication for data management

## 🔐 Admin Dashboard

The admin dashboard allows authorized users to manage events and attendees without setting up full authentication.

### Accessing the Admin Dashboard

1. Navigate to `/admin.html` or use the route: `route(event, 'admin')` in the browser console
2. Enter the password (stored in `admin-config.js`)
3. Slide the lock to unlock the dashboard

### Setting Up the Password

1. The password is stored in `admin-config.js` (this file is gitignored for security)
2. If the file doesn't exist, create it with:
   ```javascript
   const ADMIN_PASSWORD = 'your-password-here';
   ```
3. Change the password weekly by editing `admin-config.js`
4. Share the password privately with authorized users

### Admin Features

- **Events Management:**
  - Create new events
  - Edit existing events
  - Delete events
  - All changes sync with Supabase immediately

- **Attendees Management:**
  - View all registered attendees
  - Edit attendee information
  - Delete attendees
  - All changes sync with Supabase immediately

### Security Notes

- The password is stored in `admin-config.js` which is excluded from Git (see `.gitignore`)
- Session-based unlock: Once unlocked, the dashboard stays unlocked for the browser session
- No username required - just password protection
- Change password weekly for better security

## 🆕 Recent Updates

### Registration Form Improvements
- ✅ Removed shirt size field
- ✅ Removed alt phone field
- ✅ Removed attendance section (household members, names & ages)
- ✅ Removed family information section
- ✅ Streamlined to "Information" section with essential fields only
- ✅ Added support for registering multiple participants on one form
- ✅ Birthday changed to month/day only (privacy-focused)
- ✅ Added zodiac sign calculation and display

### Ideas Page Enhancements
- ✅ Added two-tab interface (Share Idea / View Ideas)
- ✅ Interactive floating ideas display with hover effects
- ✅ Helps users see existing ideas to avoid duplicates

### Address Autocomplete
- ✅ Free address autocomplete (no API key required)
- ✅ Uses Photon API and Nominatim (OpenStreetMap) with fallbacks
- ✅ Limited to US addresses only
- ✅ Validated address suggestions as you type

### UI/UX Improvements
- ✅ Navigation: "Calendar" renamed to "Events"
- ✅ User modal: Reordered to show Birthday/Zodiac second, Sign-up date third
- ✅ Event modal: Enhanced to show full details similar to user modal
- ✅ Fixed birthday day picklist selection issue
- ✅ Improved event click handlers for timeline and calendar views

---

## 🤝 Contributing

This is a family project, but suggestions are welcome! Please open an issue or submit a pull request.

---

## 📄 License

MIT License - Feel free to use this as a template for your own family reunion website!
