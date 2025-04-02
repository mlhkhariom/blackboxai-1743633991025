import { getProviders, search, loadContent, getMainPage, loadLinks } from './services/providers.js';

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchModal = document.getElementById('search-modal');
const searchResults = document.getElementById('search-results');
const closeSearch = document.getElementById('close-search');
const playerModal = document.getElementById('player-modal');
const playerContainer = document.getElementById('player-container');
const closePlayer = document.getElementById('close-player');
const contentSections = document.getElementById('content-sections');
const featuredContent = document.getElementById('featured-content');
const featuredTitle = document.getElementById('featured-title');
const featuredDescription = document.getElementById('featured-description');

// State
let currentProviders = [];
let searchTimeout = null;

// Initialize
async function init() {
    try {
        currentProviders = await getProviders();
        await loadFeaturedContent();
        await loadMainContent();
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to load content');
    }
}

// Load Featured Content
async function loadFeaturedContent() {
    try {
        // Get random provider
        const randomProvider = currentProviders[Math.floor(Math.random() * currentProviders.length)];
        const mainPage = await getMainPage(randomProvider.id);
        
        if (mainPage && mainPage[0]?.items?.length > 0) {
            const featured = mainPage[0].items[0];
            const content = await loadContent(randomProvider.id, featured.url);
            
            if (content) {
                featuredContent.style.backgroundImage = `url(${content.posterUrl})`;
                featuredTitle.textContent = content.title;
                featuredDescription.textContent = content.description;
                
                // Add click handler for watch button
                featuredContent.onclick = () => playContent(randomProvider.id, content);
            }
        }
    } catch (error) {
        console.error('Error loading featured content:', error);
    }
}

// Load Main Content
async function loadMainContent() {
    try {
        contentSections.innerHTML = ''; // Clear existing content
        
        for (const provider of currentProviders) {
            const sections = await getMainPage(provider.id);
            
            sections.forEach(section => {
                const sectionElement = createSection(section.title, section.items, provider);
                contentSections.appendChild(sectionElement);
            });
        }
    } catch (error) {
        console.error('Error loading main content:', error);
        showError('Failed to load content sections');
    }
}

// Create Content Section
function createSection(title, items, provider) {
    const section = document.createElement('section');
    section.className = 'content-section mb-8';
    
    section.innerHTML = `
        <h2 class="text-2xl font-bold mb-4">${title}</h2>
        <div class="content-row relative">
            <div class="flex space-x-4 overflow-x-auto pb-4">
                ${items.map(item => createContentCard(item, provider)).join('')}
            </div>
        </div>
    `;
    
    return section;
}

// Create Content Card
function createContentCard(item, provider) {
    return `
        <div class="content-card flex-none w-48" data-provider="${provider.id}" data-url="${item.url}">
            <div class="relative rounded-lg overflow-hidden cursor-pointer">
                <img src="${item.posterUrl}" alt="${item.title}" 
                     class="w-full h-72 object-cover">
                <div class="provider-badge">${provider.name}</div>
                ${item.quality ? `<div class="quality-badge">${item.quality}</div>` : ''}
                <div class="content-info absolute inset-0 p-4 flex flex-col justify-end">
                    <h3 class="text-lg font-semibold line-clamp-2">${item.title}</h3>
                    <p class="text-sm text-gray-300">${item.type}</p>
                </div>
            </div>
        </div>
    `;
}

// Handle Search
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if (query.length > 2) {
        searchTimeout = setTimeout(async () => {
            try {
                const results = await search(query);
                displaySearchResults(results);
                searchModal.classList.remove('hidden');
            } catch (error) {
                console.error('Search error:', error);
                showError('Search failed');
            }
        }, 500);
    }
});

// Display Search Results
function displaySearchResults(results) {
    searchResults.innerHTML = results.map(result => `
        <div class="search-result cursor-pointer" 
             data-provider="${result.provider}" 
             data-url="${result.url}"
             onclick="playContent('${result.provider}', ${JSON.stringify(result)})">
            <div class="relative rounded-lg overflow-hidden">
                <img src="${result.posterUrl}" alt="${result.title}" 
                     class="w-full h-48 object-cover">
                <div class="provider-badge">${result.provider}</div>
                <div class="content-info absolute inset-0 p-4 flex flex-col justify-end">
                    <h3 class="text-sm font-semibold line-clamp-2">${result.title}</h3>
                </div>
            </div>
        </div>
    `).join('');
}

// Play Content
async function playContent(providerId, content) {
    try {
        playerModal.classList.remove('hidden');
        playerContainer.innerHTML = '<div class="loading-spinner"></div>';
        
        const links = await loadLinks(providerId, JSON.stringify(content));
        
        if (links && links.length > 0) {
            const videoElement = document.createElement('video');
            videoElement.className = 'video-player';
            videoElement.controls = true;
            videoElement.src = links[0].url;
            
            playerContainer.innerHTML = '';
            playerContainer.appendChild(videoElement);
        } else {
            throw new Error('No playable sources found');
        }
    } catch (error) {
        console.error('Error playing content:', error);
        showError('Failed to play content');
    }
}

// Error Handling
function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-state';
    errorElement.textContent = message;
    
    // Show error for 3 seconds
    document.body.appendChild(errorElement);
    setTimeout(() => errorElement.remove(), 3000);
}

// Event Listeners
closeSearch.onclick = () => searchModal.classList.add('hidden');
closePlayer.onclick = () => playerModal.classList.add('hidden');

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Add click handlers for content cards
document.addEventListener('click', async (e) => {
    const card = e.target.closest('.content-card');
    if (card) {
        const providerId = card.dataset.provider;
        const url = card.dataset.url;
        
        try {
            const content = await loadContent(providerId, url);
            if (content) {
                playContent(providerId, content);
            }
        } catch (error) {
            console.error('Error loading content:', error);
            showError('Failed to load content');
        }
    }
});

// Export functions for use in other modules
export {
    playContent,
    showError
};