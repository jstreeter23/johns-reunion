

// 2. Initialize Icons & Router


async function route(event, viewId) {
    if(event) event.preventDefault();
    
    const contentContainer = document.getElementById('page-content');
    try {
        const response = await fetch(`${viewId}.html`);
        if (!response.ok) throw new Error(`Could not load ${viewId}.html`);
        const html = await response.text();
        contentContainer.innerHTML = html;
        lucide.createIcons(); // Re-initialize icons after loading new content
        
        // Update countdown if home page is loaded
        if (viewId === 'home') {
            setTimeout(() => {
                updateCountdown();
            }, 100);
        }
        
        // Initialize calendar view if calendar page is loaded
        if (viewId === 'calendar') {
            setTimeout(async () => {
                // Load events from Supabase first
                await loadEventsFromSupabase();
                // Then render the events view
                switchCalendarView('events');
            }, 100);
        }
        
        // Load attendance page (default to map view)
        if (viewId === 'attendance') {
            setTimeout(async () => {
                // Load data first
                await loadAttendanceTable();
                // Then show map view (default)
                switchAttendanceView('map');
            }, 100);
        }
    } catch (error) {
        console.error("Failed to load page:", error);
        contentContainer.innerHTML = `<div class="text-center text-red-500">Failed to load page content.</div>`;
    }

    // Update Nav State
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('text-brand-700', 'dark:text-white', 'font-bold');
        link.classList.add('text-sand-600', 'dark:text-sand-300');
    });

    const activeLink = document.getElementById(`nav-${viewId}`);
    if (activeLink) {
        activeLink.classList.remove('text-sand-600', 'dark:text-sand-300');
        activeLink.classList.add('text-brand-700', 'dark:text-white', 'font-bold');
    }

    // Also update mobile nav state for consistency
    document.querySelectorAll('.nav-link-mobile').forEach(link => {
        link.classList.remove('bg-brand-50', 'dark:bg-brand-900/50', 'font-bold');
    });
    const activeMobileLink = Array.from(document.querySelectorAll('.nav-link-mobile')).find(link => link.getAttribute('onclick').includes(`'${viewId}'`));
    if(activeMobileLink) {
        activeMobileLink.classList.add('bg-brand-50', 'dark:bg-brand-900/50', 'font-bold');
    }

    // Close mobile menu
    document.getElementById('mobile-menu').classList.add('hidden');
    window.scrollTo(0, 0);
}

function toggleMobileMenu() {
    document.getElementById('mobile-menu').classList.toggle('hidden');
}

// 3. Theme Logic
function toggleTheme() {
    const htmlEl = document.documentElement;
    htmlEl.classList.toggle('dark');
    const isDark = htmlEl.classList.contains('dark');
    document.getElementById('theme-icon').setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    lucide.createIcons();
}

// 4. Form Handlers
let uploadedPhotoData = null;

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedPhotoData = e.target.result; // Store as data URL
            document.getElementById('photo-preview-image').src = uploadedPhotoData;
            document.getElementById('photo-preview').classList.remove('hidden');
            lucide.createIcons();
        };
        reader.readAsDataURL(file);
    }
}

function removePhoto() {
    uploadedPhotoData = null;
    document.getElementById('profile-photo').value = '';
    document.getElementById('photo-preview').classList.add('hidden');
    lucide.createIcons();
}

