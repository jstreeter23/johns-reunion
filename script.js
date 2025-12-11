

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
        
        // Initialize address autocomplete if registration page is loaded
        if (viewId === 'register') {
            // Try immediately, and also retry in case API is still loading
            setTimeout(() => {
                initializeAddressAutocomplete();
            }, 100);
            setTimeout(() => {
                initializeAddressAutocomplete();
            }, 1000);
        }
        
        // Initialize ideas view if ideas page is loaded
        if (viewId === 'ideas') {
            setTimeout(async () => {
                // Load ideas and show submit view by default
                await loadIdeasForDisplay();
                switchIdeasView('submit');
            }, 100);
        }
        
        // Initialize admin dashboard if admin page is loaded
        if (viewId === 'admin') {
            // Load admin scripts dynamically
            setTimeout(() => {
                // Check if admin scripts are already loaded
                if (typeof checkUnlockStatus === 'undefined') {
                    // Load admin-config.js first, then admin.js
                    const configScript = document.createElement('script');
                    configScript.src = 'admin-config.js';
                    configScript.onerror = () => {
                        console.error('Failed to load admin-config.js. Please ensure the file exists.');
                        const contentContainer = document.getElementById('page-content');
                        contentContainer.innerHTML = `
                            <div class="text-center py-12">
                                <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 max-w-md mx-auto">
                                    <h3 class="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Configuration Error</h3>
                                    <p class="text-sm text-red-700 dark:text-red-300">admin-config.js file not found. Please create this file with your admin password.</p>
                                </div>
                            </div>
                        `;
                    };
                    configScript.onload = () => {
                        const adminScript = document.createElement('script');
                        adminScript.src = 'admin.js';
                        adminScript.onerror = () => {
                            console.error('Failed to load admin.js');
                        };
                        document.body.appendChild(adminScript);
                    };
                    document.body.appendChild(configScript);
                } else {
                    // Scripts already loaded, just check unlock status
                    if (typeof checkUnlockStatus !== 'undefined') {
                        checkUnlockStatus();
                    }
                }
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

// Initialize Address Autocomplete using multiple free APIs with fallbacks
let autocompleteTimeout = null;
let currentSuggestions = [];

function initializeAddressAutocomplete() {
    const addressInput = document.getElementById('address');
    if (addressInput && !addressInput.dataset.autocompleteInitialized) {
        setupAddressAutocomplete(addressInput);
        addressInput.dataset.autocompleteInitialized = 'true';
    }
    
    // Initialize for additional participant address fields
    const participantAddressInputs = document.querySelectorAll('[data-participant-field="address"]');
    participantAddressInputs.forEach(input => {
        if (!input.dataset.autocompleteInitialized) {
            setupAddressAutocomplete(input);
            input.dataset.autocompleteInitialized = 'true';
        }
    });
}

function setupAddressAutocomplete(input) {
    let suggestionsContainer = null;
    let selectedIndex = -1;
    
    // Create suggestions dropdown
    const container = input.parentElement;
    suggestionsContainer = document.createElement('div');
    suggestionsContainer.className = 'absolute z-50 w-full mt-1 bg-white dark:bg-sand-800 border border-sand-200 dark:border-sand-700 rounded-lg shadow-lg max-h-60 overflow-y-auto hidden';
    suggestionsContainer.id = `suggestions-${input.id || Math.random().toString(36).substr(2, 9)}`;
    container.style.position = 'relative';
    container.appendChild(suggestionsContainer);
    
    input.addEventListener('input', function(e) {
        const query = e.target.value.trim();
        
        // Clear previous timeout
        if (autocompleteTimeout) {
            clearTimeout(autocompleteTimeout);
        }
        
        // Hide suggestions if input is empty
        if (query.length < 2) {
            suggestionsContainer.classList.add('hidden');
            currentSuggestions = [];
            return;
        }
        
        // Debounce API calls - shorter delay for better responsiveness
        autocompleteTimeout = setTimeout(() => {
            fetchAddressSuggestions(query, suggestionsContainer, input);
        }, 200);
    });
    
    input.addEventListener('keydown', function(e) {
        if (!suggestionsContainer || suggestionsContainer.classList.contains('hidden')) return;
        
        const suggestions = suggestionsContainer.querySelectorAll('.suggestion-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
            updateSelection(suggestions, selectedIndex);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            updateSelection(suggestions, selectedIndex);
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            const selected = suggestions[selectedIndex];
            if (selected) {
                input.value = selected.dataset.address;
                suggestionsContainer.classList.add('hidden');
                currentSuggestions = [];
            }
        } else if (e.key === 'Escape') {
            suggestionsContainer.classList.add('hidden');
            selectedIndex = -1;
        }
    });
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!container.contains(e.target)) {
            suggestionsContainer.classList.add('hidden');
        }
    });
}

function updateSelection(suggestions, index) {
    suggestions.forEach((s, i) => {
        if (i === index) {
            s.classList.add('bg-brand-100', 'dark:bg-brand-900/50');
            s.scrollIntoView({ block: 'nearest' });
        } else {
            s.classList.remove('bg-brand-100', 'dark:bg-brand-900/50');
        }
    });
}

