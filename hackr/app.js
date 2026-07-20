/**
 * HN Deep-Dive — App Script
 * Handles state, API requests, keyword enrichment, and responsive DOM modifications.
 */

// Global State
const state = {
  stories: {},          // Store full story details by ID
  storyIds: [],         // Current list of story IDs in active category
  activeStoryId: null,  // Currently selected story ID
  currentCategory: 'top', // 'top', 'new', 'ask', 'show', 'jobs'
  searchQuery: '',      // Text query filtering the story list
  currentPage: 0,       // Current page index
  pageSize: 20,         // Stories per load
  theme: 'dark',        // 'dark' or 'light'
  autoRefresh: false,   // Auto-refresh flag
  refreshInterval: null, // Timer reference
  commentsCache: {},    // Cache comments to avoid reloading
  wikiCache: {},        // Cache wiki explanations by keyword
  githubCache: {}       // Cache github repo stats by owner/repo
};

// API Endpoints
const HN_BASE_URL = 'https://hacker-news.firebaseio.com/v0';
const WIKI_SEARCH_URL = 'https://en.wikipedia.org/w/api.php';
const WIKI_SUMMARY_URL = 'https://en.wikipedia.org/api/rest_v1/page/summary';

// ==========================================================================
// Initialization & Listeners
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initEventListeners();
  loadCategoryStories(state.currentCategory);
  startAutoRefreshTimer();
});

// Theme Initialization
function initTheme() {
  const savedTheme = localStorage.getItem('hn-theme') || 'dark';
  state.theme = savedTheme;
  document.documentElement.setAttribute('data-theme', savedTheme);
}

// Event Listeners
function initEventListeners() {
  // Category tabs click
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      tabButtons.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      const cat = e.target.dataset.category;
      if (cat !== state.currentCategory) {
        state.currentCategory = cat;
        loadCategoryStories(cat);
      }
    });
  });

  // Search input
  const searchInput = document.getElementById('story-search');
  const searchClear = document.getElementById('search-clear-btn');
  
  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    renderStoriesList();
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    renderStoriesList();
  });

  // Load more button
  document.getElementById('load-more-btn').addEventListener('click', () => {
    state.currentPage++;
    fetchStoriesPage();
  });

  // Manual Refresh
  document.getElementById('refresh-btn').addEventListener('click', () => {
    loadCategoryStories(state.currentCategory);
  });

  // Auto refresh toggle
  const refreshToggle = document.getElementById('auto-refresh-toggle');
  refreshToggle.addEventListener('change', (e) => {
    state.autoRefresh = e.target.checked;
    startAutoRefreshTimer();
  });

  // Theme toggle button
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  // Mobile Drawer Close button
  document.getElementById('mobile-drawer-close').addEventListener('click', closeMobileDrawer);
}

// Theme Switcher
function toggleTheme() {
  const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
  state.theme = nextTheme;
  document.documentElement.setAttribute('data-theme', nextTheme);
  localStorage.setItem('hn-theme', nextTheme);
}

// Auto Refresh Timer Control (5 minutes)
function startAutoRefreshTimer() {
  if (state.refreshInterval) {
    clearInterval(state.refreshInterval);
    state.refreshInterval = null;
  }
  
  if (state.autoRefresh) {
    state.refreshInterval = setInterval(() => {
      console.log('Auto-refreshing stories...');
      loadCategoryStories(state.currentCategory, false); // silent refresh
    }, 5 * 60 * 1000);
  }
}

// ==========================================================================
// Hacker News Data Fetchers
// ==========================================================================