async function handleRegistration(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i data-lucide="loader-2" class="animate-spin w-4 h-4"></i> Submitting...';
    submitBtn.disabled = true;
    lucide.createIcons();
    
    // Get form data
    const formData = {
        name: document.getElementById('full-name').value,
        email: document.getElementById('email').value,
        mobile: document.getElementById('mobile').value,
        altPhone: document.getElementById('alt-phone').value || '',
        address: document.getElementById('address').value || '',
        branch: document.getElementById('family-branch').value,
        parentsNames: document.getElementById('parents-names').value || '',
        birthday: document.getElementById('birthday').value || '',
        shirtSize: document.getElementById('shirt-size').value || '',
        householdMembers: document.getElementById('household-members').value || '',
        namesAges: document.getElementById('names-ages').value,
        profilePhoto: uploadedPhotoData || null,
        signedUp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
    
    // Try Supabase first, fall back to localStorage
    const result = await submitRegistrationToSupabase(formData);
    
    if (result.fallback) {
        // Supabase not configured - use localStorage
        console.log('⚠️ Supabase not configured, saving to localStorage');
        const userId = formData.name.toLowerCase().replace(/\s+/g, '-');
        let registrations = JSON.parse(localStorage.getItem('reunionRegistrations') || '[]');
        registrations.push({ id: userId, ...formData });
        localStorage.setItem('reunionRegistrations', JSON.stringify(registrations));
    } else if (result.success) {
        console.log('✅ Registration saved to Supabase!', result.data);
    } else {
        // Supabase error - save to localStorage as backup
        console.error('❌ Supabase error:', result.error);
        const userId = formData.name.toLowerCase().replace(/\s+/g, '-');
        let registrations = JSON.parse(localStorage.getItem('reunionRegistrations') || '[]');
        registrations.push({ id: userId, ...formData });
        localStorage.setItem('reunionRegistrations', JSON.stringify(registrations));
    }
    
    // Reset form
    e.target.reset();
    uploadedPhotoData = null;
    const photoPreview = document.getElementById('photo-preview');
    if (photoPreview) photoPreview.classList.add('hidden');
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
    
    // Show success overlay
    const successOverlay = document.getElementById('registration-success');
    if (successOverlay) {
        successOverlay.classList.remove('hidden');
        lucide.createIcons();
    }
}

function goToHome() {
    // Hide success overlay and navigate home
    const successOverlay = document.getElementById('registration-success');
    if (successOverlay) successOverlay.classList.add('hidden');
    route(null, 'home');
}

async function handleIdeaSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('idea-submit-btn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<i data-lucide="loader-2" class="animate-spin w-5 h-5"></i> Sending...';
    btn.disabled = true;
    lucide.createIcons();

    // Get form data using IDs
    const name = document.getElementById('idea-name').value || 'Anonymous';
    const idea = document.getElementById('idea-text').value || '';
    
    // Try Supabase first, fall back to localStorage
    const result = await submitIdeaToSupabase(name, idea);
    
    if (result.fallback) {
        // Use localStorage as fallback (Supabase not configured)
        let ideas = JSON.parse(localStorage.getItem('reunionIdeas') || '[]');
        ideas.push({ name, idea, created_at: new Date().toISOString() });
        localStorage.setItem('reunionIdeas', JSON.stringify(ideas));
        console.log('💾 Idea saved to localStorage (Supabase not configured)');
    } else if (result.success) {
        console.log('✅ Idea submitted to Supabase successfully!');
    } else {
        console.error('❌ Failed to submit idea:', result.error);
        // Still save to localStorage as backup
        let ideas = JSON.parse(localStorage.getItem('reunionIdeas') || '[]');
        ideas.push({ name, idea, created_at: new Date().toISOString() });
        localStorage.setItem('reunionIdeas', JSON.stringify(ideas));
    }
    
    document.getElementById('idea-success').classList.remove('hidden');
    btn.innerHTML = originalText;
    btn.disabled = false;
}

function resetIdeaForm() {
    document.getElementById('idea-form').reset();
    document.getElementById('idea-success').classList.add('hidden');
}

// 5. Modal Logic
// Default event data (used as fallback when Supabase is not configured)
let eventData = {
    'monthly-dec': { title: "Monthly Family Update", time: "Dec 14 • 4:00 PM", location: "Zoom", desc: "Venue updates & fundraising.", extra: "Open forum Q&A.", date: "2025-12-14" },
    'planning-dec': { title: "Planning Committee", time: "Dec 28 • 5:00 PM", location: "Zoom", desc: "Logistics & Food planning.", extra: "Review minutes before joining.", date: "2025-12-28" },
    'monthly-jan': { title: "Monthly Family Update", time: "Jan 11 • 4:00 PM", location: "Zoom", desc: "Kick-off 2026 planning.", extra: "Vote on T-shirts.", date: "2026-01-11" }
};

// Event date mapping for calendar (will be populated from Supabase or defaults)
let eventDateMap = {
    '2025-12-14': 'monthly-dec',
    '2025-12-28': 'planning-dec',
    '2026-01-11': 'monthly-jan'
};

// Load events from Supabase
async function loadEventsFromSupabase() {
    const result = await getEventsFromSupabase();
    
    if (result.success && result.data && result.data.length > 0) {
        // Clear existing data
        eventData = {};
        eventDateMap = {};
        
        // Populate from Supabase
        result.data.forEach(event => {
            const formatted = formatSupabaseEvent(event);
            const eventId = `event-${event.id}`;
            eventData[eventId] = formatted;
            eventDateMap[event.event_date] = eventId;
        });
        
        console.log('✅ Events loaded from Supabase:', result.data.length, 'events');
        return true;
    }
    console.log('⚠️ No events from Supabase, using defaults');
    return false;
}

// Render events timeline dynamically
function renderEventsTimeline() {
    const timeline = document.getElementById('events-timeline');
    if (!timeline) return;
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Get all events and sort by date
    const events = Object.entries(eventData).map(([id, event]) => ({
        id,
        ...event
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (events.length === 0) {
        timeline.innerHTML = '<div class="py-8 text-center text-sand-500">No upcoming events.</div>';
        return;
    }
    
    let html = '';
    events.forEach((event, index) => {
        const date = new Date(event.date);
        const month = monthNames[date.getMonth()];
        const day = date.getDate();
        const isFirst = index === 0;
        
        // Extract time from the time string (e.g., "Dec 14 • 4:00 PM" -> "4:00 PM")
        const timeParts = event.time.split('•');
        const timeOnly = timeParts.length > 1 ? timeParts[1].trim() : '';
        
        html += `
            <div class="relative pl-24 py-6 group cursor-pointer" onclick="openModal('${event.id}')">
                <div class="absolute left-2 top-6 w-12 h-12 ${isFirst ? 'bg-brand-600 text-white' : 'bg-white dark:bg-sand-700 text-sand-800 dark:text-sand-200'} rounded-xl flex flex-col items-center justify-center shadow-lg border-4 border-sand-50 dark:border-sand-900 z-10">
                    <span class="text-[10px] uppercase font-bold">${month}</span>
                    <span class="text-lg font-bold leading-none">${day}</span>
                </div>
                <div class="bg-white dark:bg-sand-800 p-6 rounded-2xl border border-sand-200 dark:border-sand-700 shadow-sm hover:shadow-md transition-all group-hover:-translate-y-1">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="text-xl font-bold font-serif">${event.title}</h3>
                        ${timeOnly ? `<span class="bg-brand-100 dark:bg-brand-900 text-brand-800 dark:text-brand-300 text-xs font-bold px-3 py-1 rounded-full">${timeOnly}</span>` : ''}
                    </div>
                    <p class="text-sand-500 dark:text-sand-400">${event.desc || ''}</p>
                    ${event.location ? `<p class="text-sand-400 dark:text-sand-500 text-sm mt-2 flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3"></i> ${event.location}</p>` : ''}
                </div>
            </div>
        `;
    });
    
    timeline.innerHTML = html;
    lucide.createIcons();
}

function openModal(eventId) {
    const data = eventData[eventId];
    if(!data) return;
    document.getElementById('modal-title').textContent = data.title;
    document.getElementById('modal-time').textContent = data.time;
    document.getElementById('modal-desc').textContent = data.desc;
    document.getElementById('modal-loc').textContent = data.location;
    document.getElementById('modal-extra').textContent = data.extra;
    document.getElementById('event-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('event-modal').classList.add('hidden');
}

// 6. Gallery Logic
function scrollGallery(direction) {
    const container = document.getElementById('gallery-scroll');
    const scrollAmount = container.clientWidth * 0.8;
    
    if (direction === 'right') {
        // If near the end, loop back to start
        if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 50) {
            container.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    } else {
        // If at the start, loop to end
        if (container.scrollLeft <= 50) {
            container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
        } else {
            container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        }
    }
}

// 7. Countdown Logic
function updateCountdown() {
    const eventDate = new Date('2026-07-14T00:00:00');
    const now = new Date();
    const diffTime = eventDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const daysLeftElement = document.getElementById('days-left');
    if (daysLeftElement) {
        if (diffDays > 0) {
            daysLeftElement.textContent = diffDays;
        } else if (diffDays === 0) {
            daysLeftElement.textContent = '0';
            const tickerContainer = document.getElementById('countdown-ticker');
            if (tickerContainer) {
                tickerContainer.querySelector('span').innerHTML = '<span class="font-bold text-white">Today!</span> The reunion is here';
            }
        } else {
            daysLeftElement.textContent = '0';
            const tickerContainer = document.getElementById('countdown-ticker');
            if (tickerContainer) {
                tickerContainer.style.display = 'none';
            }
        }
    }
}

// 8. Photo Modal Logic
const photoData = [
    { src: 'Photos/Curtis and Willie Alice.png' },
    { src: 'Photos/IMG_9092.jpg' },
    { src: 'Photos/IMG_9094.jpg' },
    { src: 'Photos/IMG_9095.jpg' },
    { src: 'Photos/IMG_9096.jpg' },
    { src: 'Photos/IMG_9097.jpg' },
    { src: 'Photos/IMG_9098.jpg' }
];

let currentPhotoIndex = 0;

function openPhotoModal(index) {
    currentPhotoIndex = index;
    const photo = photoData[index];
    const modal = document.getElementById('photo-modal');
    const modalImage = document.getElementById('photo-modal-image');
    const counter = document.getElementById('photo-counter');
    
    if (modal && photo) {
        modalImage.src = photo.src;
        modalImage.alt = 'Family Photo';
        if (counter) {
            counter.textContent = `${index + 1} / ${photoData.length}`;
        }
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        lucide.createIcons();
    }
}

function closePhotoModal() {
    const modal = document.getElementById('photo-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = ''; // Restore scrolling
    }
}

function navigatePhoto(direction) {
    currentPhotoIndex += direction;
    if (currentPhotoIndex < 0) {
        currentPhotoIndex = photoData.length - 1;
    } else if (currentPhotoIndex >= photoData.length) {
        currentPhotoIndex = 0;
    }
    openPhotoModal(currentPhotoIndex);
}

// 9. Calendar View Logic
let currentCalendarDate = new Date();

function switchCalendarView(view) {
    const eventsView = document.getElementById('events-view');
    const calendarView = document.getElementById('calendar-view');
    const tabEvents = document.getElementById('tab-events');
    const tabCalendar = document.getElementById('tab-calendar');
    
    if (view === 'events') {
        eventsView.classList.remove('hidden');
        calendarView.classList.add('hidden');
        tabEvents.classList.add('bg-brand-600', 'text-white', 'shadow-md');
        tabEvents.classList.remove('bg-sand-200', 'dark:bg-sand-800', 'text-sand-700', 'dark:text-sand-300');
        tabCalendar.classList.remove('bg-brand-600', 'text-white', 'shadow-md');
        tabCalendar.classList.add('bg-sand-200', 'dark:bg-sand-800', 'text-sand-700', 'dark:text-sand-300');
        renderEventsTimeline(); // Render the events timeline
    } else {
        eventsView.classList.add('hidden');
        calendarView.classList.remove('hidden');
        tabCalendar.classList.add('bg-brand-600', 'text-white', 'shadow-md');
        tabCalendar.classList.remove('bg-sand-200', 'dark:bg-sand-800', 'text-sand-700', 'dark:text-sand-300');
        tabEvents.classList.remove('bg-brand-600', 'text-white', 'shadow-md');
        tabEvents.classList.add('bg-sand-200', 'dark:bg-sand-800', 'text-sand-700', 'dark:text-sand-300');
        renderCalendar();
    }
}

function changeCalendarMonth(direction) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    renderCalendar();
}

function renderCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    const monthYearEl = document.getElementById('calendar-month-year');
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    // Format month/year display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    monthYearEl.textContent = `${monthNames[month]} ${year}`;
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    let calendarHTML = '<div class="grid grid-cols-7 gap-px bg-sand-200 dark:bg-sand-700">';
    
    // Add day headers
    dayHeaders.forEach(day => {
        calendarHTML += `<div class="bg-sand-100 dark:bg-sand-800 p-3 text-center text-xs font-bold text-sand-600 dark:text-sand-400 uppercase">${day}</div>`;
    });
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarHTML += '<div class="bg-white dark:bg-sand-800 p-4 min-h-[80px]"></div>';
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const eventId = eventDateMap[dateStr];
        const hasEvent = !!eventId;
        
        const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
        
        calendarHTML += `
            <div class="bg-white dark:bg-sand-800 p-2 min-h-[80px] border-b border-sand-100 dark:border-sand-700 ${hasEvent ? 'cursor-pointer hover:bg-sand-50 dark:hover:bg-sand-700 transition-colors' : ''}" ${hasEvent ? `onclick="openModal('${eventId}')"` : ''}>
                <div class="flex items-start justify-between">
                    <span class="text-sm font-medium ${isToday ? 'bg-brand-600 text-white rounded-full w-7 h-7 flex items-center justify-center' : 'text-sand-700 dark:text-sand-300'}">${day}</span>
                    ${hasEvent ? '<div class="w-2 h-2 bg-brand-600 rounded-full"></div>' : ''}
                </div>
                ${hasEvent ? `<div class="mt-1 text-xs text-brand-700 dark:text-brand-400 font-medium truncate">${eventData[eventId].title}</div>` : ''}
            </div>
        `;
    }
    
    calendarHTML += '</div>';
    calendarGrid.innerHTML = calendarHTML;
    lucide.createIcons();
}

// 10. User Modal Logic
const userData = {
    'marcus-robinson': {
        name: 'Marcus Robinson',
        branch: 'William Johns',
        signedUp: 'Oct 12, 2025',
        birthday: 'March 15, 1985',
        profilePhoto: null
    },
    'sarah-jenkins': {
        name: 'Sarah Jenkins',
        branch: 'Alice Walker',
        signedUp: 'Oct 14, 2025',
        birthday: 'July 22, 1990',
        profilePhoto: null
    }
};

function getUserData(userId) {
    // Check cachedRegistrations first (from Supabase)
    if (cachedRegistrations && cachedRegistrations.length > 0) {
        const registration = cachedRegistrations.find(r => r.id === userId);
        if (registration) {
            // Format birthday nicely
            let birthdayDisplay = 'Not provided';
            if (registration.birthday) {
                const bday = new Date(registration.birthday);
                birthdayDisplay = bday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            }
            return {
                name: registration.name,
                branch: registration.branch,
                signedUp: new Date(registration.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                birthday: birthdayDisplay,
                profilePhoto: registration.profile_photo || null
            };
        }
    }
    
    // Check localStorage for registered users
    const registrations = JSON.parse(localStorage.getItem('reunionRegistrations') || '[]');
    const registration = registrations.find(r => r.id === userId);
    
    if (registration) {
        // Format birthday nicely
        let birthdayDisplay = 'Not provided';
        if (registration.birthday) {
            const bday = new Date(registration.birthday);
            birthdayDisplay = bday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        }
        return {
            name: registration.name,
            branch: registration.branch,
            signedUp: registration.signedUp,
            birthday: birthdayDisplay,
            profilePhoto: registration.profilePhoto || null
        };
    }
    
    // Fall back to hardcoded userData
    return userData[userId];
}

function openUserModal(userId) {
    const user = getUserData(userId);
    if (!user) return;
    
    const modal = document.getElementById('user-modal');
    const modalPhoto = document.getElementById('user-modal-photo');
    const modalPhotoContainer = document.getElementById('user-modal-photo-container');
    const modalIconContainer = document.getElementById('user-modal-icon-container');
    
    document.getElementById('user-modal-name').textContent = user.name;
    document.getElementById('user-modal-branch').textContent = user.branch;
    document.getElementById('user-modal-date').textContent = user.signedUp;
    document.getElementById('user-modal-birthday').textContent = user.birthday || 'Not provided';
    
    // Handle profile photo
    if (user.profilePhoto) {
        modalPhoto.src = user.profilePhoto;
        modalPhotoContainer.classList.remove('hidden');
        modalIconContainer.classList.add('hidden');
    } else {
        modalPhotoContainer.classList.add('hidden');
        modalIconContainer.classList.remove('hidden');
    }
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    lucide.createIcons();
}

// Cache for Supabase registrations and all attendees
let cachedRegistrations = [];
let allAttendees = [];

async function loadAttendanceTable() {
    const attendanceTable = document.getElementById('attendance-table-body');
    if (!attendanceTable) return;
    
    // Show loading state
    attendanceTable.innerHTML = '<tr><td colspan="3" class="py-8 text-center text-sand-500"><i data-lucide="loader-2" class="animate-spin w-6 h-6 inline-block"></i> Loading...</td></tr>';
    lucide.createIcons();
    
    // Try to get registrations from Supabase first
    const result = await getRegistrationsFromSupabase();
    
    allAttendees = [];
    
    if (result.success && result.data) {
        // Use Supabase data
        console.log('✅ Loaded', result.data.length, 'registrations from Supabase');
        cachedRegistrations = result.data;
        allAttendees = result.data.map(reg => ({
            id: reg.id,
            name: reg.name,
            branch: reg.branch,
            signedUp: new Date(reg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            created_at: reg.created_at
        }));
    } else if (result.fallback) {
        // Supabase not configured - fall back to localStorage
        console.log('⚠️ Supabase not configured, loading from localStorage');
        const registrations = JSON.parse(localStorage.getItem('reunionRegistrations') || '[]');
        allAttendees = [...registrations];
    } else {
        // Supabase error - fall back to localStorage
        console.error('❌ Error loading from Supabase:', result.error);
        const registrations = JSON.parse(localStorage.getItem('reunionRegistrations') || '[]');
        allAttendees = [...registrations];
    }
    
    // Add hardcoded users if not present (for demo purposes)
    const hardcodedUserIds = ['marcus-robinson', 'sarah-jenkins'];
    hardcodedUserIds.forEach(userId => {
        if (!allAttendees.find(r => r.id === userId || (r.name && r.name.toLowerCase().replace(/\s+/g, '-') === userId))) {
            const user = userData[userId];
            if (user) {
                allAttendees.push({
                    id: userId,
                    name: user.name,
                    branch: user.branch,
                    signedUp: user.signedUp
                });
            }
        }
    });
    
    // Sort by sign-up date (most recent first)
    allAttendees.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at) : new Date(a.signedUp);
        const dateB = b.created_at ? new Date(b.created_at) : new Date(b.signedUp);
        return dateB - dateA;
    });
    
    // Render table with current filter
    filterAttendanceByBranch();
}

function filterAttendanceByBranch() {
    const attendanceTable = document.getElementById('attendance-table-body');
    const countDisplay = document.getElementById('attendance-count');
    const filterSelect = document.getElementById('branch-filter');
    
    if (!attendanceTable) return;
    
    const selectedBranch = filterSelect ? filterSelect.value : 'all';
    
    // Filter users based on selected branch
    let filteredUsers = allAttendees;
    if (selectedBranch !== 'all') {
        filteredUsers = allAttendees.filter(user => user.branch === selectedBranch);
    }
    
    // Update count display
    if (countDisplay) {
        if (selectedBranch === 'all') {
            countDisplay.textContent = `${allAttendees.length} attendee${allAttendees.length !== 1 ? 's' : ''} registered`;
        } else {
            countDisplay.textContent = `${filteredUsers.length} attendee${filteredUsers.length !== 1 ? 's' : ''} from ${selectedBranch}`;
        }
    }
    
    // Generate table rows
    let tableHTML = '';
    if (filteredUsers.length === 0) {
        if (selectedBranch === 'all') {
            tableHTML = '<tr><td colspan="3" class="py-8 text-center text-sand-500">No registrations yet. Be the first to register!</td></tr>';
        } else {
            tableHTML = `<tr><td colspan="3" class="py-8 text-center text-sand-500">No attendees from ${selectedBranch} yet.</td></tr>`;
        }
    } else {
        filteredUsers.forEach(user => {
            const oderId = user.id || user.name.toLowerCase().replace(/\s+/g, '-');
            tableHTML += `
                <tr class="even:bg-sand-50 dark:even:bg-sand-800/50 hover:bg-brand-50 dark:hover:bg-sand-700 transition-colors cursor-pointer" onclick="openUserModal('${oderId}')">
                    <td class="py-4 px-6 font-bold text-sand-900 dark:text-white">${user.name}</td>
                    <td class="py-4 px-6 text-sand-600 dark:text-sand-400">${user.branch}</td>
                    <td class="py-4 px-6 text-sand-500 dark:text-sand-400">${user.signedUp}</td>
                </tr>
            `;
        });
    }
    
    attendanceTable.innerHTML = tableHTML;
    lucide.createIcons();
}

// ============================================
// ATTENDANCE MAP
// ============================================

// State abbreviations for parsing addresses
const stateAbbreviations = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
    'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
    'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
    'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
    'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
    'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
    'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
    'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
    'district of columbia': 'DC', 'dc': 'DC'
};

