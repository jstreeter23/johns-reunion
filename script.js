

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
function handleRegistration(e) {
    e.preventDefault();
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
    'monthly-dec': { title: "Monthly Family Update", time: "Dec 14 • 4:00 PM", location: "Zoom", desc: "Venue updates & fundraising.", extra: "Open forum Q&A." },
    'planning-dec': { title: "Planning Committee", time: "Dec 28 • 5:00 PM", location: "Zoom", desc: "Logistics & Food planning.", extra: "Review minutes before joining." },
    'monthly-jan': { title: "Monthly Family Update", time: "Jan 11 • 4:00 PM", location: "Zoom", desc: "Kick-off 2026 planning.", extra: "Vote on T-shirts." }
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

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    route(null, 'home');
}); 