// ============================================
// ADMIN DASHBOARD LOGIC
// ============================================

let isUnlocked = false;
let currentAdminTab = 'events';

// Check if already unlocked (session storage)
function checkUnlockStatus() {
    const unlocked = sessionStorage.getItem('adminUnlocked');
    if (unlocked === 'true') {
        unlockDashboard();
    }
}

// Attempt to unlock dashboard
function attemptUnlock() {
    const passwordInput = document.getElementById('admin-password-input');
    const password = passwordInput.value.trim();
    const errorMessage = document.getElementById('admin-error-message');
    const lockSlider = document.getElementById('lock-slider');
    const lockStatus = document.getElementById('lock-status');
    const lockIcon = document.getElementById('lock-icon');
    
    // Check password (from admin-config.js)
    if (typeof ADMIN_PASSWORD === 'undefined') {
        console.error('Admin password not configured. Please ensure admin-config.js is loaded.');
        showError('Configuration error. Please refresh the page.');
        return;
    }
    
    if (password === ADMIN_PASSWORD) {
        // Success - unlock
        unlockDashboard();
        sessionStorage.setItem('adminUnlocked', 'true');
        passwordInput.value = '';
        errorMessage.classList.add('hidden');
    } else {
        // Failed - shake animation
        showError('Incorrect password');
        lockSlider.style.animation = 'shake 0.5s';
        setTimeout(() => {
            lockSlider.style.animation = '';
        }, 500);
        passwordInput.value = '';
        passwordInput.focus();
    }
}

function showError(message) {
    const errorMessage = document.getElementById('admin-error-message');
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    setTimeout(() => {
        errorMessage.classList.add('hidden');
    }, 3000);
}

function unlockDashboard() {
    isUnlocked = true;
    const lockScreen = document.getElementById('admin-lock-screen');
    const dashboard = document.getElementById('admin-dashboard');
    const lockSlider = document.getElementById('lock-slider');
    const lockStatus = document.getElementById('lock-status');
    const lockIcon = document.getElementById('lock-icon');
    
    // Animate slider
    lockSlider.style.width = '100%';
    lockSlider.style.left = '0';
    lockSlider.innerHTML = '<i data-lucide="unlock" class="h-5 w-5 text-white"></i>';
    lockStatus.textContent = 'Unlocked';
    lockStatus.classList.add('text-green-500');
    
    setTimeout(() => {
        lockScreen.classList.add('hidden');
        dashboard.classList.remove('hidden');
        lucide.createIcons();
        
        // Load initial data
        loadAdminEvents();
        loadAdminAttendees();
    }, 500);
}

// Switch admin tabs
function switchAdminTab(tab) {
    currentAdminTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.admin-tab').forEach(btn => {
        btn.classList.remove('border-brand-600', 'text-brand-600', 'dark:text-brand-400');
        btn.classList.add('border-transparent', 'text-sand-500', 'dark:text-sand-400');
    });
    
    const activeTab = document.getElementById(`admin-tab-${tab}`);
    activeTab.classList.remove('border-transparent', 'text-sand-500', 'dark:text-sand-400');
    activeTab.classList.add('border-brand-600', 'text-brand-600', 'dark:text-brand-400');
    
    // Update tab content
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    document.getElementById(`admin-${tab}-tab`).classList.remove('hidden');
}

// ============================================
// EVENTS MANAGEMENT
// ============================================