async function fetchAddressSuggestions(query, container, input) {
    try {
        // Try multiple APIs with fallbacks for better reliability
        // Method 1: Try Nominatim (OpenStreetMap) - more reliable for US addresses
        try {
            let cleanQuery = query.trim();
            
            // Try multiple query variations to catch different address formats
            const queries = [
                cleanQuery, // Original: "5640 S La Brea Avenue Los Angeles 90056"
                cleanQuery.replace(/\s+/g, ' '), // Normalize spaces
            ];
            
            // If query has a zip code, try without it (sometimes helps)
            const zipMatch = cleanQuery.match(/\b\d{5}(-\d{4})?\b/);
            if (zipMatch) {
                queries.push(cleanQuery.replace(/\b\d{5}(-\d{4})?\b/, '').trim());
            }
            
            let allResults = [];
            
            // Try each query variation
            for (const q of queries) {
                if (q.length < 2) continue;
                
                try {
                    // Use viewbox to bias towards US (helps with residential addresses)
                    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=us&limit=15&addressdetails=1&dedupe=1&extratags=1&viewbox=-125.0,24.0,-66.0,49.0&bounded=0`;
                    const response = await fetch(nominatimUrl, {
                        headers: {
                            'User-Agent': 'JohnsFamilyReunion/1.0',
                            'Accept-Language': 'en-US,en'
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        if (data && data.length > 0) {
                            allResults = allResults.concat(data);
                        }
                    }
                } catch (err) {
                    // Continue to next query if this one fails
                    continue;
                }
            }
            
            // Remove duplicates based on display_name and coordinates
            const uniqueResults = [];
            const seen = new Set();
            for (const item of allResults) {
                const key = `${item.display_name}|${item.lat}|${item.lon}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueResults.push(item);
                }
            }
            
            if (uniqueResults.length > 0) {
                // Prioritize: exact house number matches > house numbers > residential > other
                const prioritized = uniqueResults.sort((a, b) => {
                    const aHasHouse = !!(a.address?.house_number);
                    const bHasHouse = !!(b.address?.house_number);
                    const aIsHouse = a.type === 'house' || a.class === 'place';
                    const bIsHouse = b.type === 'house' || b.class === 'place';
                    const aIsResidential = aIsHouse || a.class === 'building' || a.type === 'residential';
                    const bIsResidential = bIsHouse || b.class === 'building' || b.type === 'residential';
                    
                    // Highest priority: has house number AND is residential
                    if (aHasHouse && aIsResidential && !(bHasHouse && bIsResidential)) return -1;
                    if (bHasHouse && bIsResidential && !(aHasHouse && aIsResidential)) return 1;
                    
                    // Second: has house number
                    if (aHasHouse && !bHasHouse) return -1;
                    if (!aHasHouse && bHasHouse) return 1;
                    
                    // Third: is residential
                    if (aIsResidential && !bIsResidential) return -1;
                    if (!aIsResidential && bIsResidential) return 1;
                    
                    return 0;
                });
                
                const formattedSuggestions = prioritized.slice(0, 8).map(item => ({
                    display_name: item.display_name,
                    address: item.address || {},
                    lat: item.lat,
                    lon: item.lon,
                    type: item.type,
                    class: item.class
                }));
                
                currentSuggestions = formattedSuggestions;
                displayNominatimSuggestions(formattedSuggestions, container, input);
                return;
            }
        } catch (nominatimError) {
            console.log('Nominatim failed, trying fallback...', nominatimError);
        }
        
        // Method 2: Fallback to Photon API
        const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10&lang=en`;
        const photonResponse = await fetch(photonUrl);
        const photonData = await photonResponse.json();
        
        if (photonData.features && photonData.features.length > 0) {
            // Filter to only United States addresses
            const usFeatures = photonData.features.filter(feature => {
                const props = feature.properties || {};
                const country = (props.country || props.countrycode || '').toLowerCase();
                const countryCode = (props.countrycode || '').toLowerCase();
                
                return country === 'us' || country === 'usa' || country === 'united states' ||
                       countryCode === 'us' || countryCode === 'usa' ||
                       props.country === 'United States' || props.country === 'USA';
            });
            
            // Sort: prioritize results with house numbers
            usFeatures.sort((a, b) => {
                const aHasNumber = !!(a.properties?.housenumber);
                const bHasNumber = !!(b.properties?.housenumber);
                if (aHasNumber && !bHasNumber) return -1;
                if (!aHasNumber && bHasNumber) return 1;
                return 0;
            });
            
            const limitedFeatures = usFeatures.slice(0, 5);
            
            if (limitedFeatures.length > 0) {
                currentSuggestions = limitedFeatures;
                displaySuggestions(limitedFeatures, container, input);
            } else {
                container.classList.add('hidden');
            }
        } else {
            container.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error fetching address suggestions:', error);
        container.classList.add('hidden');
    }
}

function displayNominatimSuggestions(suggestions, container, input) {
    container.innerHTML = '';
    selectedIndex = -1;
    
    if (suggestions.length === 0) {
        container.classList.add('hidden');
        return;
    }
    
    suggestions.forEach((item, index) => {
        const suggestion = document.createElement('div');
        suggestion.className = 'suggestion-item px-4 py-3 cursor-pointer hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors border-b border-sand-100 dark:border-sand-700 last:border-b-0';
        
        const addr = item.address || {};
        const displayName = item.display_name;
        
        // Build street address from components
        let streetAddress = '';
        const streetParts = [];
        
        if (addr.house_number) {
            streetParts.push(addr.house_number);
        }
        
        // Handle street direction (N, S, E, W, etc.)
        if (addr.road) {
            streetParts.push(addr.road);
        } else if (addr.street) {
            streetParts.push(addr.street);
        } else if (addr.pedestrian) {
            streetParts.push(addr.pedestrian);
        } else if (addr.path) {
            streetParts.push(addr.path);
        }
        
        streetAddress = streetParts.join(' ');
        
        // Fallback: extract from display_name if components aren't available
        if (!streetAddress) {
            // Try to extract street address from display_name
            const parts = displayName.split(',');
            streetAddress = parts[0] || displayName;
        }
        
        const city = addr.city || addr.town || addr.village || addr.municipality || addr.suburb || '';
        const state = addr.state || '';
        const postcode = addr.postcode || '';
        
        // Build full formatted address - use display_name if it's well formatted, otherwise construct
        let fullAddress = displayName;
        
        // If display_name doesn't look complete, build our own
        if (!displayName.includes(city) || !displayName.includes(state)) {
            const addressParts = [];
            if (streetAddress) addressParts.push(streetAddress);
            if (city) addressParts.push(city);
            if (state) addressParts.push(state);
            if (postcode) addressParts.push(postcode);
            fullAddress = addressParts.join(', ');
        }
        
        suggestion.innerHTML = `
            <div class="font-medium text-sand-900 dark:text-white">${streetAddress || displayName.split(',')[0]}</div>
            ${(city || state || postcode) ? `<div class="text-sm text-sand-500 dark:text-sand-400">${[city, state, postcode].filter(Boolean).join(', ')}</div>` : ''}
        `;
        
        suggestion.dataset.address = fullAddress;
        suggestion.addEventListener('click', function() {
            input.value = fullAddress;
            container.classList.add('hidden');
            currentSuggestions = [];
        });
        
        container.appendChild(suggestion);
    });
    
    container.classList.remove('hidden');
}

function displaySuggestions(features, container, input) {
    container.innerHTML = '';
    selectedIndex = -1;
    
    features.forEach((feature, index) => {
        const suggestion = document.createElement('div');
        suggestion.className = 'suggestion-item px-4 py-3 cursor-pointer hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors border-b border-sand-100 dark:border-sand-700 last:border-b-0';
        
        // Format address from Photon properties
        const props = feature.properties || {};
        
        // Build street address with house number, direction, and street name
        let streetAddress = '';
        if (props.housenumber) {
            streetAddress = props.housenumber;
        }
        
        // Add street direction (N, S, E, W, etc.) if present
        if (props.street) {
            streetAddress += streetAddress ? ` ${props.street}` : props.street;
        } else if (props.name) {
            // Check if name contains direction prefix
            streetAddress += streetAddress ? ` ${props.name}` : props.name;
        }
        
        const city = props.city || props.locality || props.district || '';
        const state = props.state || '';
        const postcode = props.postcode || '';
        
        // Build full formatted address
        let fullFormattedAddress = streetAddress || props.name || props.street || '';
        const addressParts = [];
        
        if (fullFormattedAddress) addressParts.push(fullFormattedAddress);
        if (city) addressParts.push(city);
        if (state) addressParts.push(state);
        if (postcode) addressParts.push(postcode);
        
        fullFormattedAddress = addressParts.join(', ');
        
        // If Photon provides display_name, prefer it but ensure it's complete
        if (props.display_name && props.display_name.includes(city)) {
            fullFormattedAddress = props.display_name;
        }
        
        // Build display text (shorter version for dropdown)
        let displayText = streetAddress || props.name || props.street || '';
        if (!displayText && props.display_name) {
            // Extract just the street part from display_name
            const parts = props.display_name.split(',');
            displayText = parts[0] || props.display_name;
        }
        
        suggestion.innerHTML = `
            <div class="font-medium text-sand-900 dark:text-white">${displayText || fullFormattedAddress}</div>
            ${(city || state || postcode) ? `<div class="text-sm text-sand-500 dark:text-sand-400">${[city, state, postcode].filter(Boolean).join(', ')}</div>` : ''}
        `;
        
        suggestion.dataset.address = fullFormattedAddress;
        suggestion.addEventListener('click', function() {
            input.value = fullFormattedAddress;
            container.classList.add('hidden');
            currentSuggestions = [];
        });
        
        container.appendChild(suggestion);
    });
    
    container.classList.remove('hidden');
}

// Additional Participants Management
let additionalParticipantCount = 0;
let participantPhotos = {}; // Store photos by participant ID

function addAdditionalParticipant() {
    additionalParticipantCount++;
    const participantId = `participant-${additionalParticipantCount}`;
    const container = document.getElementById('additional-participants-container');
    
    const participantCard = document.createElement('div');
    participantCard.id = participantId;
    participantCard.className = 'bg-sand-50 dark:bg-sand-900/30 rounded-xl p-6 border-2 border-sand-200 dark:border-sand-700 relative';
    
    participantCard.innerHTML = `
        <div class="flex items-center justify-between mb-4 pb-3 border-b border-sand-200 dark:border-sand-700">
            <h4 class="text-lg font-bold font-serif text-sand-800 dark:text-sand-200">Participant ${additionalParticipantCount}</h4>
            <button type="button" onclick="removeAdditionalParticipant('${participantId}')" class="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors flex items-center gap-1">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
                <span class="text-sm">Remove</span>
            </button>
        </div>
        
        <div class="space-y-6">
            <div class="space-y-6">
                <h5 class="text-sm font-bold text-sand-600 dark:text-sand-400 uppercase">Contact Details</h5>
                <div class="grid md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-xs font-bold uppercase text-sand-500 mb-1 ml-1">Full Name *</label>
                        <input type="text" data-participant-field="name" required class="w-full bg-white dark:bg-sand-800 border border-sand-200 dark:border-sand-600 rounded-xl px-4 py-3 outline-none focus:border-brand-500 transition-all">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-sand-500 mb-1 ml-1">Email *</label>
                        <input type="email" data-participant-field="email" required class="w-full bg-white dark:bg-sand-800 border border-sand-200 dark:border-sand-600 rounded-xl px-4 py-3 outline-none focus:border-brand-500 transition-all">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-sand-500 mb-1 ml-1">Mobile (Text Group) *</label>
                    <input type="tel" data-participant-field="mobile" required class="w-full bg-white dark:bg-sand-800 border border-sand-200 dark:border-sand-600 rounded-xl px-4 py-3 outline-none focus:border-brand-500 transition-all">
                </div>
                <div class="relative">
                    <label class="block text-xs font-bold uppercase text-sand-500 mb-1 ml-1">Address</label>
                    <input type="text" data-participant-field="address" placeholder="Start typing your address..." class="w-full bg-white dark:bg-sand-800 border border-sand-200 dark:border-sand-600 rounded-xl px-4 py-3 outline-none focus:border-brand-500 transition-all">
                </div>
            </div>
            
            <div class="space-y-6 pt-4">
                <h5 class="text-sm font-bold text-sand-600 dark:text-sand-400 uppercase">Family Information</h5>
                <div>
                    <label class="block text-xs font-bold uppercase text-sand-500 mb-1 ml-1">Family Branch *</label>
                    <select data-participant-field="branch" required class="w-full bg-white dark:bg-sand-800 border border-sand-200 dark:border-sand-600 rounded-xl px-4 py-3 outline-none focus:border-brand-500 transition-all">
                        <option value="" disabled selected>Choose Descendant of...</option>
                        <option>William Johns</option>
                        <option>L.C. Johns</option>
                        <option>Alice Walker</option>
                        <option>Stephen Johns</option>
                        <option>Roger Johns</option>
                        <option>Bennie Johns</option>
                        <option>Larry Johns</option>
                        <option>Milton Johns</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-sand-500 mb-1 ml-1">Birthday</label>
                    <div class="grid grid-cols-2 gap-3">
                        <select data-participant-birthday-month="${participantId}" class="w-full bg-white dark:bg-sand-800 border border-sand-200 dark:border-sand-600 rounded-xl px-4 py-3 outline-none focus:border-brand-500 transition-all" onchange="updateParticipantDays('${participantId}')">
                            <option value="" disabled selected>Month</option>
                            <option value="01">January</option>
                            <option value="02">February</option>
                            <option value="03">March</option>
                            <option value="04">April</option>
                            <option value="05">May</option>
                            <option value="06">June</option>
                            <option value="07">July</option>
                            <option value="08">August</option>
                            <option value="09">September</option>
                            <option value="10">October</option>
                            <option value="11">November</option>
                            <option value="12">December</option>
                        </select>
                        <select data-participant-birthday-day="${participantId}" disabled class="w-full bg-white dark:bg-sand-800 border border-sand-200 dark:border-sand-600 rounded-xl px-4 py-3 outline-none focus:border-brand-500 transition-all">
                            <option value="">Day</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-sand-500 mb-1 ml-1">Profile Photo (Optional)</label>
                    <div class="mt-2">
                        <input type="file" data-participant-photo="${participantId}" accept="image/*" class="hidden" onchange="handleParticipantPhotoUpload(event, '${participantId}')">
                        <label for="participant-photo-${participantId}" data-participant-photo-label="${participantId}" class="cursor-pointer inline-flex items-center gap-2 px-4 py-3 bg-white dark:bg-sand-800 border border-sand-200 dark:border-sand-600 rounded-xl hover:bg-sand-100 dark:hover:bg-sand-900 transition-colors">
                            <i data-lucide="camera" class="w-5 h-5 text-sand-500"></i>
                            <span class="text-sm text-sand-700 dark:text-sand-300">Choose Photo</span>
                        </label>
                        <div data-participant-photo-preview="${participantId}" class="mt-3 hidden">
                            <div class="relative inline-block">
                                <img data-participant-photo-image="${participantId}" src="" alt="Preview" class="w-24 h-24 object-cover rounded-xl border-2 border-sand-200 dark:border-sand-700">
                                <button type="button" onclick="removeParticipantPhoto('${participantId}')" class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                                    <i data-lucide="x" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.appendChild(participantCard);
    lucide.createIcons();
    
    // Set up label click handler for photo upload
    const photoLabel = participantCard.querySelector(`[data-participant-photo-label="${participantId}"]`);
    const photoInput = participantCard.querySelector(`[data-participant-photo="${participantId}"]`);
    if (photoLabel && photoInput) {
        photoLabel.setAttribute('for', `participant-photo-${participantId}`);
        photoInput.id = `participant-photo-${participantId}`;
    }
    
    // Initialize address autocomplete for new participant
    setTimeout(() => {
        const participantAddressInput = participantCard.querySelector('[data-participant-field="address"]');
        if (participantAddressInput && !participantAddressInput.dataset.autocompleteInitialized) {
            setupAddressAutocomplete(participantAddressInput);
            participantAddressInput.dataset.autocompleteInitialized = 'true';
        }
    }, 100);
}

function updateParticipantDays(participantId) {
    const monthSelect = document.querySelector(`[data-participant-birthday-month="${participantId}"]`);
    const daySelect = document.querySelector(`[data-participant-birthday-day="${participantId}"]`);
    if (!monthSelect || !daySelect) return;
    
    const month = parseInt(monthSelect.value);
    if (isNaN(month) || month < 1 || month > 12) {
        daySelect.innerHTML = '<option value="">Day</option>';
        daySelect.disabled = true;
        return;
    }
    
    const daysInMonth = new Date(2024, month, 0).getDate(); // Use 2024 (leap year) to get max days
    
    daySelect.innerHTML = '';
    daySelect.disabled = false;
    
    // Add placeholder
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Day';
    placeholder.disabled = true;
    placeholder.selected = true;
    daySelect.appendChild(placeholder);
    
    // Add day options
    for (let day = 1; day <= daysInMonth; day++) {
        const option = document.createElement('option');
        option.value = String(day).padStart(2, '0');
        option.textContent = day;
        daySelect.appendChild(option);
    }
}

function updatePrimaryDays() {
    const monthSelect = document.getElementById('birthday-month');
    const daySelect = document.getElementById('birthday-day');
    if (!monthSelect || !daySelect) return;
    
    const month = parseInt(monthSelect.value);
    if (isNaN(month) || month < 1 || month > 12) {
        daySelect.innerHTML = '<option value="">Day</option>';
        daySelect.disabled = true;
        return;
    }
    
    const daysInMonth = new Date(2024, month, 0).getDate(); // Use 2024 (leap year) to get max days
    
    daySelect.innerHTML = '';
    daySelect.disabled = false;
    
    // Add placeholder
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Day';
    placeholder.disabled = true;
    placeholder.selected = true;
    daySelect.appendChild(placeholder);
    
    // Add day options
    for (let day = 1; day <= daysInMonth; day++) {
        const option = document.createElement('option');
        option.value = String(day).padStart(2, '0');
        option.textContent = day;
        daySelect.appendChild(option);
    }
}

function removeAdditionalParticipant(participantId) {
    const participantCard = document.getElementById(participantId);
    if (participantCard) {
        participantCard.remove();
        delete participantPhotos[participantId];
    }
}

function handleParticipantPhotoUpload(event, participantId) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            participantPhotos[participantId] = e.target.result;
            const previewImage = document.querySelector(`[data-participant-photo-image="${participantId}"]`);
            const previewContainer = document.querySelector(`[data-participant-photo-preview="${participantId}"]`);
            if (previewImage) previewImage.src = e.target.result;
            if (previewContainer) previewContainer.classList.remove('hidden');
            lucide.createIcons();
        };
        reader.readAsDataURL(file);
    }
}