// Load a fresh category list
async function loadCategoryStories(category, showLoading = true) {
  if (showLoading) {
    showStoriesSkeleton();
  }
  
  state.currentPage = 0;
  state.storyIds = [];
  
  let endpoint = '/topstories.json';
  if (category === 'new') endpoint = '/newstories.json';
  else if (category === 'ask') endpoint = '/askstories.json';
  else if (category === 'show') endpoint = '/showstories.json';
  else if (category === 'jobs') endpoint = '/jobstories.json';

  try {
    const res = await fetch(`${HN_BASE_URL}${endpoint}`);
    if (!res.ok) throw new Error('Failed to fetch category stories');
    state.storyIds = await res.json();
    
    // Fetch details for the first page
    await fetchStoriesPage();
  } catch (err) {
    console.error('Error loading category stories:', err);
    document.getElementById('stories-container').innerHTML = `
      <div class="wiki-empty">
        <p>Failed to load stories. Please check your internet connection and try again.</p>
        <button class="btn btn-secondary" style="margin-top: 10px" onclick="location.reload()">Retry</button>
      </div>
    `;
  }
}

// Fetch a page of story details
async function fetchStoriesPage() {
  const startIdx = state.currentPage * state.pageSize;
  const endIdx = startIdx + state.pageSize;
  const pageIds = state.storyIds.slice(startIdx, endIdx);
  
  if (pageIds.length === 0) {
    document.getElementById('load-more-btn').style.display = 'none';
    return;
  } else {
    document.getElementById('load-more-btn').style.display = 'block';
  }

  // Fetch story details concurrently
  const fetchPromises = pageIds.map(id => fetchStoryDetails(id));
  await Promise.all(fetchPromises);
  
  renderStoriesList();
}

// Fetch single story detail helper
async function fetchStoryDetails(id) {
  // If already cached, don't refetch
  if (state.stories[id]) return state.stories[id];

  try {
    const res = await fetch(`${HN_BASE_URL}/item/${id}.json`);
    if (!res.ok) throw new Error(`Failed to fetch details for item ${id}`);
    const item = await res.json();
    if (item) {
      state.stories[id] = item;
    }
    return item;
  } catch (err) {
    console.warn(`Could not load story ${id}:`, err);
    return null;
  }
}

// Show skeleton loading placeholders
function showStoriesSkeleton() {
  const container = document.getElementById('stories-container');
  container.innerHTML = `
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
  `;
}

// ==========================================================================
// Renders List of Stories (Left Panel)
// ==========================================================================

