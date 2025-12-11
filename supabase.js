// ============================================
// SUPABASE CONFIGURATION
// ============================================
// 
// To set up your Supabase backend:
// 1. Go to https://supabase.com and create a free account
// 2. Create a new project
// 3. Go to Project Settings > API
// 4. Copy your Project URL and anon/public key
// 5. Replace the values below
//
// ============================================

// Replace these with your Supabase project credentials
const SUPABASE_URL = 'https://wpkzcyzpivvxnsjwmueb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_giBhysrcmhpXq5q9DWdhMg_AyqDi7WW';

// Initialize Supabase client (will be set after library loads)
let supabase = null;

function initSupabase() {
    if (typeof window.supabase !== 'undefined' && SUPABASE_URL !== 'YOUR_SUPABASE_PROJECT_URL') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase initialized successfully');
        return true;
    } else if (SUPABASE_URL === 'YOUR_SUPABASE_PROJECT_URL') {
        console.warn('⚠️ Supabase not configured. Using localStorage fallback. See supabase.js for setup instructions.');
        return false;
    }
    return false;
}

// Check if Supabase is configured and ready
function isSupabaseReady() {
    return supabase !== null && SUPABASE_URL !== 'YOUR_SUPABASE_PROJECT_URL';
}

// ============================================
// REGISTRATIONS
// ============================================

async function submitRegistrationToSupabase(formData) {
    if (!isSupabaseReady()) {
        return { success: false, fallback: true };
    }
    
    try {
        const { data, error } = await supabase
            .from('registrations')
            .insert([{
                name: formData.name,
                email: formData.email,
                mobile: formData.mobile,
                address: formData.address,
                branch: formData.branch,
                birthday: formData.birthday || null,
                profile_photo: formData.profilePhoto
            }])
            .select();
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error submitting registration:', error);
        return { success: false, error };
    }
}

async function getRegistrationsFromSupabase() {
    if (!isSupabaseReady()) {
        return { success: false, fallback: true };
    }
    
    try {
        const { data, error } = await supabase
            .from('registrations')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching registrations:', error);
        return { success: false, error };
    }
}

// ============================================
// IDEAS
// ============================================

async function submitIdeaToSupabase(name, idea) {
    if (!isSupabaseReady()) {
        return { success: false, fallback: true };
    }
    
    try {
        const { data, error } = await supabase
            .from('ideas')
            .insert([{ name, idea }])
            .select();
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error submitting idea:', error);
        return { success: false, error };
    }
}

async function getIdeasFromSupabase() {
    if (!isSupabaseReady()) {
        return { success: false, fallback: true };
    }
    
    try {
        const { data, error } = await supabase
            .from('ideas')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching ideas:', error);
        return { success: false, error };
    }
}

async function deleteAllIdeasFromSupabase() {
    if (!isSupabaseReady()) {
        return { success: false, fallback: true };
    }
    
    try {
        const { data, error } = await supabase
            .from('ideas')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using a condition that matches all rows)
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error deleting ideas:', error);
        return { success: false, error };
    }
}

// ============================================
// EVENTS
// ============================================

async function getEventsFromSupabase() {
    if (!isSupabaseReady()) {
        return { success: false, fallback: true };
    }
    
    try {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('event_date', { ascending: true });
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching events:', error);
        return { success: false, error };
    }
}

// Helper to convert Supabase event to app format
function formatSupabaseEvent(event) {
    const date = new Date(event.event_date);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const timeStr = event.event_time ? ` • ${event.event_time}` : '';
    
    return {
        id: event.id,
        title: event.title,
        time: `${monthNames[date.getMonth()]} ${date.getDate()}${timeStr}`,
        date: event.event_date,
        location: event.location || 'TBD',
        desc: event.description || '',
        extra: event.extra_info || ''
    };
}

// ============================================
// SQL SETUP SCRIPT (Run this in Supabase SQL Editor)
// ============================================
/*
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

-- Enable Row Level Security (optional but recommended)
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read/write (for demo purposes)
-- For production, you'd want more restrictive policies
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
*/