function removeParticipantPhoto(participantId) {
    participantPhotos[participantId] = null;
    const photoInput = document.querySelector(`[data-participant-photo="${participantId}"]`);
    const previewContainer = document.querySelector(`[data-participant-photo-preview="${participantId}"]`);
    if (photoInput) photoInput.value = '';
    if (previewContainer) previewContainer.classList.add('hidden');
    lucide.createIcons();
}

async function handleRegistration(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i data-lucide="loader-2" class="animate-spin w-4 h-4"></i> Submitting...';
    submitBtn.disabled = true;
    lucide.createIcons();
    
    // Collect all participants (primary + additional)
    const allParticipants = [];
    
    // Get primary registrar data
    const birthdayMonth = document.getElementById('birthday-month').value;
    const birthdayDay = document.getElementById('birthday-day').value;
    const birthday = (birthdayMonth && birthdayDay) ? `${birthdayMonth}/${birthdayDay}` : '';
    
    const primaryData = {
        name: document.getElementById('full-name').value,
        email: document.getElementById('email').value,
        mobile: document.getElementById('mobile').value,
        address: document.getElementById('address').value || '',
        branch: document.getElementById('family-branch').value,
        birthday: birthday,
        profilePhoto: uploadedPhotoData || null,
        signedUp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
    allParticipants.push(primaryData);
    
    // Get additional participants data
    const additionalContainers = document.querySelectorAll('[id^="participant-"]');
    additionalContainers.forEach(container => {
        const participantId = container.id;
        const partMonth = container.querySelector(`[data-participant-birthday-month="${participantId}"]`).value;
        const partDay = container.querySelector(`[data-participant-birthday-day="${participantId}"]`).value;
        const partBirthday = (partMonth && partDay) ? `${partMonth}/${partDay}` : '';
        
        const participantData = {
            name: container.querySelector('[data-participant-field="name"]').value,
            email: container.querySelector('[data-participant-field="email"]').value,
            mobile: container.querySelector('[data-participant-field="mobile"]').value,
            address: container.querySelector('[data-participant-field="address"]').value || '',
            branch: container.querySelector('[data-participant-field="branch"]').value,
            birthday: partBirthday,
            profilePhoto: participantPhotos[participantId] || null,
            signedUp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };
        allParticipants.push(participantData);
    });
    
    // Submit each participant separately
    let successCount = 0;
    let errorCount = 0;
    
    for (const participantData of allParticipants) {
        const result = await submitRegistrationToSupabase(participantData);
    
    if (result.fallback) {
        // Supabase not configured - use localStorage
        console.log('⚠️ Supabase not configured, saving to localStorage');
            const userId = participantData.name.toLowerCase().replace(/\s+/g, '-');
        let registrations = JSON.parse(localStorage.getItem('reunionRegistrations') || '[]');
            registrations.push({ id: userId, ...participantData });
        localStorage.setItem('reunionRegistrations', JSON.stringify(registrations));
            successCount++;
    } else if (result.success) {
        console.log('✅ Registration saved to Supabase!', result.data);
            successCount++;
    } else {
        // Supabase error - save to localStorage as backup
        console.error('❌ Supabase error:', result.error);
            const userId = participantData.name.toLowerCase().replace(/\s+/g, '-');
        let registrations = JSON.parse(localStorage.getItem('reunionRegistrations') || '[]');
            registrations.push({ id: userId, ...participantData });
        localStorage.setItem('reunionRegistrations', JSON.stringify(registrations));
            successCount++; // Still count as success since we saved to localStorage
        }
    }
    
    // Reset form
    e.target.reset();
    uploadedPhotoData = null;
    participantPhotos = {};
    additionalParticipantCount = 0;
    const photoPreview = document.getElementById('photo-preview');
    if (photoPreview) photoPreview.classList.add('hidden');
    
    // Clear additional participants
    const additionalContainer = document.getElementById('additional-participants-container');
    if (additionalContainer) additionalContainer.innerHTML = '';
    
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
        allIdeas = ideas; // Update local array
        console.log('💾 Idea saved to localStorage (Supabase not configured)');
    } else if (result.success) {
        console.log('✅ Idea submitted to Supabase successfully!');
        // Reload ideas to get the new one
        await loadIdeasForDisplay();
    } else {
        console.error('❌ Failed to submit idea:', result.error);
        // Still save to localStorage as backup
        let ideas = JSON.parse(localStorage.getItem('reunionIdeas') || '[]');
        ideas.push({ name, idea, created_at: new Date().toISOString() });
        localStorage.setItem('reunionIdeas', JSON.stringify(ideas));
        allIdeas = ideas; // Update local array
    }
    
    document.getElementById('idea-success').classList.remove('hidden');
    btn.innerHTML = originalText;
    btn.disabled = false;
}