function renderStoriesList() {
  const container = document.getElementById('stories-container');
  const startIdx = 0;
  const endIdx = (state.currentPage + 1) * state.pageSize;
  const activeIds = state.storyIds.slice(startIdx, endIdx);
  
  // Filter active stories by search query
  let filteredStories = activeIds
    .map(id => state.stories[id])
    .filter(story => story && !story.deleted && !story.dead);

  if (state.searchQuery) {
    filteredStories = filteredStories.filter(story => {
      const titleMatch = story.title && story.title.toLowerCase().includes(state.searchQuery);
      const textMatch = story.text && story.text.toLowerCase().includes(state.searchQuery);
      const authorMatch = story.by && story.by.toLowerCase().includes(state.searchQuery);
      return titleMatch || textMatch || authorMatch;
    });
  }

  if (filteredStories.length === 0) {
    container.innerHTML = `
      <div class="wiki-empty">
        <p>No stories found matching your query.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  filteredStories.forEach((story, idx) => {
    const card = document.createElement('div');
    card.className = `story-card ${state.activeStoryId === story.id ? 'active' : ''}`;
    card.dataset.id = story.id;
    
    // Domain extract
    let domainStr = '';
    if (story.url) {
      try {
        const urlObj = new URL(story.url);
        domainStr = urlObj.hostname.replace('www.', '');
      } catch (e) {
        domainStr = 'link';
      }
    } else {
      domainStr = 'text post';
    }

    const timeAgoStr = formatTimeAgo(story.time);
    const score = story.score || 0;
    const commentsCount = story.descendants || 0;

    card.innerHTML = `
      <div class="story-meta-top">
        <span class="story-rank">#${idx + 1}</span>
        <span class="story-domain">${domainStr}</span>
      </div>
      <div class="story-title-text">${escapeHTML(story.title)}</div>
      <div class="story-meta-bottom">
        <div class="meta-stats">
          <div class="meta-icon-group" title="Upvotes">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L2 22h20L12 2z"/>
            </svg>
            <span>${score}</span>
          </div>
          <div class="meta-icon-group" title="Comments">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>${commentsCount}</span>
          </div>
        </div>
        <span>${timeAgoStr}</span>
      </div>
    `;

    // Click behavior to show details
    card.addEventListener('click', () => {
      selectStory(story.id);
    });

    container.appendChild(card);
  });
}

// Helper to calculate time ago
function formatTimeAgo(timestamp) {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  let interval = Math.floor(seconds / 31536000);
  
  if (interval >= 1) return interval === 1 ? '1 year ago' : `${interval} years ago`;
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval === 1 ? '1 month ago' : `${interval} months ago`;
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval === 1 ? '1 day ago' : `${interval} days ago`;
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval === 1 ? '1 hour ago' : `${interval} hours ago`;
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval === 1 ? '1 minute ago' : `${interval} minutes ago`;
  return seconds < 10 ? 'just now' : `${Math.floor(seconds)} seconds ago`;
}

// Escape HTML utility
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================================================
// Renders Details & Context (Right Panel / Mobile Drawer)
// ==========================================================================

async function selectStory(id) {
  state.activeStoryId = id;
  
  // Highlight active card
  document.querySelectorAll('.story-card').forEach(card => {
    if (parseInt(card.dataset.id) === id) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });

  const story = state.stories[id];
  if (!story) return;

  // Show detailed panel state, hide empty state
  document.getElementById('empty-context-state').classList.add('hidden');
  const detailsState = document.getElementById('active-context-state');
  detailsState.classList.remove('hidden');

  // Populate Header
  let tagType = 'Story';
  if (story.title.toLowerCase().startsWith('ask hn:')) tagType = 'Ask HN';
  else if (story.title.toLowerCase().startsWith('show hn:')) tagType = 'Show HN';
  else if (story.type === 'job') tagType = 'Job';

  document.getElementById('context-story-type').innerText = tagType;
  document.getElementById('context-story-title').innerText = story.title;
  document.getElementById('context-story-author').innerText = story.by;
  document.getElementById('context-story-score').innerText = story.score || 0;
  document.getElementById('context-story-time').innerText = formatTimeAgo(story.time);

  // Set action buttons
  const hnLink = `https://news.ycombinator.com/item?id=${story.id}`;
  document.getElementById('context-hn-link').href = hnLink;
  
  const sourceLinkBtn = document.getElementById('context-source-link');
  if (story.url) {
    sourceLinkBtn.href = story.url;
    sourceLinkBtn.classList.remove('hidden');
  } else {
    sourceLinkBtn.classList.add('hidden');
  }

  // Handle Ask HN / Post Content Text
  const textContainer = document.getElementById('story-text-container');
  if (story.text) {
    document.getElementById('context-story-text').innerHTML = story.text; // HN API text has raw HTML tags, sanitized by safe source
    textContainer.classList.remove('hidden');
  } else {
    textContainer.classList.add('hidden');
  }

  // Setup Deep Dive Search Hub buttons
  const queryTitle = encodeURIComponent(story.title.replace(/^(Show HN|Ask HN):\s*/i, ''));
  const queryUrl = story.url ? encodeURIComponent(story.url) : '';
  
  document.getElementById('search-google').href = `https://www.google.com/search?q=${queryTitle}`;
  document.getElementById('search-reddit').href = story.url ? `https://www.reddit.com/search/?q=url:${queryUrl}` : `https://www.reddit.com/search/?q=${queryTitle}`;
  document.getElementById('search-twitter').href = story.url ? `https://x.com/search?q=${queryUrl}` : `https://x.com/search?q=${queryTitle}`;
  document.getElementById('search-youtube').href = `https://www.youtube.com/results?search_query=${queryTitle}`;

  // Reset context enrichment UI blocks
  document.getElementById('github-enrichment-card').classList.add('hidden');
  document.getElementById('wiki-results-container').innerHTML = '';
  document.getElementById('wiki-loading-indicator').classList.remove('hidden');

  // Trigger Dynamic Integrations asynchronously
  triggerGitHubIntegration(story.url);
  triggerWikipediaIntegration(story.title);
  triggerCommentsIntegration(story);

  // Check if mobile viewport, open mobile slide drawer
  if (window.innerWidth <= 768) {
    openMobileDrawer();
  }
}

// ==========================================================================
// Wikipedia Concept Resolver (Topic Explainer)
// ==========================================================================

async function triggerWikipediaIntegration(title) {
  const wikiContainer = document.getElementById('wiki-results-container');
  const wikiLoading = document.getElementById('wiki-loading-indicator');
  
  // Extract keywords
  const keywords = extractKeywords(title);
  
  if (keywords.length === 0) {
    wikiLoading.classList.add('hidden');
    wikiContainer.innerHTML = `<div class="wiki-empty">No matching reference terms found in story title.</div>`;
    return;
  }

  const wikiPromises = keywords.map(keyword => getWikipediaConceptSummary(keyword));
  const results = await Promise.all(wikiPromises);
  const validResults = results.filter(res => res !== null);

  wikiLoading.classList.add('hidden');
  
  if (validResults.length === 0) {
    wikiContainer.innerHTML = `<div class="wiki-empty">Could not find Wikipedia matches for title terms.</div>`;
    return;
  }

  wikiContainer.innerHTML = '';
  validResults.forEach(data => {
    const card = document.createElement('div');
    card.className = 'wiki-card';
    
    // Construct card UI
    let thumbnailHtml = '';
    if (data.thumbnail && data.thumbnail.source) {
      thumbnailHtml = `<img src="${data.thumbnail.source}" alt="${data.title}" style="max-height: 80px; max-width: 100px; border-radius: 6px; float: right; margin-left: 10px; object-fit: cover;">`;
    }

    card.innerHTML = `
      ${thumbnailHtml}
      <h4>${escapeHTML(data.title)}</h4>
      <p>${escapeHTML(data.extract)}</p>
      <a href="${data.content_urls.desktop.page}" target="_blank" class="wiki-link">
        Read more on Wikipedia
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      </a>
    `;
    wikiContainer.appendChild(card);
  });
}

// Clean and extract noun keywords from post title
function extractKeywords(title) {
  let clean = title.replace(/^(Show HN|Ask HN|HN|Poll):\s*/i, '');
  // Clean special characters
  clean = clean.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, ' ');
  const words = clean.split(/\s+/);
  
  // Custom blacklist (Stop words and very generic tech words)
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'in', 'of', 'for', 'to', 'with', 'by', 'from', 'on', 'at', 'about', 'how', 'we', 'is', 'are', 'was', 'were', 'it', 'its', 'this', 'that', 'these', 'those', 'who', 'which', 'what', 'why', 'how', 'where', 'when',
    'using', 'release', 'version', 'optimized', 'simple', 'build', 'make', 'code', 'open', 'source', 'free', 'new', 'years', 'first', 'engine', 'tool', 'framework', 'database', 'project', 'server', 'application', 'developer', 'developers', 'programming', 'language', 'library', 'platform', 'service', 'system', 'systems', 'web', 'hacker', 'news', 'show', 'ask', 'github', 'google', 'microsoft', 'apple', 'facebook', 'amazon'
  ]);
  
  // Candidate filters: Ignore numbers, stop words, and words shorter than 3 letters
  const candidates = words.filter(w => {
    const lower = w.toLowerCase();
    if (stopWords.has(lower)) return false;
    if (w.length < 3) return false;
    if (/^\d+$/.test(w)) return false; // skip pure numbers
    return true;
  });

  // Extract capitalised terms as high priority (often named technologies/entities)
  const capitalized = candidates.filter(w => w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase());
  
  const merged = [...capitalized, ...candidates];
  const unique = [...new Set(merged)];
  
  return unique.slice(0, 3); // Return at most top 3 terms
}