// Reverse lookup
const stateNames = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
    'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
    'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
    'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
    'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
    'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
    'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
    'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
    'DC': 'District of Columbia'
};

function parseStateFromAddress(address) {
    if (!address) return null;
    const addr = address.toUpperCase().trim();
    
    // Try to find 2-letter state code
    const stateCodeMatch = addr.match(/\b([A-Z]{2})\b\s*\d{5}/) || addr.match(/,\s*([A-Z]{2})\b/) || addr.match(/\b([A-Z]{2})$/);
    if (stateCodeMatch && stateNames[stateCodeMatch[1]]) {
        return stateCodeMatch[1];
    }
    
    // Try to find full state name
    const lowerAddr = address.toLowerCase();
    for (const [name, abbr] of Object.entries(stateAbbreviations)) {
        if (lowerAddr.includes(name)) {
            return abbr;
        }
    }
    
    return null;
}

function getAttendeesByState() {
    const byState = {};
    
    // Get registrations with addresses
    if (cachedRegistrations && cachedRegistrations.length > 0) {
        cachedRegistrations.forEach(reg => {
            const state = parseStateFromAddress(reg.address);
            if (state) {
                if (!byState[state]) byState[state] = [];
                byState[state].push({ name: reg.name, branch: reg.branch });
            }
        });
    }
    
    // Also check localStorage
    const localRegs = JSON.parse(localStorage.getItem('reunionRegistrations') || '[]');
    localRegs.forEach(reg => {
        const state = parseStateFromAddress(reg.address);
        if (state) {
            if (!byState[state]) byState[state] = [];
            // Avoid duplicates
            if (!byState[state].find(a => a.name === reg.name)) {
                byState[state].push({ name: reg.name, branch: reg.branch });
            }
        }
    });
    
    return byState;
}