function resetIdeaForm() {
    document.getElementById('idea-form').reset();
    document.getElementById('idea-success').classList.add('hidden');
}

// Ideas View Management
let allIdeas = [];
let ideaElements = [];

function switchIdeasView(view) {
    const submitView = document.getElementById('ideas-submit-view');
    const viewView = document.getElementById('ideas-view-view');
    const tabSubmit = document.getElementById('tab-submit');
    const tabView = document.getElementById('tab-view');
    
    if (view === 'submit') {
        submitView.classList.remove('hidden');
        viewView.classList.add('hidden');
        tabSubmit.classList.add('bg-brand-600', 'text-white', 'shadow-md');
        tabSubmit.classList.remove('bg-sand-200', 'dark:bg-sand-800', 'text-sand-700', 'dark:text-sand-300');
        tabView.classList.remove('bg-brand-600', 'text-white', 'shadow-md');
        tabView.classList.add('bg-sand-200', 'dark:bg-sand-800', 'text-sand-700', 'dark:text-sand-300');
    } else {
        submitView.classList.add('hidden');
        viewView.classList.remove('hidden');
        tabView.classList.add('bg-brand-600', 'text-white', 'shadow-md');
        tabView.classList.remove('bg-sand-200', 'dark:bg-sand-800', 'text-sand-700', 'dark:text-sand-300');
        tabSubmit.classList.remove('bg-brand-600', 'text-white', 'shadow-md');
        tabSubmit.classList.add('bg-sand-200', 'dark:bg-sand-800', 'text-sand-700', 'dark:text-sand-300');
        renderFloatingIdeas();
    }
    lucide.createIcons();
}