// Fetch article summary from Wikipedia API
async function getWikipediaConceptSummary(keyword) {
  if (state.wikiCache[keyword]) return state.wikiCache[keyword];

  try {
    // 1. Search Wikipedia for matching article title
    const searchUrl = `${WIKI_SEARCH_URL}?action=query&list=search&srsearch=${encodeURIComponent(keyword)}&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    
    if (!searchData.query || searchData.query.search.length === 0) return null;
    
    // Take the best matching article title
    const pageTitle = searchData.query.search[0].title;
    
    // 2. Fetch the REST summary for that page
    const summaryRes = await fetch(`${WIKI_SUMMARY_URL}/${encodeURIComponent(pageTitle)}`);
    if (!summaryRes.ok) return null;
    const summaryData = await summaryRes.json();
    
    // Ensure it's a standard document, not a disambiguation or missing page
    if (summaryData.type === 'standard') {
      state.wikiCache[keyword] = summaryData;
      return summaryData;
    }
  } catch (err) {
    console.warn(`Wikipedia API failed for keyword: ${keyword}`, err);
  }
  return null;
}

// ==========================================================================
// GitHub Repository Details Integration
// ==========================================================================

async function triggerGitHubIntegration(url) {
  const ghCard = document.getElementById('github-enrichment-card');
  if (!url) return;

  const githubMatch = url.match(/https?:\/\/(?:www\.)?github\.com\/([^\/]+)\/([^\/#\?]+)/);
  if (!githubMatch) return;

  const owner = githubMatch[1];
  let repo = githubMatch[2];
  // Sanitize repo name (removing .git or similar trailing parts)
  repo = repo.replace(/\.git$/, '');

  const repoKey = `${owner}/${repo}`;
  ghCard.classList.remove('hidden'); // Show card loading
  
  // Loading placeholders
  document.getElementById('github-repo-name').innerText = repoKey;
  document.getElementById('github-repo-lang').innerText = '...';
  document.getElementById('github-repo-desc').innerText = 'Loading repo stats...';
  document.getElementById('github-repo-stars').innerText = '--';
  document.getElementById('github-repo-forks').innerText = '--';
  document.getElementById('github-repo-issues').innerText = '--';

  try {
    let repoData;
    if (state.githubCache[repoKey]) {
      repoData = state.githubCache[repoKey];
    } else {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
      if (!res.ok) throw new Error('GitHub API limits or repo not found');
      repoData = await res.json();
      state.githubCache[repoKey] = repoData;
    }

    // Populate data
    document.getElementById('github-repo-lang').innerText = repoData.language || 'Unknown';
    document.getElementById('github-repo-lang').style.display = repoData.language ? 'inline-block' : 'none';
    document.getElementById('github-repo-desc').innerText = repoData.description || 'No description provided.';
    document.getElementById('github-repo-stars').innerText = repoData.stargazers_count.toLocaleString();
    document.getElementById('github-repo-forks').innerText = repoData.forks_count.toLocaleString();
    document.getElementById('github-repo-issues').innerText = repoData.open_issues_count.toLocaleString();
  } catch (err) {
    console.warn(`GitHub fetch failed for ${repoKey}:`, err);
    document.getElementById('github-repo-desc').innerText = 'Could not load GitHub metadata. Rate limit exceeded or repository is private.';
  }
}

// ==========================================================================
// Hacker News Comments Integration (Thread Tree Resolver)
// ==========================================================================

async function triggerCommentsIntegration(story) {
  const container = document.getElementById('comments-list-element');
  const loader = document.getElementById('comments-loading-indicator');
  const countLabel = document.getElementById('comments-title-count');
  
  const totalComments = story.descendants || 0;
  countLabel.innerText = `${totalComments} comments`;

  container.innerHTML = '';
  
  if (!story.kids || story.kids.length === 0) {
    loader.classList.add('hidden');
    container.innerHTML = `<div class="comments-empty">No discussions have started on this story yet.</div>`;
    return;
  }

  loader.classList.remove('hidden');

  try {
    let commentsTree;
    if (state.commentsCache[story.id]) {
      commentsTree = state.commentsCache[story.id];
    } else {
      // Build top 15 comments
      const topKids = story.kids.slice(0, 15);
      commentsTree = await fetchCommentTree(topKids, 1);
      state.commentsCache[story.id] = commentsTree;
    }

    loader.classList.add('hidden');
    
    if (commentsTree.length === 0) {
      container.innerHTML = `<div class="comments-empty">No active discussions found.</div>`;
      return;
    }

    // Render tree recursively
    renderCommentsHTML(commentsTree, container);
  } catch (err) {
    console.error('Comments fetching failed:', err);
    loader.classList.add('hidden');
    container.innerHTML = `<div class="comments-empty">Error loading comment thread.</div>`;
  }
}

// Recursive Comment Thread Fetcher (DFS/BFS with depth controls to prevent slow fetches)
async function fetchCommentTree(kidIds, depth) {
  if (!kidIds || kidIds.length === 0 || depth > 3) return [];

  // Parallel requests for all nodes at current depth
  const fetches = kidIds.map(async id => {
    try {
      const res = await fetch(`${HN_BASE_URL}/item/${id}.json`);
      if (!res.ok) return null;
      const comment = await res.json();
      
      if (!comment || comment.deleted || comment.dead) return null;

      // Determine how many sub-comments to fetch based on depth
      let subKids = [];
      if (comment.kids) {
        if (depth === 1) subKids = comment.kids.slice(0, 5);       // Level 1: fetch top 5 subcomments
        else if (depth === 2) subKids = comment.kids.slice(0, 2);  // Level 2: fetch top 2 subcomments
      }

      const children = await fetchCommentTree(subKids, depth + 1);
      return {
        id: comment.id,
        author: comment.by || '[deleted]',
        text: comment.text || '',
        time: comment.time,
        depth: depth,
        children: children
      };
    } catch (e) {
      return null;
    }
  });

  const results = await Promise.all(fetches);
  return results.filter(c => c !== null);
}

// Renders the recursively fetched JSON comment tree into DOM elements
function renderCommentsHTML(comments, parentElement) {
  comments.forEach(comment => {
    const node = document.createElement('div');
    node.className = 'comment-node';
    node.dataset.depth = comment.depth;
    node.id = `comment-${comment.id}`;

    const dateStr = formatTimeAgo(comment.time);
    
    // Create card body
    const card = document.createElement('div');
    card.className = 'comment-card';
    card.innerHTML = `
      <div class="comment-header">
        <span class="comment-author">${escapeHTML(comment.author)}</span>
        <div>
          <span style="margin-right: 10px">${dateStr}</span>
          <button class="comment-toggle-btn" onclick="toggleCommentCollapse(this)">[-] Collapse</button>
        </div>
      </div>
      <div class="comment-body">${comment.text}</div>
    `;
    node.appendChild(card);

    // If has children, render recursively
    if (comment.children && comment.children.length > 0) {
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'comment-children';
      renderCommentsHTML(comment.children, childrenContainer);
      node.appendChild(childrenContainer);
    }

    parentElement.appendChild(node);
  });
}

// Globally accessible collapse handler using relative DOM traversal
window.toggleCommentCollapse = function(buttonElement) {
  const node = buttonElement.closest('.comment-node');
  if (!node) return;

  const button = node.querySelector('.comment-toggle-btn');
  const isCollapsed = node.classList.toggle('collapsed');
  
  if (isCollapsed) {
    button.innerText = '[+] Expand';
  } else {
    button.innerText = '[-] Collapse';
  }
};

// ==========================================================================
// Mobile Views & Drawer Actions
// ==========================================================================

function openMobileDrawer() {
  const drawer = document.getElementById('mobile-drawer');
  const drawerContent = document.getElementById('mobile-drawer-content');
  const activeContextState = document.getElementById('active-context-state');
  
  // Clone active contents into the drawer for mobile rendering
  drawerContent.innerHTML = '';
  const clone = activeContextState.cloneNode(true);
  clone.classList.remove('hidden');
  clone.id = 'active-context-state-mobile'; // Avoid duplicated ID conflicts
  
  // Copy cloned content to mobile drawer
  drawerContent.appendChild(clone);

  drawer.classList.add('open');
}

function closeMobileDrawer() {
  const drawer = document.getElementById('mobile-drawer');
  drawer.classList.remove('open');
}