function switchAttendanceView(view) {
    const mapView = document.getElementById('attendance-map-view');
    const tableView = document.getElementById('attendance-table-view');
    const mapTab = document.getElementById('tab-map');
    const tableTab = document.getElementById('tab-table');
    
    if (view === 'map') {
        mapView.classList.remove('hidden');
        tableView.classList.add('hidden');
        mapTab.className = 'px-6 py-3 rounded-full font-medium transition-all bg-brand-600 text-white shadow-md flex items-center gap-2';
        tableTab.className = 'px-6 py-3 rounded-full font-medium transition-all bg-sand-200 dark:bg-sand-800 text-sand-700 dark:text-sand-300 hover:bg-sand-300 dark:hover:bg-sand-700 flex items-center gap-2';
        renderUSMap();
    } else {
        mapView.classList.add('hidden');
        tableView.classList.remove('hidden');
        mapTab.className = 'px-6 py-3 rounded-full font-medium transition-all bg-sand-200 dark:bg-sand-800 text-sand-700 dark:text-sand-300 hover:bg-sand-300 dark:hover:bg-sand-700 flex items-center gap-2';
        tableTab.className = 'px-6 py-3 rounded-full font-medium transition-all bg-brand-600 text-white shadow-md flex items-center gap-2';
        filterAttendanceByBranch();
    }
    lucide.createIcons();
}