async function loadIdeasForDisplay() {
    const loadingEl = document.getElementById('ideas-loading');
    const emptyEl = document.getElementById('ideas-empty');
    const container = document.getElementById('ideas-container');
    
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (emptyEl) emptyEl.classList.add('hidden');
    
    // Try to get ideas from Supabase first
    const result = await getIdeasFromSupabase();
    
    if (result.success && result.data) {
        allIdeas = result.data;
    } else if (result.fallback) {
        // Supabase not configured - use localStorage
        const ideas = JSON.parse(localStorage.getItem('reunionIdeas') || '[]');
        allIdeas = ideas;
    } else {
        // Supabase error - fall back to localStorage
        const ideas = JSON.parse(localStorage.getItem('reunionIdeas') || '[]');
        allIdeas = ideas;
    }
    
    if (loadingEl) loadingEl.classList.add('hidden');
    
    if (allIdeas.length === 0) {
        if (emptyEl) emptyEl.classList.remove('hidden');
    }
}

// Function to delete all test ideas (can be called from browser console)
async function deleteAllIdeas() {
    if (confirm('Are you sure you want to delete ALL ideas? This cannot be undone.')) {
        // Clear localStorage
        localStorage.removeItem('reunionIdeas');
        console.log('✅ Cleared ideas from localStorage');
        
        // Try to delete from Supabase if configured
        const result = await deleteAllIdeasFromSupabase();
        if (result.success) {
            console.log('✅ Deleted all ideas from Supabase');
        } else if (!result.fallback) {
            console.log('⚠️ Could not delete from Supabase:', result.error);
        }
        
        // Reload ideas display
        allIdeas = [];
        if (document.getElementById('ideas-view-view') && !document.getElementById('ideas-view-view').classList.contains('hidden')) {
            renderFloatingIdeas();
        }
        
        alert('All ideas have been deleted.');
    }
}

