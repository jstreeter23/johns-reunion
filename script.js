

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
        
        // Load attendance table if attendance page is loaded
        if (viewId === 'attendance') {
            setTimeout(() => {
                loadAttendanceTable();
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
    
    if (result.fallback || !result.success) {
        // Use localStorage as fallback
        const userId = formData.name.toLowerCase().replace(/\s+/g, '-');
        let registrations = JSON.parse(localStorage.getItem('reunionRegistrations') || '[]');
        registrations.push({ id: userId, ...formData });
        localStorage.setItem('reunionRegistrations', JSON.stringify(registrations));
    }
    
    // Reset form
    e.target.reset();
    uploadedPhotoData = null;
    document.getElementById('photo-preview').classList.add('hidden');
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
    
    alert("Registration Submitted! Welcome to the family.");
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
    const amount = container.clientWidth * 0.8;
    container.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
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
    {
        src: 'https://images.unsplash.com/photo-1522770179533-24471fcdba45?w=1200&h=800&fit=crop',
        title: 'The Big Picnic',
        subtitle: 'Last Year - Family gathering at the park'
    },
    {
        src: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&h=800&fit=crop',
        title: 'Uncle Ray\'s Fish Fry',
        subtitle: 'Delicious food and great company'
    },
    {
        src: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=800&fit=crop',
        title: 'Talent Show Night',
        subtitle: 'Family members showcasing their talents'
    }
];

let currentPhotoIndex = 0;

function openPhotoModal(index) {
    currentPhotoIndex = index;
    const photo = photoData[index];
    const modal = document.getElementById('photo-modal');
    const modalImage = document.getElementById('photo-modal-image');
    const modalTitle = document.getElementById('photo-modal-title');
    const modalSubtitle = document.getElementById('photo-modal-subtitle');
    
    if (modal && photo) {
        modalImage.src = photo.src;
        modalImage.alt = photo.title;
        modalTitle.textContent = photo.title;
        modalSubtitle.textContent = photo.subtitle;
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
        extra: 'Marcus is bringing 3 family members and is interested in helping with the planning committee activities.',
        profilePhoto: null
    },
    'sarah-jenkins': {
        name: 'Sarah Jenkins',
        branch: 'Alice Walker',
        signedUp: 'Oct 14, 2025',
        extra: 'Sarah is bringing 2 family members and has volunteered to help with food & catering planning.',
        profilePhoto: null
    }
};

function getUserData(userId) {
    // Check cachedRegistrations first (from Supabase)
    if (cachedRegistrations && cachedRegistrations.length > 0) {
        const registration = cachedRegistrations.find(r => r.id === userId);
        if (registration) {
            return {
                name: registration.name,
                branch: registration.branch,
                signedUp: new Date(registration.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                extra: `Birthday: ${registration.birthday || 'Not provided'}<br>Shirt Size: ${registration.shirt_size || 'Not selected'}<br>Household Members: ${registration.household_members || 'Not specified'}<br><br>${registration.names_ages || ''}`,
                profilePhoto: registration.profile_photo || null
            };
        }
    }
    
    // Check localStorage for registered users
    const registrations = JSON.parse(localStorage.getItem('reunionRegistrations') || '[]');
    const registration = registrations.find(r => r.id === userId);
    
    if (registration) {
        return {
            name: registration.name,
            branch: registration.branch,
            signedUp: registration.signedUp,
            extra: `Birthday: ${registration.birthday || 'Not provided'}<br>Shirt Size: ${registration.shirtSize || 'Not selected'}<br>Household Members: ${registration.householdMembers || 'Not specified'}<br><br>${registration.namesAges || ''}`,
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
    document.getElementById('user-modal-extra').innerHTML = user.extra;
    
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

// Cache for Supabase registrations
let cachedRegistrations = [];

async function loadAttendanceTable() {
    const attendanceTable = document.getElementById('attendance-table-body');
    if (!attendanceTable) return;
    
    // Show loading state
    attendanceTable.innerHTML = '<tr><td colspan="3" class="py-8 text-center text-sand-500"><i data-lucide="loader-2" class="animate-spin w-6 h-6 inline-block"></i> Loading...</td></tr>';
    lucide.createIcons();
    
    // Try to get registrations from Supabase first
    const result = await getRegistrationsFromSupabase();
    
    let allUsers = [];
    
    if (result.success && result.data) {
        // Use Supabase data
        cachedRegistrations = result.data;
        allUsers = result.data.map(reg => ({
            id: reg.id,
            name: reg.name,
            branch: reg.branch,
            signedUp: new Date(reg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            created_at: reg.created_at
        }));
    } else {
        // Fall back to localStorage
        const registrations = JSON.parse(localStorage.getItem('reunionRegistrations') || '[]');
        allUsers = [...registrations];
    }
    
    // Add hardcoded users if not present (for demo purposes)
    const hardcodedUserIds = ['marcus-robinson', 'sarah-jenkins'];
    hardcodedUserIds.forEach(userId => {
        if (!allUsers.find(r => r.id === userId || (r.name && r.name.toLowerCase().replace(/\s+/g, '-') === userId))) {
            const user = userData[userId];
            if (user) {
                allUsers.push({
                    id: userId,
                    name: user.name,
                    branch: user.branch,
                    signedUp: user.signedUp
                });
            }
        }
    });
    
    // Sort by sign-up date (most recent first)
    allUsers.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at) : new Date(a.signedUp);
        const dateB = b.created_at ? new Date(b.created_at) : new Date(b.signedUp);
        return dateB - dateA;
    });
    
    // Generate table rows
    let tableHTML = '';
    if (allUsers.length === 0) {
        tableHTML = '<tr><td colspan="3" class="py-8 text-center text-sand-500">No registrations yet. Be the first to register!</td></tr>';
    } else {
        allUsers.forEach(user => {
            const oderId = user.id || user.name.toLowerCase().replace(/\s+/g, '-');
            tableHTML += `
                <tr class="even:bg-sand-50 dark:even:bg-sand-800/50 hover:bg-brand-50 transition-colors cursor-pointer" onclick="openUserModal('${oderId}')">
                    <td class="py-4 px-6 font-bold text-sand-900 dark:text-white">${user.name}</td>
                    <td class="py-4 px-6 text-sand-600 dark:text-sand-400">${user.branch}</td>
                    <td class="py-4 px-6 text-sand-500 dark:text-sand-400">${user.signedUp}</td>
                </tr>
            `;
        });
    }
    
    attendanceTable.innerHTML = tableHTML;
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