async function renderUSMap() {
    const container = document.getElementById('us-map-container');
    if (!container) return;
    
    const attendeesByState = getAttendeesByState();
    const highlightedStates = Object.keys(attendeesByState);
    
    // Show loading
    container.innerHTML = '<div class="flex items-center justify-center py-16"><i data-lucide="loader-2" class="animate-spin w-8 h-8 text-brand-600"></i></div>';
    lucide.createIcons();
    
    try {
        // Fetch the SVG file
        const response = await fetch('us-map.svg');
        const svgText = await response.text();
        
        // Parse the SVG
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const svg = svgDoc.querySelector('svg');
        
        // Style each state path
        const paths = svg.querySelectorAll('path');
        paths.forEach(path => {
            const stateId = path.getAttribute('id');
            const hasAttendees = highlightedStates.includes(stateId);
            
            // Apply styles
            path.setAttribute('class', `transition-colors duration-200 ${hasAttendees ? 'cursor-pointer' : 'cursor-default'}`);
            path.setAttribute('fill', hasAttendees ? '#4d7c0f' : '#e7e5e4');
            path.setAttribute('stroke', '#ffffff');
            path.setAttribute('stroke-width', '1');
            
            if (hasAttendees) {
                path.setAttribute('onmouseenter', `showMapTooltip(event, '${stateId}')`);
                path.setAttribute('onmouseleave', 'hideMapTooltip()');
                path.setAttribute('onmouseover', "this.setAttribute('fill', '#65a30d')");
                path.setAttribute('onmouseout', "this.setAttribute('fill', '#4d7c0f')");
            }
        });
        
        // Add class for dark mode
        svg.setAttribute('class', 'w-full h-auto dark:[&_path:not([fill=\"#4d7c0f\"]):not([fill=\"#65a30d\"])]:fill-sand-700');
        
        // Insert SVG and tooltip
        container.innerHTML = '';
        container.appendChild(svg);
        
        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.id = 'map-tooltip';
        tooltip.className = 'absolute z-50 hidden bg-white dark:bg-sand-900 rounded-xl shadow-2xl border border-sand-200 dark:border-sand-700 p-4 pointer-events-none max-w-xs';
        container.appendChild(tooltip);
        
    } catch (error) {
        console.error('Error loading map:', error);
        container.innerHTML = '<p class="text-center text-sand-500 py-8">Could not load map</p>';
    }
    
    // Update count
    const totalStates = highlightedStates.length;
    const totalAttendees = Object.values(attendeesByState).reduce((sum, arr) => sum + arr.length, 0);
    const countDisplay = document.getElementById('attendance-count');
    if (countDisplay) {
        countDisplay.textContent = `${totalAttendees} attendee${totalAttendees !== 1 ? 's' : ''} from ${totalStates} state${totalStates !== 1 ? 's' : ''}`;
    }
}

