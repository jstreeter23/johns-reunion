

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

function renderUSMap() {
    const container = document.getElementById('us-map-container');
    if (!container) return;
    
    const attendeesByState = getAttendeesByState();
    const highlightedStates = Object.keys(attendeesByState);
    
    // Create tooltip element
    let tooltip = document.getElementById('map-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'map-tooltip';
        tooltip.className = 'absolute z-50 hidden bg-white dark:bg-sand-900 rounded-xl shadow-2xl border border-sand-200 dark:border-sand-700 p-4 pointer-events-none max-w-xs';
        container.appendChild(tooltip);
    }
    
    // US States SVG paths (simplified for common states)
    const statePaths = {
        'AL': 'M628.5,398.5l-3.2,24.8l-1.5,16.9l-1,14.2l5.1,3.4l.5,5.6l-4.6,7.5l-1.1,4l2.3,3l-.1,2.1l-21.2,3l-21.7,1.8l.7-5.7l1.8-12.8l4-22.4l2.2-17.2l1.1-24.6l33.6-2.5l3.1-.1z',
        'AK': 'M158.7,453.7l-1.2-2.2l-.8-1.9l-.4-3.8l3.3-2.7l1.9-.8l2.2.9l1.1,2l-1,3.2l-2.9,3.4l-2.2,1.9z M182.6,517.6l-4.4-1.2l-3-4l-3.6-1.7l-3.5-4.3l-.1-3l2.6-.3l2.6,1.9l1.6,2.2l2.9,1.1l1.9-.5l1.9,2.4l1.2,3.8l-.1,3.6z',
        'AZ': 'M214.8,386.5l-2.3,19.9l-3.7,23.2l-1.3,13.9l-1.7,12.7l18.3,10.4l37.4,21l20.5,11.8l-11.4.3l-35.9-1.2l1.5-8.9l.7-2.9l-2.1-1.3l-7.9-.1l-2.9-3.2l-3.6-1.2l-2.9-5.4l-6.7-6.5l-1.9-3.7l.2-4.2l3.8-5.7l.5-2.7l-1.9-4.7l-.8-4.3l3.4-6.2l-2.4-5.4l-5.7-7.7l-1.9-8.7l-4.7-5.9l-1.9-1.6l.2-4.7l17.6-2.7l3.4.7l3.4-.7z',
        'AR': 'M561.1,365.8l.9,6.2l-.5,5.6l3.1,7l-1.1,5l-3.9,5.7l1.8,4.8l-1,3.9l-.6,11.2l-49.9,1.4l-3.7-3.2l1-6l-2.3-5.3l-.1-4.2l3.6-4.6l-1.9-8.9l1.3-6.8l5-6.6l-1.3-5.7l44.5-1.1l5.1,1.6z',
        'CA': 'M140.1,290.3l-2.7,8.9l-5.3,11.9l-1.7,14.2l-6.3,12.3l-7.6,11.8l-1.9,7.8l-1,6.7l4.2,6.5l.3,5.5l-3.6,3.9l-1.9,7.3l3.5,6.5l5.9,7.9l5.6,2.7l4.6,11.5l4.5,7.9l3.7,3.9l-.1,5.6l-3.9,7.5l9.9,12.4l7.3,5.9l2.5,6.9l-1.7,6.2l1.9,1.7l4.9-2l27.7,4.9l38.2,7l-12.4-88l-8.7-59.9l-37.2-10.9l-19-6.2l-4.7,1.7z',
        'CO': 'M363.4,290.3l-2.7,45.5l-1.8,31.1l-72.9-3.7l-34.9-3.1l3.5-57.6l1.7-25.8l57.7,3.1l49.4,10.5z',
        'CT': 'M825.8,205.3l-1.5,10.9l.7,3.2l-5.7,1.3l-16.5,4.4l-.7-3.2l1.9-7.4l1.1-6.1l18.1-4.9l2.6,1.8z',
        'DE': 'M790.2,264.9l.8,3.2l-.3,7.7l-2.7,10.6l-5.4,1l2.7-14l1.8-6.1l3.1-2.4z',
        'FL': 'M686.9,426.8l10.5,4.5l8.5,7.1l4.7,5.8l5.1,8.9l8.7,16.6l4.9,14.3l4.8,9.1l2,9.9l-.2,5.9l-3.7,5l-.5,8.5l4.7,6.9l.4,4.7l-2.3,6.5l-3.4-1.5l-3.4-6.2l-4.5-3.9l1.1-4.9l-3.1-2.9l-3.7-2.5l-.9-4.7l-4.5-2.9l-7.3-3.1l-5-5.3l-4.3-3.4l-1.4-4l-6.9-4l-3.9-.4l-5.9,1.2l-3.7-2.5l-4.9-5.4l-4.2-10.9l-3.7-6l.5-3.4l-5.7-8.4l-5.4-4l-6.9-7.8l-1-5.1l-8.3-6.2l-.5-3.6l-5.3-3.9l-.2-3.1l-8.3-.8l-2.6-2.2l-8.2-.3l-5.7,1.2l-5.9,3.2l-2.7-1.7l-7.6,1.9l-5.5,1.5l-6.6-.2l.9-7.5l17.9-2.1l45.3-4.3l7.7,5.2l6.7,2.5l5.7,7.9l6.6,1.3l5.2-1.3l10.7.2z',
        'GA': 'M683,342.5l-3.3,6.9l-4.1,13.6l-3.9,10.5l-2.9,12.4l-2.9,9.9l-2.7,14.2l-2.7,9.9l2.8,4.1l4.5,6.5l3.5,7l4.2,2.3l.7,3.2l-6.9,5.9l-5.5.7l-3.2,4.9l-5.6,1.7l-.5,3.8l-4.7,4.2l-3.5-2.3l-18.7,2.5l-20.8,2.9l-2.1-.2l.6-6l-2.5-5.3l-.4-5l-3.9-9.4l1.9-3l-1.7-4.5l2.5-5.1l1.1-7.9l3.9-9.9l2.9-5.5l-.4-4.6l2.9-6.6l-1.5-5.6l3.4-1l34.2-3.9l21.6-2.2l6.9-.1z',
        'HI': 'M273.5,535.5l-1.7-3.2l1.2-2.9l3.2.4l1.6,2.3l-.5,2.9l-3.8.5z M292.1,541.1l-4.2-1.7l-.4-2.5l2.3-2.8l3.6.2l2.6,2.7l-.8,3.2l-3.1.9z M304,530.4l-2.1,2.7l-2.4-.9l-.5-2.5l2.6-2.3l2.3.8l.1,2.2z M318.2,520.7l-.7,3.2l-3.5-.4l-1.1-2.3l.9-2.5l3.2-.3l1.2,2.3z M346.3,507.7l-5.3,1.3l-3.2-1.7l.8-3.7l3.9-1.7l3.9,1.2l-.1,4.6z',
        'ID': 'M232.7,195.5l-6.7,26.9l-4.9,21.2l-4.4,13.6l-2.9,5.9l-3.4.2l-3.2,4.4l.7,3.7l-2.2,3.9l-.2,5.1l-7.5,9.4l-2.4,1.6l-.2,5.6l5.7,6.7l.5,2.9l-5.9,2.4l-2.9,5.2l-2.1,0l-1.5-3.7l.4-10.6l-3.5-4.7l-2.9-.2l-4,4.9l-5.7,2.5l-1.7-1.5l.9-6.4l-3.2-4.9l-1.9-6.2l-3.9-3.7l2.7-13.4l1.5-10.1l-1.5-2.5l.5-7.1l4.7-20.7l3.4-16.6l-2-10.9l-.3-5.9l2.4-9.4l41.5,9l27.7,4.7l-1.7,6.1z',
        'IL': 'M598.4,241.8l1.1,4.5l.1,6.9l3.1,6.2l.7,11.5l-2.1,5.7l-2.1,3.2l1.1,6.1l3.4,5.5l3.4,3.7l.7,7.5l-1.7,10.9l-3.7,7.1l-3.2,3.5l-.7,6.9l-2.7,3.2l-.6,4.7l-2.2,4l-10.5-.1l-3.1-1.5l-5.7-.7l-3.1-5.4l-3.2-1.3l-2.4,2.4l-6.3.5l-1.4-2.7l1.6-2.9l-.3-3.4l-3.2-4.7l-2.1-6.2l-.3-4.9l2.7-3.2l.2-4l-2.6-4l-.2-4.7l4.2-8.5l-1.2-3.7l-3.9-4.7l-1.3-7.5l1.5-2.3l-.2-5.1l2.4-5.4l-.1-5l3.3-6.4l-.3-5.2l34.9.1l12.6.9l.2,5.2z',
        'IN': 'M622.4,246.5l.2,6.5l-2.5,3.2l.4,4.1l2.5,4.7l.4,4.1l-1.8,5.4l2.1,5.7l-.3,8.1l3.7,7.9l-.1,5.7l-1,13.5l-2.3,5.6l2.1,3.8l-35.7,3.7l-1.7-3.6l1.9-4.7l-1.6-3.1l-1.5-6.5l-3.3-4.2l1.9-2.4l.6-6.7l3.2-3.4l3.7-7.2l1.7-10.4l-.6-7.3l-3.4-3.9l-3.3-5.3l-1.3-6.3l2.2-3.3l2.2-5.4l-.6-11.5l36.3-1.7z',
        'IA': 'M543.9,228.3l.3,4.9l2.6,2.8l.3,3.7l-3.4,5.5l-1.4,6l1.2,4.6l2.4,1.2l1.2,2.6l-.4,5.1l-4,3.6l-1.6,2.2l-51.8,1.7l-30.9-.5l-.6-6.6l-2.4-4.2l-4.2-2.7l-1.2-2.4l-.4-6.4l-3.7-5.4l.9-6.2l2.9-4.7l-.6-2.8l-3.3-2.6l-.2-4.9l-2-4.6l1.4-6.2l2.2-3.2l.8-4.7l3.8.1l48.7.7l39.2-1.8l1.2,5.9l4.6,5.9l2.9,3l.5,4.7l-3.6,5.8l-.3,4.4z',
        'KS': 'M489.1,299.1l-5.6,51.9l-63.7-2.1l-61.4-4.2l1.6-26.4l.9-24.9l42.7,1.2l83.9,2.5l1.6,2z',
        'KY': 'M669.7,318.1l-4.2,3.9l-6.7,5.6l-2.3.4l.1,3.7l-3.5,3.4l-3,-.3l-2.7,4.3l-3.7.4l-48.6,4.9l-22.3,2.8l-4.3-4.6l-12.2,1.3l-7.9,.5l2.2-4.3l.7-4.9l2.8-3.1l.6-6.8l3.3-3.6l3.7-7l-2.2-3.9l2.2-3.5l7.7-.8l4.9-2.9l5.7-1l5.2,3.1l5.5-.7l6.2,1l5.4-.6l2.7-2.9l4.4.5l2.9,3.1l6.3-2.5l4.6,1.1l2.2,4.7l6.3.4l2.1-2.4l10.2-.8l5.1-3.4l7.4-1.5l2.6,2.1l3.8,4.9l4.9,2l.4,3.7l4.3,3.8z',
        'LA': 'M561.1,456.9l-1.9,14.6l-.1,3.2l4.1,5.4l-.1,7.9l-4.5,4.2l1.3,3.7l-1.9,3l4.2,3l3.5-.5l2.1,3l6.7-.5l2.1-3l3.9,2.2l-2.2,6.1l4.6,1.6l3.2-1.5l1.9,2.6l-2.4,3.6l5.7,2.7l2.5-5.6l4.7-.3l1.7,2.2l-2.1,2.9l1,2.3l9.2.5l2.7-2.2l2.9,4.1l-3,2.2l2,3.7l-8.5,3.2l-5.2-.8l-6.5,2.4l-3.5-1.9l-4.9,3.6l-5.2,1l-7.9-3.9l-5.4,1.2l-4.8-1.9l-5.9,.5l-.5-4.4l-3.3-3.2l-1-4.7l3.5-2l-.1-5.3l-3.7-1.4l-7.7,.5l-3.5-2l-7.7,.4l-2.6-3.4l.9-7.2l5.3-4.2l2.3-7.8l4.5-5.2l.6-6.1l3.1-4.4l-1.1-5.4l-3.3-1.3l1.8-4.2l43.9-1.1z',
        'ME': 'M852.4,115.4l1.9-2.9l2.1,2l1,3.5l-2.5,3.5l-2.2-.5l-.3-5.6z M855.6,76.5l3.4,2.9l4.4,8.2l-2.3,7.9l-2.6.1l-3.5,4.2l1.7,5.4l4.7,3.4l.3,4.1l-2.1,5.1l-4.3-.5l-4.9,7.1l-1.7-1.6l-1.4,2.5l-1-3.3l1.4-3.1l-.5-6.3l-3.7-3.2l-2.3-7.9l1.6-3.5l-1.2-6.5l2.8-5.8l2.9-1.8l.3-4.2l5.9-5.7l1.3,2.9l.6-.6z',
        'MD': 'M790.5,280.6l-6.9,2.2l-7,-.5l-2.9-2.6l-2.3,2.2l-4.9,-.2l-3.5-5.2l-3.7-3.9l-1.9,-.1l-1.9,4.6l-3.5,3l-4.4-1l-7.9,3.3l-5.9,-.3l-7.5,2.9l-1.1-8.7l6.4-2.3l2.8-3.1l3.7-4.5l5-1.4l4.5,1l5.5-5.5l1.8,5l4.9,1.3l2.2-1.6l4.7,.3l.7,4.9l10.7-.6l2.1-5l4.1-5.7l2.7,6.9l4.4,5.3l-.5,8.9l.4,5z',
        'MA': 'M857.4,189.8l-2.1,2.5l-2.5-.4l-.5-2.9l2.7-1.3l2.4,2.1z M848.4,188.4l-1.5,2.2l-3-1.2l.3-2.5l2.7-.5l1.5,2z M824.5,185.6l3.5-.3l1.1,2.6l3.4,.1l.2,2.1l-7.1,2.2l-4.1-.3l-.1-2.1l1.1-2l2-2.3z',
        'MI': 'M612.5,150.4l3.7-5.7l2.9-2.2l5-1.2l1.3-3.2l2.3-1.7l1.8,1.3l5.9,.3l3.6-1.7l1-2.7l2.2-.7l3.3,1.9l1.6,7.1l2.5,6.4l-1.2,4.2l-2.1,2.3l.6,2.1l2.9,-.2l1.7,2l-.6,2.2l-3,2.3l-.3,4.6l1.8,1l3.7-2.7l2.3,.8l3.1,-1l5.3,2.4l1.8,3.2l1.7,6.2l3.1,6.4l-1.5,3.6l-.8,4.6l1.3,2.7l-.4,3.5l-2.2,4.4l1.9,2.2l.2,2.4l-4,1.7l-3.6,3.6l-6.2,2.6l-3.6,3l-.5-1.7l.3-6.7l-2.9-1.2l-.6-2.7l-3.7-3.5l-7.5-3.1l-1.7-4.2l-7.5-1.7l-.7-1.3l-5.7-1.3l-5-4.2l-15.7-3.5l.3-5l3.9-2.4l2-5.1l-.5-2.3l-1.7-1.5l2.3-1.8l6.3-1.5l2.5-3.7l1.1-5.9l-2-3.3l-1.3-4.7l-2.1-.6l-3.6,1.5l-3.7-.3l-.6-2.2l5.1-1.1l1.9-2.3l.6-3.9l2.5-1.9l-.4-5.7l1.8-3.8z',
        'MN': 'M533.7,107.5l-.1,6.6l3.9,5.3l8.7,5.3l1.4,5.5l.3,22.7l1.6,4.5l4.7,3.4l3.7-.2l1.1,3l-5.4,4.3l-5.4,7.1l-1.5,9.7l-.3,8.9l1.5,5.7l-1.9,3l-47.9.7l-1.5-53.6l-.4-18.9l-4.1-2.5l-2.7-5.2l-5.5-1.5l-2.4-4.7l-4.7-5.1l-.7-4.1l2.8-3.7l2.7,.3l5.2-4.3l3.1-.6l6.9,3.7l3.5,-.6l5.4,.5l5.3,2.6l18.3.2l5.7.3v5.8z',
        'MS': 'M603.9,399.9l-43.9,1.2l-1.7,4l3.2,1.3l1.1,5.2l-3.1,4.5l-.5,6.2l-4.5,5.1l-2.3,7.9l-5.3,4.2l-.9,7.5l3,3.4l.9,4.9l-2.3,1.2l-2.2,6.9l21.7-1.1l21.3-2.1l4.9-4.1l1.4-4.5l.8-11.5l1-3.7l-1.8-4.7l3.8-5.6l1.2-5.2l-3.1-6.8l.5-5.6l-.9-6.1l5.7-2z',
        'MO': 'M557.8,279.5l2.7,3.5l4.3,3.2l-.2,4l3,5.5l-2.7,4.6l-1,5.7l3.2,3.7l4.4,2l2.4,4.6l2,2.5l.3,5.7l-1.4,4.5l2.5,5.3l2.6,3.5l-.1,7.8l-5.3.3l-10.6.6l-42.7,1.7l-1.5-5.2l5.1-3.7l1.6-5.3l-3.1-4.9l-4.4-2.3l-1.1-3.7l-2.1-3.4l5.1-4.3l-.8-10.5l71.7-1.9l5.2-47.2l32.7,1.1l3,3.8l-2.7,3.8l.1,4.2l3.7,5.9l3.9,3.6l1.5,4l-3,4.4l-2.9,6.9l-4.5,3.9l-3.3,1.2l-3.5-1.7l-4.5,2l-6.1-1l-5.3.7l-5.8-3.1l-5.9,1l-5.2,3l-8.1.9z',
        'MT': 'M317.6,111.3l.6,6.9l2.2,4.9l-.5,4.2l1.7,3.5l1.1,3.9l-1.7,4.7l1.9,3.4l-.5,5.9l2.2,7l.3,3.5l1.4,2.4l-1.5,4.1l2.6,5.4l.3,3.4l4.5,4.1l.5,3.9l-71.5-5l-75.2-10.2l5.9-32l6.9-37.6l62.9,10.4l56.4,7.1z',
        'NE': 'M424.1,238.1l-63.7-5.2l-28.7-3.8l3.3-33l4.9-31.9l42.1,3.4l45.9,2.2l2.1,4.4l4.9,4.1l1.2,3.8l5.7,1.5l3.4,5.7l5.1,2.1l1.6,2.2l.1,2.5l5.7,5.1l-.3,5.5l2.7,5.5l-5.4,6.9l-1.6,4.9l-1.7,7.9l-1,10.5l-25.3-1.3z',
        'NV': 'M185.8,230l-9.9,52.8l-5.9,28l-11.6,52.3l-16.4-3.4l-18.7-4.7l-12.9-3.2l9.8-37.9l13.5-51.5l5.9-21.2l4.4-13.3l5.9-24.2l40.3,9.2l2.4,7.9l-3.7,3.8l-2.5,4l.2,2.4l-.8-.1z',
        'NH': 'M840.5,138.5l.3,5.7l.5,4.3l-1.2,6.6l.7,3.9l-.5,4.1l-2.9,3.2l-.5,3.5l.1,3.5l2.1,1l-3.9,7.4l-3.5.1l-1.2-2.5l-2.8.3l-1.3-3.4l.7-4.8l-.6-2.7l.5-10.9l2.3-5.5l-1.7-3.1l1.4-3.9l-.6-7.2l1.4-5.6l-.9-5.9l5-1.9l5.3,1.7l1.3,6.1l.4,5.6z',
        'NJ': 'M801.6,240.7l-.7,3.1l1.2,2.6l2.2-1.3l1.5,2.7l-.9,3.1l-3.1,4.7l-2.9,4.1l-1.7,6.9l1.1,4.5l3.3,3.7l1.6,2.7l-.5,2.5l-3.7,2.2l-1.8-1.2l-1-7.9l-2.1-4.5l-3.4-2.8l.1-4.3l-1.2-2.3l.4-4.4l1.9-1.7l-1.2-2.3l1.5-3.5l3.2-.8l3.7-4.2l1.9,1.5l2-.3z',
        'NM': 'M288.4,363.3l1.2,10.5l3.9,26.3l1.3,13.3l.6,11.9l-49.9-5.5l-9.6-1.3l-1.4,10.9l-35.6-5.8l8.7-51.7l6.3-37.5l42.6,5.8l30.4,3.1l1.5,19.9z',
        'NY': 'M818.5,175.1l1.7,4.3l4.3,3.2l-.7,2.5l-2.5,3.3l-3.9,2.9l-3,4.2l-2.5,1.3l-.7,-.1l-1.7,2.9l-4.7,3.1l-2.5,.3l-2.4,3.3l-.3,6.1l-2.6,.7l-1.2,2.2l.3,5.4l-2.9,.7l-2.3,-3.7l-1.9,2.2l-6.9,3.6l-4.5,1.4l-6.9,1.7l-5.5,.8l-4.7,-.2l-5.9,-.2l-8.8,1.9l-8.2,2l-8.6,-1.9l3.9,-4.2l1.3,-5.5l3.9,-4.1l4.1,-3.2l4.5,-5.1l2.4,-4.2l4.3,-5.9l2.5,-5.7l1.5,-8.5l2.5,-7.5l3.1,-4.7l-.2,-4.3l-3.7,-3.2l-1,-3.2l-3.3,-6.2l3.9,-2.1l5.5,-1.5l5.5,-1l16.5,4.1l40.2,-9.5l5.1,-1.6l1.3,6.5l3.3,4.2l.7,5.5l-2.1,4.5l.3,3.2l3.5,2.3l-.4,2.1z',
        'NC': 'M778.3,335.5l-4.7,6.7l-6.3,8.9l-7.5,5.5l-3.3,5.2l-3.5,2.5l-.9,3.1l-5.9,-1.1l-3.3,4.2l-3.9,3.3l-2.7,-.3l.7,-4.6l-1.3,-3.1l-4.6,.2l-2.9,5.5l-4.3,.5l-.5,5.5l-4.7,1.2l-5,3.3l-5.4,-.3l-5.7,4l-5.6,-.8l-6.6,3.9l-4.5,-.1l-5.2,-3.3l-4.9,2.5l-3.7,3.7l-3.5,.5l-3.2,-.9l-2.7,3.3l-7.7,2.6l-3.1,-1.5l-2,-3.3l1,-4.9l.5,-5.6l-3.1,-.5l2,-2l2.8,-3.4l4.9,-6.4l6.4,-2.3l4.7,-4.2l9.2,-3.2l7.1,-3.3l6.9,-1.1l3.5,-2.3l4.3,.5l6.1,-4.1l3.2,.4l3.2,-4.3l6.1,-.7l6.7,-5.5l4.3,-.5l3.5,-2.7l7.3,-3.4l2.3,.4l2.7,-4.4l4.5,-2.2l.3,-2.7l4.9,-.3l6.1,-2.2l4.5,.2l1.9,6.2l8.2,1.5z',
        'ND': 'M483.3,107.1l1.7,23.9l-.5,27.8l-1.9,14l-70-2.1l-33.9-2.4l2.2-28.7l.8-28.9l.4-14.5l37.9,1.3l63.3,9.6z',
        'OH': 'M690.5,246.9l-2.9,3.4l-.7,5.6l2.9,5.4l-2.1,3.3l1.2,3.5l-1.9,4.8l4.2,6.2l-2.9,7.2l1.2,3.3l-1.5,2.8l-4.1,2.2l-6.3,-.2l-3.3,5l-3.9,1.4l-5.5,5.1l-3.3,3.9l-6.4,-1.2l-3-3.3l-4.5,-.5l-2.7,2.8l-5.2,.5l-6.3,-.9l-5.7,.7l-4.9,3.1l-5.4,.5l-1.9,-5.7l1.9,-5.2l-.6,-4.2l-2.4,-4.5l-.3,-4.2l2.3,-3.1l-.3,-6.7l-.3,-4.6l-3.7,-8.1l.3,-7.9l-2.2,-5.8l1.8,-5.1l-.4,-4.2l-2.4,-4.6l-.3,-6.5l35.4,-4.1l31.7,-4.8l5.8,5.1l3.3,5.4l4.5,3.7l4.1,.3l3.1,2.9l4.1,.4l4.5,4.7z',
        'OK': 'M421.2,344.4l-.6,30.7l-4.7,-3.7l-5.8,.7l-3.9,-2.2l-3.6,2.9l-3.7,-1l-5.1,2.5l-3.4,.2l-2.5,2.7l-4.1,-2l-3.9,.9l-3.5,-3.2l-4.2,.1l-2.9,-2.1l-4.1,1.6l-2.9,-1l-3.2,1.4l-2.9,-2.6l-3.5,.9l-5.7,-2.3l-4.8,-3.5l.3,-13.7l-44.7,-1l1.2,-14.1l54.7,1l63.7,2.1l1.6,5.1l.1,2z',
        'OR': 'M171.3,169l-5.5,20.1l-3.6,15.8l-6.6,22.2l-.4,7.7l-4.3,8.2l-.2,6.2l-49.1,-11.6l-38.2,-10.2l6.5,-18.5l-3.2,-4.2l2.7,-8.9l-.9,-7.5l1.9,-7.7l3.5,-.9l5.7,-5.1l5.3,-2l3.1,-3.9l.6,-3.3l6.1,-5.9l3.3,-1.9l-.8,-3.7l3.4,-5.7l5.3,-5.2l.5,-5.2l-2.1,-2.4l3.5,-.4l7.4,2.8l6,-.8l1.6,2.3l6.1,1.7l5.6,.2l2.1,-2.8l3.4,.1l.7,-3.7l4.9,-.8l1.7,-2.9l2.9,.8l13.3,3.7l12.3,2.2l-3.7,15.6z',
        'PA': 'M775.3,235.7l-4.3,4.3l-3.6,.4l-3.1,4.5l-1.3,5.2l-3.4,4.3l-.5,6.2l-2.5,2l-4.5,-.7l-46.9,9.8l-18.2,3.3l1.1,-5l-2.1,-4l4.5,-3.7l2.3,-5l-.3,-4.1l.9,-4.6l3.6,-4.8l.5,-2.9l-.7,-4.3l2,-5.2l-.1,-2.7l2.9,-1.1l4.7,-5.1l4.8,-1.9l1.7,1.5l4.3,-.6l4.9,-4.8l3.5,-1.5l3.7,-.3l4.7,-.5l2.5,-2.7l3.2,-.3l3.1,2.3l5.7,-.7l1.9,-2.9l2.9,-1.1l3.7,1.2l3.2,-1.5l4.4,.5l2.8,5.9l1.9,8.2l4.7,5.2l5.3,5.2l.5,5.1z',
        'RI': 'M833.4,205l-1.4,6.8l-.9,5.1l-3.9,-2.4l-2.3,-3.9l1.4,-2.9l.4,-3.5l2.4,.7l4.3,.1z',
        'SC': 'M706.1,370.5l-3.5,4.6l-1.9,5.5l-2.5,4l-5.5,7.1l-6.5,5.8l-5.3,2.2l-6.9,6l-4.6,1l-3.2,3.5l-2.9,5.1l-4.7,.2l-.7,-3.5l-3.7,-1.9l2.3,-4.7l-.3,-4.6l-5.9,-3l-2.9,-6.3l-3.2,-4.3l1.5,-2.5l-2.3,-3l-.7,-3.9l-1.9,-.7l1.7,-7.9l2.9,-5.9l4.2,-2.7l6.1,1.5l5.3,-.9l6.2,-3.7l5.5,.8l5.6,-4.1l5.3,.3l4.9,-3.3l4.7,-1.2l-.2,5.1l4.4,-1l3.8,-3.2l3.3,-4.1l5.9,.9l-.5,4.3l1.7,2.2l-1.1,5.2l-2.7,8.4z',
        'SD': 'M484.1,172.4l-.5,27.5l-1.6,26.3l-51.4,-1.5l-45.2,-2.9l.9,-9.9l1.7,-8.1l1.8,-4.6l5.2,-6.7l-2.6,-5.5l-.3,-3.5l-4.7,-4l-.4,-3.8l-2.6,-5.4l1.6,-4l-1.5,-2.6l-.2,-3.2l-2.2,-7.2l.5,-6.1l-1.8,-3.2l1.7,-4.7l-1.2,-4l.5,-4.2l-2.2,-4.8l-.5,-6.9l72.2,4.3l-.3,28.9l-.3,14.3z',
        'TN': 'M671.3,342.4l-5.5,-1.7l-3.5,2.7l-7.1,2.6l-3.9,-.3l-6.4,4.2l-5,-.9l-6.5,3.5l-6.3,-.3l-6.7,-.3l-3.8,2.5l-2.1,-.6l-22.6,3.3l-22.3,1.5l-18.4,1.8l-2,-5.9l3.5,-4.1l-1.1,-4.2l3.5,-5.7l4.1,-3.8l.9,-3.4l1.6,-5.8l5,-4l.9,-5.9l48.4,-5.1l22.3,-2.5l12.2,-1.6l4.5,4.6l.8,4.1l6.6,-.7l.9,5.3l3.1,3.7l-.5,5.3l3.1,4.1l-1.7,4.9l3.7,3.9l-3,2.5z',
        'TX': 'M421.1,373.8l47.5,2.2l4.4,.3l-1.9,20.5l-.5,8.3l2.1,4.7l1.2,5.1l5.1,7.5l2.2,2.8l1.2,5.8l3.8,6.7l4.7,3.9l.7,2.7l-2.5,.3l-7.4,3.9l-3.6,.2l-5.1,3.4l-4.6,1.2l-2.2,1.7l-4.4,.3l-4.3,1.6l-5.5,3.7l-3.5,4.9l-1.5,6.5l-.3,5.5l-3.9,5.7l-.6,2.5l-3.5,-.7l-2.9,1.2l-.5,3.2l-2.7,5.5l1.3,2.7l-1.6,4.5l-1.2,5l-2.5,3.2l.7,4.4l-5.2,3.4l-4.8,-2.9l-5.1,.6l-5,-2.3l-6.6,-4.7l-3.7,1.6l2.2,4.1l-.2,3.6l-.8,6.7l-2.5,2.6l-.9,3.2l-3,3.4l-5.9,-4.2l-5.3,-1.2l-1.5,-4.3l-5.5,-5.8l-1.7,-2.9l-.9,-5l-6.7,-6.9l-4,-3.2l.7,-4.3l-6.9,-12.5l-2.2,-.2l-.3,-3.9l-4.5,-4.6l.3,-4.2l-3.4,-6.2l-4,-5.7l.3,-4.2l-3.4,-2.2l3.2,-9.5l2.5,-4.5l-.5,-3l3.2,-6.1l.2,-4.1l-1,-3.5l1.4,-9.1l3.2,-5.9l-.5,-3.2l-2.5,-3l1.2,-5.8l3.2,-.9l.2,-8.2l2.2,-10.3l1,-3.2l-2.5,-5.5l-.5,-5.1l-2.9,-4l-1.4,-4.5l-3.7,-4.5l43.7,.6l-.7,15.5l.5,28.8l.5,6.1l3.3,3.1l2.8,-1.9l3.2,1l2.9,2.4l3.2,-1.3l2.9,.9l4.3,-1.7l3.1,2.1l4,.1l3.6,3l4,-.9l4.1,2l2.4,-2.8l3.3,-.3l5.1,-2.6l3.9,1.2l3.5,-3.1l4,2.4l5.7,-.7l4.9,3.6z',
        'UT': 'M254.6,292.8l-45.8,-7l12.3,-72.9l27.7,4.4l34.5,4.7l-4.6,29.7l-1,6.8l.7,4.5l-5.2,15.1l-.5,4.9l-1.6,3.7l-4.2,3.7l-.9,4.4l-11.4,-2.1z',
        'VT': 'M819.3,140.5l-.4,4.9l1.7,6.9l-1.5,5.1l2.3,8.3l-.6,4.3l-1.9,4.9l-15.4,4.2l-1.9,-2.3l1.2,-4.7l-1,-4.1l2.2,-5.5l-.4,-5.2l-.9,-6.7l1.2,-6.2l-.6,-4.5l-.4,-5.9l14.9,-4.2l1.5,4.7z',
        'VA': 'M781.2,293.8l-2.8,6.9l-3.9,2.3l-1,4.5l2.5,4.2l-1.7,6.5l-3.5,2.3l-2.5,6.1l.3,3.7l-4.4,.9l-3.7,3.5l-3.2,-.7l-1.5,3.9l-5.9,5.3l-.9,3.3l-5.7,1.2l-4.1,-2.2l-3.2,4.3l-3.2,-.5l-5.7,3.9l-3.5,-.1l-5.3,-.4l-4.3,-2.9l-5.3,-.9l-1.3,-3.5l.7,-3.6l-2.9,-5.2l-6.6,-1.5l-4,-5.7l-8.6,5.5l-4.7,1.4l-3.7,-2.3l-3.9,-6.5l4.1,-6l3.5,-5.9l2.5,-6.7l.7,-8.3l.1,-3.7l-1.2,-2.3l9.2,.9l5.4,-2.9l4.6,.5l3.9,-2.5l6.9,-.5l3.2,-5.2l2.6,2.3l7.3,.4l6.6,-2.2l10.6,5.7l2.5,6.3l4,2l4.8,-.3l6,-5l5.8,-1.9l3,-3.5l7.4,.1l.8,8.5z',
        'WA': 'M171.5,53l2.7,7.9l3.4,1.7l1.1,5.6l3.9,2.1l3.8,-.4l4.1,2.9l4.7,-.6l.9,-2.6l3.3,-.3l1.5,2.2l-.8,3.9l3.7,.3l1.5,5.9l-2.1,9.9l-4.6,1.2l.9,7.4l-2.5,9l-.5,7.2l-3.7,.5l-5.9,4.9l-3.1,.8l1.4,-9.9l-2.3,-4.7l-6.3,-1.6l-.7,2.7l-5.9,-.1l-6.2,-1.7l-1.5,-2.3l-6.3,.8l-7.5,-2.9l-3.1,.2l-.4,5.1l-2.9,-3l.5,-5.3l-3.9,-2.2l-2.6,-4l-4,-.7l-4.7,-4.7l-6.9,1.6l.9,-3.7l-2.7,-1.4l-2.4,-6.5l.8,-5.3l-2,-7.2l3.1,-10.3l5.9,2.2l4.4,.6l5.3,2.2l6.2,.7l3.9,1.2l5.9,-.1l6,-2.1l6.4,.3l2.2,1.5l5.4,.3l4.7,-2.6l3.2,-5.9z',
        'WV': 'M718.3,275.7l1.2,2.9l-.6,3.5l3.5,4.9l3.5,2.5l1.3,3.4l-4.2,4.2l-3.6,1.2l-2.1,3.9l-1.8,3.3l-2.9,.9l-3.2,5.7l.7,3.2l2.5,1.9l-1.3,6.8l-4.2,-.5l-1.9,4.7l-4.3,4.3l-2.3,4.3l-3.1,-1.2l.9,-5.5l-1.7,-4.2l-2.5,-2.2l-1.3,-4.4l-4.2,-4.4l-1.7,-4l-2.1,-.3l-4.6,4l-3.7,-.3l-1.5,-2.7l-1.9,3.2l-3.9,2.3l-.7,-5.3l1.9,-4.9l-.4,-5.7l3.2,-1.2l4.4,-4l2.9,-6.8l3,-4.6l-1.5,-3.7l-4,-4.2l3,-1.2l2.7,-4.2l2.9,.3l3.5,-3.4l-.2,-3.7l2.2,-.3l6.9,-5.7l3.3,4.5l3.9,.5l3.3,4.5l.9,5.2l3.9,3.2l2.1,.5z',
        'WI': 'M576.4,149.1l1.4,3.6l3.1,.5l3.2,2.5l1.9,4.4l4.4,3.5l1.3,5.7l2.1,1.9l-.3,2.8l1.7,1.7l.7,5.9l-.5,4.8l-1.7,4l.5,4.5l1.4,4.4l-.7,3.2l2.1,3.2l.5,5.5l-.7,3.2l-1,3l-3.3,2.8l-1.5,3.9l-3.1,-.6l-10.2-2.2l-2.6,-3.5l-4.3,-.3l-5.9,2.5l-9.6,1.1l-3.9,-2.3l-2.7,-.9l-2.5,-5.9l-4.9,-3.3l-1.7,-4.5l-.3,-22.8l-1.5,-5.3l-8.7,-5.5l-4.3,-5.9l.2,-7.2l2.6,-1.9l1.2,-4.4l.8,-4l4.7,-3l3.2,-3.1l-.6,-2.9l1.2,-2.7l4.5,1l3.7,3l1.6,-.3l3.6,-2.5l4.5,2.2l3.5,-.5l2.8,4.9l4,3.9l3,1.5z',
        'WY': 'M363.6,179.4l-4.9,57.5l-42.8,-3.9l-57.3,-7.3l4.9,-57.9l53.7,6.3l46.4,5.3z'
    };
    
    // Build SVG
    let svg = `<svg viewBox="0 0 960 600" class="w-full h-auto">`;
    
    // Add state paths
    for (const [state, path] of Object.entries(statePaths)) {
        const hasAttendees = highlightedStates.includes(state);
        const fillClass = hasAttendees ? 'fill-brand-600 hover:fill-brand-500' : 'fill-sand-200 dark:fill-sand-700';
        const cursorClass = hasAttendees ? 'cursor-pointer' : 'cursor-default';
        
        svg += `<path 
            d="${path}" 
            class="${fillClass} ${cursorClass} stroke-white dark:stroke-sand-900 stroke-1 transition-colors duration-200"
            data-state="${state}"
            ${hasAttendees ? `onmouseenter="showMapTooltip(event, '${state}')" onmouseleave="hideMapTooltip()"` : ''}
        />`;
    }
    
    svg += `</svg>`;
    
    // Insert before tooltip
    const existingTooltip = container.querySelector('#map-tooltip');
    container.innerHTML = svg;
    if (existingTooltip) container.appendChild(existingTooltip);
    else {
        const newTooltip = document.createElement('div');
        newTooltip.id = 'map-tooltip';
        newTooltip.className = 'absolute z-50 hidden bg-white dark:bg-sand-900 rounded-xl shadow-2xl border border-sand-200 dark:border-sand-700 p-4 pointer-events-none max-w-xs';
        container.appendChild(newTooltip);
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