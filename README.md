# 🌳 The Johns Reunion - Brownsville 2026

A modern, responsive website built for the upcoming Johns Family Reunion. This project serves as the central hub for family members to view schedules, register for events, share ideas, and see who is attending.

![Project Status](https://img.shields.io/badge/Status-In%20Development-yellow)
![License](https://img.shields.io/badge/License-MIT-green)

## 🚀 Live Demo
**[View the Live Site Here](https://jstreeter23.github.io/johns-reunion/)** 

## ✨ Features

* **⚡ Simulated SPA Experience:** Fast, app-like navigation without page reloads using a lightweight vanilla JS router.
* **🎨 Custom Design System:** Earthy "Rooted in Love" color palette using Tailwind CSS with custom `brand` and `sand` themes.
* **🌗 Dark Mode:** Fully supported dark mode that respects user system preferences and includes a manual toggle.
* **📱 Mobile-First:** Responsive navigation that adapts from a desktop header to a mobile drawer menu.
* **📅 Event Calendar:** Interactive calendar with tabs to toggle between timeline and grid view, with modal pop-ups for event details.
* **📸 Photo Gallery:** Horizontal snap-scroll gallery with lightbox modal for viewing family memories.
* **⏳ Countdown Ticker:** Dynamic countdown showing days until the reunion.
* **👤 User Profiles:** Attendee detail modals with profile photos and registration info.
* **📝 Registration Form:** Complete participant form with shirt sizes, birthday, and optional photo upload.
* **💡 Ideas Submission:** Form for family members to submit activity ideas.

## 🛠️ Tech Stack

**Frontend**
* **Core:** HTML5, Vanilla JavaScript (ES6+)
* **Styling:** Tailwind CSS (via CDN for rapid prototyping)
* **Icons:** Lucide Icons
* **Fonts:** Google Fonts (Merriweather & Inter)

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
├── ideas.html          # Idea submission form
├── attendance.html     # List of attendees
└── register.html       # Registration form
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
    alt_phone TEXT,
    address TEXT,
    branch TEXT NOT NULL,
    parents_names TEXT,
    birthday DATE,
    shirt_size TEXT,
    household_members INTEGER,
    names_ages TEXT,
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
4. Events will automatically appear on the calendar

---

## 📊 Database Schema

### `registrations` Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (auto-generated) |
| name | TEXT | Full name (required) |
| email | TEXT | Email address (required) |
| mobile | TEXT | Mobile phone (required) |
| alt_phone | TEXT | Alternative phone |
| address | TEXT | Street address |
| branch | TEXT | Family branch (required) |
| parents_names | TEXT | Parents' names |
| birthday | DATE | Date of birth |
| shirt_size | TEXT | S, M, L, XL, 2XL, 3XL |
| household_members | INTEGER | Number attending |
| names_ages | TEXT | Names and ages of household |
| profile_photo | TEXT | Base64 encoded photo |
| created_at | TIMESTAMP | Registration timestamp |

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

## 🔒 Security Notes

- The current setup uses public (anon) policies for simplicity
- For production, consider adding:
  - Email verification for registrations
  - Rate limiting on form submissions
  - More restrictive RLS policies
  - Admin authentication for data management

---

## 🤝 Contributing

This is a family project, but suggestions are welcome! Please open an issue or submit a pull request.

---

## 📄 License

MIT License - Feel free to use this as a template for your own family reunion website!