function showMapTooltip(event, stateCode) {
    const tooltip = document.getElementById('map-tooltip');
    if (!tooltip) return;
    
    const attendeesByState = getAttendeesByState();
    const attendees = attendeesByState[stateCode] || [];
    const stateName = stateNames[stateCode] || stateCode;
    
    let html = `<div class="font-bold text-brand-900 dark:text-white mb-2">${stateName}</div>`;
    html += `<div class="text-sm text-sand-600 dark:text-sand-400 mb-2">${attendees.length} attendee${attendees.length !== 1 ? 's' : ''}</div>`;
    html += `<ul class="space-y-1">`;
    attendees.forEach(a => {
        html += `<li class="text-sm"><span class="font-medium text-sand-900 dark:text-white">${a.name}</span> <span class="text-sand-500 dark:text-sand-400">· ${a.branch}</span></li>`;
    });
    html += `</ul>`;
    
    tooltip.innerHTML = html;
    tooltip.classList.remove('hidden');
    
    // Position tooltip
    const container = document.getElementById('us-map-container');
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    tooltip.style.left = `${Math.min(x + 10, rect.width - 200)}px`;
    tooltip.style.top = `${y + 10}px`;
}

function hideMapTooltip() {
    const tooltip = document.getElementById('map-tooltip');
    if (tooltip) tooltip.classList.add('hidden');
}

function closeUserModal() {
    const modal = document.getElementById('user-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// Initial Load
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Supabase
    initSupabase();
    
    // Load events from Supabase (if configured)
    await loadEventsFromSupabase();
    
    // Route to home page
    route(null, 'home');
    
    // Update countdown every minute
    setInterval(updateCountdown, 60000);
    
    // Handle ESC key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const photoModal = document.getElementById('photo-modal');
            const userModal = document.getElementById('user-modal');
            if (photoModal && !photoModal.classList.contains('hidden')) {
                closePhotoModal();
            } else if (userModal && !userModal.classList.contains('hidden')) {
                closeUserModal();
            }
        }
    });
}); 