async function loadAdminEvents() {
    const eventsList = document.getElementById('admin-events-list');
    eventsList.innerHTML = '<div class="text-center py-8 text-sand-500">Loading events...</div>';
    
    const result = await getEventsFromSupabase();
    
    if (result.success && result.data && result.data.length > 0) {
        let html = '';
        result.data.forEach(event => {
            const date = new Date(event.event_date);
            const formattedDate = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
            html += `
                <div class="bg-white dark:bg-sand-800 rounded-xl border border-sand-200 dark:border-sand-700 p-6 hover:shadow-lg transition-shadow">
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex-1">
                            <h3 class="text-xl font-serif font-bold text-sand-900 dark:text-white mb-2">${escapeHtml(event.title)}</h3>
                            <div class="flex flex-wrap gap-4 text-sm text-sand-600 dark:text-sand-400">
                                <span class="flex items-center gap-1">
                                    <i data-lucide="calendar" class="w-4 h-4"></i>
                                    ${formattedDate}
                                </span>
                                ${event.event_time ? `
                                    <span class="flex items-center gap-1">
                                        <i data-lucide="clock" class="w-4 h-4"></i>
                                        ${escapeHtml(event.event_time)}
                                    </span>
                                ` : ''}
                                ${event.location ? `
                                    <span class="flex items-center gap-1">
                                        <i data-lucide="map-pin" class="w-4 h-4"></i>
                                        ${escapeHtml(event.location)}
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                        <div class="flex gap-2 ml-4">
                            <button onclick="openEventModal('${event.id}')" class="p-2 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors" title="Edit">
                                <i data-lucide="edit" class="w-5 h-5"></i>
                            </button>
                            <button onclick="confirmDeleteEvent('${event.id}', '${escapeHtml(event.title)}')" class="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                                <i data-lucide="trash-2" class="w-5 h-5"></i>
                            </button>
                        </div>
                    </div>
                    ${event.description ? `
                        <p class="text-sm text-sand-700 dark:text-sand-300 mb-2">${escapeHtml(event.description)}</p>
                    ` : ''}
                    ${event.extra_info ? `
                        <p class="text-xs text-sand-500 dark:text-sand-400">${escapeHtml(event.extra_info)}</p>
                    ` : ''}
                </div>
            `;
        });
        eventsList.innerHTML = html;
        lucide.createIcons();
    } else {
        eventsList.innerHTML = '<div class="text-center py-8 text-sand-500">No events found. Create your first event!</div>';
    }
}

function openEventModal(eventId) {
    const modal = document.getElementById('admin-event-modal');
    const form = document.getElementById('admin-event-form');
    const title = document.getElementById('event-modal-title');
    const eventIdInput = document.getElementById('event-id');
    
    // Reset form
    form.reset();
    eventIdInput.value = eventId || '';
    title.textContent = eventId ? 'Edit Event' : 'Create Event';
    
    // If editing, load event data
    if (eventId) {
        loadEventData(eventId);
    }
    
    modal.classList.remove('hidden');
    lucide.createIcons();
}

async function loadEventData(eventId) {
    const result = await getEventsFromSupabase();
    
    if (result.success && result.data) {
        const event = result.data.find(e => e.id === eventId);
        if (event) {
            document.getElementById('event-title').value = event.title || '';
            document.getElementById('event-date').value = event.event_date || '';
            document.getElementById('event-time').value = event.event_time || '';
            document.getElementById('event-location').value = event.location || '';
            document.getElementById('event-description').value = event.description || '';
            document.getElementById('event-extra').value = event.extra_info || '';
        }
    }
}

function closeEventModal() {
    document.getElementById('admin-event-modal').classList.add('hidden');
}

async function saveEvent(e) {
    e.preventDefault();
    
    const eventId = document.getElementById('event-id').value;
    const eventData = {
        title: document.getElementById('event-title').value.trim(),
        event_date: document.getElementById('event-date').value,
        event_time: document.getElementById('event-time').value.trim() || null,
        location: document.getElementById('event-location').value.trim() || null,
        description: document.getElementById('event-description').value.trim() || null,
        extra_info: document.getElementById('event-extra').value.trim() || null
    };
    
    let result;
    if (eventId) {
        result = await updateEventInSupabase(eventId, eventData);
    } else {
        result = await createEventInSupabase(eventData);
    }
    
    if (result.success) {
        closeEventModal();
        await loadAdminEvents();
        showSuccessMessage(eventId ? 'Event updated successfully!' : 'Event created successfully!');
    } else {
        showErrorMessage('Failed to save event. Please try again.');
    }
}

function confirmDeleteEvent(eventId, eventTitle) {
    if (confirm(`Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`)) {
        deleteEvent(eventId);
    }
}

async function deleteEvent(eventId) {
    const result = await deleteEventFromSupabase(eventId);
    
    if (result.success) {
        await loadAdminEvents();
        showSuccessMessage('Event deleted successfully!');
    } else {
        showErrorMessage('Failed to delete event. Please try again.');
    }
}

// ============================================
// ATTENDEES MANAGEMENT
// ============================================

async function loadAdminAttendees() {
    const attendeesList = document.getElementById('admin-attendees-list');
    attendeesList.innerHTML = '<div class="text-center py-8 text-sand-500">Loading attendees...</div>';
    
    const result = await getRegistrationsFromSupabase();
    
    if (result.success && result.data && result.data.length > 0) {
        let html = '';
        result.data.forEach(attendee => {
            const signUpDate = new Date(attendee.created_at);
            const formattedDate = signUpDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            
            html += `
                <div class="bg-white dark:bg-sand-800 rounded-xl border border-sand-200 dark:border-sand-700 p-6 hover:shadow-lg transition-shadow">
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex-1">
                            <h3 class="text-xl font-serif font-bold text-sand-900 dark:text-white mb-2">${escapeHtml(attendee.name)}</h3>
                            <div class="flex flex-wrap gap-4 text-sm text-sand-600 dark:text-sand-400">
                                <span class="flex items-center gap-1">
                                    <i data-lucide="mail" class="w-4 h-4"></i>
                                    ${escapeHtml(attendee.email)}
                                </span>
                                <span class="flex items-center gap-1">
                                    <i data-lucide="phone" class="w-4 h-4"></i>
                                    ${escapeHtml(attendee.mobile)}
                                </span>
                                <span class="flex items-center gap-1">
                                    <i data-lucide="users" class="w-4 h-4"></i>
                                    ${escapeHtml(attendee.branch)}
                                </span>
                                ${attendee.birthday ? `
                                    <span class="flex items-center gap-1">
                                        <i data-lucide="cake" class="w-4 h-4"></i>
                                        ${escapeHtml(attendee.birthday)}
                                    </span>
                                ` : ''}
                            </div>
                            ${attendee.address ? `
                                <p class="text-sm text-sand-500 dark:text-sand-400 mt-2">
                                    <i data-lucide="map-pin" class="w-4 h-4 inline mr-1"></i>
                                    ${escapeHtml(attendee.address)}
                                </p>
                            ` : ''}
                            <p class="text-xs text-sand-400 dark:text-sand-500 mt-2">Signed up: ${formattedDate}</p>
                        </div>
                        <div class="flex gap-2 ml-4">
                            <button onclick="openAttendeeModal('${attendee.id}')" class="p-2 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors" title="Edit">
                                <i data-lucide="edit" class="w-5 h-5"></i>
                            </button>
                            <button onclick="confirmDeleteAttendee('${attendee.id}', '${escapeHtml(attendee.name)}')" class="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                                <i data-lucide="trash-2" class="w-5 h-5"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        attendeesList.innerHTML = html;
        lucide.createIcons();
    } else {
        attendeesList.innerHTML = '<div class="text-center py-8 text-sand-500">No attendees found.</div>';
    }
}

function openAttendeeModal(attendeeId) {
    const modal = document.getElementById('admin-attendee-modal');
    const form = document.getElementById('admin-attendee-form');
    const attendeeIdInput = document.getElementById('attendee-id');
    
    // Reset form
    form.reset();
    attendeeIdInput.value = attendeeId;
    
    // Load attendee data
    loadAttendeeData(attendeeId);
    
    modal.classList.remove('hidden');
    lucide.createIcons();
}

async function loadAttendeeData(attendeeId) {
    const result = await getRegistrationsFromSupabase();
    
    if (result.success && result.data) {
        const attendee = result.data.find(a => a.id === attendeeId);
        if (attendee) {
            document.getElementById('attendee-name').value = attendee.name || '';
            document.getElementById('attendee-email').value = attendee.email || '';
            document.getElementById('attendee-mobile').value = attendee.mobile || '';
            document.getElementById('attendee-address').value = attendee.address || '';
            document.getElementById('attendee-branch').value = attendee.branch || '';
            document.getElementById('attendee-birthday').value = attendee.birthday || '';
        }
    }
}

function closeAttendeeModal() {
    document.getElementById('admin-attendee-modal').classList.add('hidden');
}

async function saveAttendee(e) {
    e.preventDefault();
    
    const attendeeId = document.getElementById('attendee-id').value;
    const attendeeData = {
        name: document.getElementById('attendee-name').value.trim(),
        email: document.getElementById('attendee-email').value.trim(),
        mobile: document.getElementById('attendee-mobile').value.trim(),
        address: document.getElementById('attendee-address').value.trim() || null,
        branch: document.getElementById('attendee-branch').value,
        birthday: document.getElementById('attendee-birthday').value.trim() || null,
        profile_photo: null // Keep existing photo if any
    };
    
    const result = await updateRegistrationInSupabase(attendeeId, attendeeData);
    
    if (result.success) {
        closeAttendeeModal();
        await loadAdminAttendees();
        showSuccessMessage('Attendee updated successfully!');
    } else {
        showErrorMessage('Failed to save attendee. Please try again.');
    }
}

function confirmDeleteAttendee(attendeeId, attendeeName) {
    if (confirm(`Are you sure you want to delete "${attendeeName}"? This action cannot be undone.`)) {
        deleteAttendeeById(attendeeId);
    }
}

// Delete attendee from modal (gets ID from form)
async function deleteAttendee() {
    const attendeeId = document.getElementById('attendee-id').value;
    if (!attendeeId) {
        showErrorMessage('No attendee selected.');
        return;
    }
    
    // Get attendee name for confirmation
    const attendeeName = document.getElementById('attendee-name').value || 'this attendee';
    
    if (confirm(`Are you sure you want to delete "${attendeeName}"? This action cannot be undone.`)) {
        await deleteAttendeeById(attendeeId);
    }
}

// Delete attendee by ID
async function deleteAttendeeById(attendeeId) {
    const result = await deleteRegistrationFromSupabase(attendeeId);
    
    if (result.success) {
        closeAttendeeModal();
        await loadAdminAttendees();
        showSuccessMessage('Attendee deleted successfully!');
    } else {
        showErrorMessage('Failed to delete attendee. Please try again.');
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Success/Error message display
function showSuccessMessage(message) {
    showToast(message, 'success');
}

function showErrorMessage(message) {
    showToast(message, 'error');
}

function showToast(message, type) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `fixed top-24 right-4 z-[200] px-6 py-4 rounded-xl shadow-lg transition-all transform translate-x-0 ${
        type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
    }`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        toast.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Make functions globally accessible for onclick handlers
window.attemptUnlock = attemptUnlock;
window.switchAdminTab = switchAdminTab;
window.openEventModal = openEventModal;
window.closeEventModal = closeEventModal;
window.saveEvent = saveEvent;
window.confirmDeleteEvent = confirmDeleteEvent;
window.openAttendeeModal = openAttendeeModal;
window.closeAttendeeModal = closeAttendeeModal;
window.saveAttendee = saveAttendee;
window.deleteAttendee = deleteAttendee;
window.confirmDeleteAttendee = confirmDeleteAttendee;
window.deleteAttendeeById = deleteAttendeeById;

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        checkUnlockStatus();
    });
} else {
    // DOM already loaded
    checkUnlockStatus();
}
