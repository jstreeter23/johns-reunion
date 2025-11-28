

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
            setTimeout(() => {
                // Ensure calendar view starts with events tab
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

function handleRegistration(e) {
    e.preventDefault();
    
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
    
    // Generate user ID from name
    const userId = formData.name.toLowerCase().replace(/\s+/g, '-');
    
    // Get existing registrations from localStorage
    let registrations = JSON.parse(localStorage.getItem('reunionRegistrations') || '[]');
    
    // Add new registration
    registrations.push({
        id: userId,
        ...formData
    });
    
    // Save to localStorage
    localStorage.setItem('reunionRegistrations', JSON.stringify(registrations));
    
    // Reset form
    e.target.reset();
    uploadedPhotoData = null;
    document.getElementById('photo-preview').classList.add('hidden');
    
    alert("Registration Submitted! Welcome to the family.");
    route(null, 'home');
}

function handleIdeaSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('idea-submit-btn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<i data-lucide="loader-2" class="animate-spin w-5 h-5"></i> Sending...';
    btn.disabled = true;
    lucide.createIcons();

    setTimeout(() => {
        document.getElementById('idea-success').classList.remove('hidden');
        btn.innerHTML = originalText;
        btn.disabled = false;
    }, 800);
}

function resetIdeaForm() {
    document.getElementById('idea-form').reset();
    document.getElementById('idea-success').classList.add('hidden');
}

// 5. Modal Logic
const eventData = {
    'monthly-dec': { title: "Monthly Family Update", time: "Dec 14 • 4:00 PM", location: "Zoom", desc: "Venue updates & fundraising.", extra: "Open forum Q&A.", date: "2025-12-14" },
    'planning-dec': { title: "Planning Committee", time: "Dec 28 • 5:00 PM", location: "Zoom", desc: "Logistics & Food planning.", extra: "Review minutes before joining.", date: "2025-12-28" },
    'monthly-jan': { title: "Monthly Family Update", time: "Jan 11 • 4:00 PM", location: "Zoom", desc: "Kick-off 2026 planning.", extra: "Vote on T-shirts.", date: "2026-01-11" }
};

// Event date mapping for calendar
const eventDateMap = {
    '2025-12-14': 'monthly-dec',
    '2025-12-28': 'planning-dec',
    '2026-01-11': 'monthly-jan'
};

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
    // First check localStorage for registered users
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

function loadAttendanceTable() {
    const attendanceTable = document.getElementById('attendance-table-body');
    if (!attendanceTable) return;
    
    // Get registrations from localStorage
    const registrations = JSON.parse(localStorage.getItem('reunionRegistrations') || '[]');
    
    // Combine with hardcoded users (don't duplicate)
    const hardcodedUserIds = ['marcus-robinson', 'sarah-jenkins'];
    const allUsers = [...registrations];
    
    hardcodedUserIds.forEach(userId => {
        if (!registrations.find(r => r.id === userId)) {
            const user = userData[userId];
            allUsers.push({
                id: userId,
                name: user.name,
                branch: user.branch,
                signedUp: user.signedUp
            });
        }
    });
    
    // Sort by sign-up date (most recent first)
    allUsers.sort((a, b) => new Date(b.signedUp) - new Date(a.signedUp));
    
    // Generate table rows
    let tableHTML = '';
    allUsers.forEach(user => {
        const userId = user.id || user.name.toLowerCase().replace(/\s+/g, '-');
        tableHTML += `
            <tr class="even:bg-sand-50 dark:even:bg-sand-800/50 hover:bg-brand-50 transition-colors cursor-pointer" onclick="openUserModal('${userId}')">
                <td class="py-4 px-6 font-bold text-sand-900 dark:text-white">${user.name}</td>
                <td class="py-4 px-6 text-sand-600 dark:text-sand-400">${user.branch}</td>
                <td class="py-4 px-6 text-sand-500 dark:text-sand-400">${user.signedUp}</td>
            </tr>
        `;
    });
    
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
document.addEventListener('DOMContentLoaded', () => {
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