function renderFloatingIdeas() {
    const container = document.getElementById('ideas-container');
    if (!container) return;
    
    // Clear existing ideas
    container.innerHTML = '';
    ideaElements = [];
    
    if (allIdeas.length === 0) {
        return;
    }
    
    // Create floating idea cards
    allIdeas.forEach((idea, index) => {
        const ideaCard = document.createElement('div');
        ideaCard.className = 'idea-card absolute cursor-pointer transition-all duration-300 group';
        
        // Random starting position (avoid edges)
        const left = Math.random() * 70 + 10; // 10% to 80%
        const top = Math.random() * 70 + 10; // 10% to 80%
        
        // Random rotation
        const rotation = (Math.random() - 0.5) * 15; // -7.5 to 7.5 degrees
        
        // Random size variation
        const size = Math.random() * 0.25 + 0.9; // 0.9 to 1.15 scale
        
        ideaCard.style.left = `${left}%`;
        ideaCard.style.top = `${top}%`;
        ideaCard.style.setProperty('--rotation', `${rotation}deg`);
        ideaCard.style.setProperty('--scale', size);
        ideaCard.style.transform = `rotate(${rotation}deg) scale(${size})`;
        ideaCard.style.zIndex = index;
        
        // Create card content
        ideaCard.innerHTML = `
            <div class="bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/30 dark:to-brand-800/30 rounded-2xl p-4 shadow-lg border-2 border-brand-200 dark:border-brand-700/50 backdrop-blur-sm min-w-[200px] max-w-[280px] transition-all duration-300 group-hover:shadow-2xl group-hover:border-brand-400 dark:group-hover:border-brand-500">
                <div class="flex items-start gap-2">
                    <i data-lucide="lightbulb" class="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5"></i>
                    <div class="flex-1 min-w-0">
                        <p class="text-xs font-bold text-brand-700 dark:text-brand-300 uppercase tracking-wide mb-2 truncate group-hover:whitespace-normal">${escapeHtml(idea.name || 'Anonymous')}</p>
                        <p class="text-sm text-sand-700 dark:text-sand-300 line-clamp-3 group-hover:line-clamp-none group-hover:whitespace-normal">${escapeHtml(idea.idea)}</p>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(ideaCard);
        ideaElements.push(ideaCard);
        
        // Add floating animation
        animateIdeaCard(ideaCard);
    });
    
    lucide.createIcons();
}

function animateIdeaCard(card) {
    // Gentle floating animation using CSS animations
    const duration = 15 + Math.random() * 10; // 15-25 seconds
    const delay = Math.random() * 2;
    
    // Get the initial transform values
    const initialTransform = card.style.transform;
    const rotationMatch = initialTransform.match(/rotate\(([^)]+)\)/);
    const scaleMatch = initialTransform.match(/scale\(([^)]+)\)/);
    const rotation = rotationMatch ? rotationMatch[1] : '0deg';
    const scale = scaleMatch ? scaleMatch[1] : '1';
    
    // Store original scale for hover restoration
    card.dataset.originalScale = scale;
    
    // Set CSS variables for animation
    card.style.setProperty('--rotation', rotation);
    card.style.setProperty('--scale', scale);
    
    // Use CSS animation instead of inline transform
    card.style.transform = '';
    card.style.animation = `float-idea ${duration}s ease-in-out ${delay}s infinite`;
    
    // Add hover effect
    card.addEventListener('mouseenter', function() {
        this.style.animationPlayState = 'paused';
        const currentRotation = this.style.getPropertyValue('--rotation') || '0deg';
        this.style.transform = `rotate(${currentRotation}) scale(1.15)`;
        this.style.zIndex = '1000';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.animationPlayState = 'running';
        this.style.transform = '';
        this.style.zIndex = '';
    });
}

// Add CSS animation for floating
if (!document.getElementById('idea-float-styles')) {
    const style = document.createElement('style');
    style.id = 'idea-float-styles';
    style.textContent = `
        @keyframes float-idea {
            0%, 100% {
                transform: translate(0, 0) rotate(var(--rotation, 0deg)) scale(var(--scale, 1));
            }
            25% {
                transform: translate(10px, -15px) rotate(calc(var(--rotation, 0deg) + 2deg)) scale(var(--scale, 1));
            }
            50% {
                transform: translate(-8px, -20px) rotate(calc(var(--rotation, 0deg) - 2deg)) scale(var(--scale, 1));
            }
            75% {
                transform: translate(-10px, -10px) rotate(calc(var(--rotation, 0deg) + 1deg)) scale(var(--scale, 1));
            }
        }
        .idea-card {
            --rotation: 0deg;
            --scale: 1;
        }
    `;
    document.head.appendChild(style);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
        
        const eventCardId = `event-card-${event.id.replace(/[^a-zA-Z0-9]/g, '-')}`;
        html += `
            <div id="${eventCardId}" class="relative pl-24 py-6 group cursor-pointer event-card" data-event-id="${event.id}">
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
    
    // Add click event listeners to all event cards
    const eventCards = timeline.querySelectorAll('.event-card');
    eventCards.forEach(card => {
        card.addEventListener('click', function(e) {
            e.stopPropagation();
            const eventId = this.dataset.eventId;
            if (eventId) {
                openModal(eventId);
            }
        });
    });
}

function openModal(eventId) {
    console.log('openModal called with eventId:', eventId);
    console.log('Available events:', Object.keys(eventData));
    
    const data = eventData[eventId];
    if(!data) {
        console.error('Event not found:', eventId, 'Available:', Object.keys(eventData));
        return;
    }
    
    console.log('Opening modal for event:', data);
    
    // Update modal content
    const titleEl = document.getElementById('modal-title');
    const timeEl = document.getElementById('modal-time');
    const descEl = document.getElementById('modal-desc');
    const locEl = document.getElementById('modal-loc');
    const extraEl = document.getElementById('modal-extra');
    
    if (titleEl) titleEl.textContent = data.title || 'Event';
    if (timeEl) timeEl.textContent = data.time || 'TBD';
    if (descEl) {
        descEl.textContent = data.desc || '';
        descEl.style.display = data.desc ? 'block' : 'none';
    }
    if (locEl) locEl.textContent = data.location || 'TBD';
    if (extraEl) {
        extraEl.textContent = data.extra || '';
        extraEl.style.display = data.extra ? 'block' : 'none';
    }
    
    // Show modal
    const modal = document.getElementById('event-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        lucide.createIcons();
    } else {
        console.error('Event modal element not found!');
    }
}

// Make openModal globally accessible
window.openModal = openModal;

function closeModal() {
    document.getElementById('event-modal').classList.add('hidden');
    document.body.style.overflow = '';
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
        
        const dayCellId = hasEvent ? `calendar-day-${dateStr}-${eventId.replace(/[^a-zA-Z0-9]/g, '-')}` : '';
        calendarHTML += `
            <div ${dayCellId ? `id="${dayCellId}"` : ''} class="bg-white dark:bg-sand-800 p-2 min-h-[80px] border-b border-sand-100 dark:border-sand-700 ${hasEvent ? 'cursor-pointer hover:bg-sand-50 dark:hover:bg-sand-700 transition-colors calendar-event-day' : ''}" ${hasEvent ? `data-event-id="${eventId}"` : ''}>
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
    
    // Add click event listeners to calendar event days
    const calendarEventDays = calendarGrid.querySelectorAll('.calendar-event-day');
    calendarEventDays.forEach(day => {
        day.addEventListener('click', function(e) {
            e.stopPropagation();
            const eventId = this.dataset.eventId;
            if (eventId) {
                openModal(eventId);
            }
        });
    });
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

function getZodiacSign(month, day) {
    if (!month || !day) return null;
    const m = parseInt(month);
    const d = parseInt(day);
    
    if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return 'Aries';
    if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return 'Taurus';
    if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return 'Gemini';
    if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return 'Cancer';
    if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return 'Leo';
    if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return 'Virgo';
    if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return 'Libra';
    if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return 'Scorpio';
    if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return 'Sagittarius';
    if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return 'Capricorn';
    if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return 'Aquarius';
    if ((m === 2 && d >= 19) || (m === 3 && d <= 20)) return 'Pisces';
    return null;
}

function getUserData(userId) {
    // Check cachedRegistrations first (from Supabase)
    if (cachedRegistrations && cachedRegistrations.length > 0) {
        const registration = cachedRegistrations.find(r => r.id === userId);
        if (registration) {
            // Format birthday as MM/DD
            let birthdayDisplay = 'Not provided';
            let zodiacSign = null;
            if (registration.birthday) {
                // Birthday is stored as MM/DD or could be a date string
                if (registration.birthday.includes('/')) {
                    const [month, day] = registration.birthday.split('/');
                    birthdayDisplay = `${month}/${day}`;
                    zodiacSign = getZodiacSign(month, day);
                } else {
                    // Legacy date format
                const bday = new Date(registration.birthday);
                    const month = String(bday.getMonth() + 1).padStart(2, '0');
                    const day = String(bday.getDate()).padStart(2, '0');
                    birthdayDisplay = `${month}/${day}`;
                    zodiacSign = getZodiacSign(month, day);
                }
            }
            return {
                name: registration.name,
                branch: registration.branch,
                signedUp: new Date(registration.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                birthday: birthdayDisplay,
                zodiacSign: zodiacSign,
                profilePhoto: registration.profile_photo || null
            };
        }
    }
    
    // Check localStorage for registered users
    const registrations = JSON.parse(localStorage.getItem('reunionRegistrations') || '[]');
    const registration = registrations.find(r => r.id === userId);
    
    if (registration) {
        // Format birthday as MM/DD
        let birthdayDisplay = 'Not provided';
        let zodiacSign = null;
        if (registration.birthday) {
            // Birthday is stored as MM/DD or could be a date string
            if (registration.birthday.includes('/')) {
                const [month, day] = registration.birthday.split('/');
                birthdayDisplay = `${month}/${day}`;
                zodiacSign = getZodiacSign(month, day);
            } else {
                // Legacy date format
            const bday = new Date(registration.birthday);
                const month = String(bday.getMonth() + 1).padStart(2, '0');
                const day = String(bday.getDate()).padStart(2, '0');
                birthdayDisplay = `${month}/${day}`;
                zodiacSign = getZodiacSign(month, day);
            }
        }
        return {
            name: registration.name,
            branch: registration.branch,
            signedUp: registration.signedUp,
            birthday: birthdayDisplay,
            zodiacSign: zodiacSign,
            profilePhoto: registration.profilePhoto || null
        };
    }
    
    // Fall back to hardcoded userData
    const user = userData[userId];
    if (user && user.birthday) {
        // Parse hardcoded birthday format
        const bday = new Date(user.birthday);
        const month = String(bday.getMonth() + 1).padStart(2, '0');
        const day = String(bday.getDate()).padStart(2, '0');
        return {
            ...user,
            birthday: `${month}/${day}`,
            zodiacSign: getZodiacSign(month, day)
        };
    }
    return user;
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
    
    // Display zodiac sign
    const zodiacElement = document.getElementById('user-modal-zodiac');
    if (zodiacElement) {
        if (user.zodiacSign) {
            zodiacElement.textContent = user.zodiacSign;
        } else {
            zodiacElement.textContent = '';
        }
    }
    
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
        
        // Preserve aspect ratio and ensure proper display as US map
        // Keep original viewBox if it exists, otherwise set it
        const existingViewBox = svg.getAttribute('viewBox');
        if (!existingViewBox || existingViewBox !== '0 0 959 593') {
            svg.setAttribute('viewBox', '0 0 959 593');
        }
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        
        // Remove fixed dimensions to allow responsive scaling
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        
        // Set styles for proper display
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.display = 'block';
        svg.style.maxWidth = '100%';
        
        // Add class for dark mode
        svg.setAttribute('class', 'w-full h-full dark:[&_path:not([fill=\"#4d7c0f\"]):not([fill=\"#65a30d\"])]:fill-sand-700');
        
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