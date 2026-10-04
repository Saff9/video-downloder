/**
 * VideoFetch Pro — Neural Science Feed, Snap-Scroll Shorts, Universal Downloader & Offline Support
 */

(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  // App Version
  const APP_VERSION = '1.0.1';

  // Storage Keys
  const STORAGE = {
    SERVER: 'videofetch_server_url',
    DOWNLOAD_HISTORY: 'videofetch_history_v2',
    WATCH_HISTORY: 'videofetch_watch_history_v2',
    BOOKMARKS: 'videofetch_bookmarks_v1',
    OFFLINE_FEED: 'videofetch_offline_feed_v1',
    OFFLINE_SHORTS: 'videofetch_offline_shorts_v1',
    THEME: 'videofetch_theme',
    AUTOPASTE: 'videofetch_autopaste',
    BLOCK_SHORTS: 'videofetch_block_shorts',
    FEED_TOPIC: 'videofetch_feed_topic',
  };

  // Limits
  const MAX_FEED_VIDEOS = 100;
  const MAX_SHORTS = 300;
  const FEED_PAGE_LIMIT = 24;
  const SHORTS_PAGE_LIMIT = 24;

  // State
  let activeTab = 'feed';
  let activeHistorySubtab = 'watched'; // 'watched' | 'bookmarks' | 'downloaded'
  let currentCategory = 'science_all';
  let currentPlaying = null; // { url, title, videoId, author, views }
  let currentMeta = null;
  let selectedFormat = { type: 'video', quality: 'best', audioExt: 'mp3' };
  let isShortsBlocked = localStorage.getItem(STORAGE.BLOCK_SHORTS) === 'true';
  let toastTimer = null;
  let searchDebounce = null;
  let reelObserver = null;
  let isLoadingMoreFeed = false;
  let isLoadingMoreShorts = false;

  // Pagination State
  let feedVideos = [];
  let feedPage = 1;
  let hasMoreFeed = true;

  let shortsVideos = [];
  let shortsPage = 1;
  let hasMoreShorts = true;

  // In-Memory Client Cache for ultra-fast instant switching
  const clientFeedCache = new Map();

  // Invidious Direct Fallback Mirrors
  const MIRRORS = [
    'https://inv.tux.pizza',
    'https://invidious.nerdvpn.de',
    'https://vid.priv.au',
    'https://yewtu.be',
    'https://invidious.drgns.space',
  ];

  // Cached DOM references
  const els = {
    // Navigation
    desktopNavItems: $$('.desktop-nav .nav-item'),
    mobileNavItems: $$('.mobile-nav .mob-item'),
    shortsNavItems: $$('.js-shorts-nav'),
    appViews: $$('.app-view'),
    quickBlockShortsBtn: $('#quick-block-shorts-btn'),
    headerRefreshBtn: $('#header-refresh-btn'),
    themeBtn: $('#theme-btn'),
    navHistoryCount: $('#nav-history-count'),

    // Feed (Science & Education)
    youtubeSearchForm: $('#youtube-search-form'),
    youtubeSearchInput: $('#youtube-search-input'),
    clearSearchBtn: $('#clear-search-btn'),
    feedRefreshTrigger: $('#feed-refresh-trigger'),
    videoCategories: $('#video-categories'),
    categoryChips: $$('#video-categories .chip'),
    channelCardContainer: $('#channel-card-container'),
    feedSkel: $('#feed-skel'),
    videoFeedGrid: $('#video-feed-grid'),
    videoFeedEmpty: $('#video-feed-empty'),
    feedLoadMoreWrap: $('#feed-load-more-wrap'),
    feedLoadMoreBtn: $('#feed-load-more-btn'),
    feedCountBadge: $('#feed-count-badge'),
    feedLoadSpinner: $('#feed-load-spinner'),

    // Snap-Scroll Shorts Feed
    shortsRefreshBtn: $('#shorts-refresh-btn'),
    shortsSkel: $('#shorts-skel'),
    shortsReelContainer: $('#shorts-reel-container'),
    shortsEmpty: $('#shorts-empty'),
    shortsLoadedCount: $('#shorts-loaded-count'),

    // Downloader
    mediaUrlInput: $('#media-url-input'),
    pasteBtn: $('#paste-btn'),
    analyzeBtn: $('#analyze-btn'),
    analyzeBtnText: $('#analyze-btn .btn-text'),
    analyzeBtnLoader: $('#analyze-btn .btn-loader'),
    mediaPreviewCard: $('#media-preview-card'),
    previewThumb: $('#preview-thumb'),
    previewDuration: $('#preview-duration'),
    previewPlatformBadge: $('#preview-platform-badge'),
    previewViews: $('#preview-views'),
    previewTitle: $('#preview-title'),
    previewUploader: $('#preview-uploader'),
    fmtTabs: $$('.fmt-tab'),
    videoQualitiesList: $('#video-qualities'),
    audioQualitiesList: $('#audio-qualities'),
    executeDownloadBtn: $('#execute-download-btn'),

    // History & Bookmarks
    historyFilterInput: $('#history-filter-input'),
    clearAllHistory: $('#clear-all-history'),
    historySubtabs: $$('.hist-tab-btn'),
    histWatchCount: $('#hist-watch-count'),
    histBookmarkCount: $('#hist-bookmark-count'),
    histDownloadCount: $('#hist-download-count'),
    historyList: $('#history-list'),
    historyEmptyState: $('#history-empty-state'),

    // Settings
    prefBlockShorts: $('#pref-block-shorts'),
    vpsStatusPill: $('#vps-status-pill'),
    vpsUrlInput: $('#vps-url-input'),
    vpsTestBtn: $('#vps-test-btn'),
    vpsSaveBtn: $('#vps-save-btn'),
    vpsFeedback: $('#vps-feedback'),
    prefQualitySelect: $('#pref-quality-select'),
    prefFeedTopicSelect: $('#pref-feed-topic-select'),
    prefThemeSelect: $('#pref-theme-select'),
    prefAutopasteCheck: $('#pref-autopaste-check'),
    btnCheckUpdates: $('#btn-check-updates'),
    updateStatusText: $('#update-status-text'),

    // Modal Player
    videoModal: $('#video-modal'),
    modalTitle: $('#modal-title'),
    modalCloseBtn: $('#modal-close-btn'),
    modalFloatBtn: $('#modal-float-btn'),
    modalIframe: $('#modal-iframe'),
    modalAuthorBadge: $('#modal-author-badge'),
    modalAuthorAvatar: $('#modal-author-avatar'),
    modalViewsBadge: $('#modal-views-badge'),
    modalDlBtn: $('#modal-dl-btn'),
    modalCopyLinkBtn: $('#modal-copy-link-btn'),
    relatedSkel: $('#related-skel'),
    relatedList: $('#related-list'),

    // Floating Mini-Player Dock
    floatingMiniPlayer: $('#floating-mini-player'),
    floatingTitle: $('#floating-title'),
    floatingIframe: $('#floating-iframe'),
    floatingExpandBtn: $('#floating-expand-btn'),
    floatingCloseBtn: $('#floating-close-btn'),

    // Sponsor Modal
    sponsorModal: $('#sponsor-modal'),
    closeSponsorModal: $('#close-sponsor-modal'),

    // Toast
    toast: $('#toast'),
  };

  // Safe global avatar error handler to prevent broken image badges
  window.handleAvatarError = function(img, name) {
    if (!img) return;
    img.onerror = null;
    img.src = getLocalSvgAvatar(name);
  };

  function getLocalSvgAvatar(name) {
    const clean = String(name || 'Science Channel').trim();
    const words = clean.split(/[\s_\-–—/]+/).filter(Boolean);
    let initials = 'SC';
    if (words.length >= 2) {
      initials = (words[0][0] + words[1][0]).toUpperCase();
    } else if (words.length === 1) {
      initials = words[0].slice(0, 2).toUpperCase();
    }

    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      hash = clean.charCodeAt(i) + ((hash << 5) - hash);
    }
    const gradients = [
      ['#ef4444', '#b91c1c'], // red
      ['#3b82f6', '#1d4ed8'], // blue
      ['#10b981', '#047857'], // emerald
      ['#8b5cf6', '#6d28d9'], // violet
      ['#f59e0b', '#d97706'], // amber
      ['#06b6d4', '#0e7490'], // cyan
      ['#ec4899', '#be185d'], // pink
      ['#6366f1', '#4338ca'], // indigo
      ['#14b8a6', '#0f766e'], // teal
      ['#f97316', '#c2410c'], // orange
    ];
    const [c1, c2] = gradients[Math.abs(hash) % gradients.length];
    const gid = 'g_' + Math.abs(hash);

    const safeInitials = escapeHtml(initials);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
      <defs>
        <linearGradient id="${gid}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${c1}"/>
          <stop offset="100%" stop-color="${c2}"/>
        </linearGradient>
      </defs>
      <circle cx="64" cy="64" r="64" fill="url(#${gid})"/>
      <circle cx="64" cy="64" r="60" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2"/>
      <text x="64" y="68" font-family="system-ui, -apple-system, Roboto, sans-serif" font-size="46" font-weight="800" fill="#ffffff" text-anchor="middle" dominant-baseline="central" letter-spacing="1">${safeInitials}</text>
    </svg>`;

    try {
      return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    } catch (_) {
      return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    }
  }

  function getChannelAvatar(uploader, customAvatar = '') {
    if (customAvatar && !customAvatar.includes('ui-avatars.com') && !customAvatar.startsWith('http://localhost') && !customAvatar.startsWith('data:')) {
      return customAvatar;
    }
    return getLocalSvgAvatar(uploader);
  }

  // ================= UTILITIES =================
  function getServerUrl() {
    const custom = (localStorage.getItem(STORAGE.SERVER) || '').trim();
    if (custom) return custom.replace(/\/+$/, '');
    if (window.location.protocol.startsWith('http')) return window.location.origin;
    return '';
  }

  function show(el) { if (el) el.classList.remove('hidden'); }
  function hide(el) { if (el) el.classList.add('hidden'); }

  function showToast(msg, type = '') {
    if (!els.toast) return;
    clearTimeout(toastTimer);
    els.toast.textContent = msg;
    els.toast.className = 'app-toast' + (type ? ' ' + type : '');
    show(els.toast);
    toastTimer = setTimeout(() => hide(els.toast), 3200);
  }

  function fmtDuration(seconds) {
    if (!seconds || seconds <= 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

  function fmtViews(n) {
    if (!n || isNaN(n)) return '';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B views';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M views';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K views';
    return n + ' views';
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[c]));
  }

  function extractVideoId(url) {
    if (!url) return '';
    const match = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/i);
    return match ? match[1] : '';
  }

  function getCleanThumbnail(videoId, customThumb = '') {
    if (!videoId || videoId.includes('_36yNWb_00k')) {
      return 'icons/logo.svg';
    }
    if (customThumb && !customThumb.includes('_36yNWb_00k')) {
      return customThumb;
    }
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }

  // ================= PWA SERVICE WORKER REGISTRATION =================
  function initServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('VideoFetch Service Worker registered with scope:', reg.scope);
          })
          .catch((err) => {
            console.warn('Service Worker registration failed:', err);
          });
      });
    }

    window.addEventListener('online', () => {
      showToast('Back online 🟢 Reconnected', '');
    });

    window.addEventListener('offline', () => {
      showToast('Offline Mode Active 📡 Serving Cached Content', '');
    });
  }

  // ================= FOCUS / BLOCK SHORTS =================
  function setBlockShorts(blocked) {
    isShortsBlocked = blocked;
    localStorage.setItem(STORAGE.BLOCK_SHORTS, String(blocked));

    if (els.prefBlockShorts) els.prefBlockShorts.checked = blocked;
    if (els.quickBlockShortsBtn) {
      els.quickBlockShortsBtn.classList.toggle('active', blocked);
      els.quickBlockShortsBtn.title = blocked ? 'Shorts Blocked (Focus Mode Active)' : 'Block Shorts (Focus Mode)';
    }

    els.shortsNavItems.forEach((item) => {
      item.style.display = blocked ? 'none' : '';
    });

    if (blocked && activeTab === 'shorts') {
      switchTab('feed');
    }
  }

  // ================= TAB NAVIGATION =================
  function switchTab(tabId) {
    activeTab = tabId;

    els.desktopNavItems.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tabId));
    els.mobileNavItems.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tabId));
    els.appViews.forEach((view) => view.classList.toggle('active', view.id === `view-${tabId}`));

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (tabId === 'feed') {
      if (feedVideos.length === 0) {
        loadScienceFeed(currentCategory, false);
      }
    } else if (tabId === 'shorts') {
      if (shortsVideos.length === 0) {
        loadScienceShorts(false);
      } else {
        setTimeout(activateVisibleShort, 150);
      }
    } else if (tabId === 'history') {
      renderCurrentHistory();
    }
  }

  function activateVisibleShort() {
    if (!els.shortsReelContainer) return;
    const cards = Array.from(els.shortsReelContainer.querySelectorAll('.reel-card'));
    if (cards.length === 0) return;

    const containerTop = els.shortsReelContainer.scrollTop;
    const containerHeight = els.shortsReelContainer.clientHeight || window.innerHeight;
    const centerPoint = containerTop + containerHeight / 2;

    let closestCard = cards[0];
    let minDistance = Infinity;

    cards.forEach((card) => {
      const cardCenter = card.offsetTop + card.offsetHeight / 2;
      const dist = Math.abs(cardCenter - centerPoint);
      if (dist < minDistance) {
        minDistance = dist;
        closestCard = card;
      }
    });

    cards.forEach((card) => {
      const iframe = card.querySelector('iframe');
      if (!iframe) return;
      if (card === closestCard) {
        if (iframe.dataset.src && iframe.src !== iframe.dataset.src) {
          iframe.src = iframe.dataset.src;
        }
      } else {
        if (iframe.src) iframe.src = '';
      }
    });
  }

  // ================= SCIENCE & EDUCATION FEED (UP TO 100 VIDEOS) =================
  async function loadScienceFeed(category = 'science_all', forceFresh = false, isLoadMore = false) {
    if (isLoadMore && (isLoadingMoreFeed || !hasMoreFeed || feedVideos.length >= MAX_FEED_VIDEOS)) {
      return;
    }

    if (!isLoadMore) {
      currentCategory = category;
      feedPage = 1;
      feedVideos = [];
      hasMoreFeed = true;

      els.categoryChips.forEach((chip) => {
        chip.classList.toggle('active', chip.dataset.cat === category);
      });

      const cacheKey = `feed_${category}`;
      if (!forceFresh && clientFeedCache.has(cacheKey)) {
        feedVideos = clientFeedCache.get(cacheKey);
        renderVideoFeed(feedVideos);
        updateFeedPaginationUI();
        return;
      }

      show(els.feedSkel);
      hide(els.videoFeedGrid);
      hide(els.videoFeedEmpty);
      hide(els.feedLoadMoreWrap);
      hide(els.channelCardContainer);
    } else {
      isLoadingMoreFeed = true;
      if (els.feedLoadSpinner) show(els.feedLoadSpinner);
      if (els.feedLoadMoreBtn) els.feedLoadMoreBtn.disabled = true;
    }

    const base = getServerUrl();
    let newItems = [];

    try {
      if (base) {
        const seed = forceFresh ? Date.now() : Math.floor(Date.now() / 180000);
        const res = await fetch(
          `${base}/api/feed?category=${category}&seed=${seed}&blockShorts=${isShortsBlocked}&page=${feedPage}&limit=${FEED_PAGE_LIMIT}`
        );
        const data = await res.json();
        newItems = data.items || [];
      } else {
        newItems = await fetchDirectCurated(category, feedPage);
      }
    } catch (err) {
      console.warn('Feed fetch error, checking offline cache fallback:', err);
      if (!isLoadMore) {
        const offlineData = localStorage.getItem(STORAGE.OFFLINE_FEED);
        if (offlineData) {
          try {
            newItems = JSON.parse(offlineData);
            showToast('Loaded feed from offline cache', '');
          } catch (_) {}
        }
      }
      if (newItems.length === 0) {
        newItems = await fetchDirectCurated(category, feedPage);
      }
    } finally {
      if (!isLoadMore) {
        hide(els.feedSkel);
      } else {
        isLoadingMoreFeed = false;
        if (els.feedLoadSpinner) hide(els.feedLoadSpinner);
        if (els.feedLoadMoreBtn) els.feedLoadMoreBtn.disabled = false;
      }

      if (newItems && newItems.length > 0) {
        const seenUrls = new Set(feedVideos.map((v) => v.url));
        for (const item of newItems) {
          if (!seenUrls.has(item.url) && feedVideos.length < MAX_FEED_VIDEOS) {
            seenUrls.add(item.url);
            feedVideos.push(item);
          }
        }
        feedPage++;
      }

      if (feedVideos.length >= MAX_FEED_VIDEOS || newItems.length === 0) {
        hasMoreFeed = false;
      }

      if (!isLoadMore && feedVideos.length > 0) {
        clientFeedCache.set(`feed_${category}`, feedVideos);
        try {
          localStorage.setItem(STORAGE.OFFLINE_FEED, JSON.stringify(feedVideos.slice(0, 50)));
        } catch (_) {}
      }

      renderVideoFeed(feedVideos);
      updateFeedPaginationUI();
    }
  }

  function updateFeedPaginationUI() {
    if (!els.feedLoadMoreWrap) return;
    const count = feedVideos.length;
    if (els.feedCountBadge) els.feedCountBadge.textContent = count;

    if (count === 0) {
      hide(els.feedLoadMoreWrap);
      return;
    }

    show(els.feedLoadMoreWrap);

    if (count >= MAX_FEED_VIDEOS || !hasMoreFeed) {
      if (els.feedLoadMoreBtn) {
        els.feedLoadMoreBtn.disabled = true;
        els.feedLoadMoreBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          <span>All ${count} Curated Videos Loaded (Max 100)</span>
        `;
      }
    } else {
      if (els.feedLoadMoreBtn) {
        els.feedLoadMoreBtn.disabled = false;
        els.feedLoadMoreBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          <span>Load More Videos (<span id="feed-count-badge">${count}</span> / ${MAX_FEED_VIDEOS})</span>
          <span class="spinner-small hidden" id="feed-load-spinner"></span>
        `;
      }
    }
  }

  function renderVideoFeed(items) {
    if (!items || items.length === 0) {
      hide(els.videoFeedGrid);
      hide(els.feedLoadMoreWrap);
      show(els.videoFeedEmpty);
      return;
    }

    hide(els.videoFeedEmpty);
    show(els.videoFeedGrid);

    els.videoFeedGrid.innerHTML = items
      .map((v) => {
        const videoId = v.id || extractVideoId(v.url) || '';
        const thumbHd = getCleanThumbnail(videoId, v.thumbnail);
        const uploader = v.uploader || 'Science Channel';
        const avatarUrl = getChannelAvatar(uploader, v.avatar);
        const bookmarked = isBookmarked(v.url);

        return `<div class="v-card js-play-video" data-url="${escapeHtml(v.url)}" data-title="${escapeHtml(v.title)}" data-uploader="${escapeHtml(uploader)}" data-views="${escapeHtml(fmtViews(v.views))}" data-thumb="${escapeHtml(thumbHd)}">
        <div class="v-thumb-wrap">
          <img src="${escapeHtml(thumbHd)}" alt="${escapeHtml(v.title)}" loading="lazy" onload="if(this.naturalWidth && this.naturalWidth <= 120){this.src='icons/logo.svg';this.classList.add('fallback-logo-thumb');}" onerror="if(!this.dataset.tried){this.dataset.tried=1;this.src='https://i.ytimg.com/vi/${videoId || 'dQw4w9WgXcQ'}/mqdefault.jpg';}else{this.src='icons/logo.svg';this.classList.add('fallback-logo-thumb');}" />
          <span class="v-dur-badge">${fmtDuration(v.duration)}</span>
        </div>
        <div class="v-info-row">
          <img class="v-channel-avatar" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(uploader)}" loading="lazy" onerror="window.handleAvatarError && window.handleAvatarError(this, '${escapeHtml(uploader)}');" />
          <div class="v-meta-col">
            <h3 class="v-title">${escapeHtml(v.title)}</h3>
            <div class="v-uploader">${escapeHtml(uploader)}</div>
            <div class="v-stats">${fmtViews(v.views)}${v.publishedText ? ' &bull; ' + escapeHtml(v.publishedText) : ''}</div>
            <div class="v-card-actions">
              <button type="button" class="v-card-btn primary js-play-video">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                <span>Watch</span>
              </button>
              <button type="button" class="v-card-btn js-bookmark-toggle ${bookmarked ? 'bookmarked' : ''}" data-url="${escapeHtml(v.url)}" data-title="${escapeHtml(v.title)}" data-uploader="${escapeHtml(uploader)}" data-thumb="${escapeHtml(thumbHd)}" title="${bookmarked ? 'Remove Bookmark' : 'Bookmark Video'}">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="${bookmarked ? '#f59e0b' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span>${bookmarked ? 'Saved' : 'Save'}</span>
              </button>
              <button type="button" class="v-card-btn js-quick-dl" data-url="${escapeHtml(v.url)}">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      </div>`;
      })
      .join('');
  }

  // ================= CHANNEL SEARCH & RENDERING =================
  async function performSearch(query) {
    if (!query || !query.trim()) {
      hide(els.channelCardContainer);
      hide(els.clearSearchBtn);
      loadScienceFeed(currentCategory);
      return;
    }

    show(els.clearSearchBtn);
    show(els.feedSkel);
    hide(els.videoFeedGrid);
    hide(els.videoFeedEmpty);
    hide(els.feedLoadMoreWrap);
    hide(els.channelCardContainer);

    const base = getServerUrl();
    try {
      let data = null;
      if (base) {
        const res = await fetch(`${base}/api/search?q=${encodeURIComponent(query)}&blockShorts=${isShortsBlocked}`);
        data = await res.json();
      } else {
        data = await searchDirect(query);
      }

      hide(els.feedSkel);

      if (data.channel) {
        renderChannelCard(data.channel);
      } else {
        hide(els.channelCardContainer);
      }

      feedVideos = data.items || [];
      hasMoreFeed = false;
      renderVideoFeed(feedVideos);
    } catch (err) {
      hide(els.feedSkel);
      showToast('Search failed: ' + err.message, 'err');
    }
  }

  function renderChannelCard(channel) {
    if (!channel) {
      hide(els.channelCardContainer);
      return;
    }

    const avatarUrl = getChannelAvatar(channel.name, channel.avatar);

    show(els.channelCardContainer);
    els.channelCardContainer.innerHTML = `
      <div class="channel-card">
        <div class="channel-left">
          <div class="channel-avatar-wrap">
            <img class="channel-avatar" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(channel.name)}" onerror="window.handleAvatarError && window.handleAvatarError(this, '${escapeHtml(channel.name)}');" />
            ${channel.verified ? `
              <div class="channel-verified-badge" title="Verified Creator">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              </div>` : ''}
          </div>
          <div class="channel-info-col">
            <div class="channel-name-row">
              <h2 class="channel-name">${escapeHtml(channel.name)}</h2>
            </div>
            <span class="channel-handle">${escapeHtml(channel.handle || '')}</span>
            <div class="channel-stats-row">
              <span>${escapeHtml(channel.subCount || 'Verified Creator')}</span>
              ${channel.videoCount ? `&bull; <span>${escapeHtml(channel.videoCount)}</span>` : ''}
            </div>
            <p class="channel-desc">${escapeHtml(channel.description || '')}</p>
          </div>
        </div>
        <button type="button" class="channel-action-btn js-browse-channel" data-query="${escapeHtml(channel.name)}">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span>Explore Creator</span>
        </button>
      </div>
    `;
  }

  // ================= SNAP-SCROLL SHORTS FEED (UP TO 300 SHORTS) =================
  async function loadScienceShorts(forceFresh = false, isLoadMore = false) {
    if (isShortsBlocked) return;
    if (isLoadMore && (isLoadingMoreShorts || !hasMoreShorts || shortsVideos.length >= MAX_SHORTS)) {
      return;
    }

    if (!isLoadMore) {
      shortsPage = 1;
      shortsVideos = [];
      hasMoreShorts = true;

      show(els.shortsSkel);
      hide(els.shortsReelContainer);
      hide(els.shortsEmpty);
    } else {
      isLoadingMoreShorts = true;
    }

    const base = getServerUrl();
    let newItems = [];
    const randomSeed = forceFresh ? Date.now() : Math.floor(Date.now() / 200000);

    try {
      if (base) {
        const res = await fetch(
          `${base}/api/feed?type=shorts&seed=${randomSeed}&page=${shortsPage}&limit=${SHORTS_PAGE_LIMIT}`
        );
        const data = await res.json();
        newItems = data.items || [];
      } else {
        newItems = await fetchDirectShorts(shortsPage);
      }
    } catch (err) {
      console.warn('Shorts error, fallback to offline cache:', err);
      if (!isLoadMore) {
        const offlineShorts = localStorage.getItem(STORAGE.OFFLINE_SHORTS);
        if (offlineShorts) {
          try {
            newItems = JSON.parse(offlineShorts);
            showToast('Loaded shorts from offline cache', '');
          } catch (_) {}
        }
      }
      if (newItems.length === 0) {
        newItems = await fetchDirectShorts(shortsPage);
      }
    } finally {
      if (!isLoadMore) {
        hide(els.shortsSkel);
      } else {
        isLoadingMoreShorts = false;
      }

      if (newItems && newItems.length > 0) {
        const seenUrls = new Set(shortsVideos.map((s) => s.url));
        for (const item of newItems) {
          if (!seenUrls.has(item.url) && shortsVideos.length < MAX_SHORTS) {
            seenUrls.add(item.url);
            shortsVideos.push(item);
          }
        }
        shortsPage++;
      }

      if (shortsVideos.length >= MAX_SHORTS || newItems.length === 0) {
        hasMoreShorts = false;
      }

      if (!isLoadMore && shortsVideos.length > 0) {
        try {
          localStorage.setItem(STORAGE.OFFLINE_SHORTS, JSON.stringify(shortsVideos.slice(0, 50)));
        } catch (_) {}
      }

      renderShortsReels(shortsVideos);
      if (els.shortsLoadedCount) {
        els.shortsLoadedCount.textContent = shortsVideos.length;
      }
    }
  }

  function renderShortsReels(items) {
    if (!items || items.length === 0 || isShortsBlocked) {
      hide(els.shortsReelContainer);
      show(els.shortsEmpty);
      return;
    }

    hide(els.shortsEmpty);
    show(els.shortsReelContainer);

    els.shortsReelContainer.innerHTML = items
      .map((s, idx) => {
        const uploaderSafe = s.uploader || 'Science Creator';
        const avatarUrl = getChannelAvatar(uploaderSafe, s.avatar);
        const embedUrl = `https://www.youtube-nocookie.com/embed/${s.id}?autoplay=1&mute=1&controls=1&loop=1&playlist=${s.id}&enablejsapi=1&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3`;
        const bookmarked = isBookmarked(s.url);
        const thumbHd = getCleanThumbnail(s.id, s.thumbnail);

        return `<div class="reel-card" data-video-id="${escapeHtml(s.id)}" data-url="${escapeHtml(s.url)}" data-title="${escapeHtml(s.title)}" data-uploader="${escapeHtml(uploaderSafe)}">
        <!-- Top Controls Overlay -->
        <div class="reel-top-bar">
          <div class="reel-badge-pill">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="#ff0000"><path d="M17.77 10.32l-1.2-.5L18 9.06c1.84-.96 2.53-3.23 1.56-5.06s-3.24-2.53-5.07-1.56L6 6.94c-1.29.68-2.07 2.04-2 3.49.07 1.42.93 2.67 2.22 3.25.03.01 1.2.5 1.2.5L6 14.93c-1.83.97-2.53 3.24-1.56 5.07.97 1.83 3.24 2.53 5.07 1.56l8.5-4.5c1.29-.68 2.06-2.04 1.99-3.49-.07-1.42-.94-2.68-2.23-3.25zM10 14.5v-5l4.5 2.5-4.5 2.5z"/></svg>
            <span>VideoFetch Pure</span>
          </div>
          <button type="button" class="reel-mute-btn js-toggle-sound" title="Toggle Sound / Unmute">
            <svg class="icon-muted" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
          </button>
        </div>

        <!-- Video Frame -->
        <div class="reel-video-container">
          <iframe src="${idx === 0 ? embedUrl : ''}" data-src="${embedUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
        </div>
        
        <!-- Right Action Sidebar -->
        <div class="reel-actions-column">
          <button type="button" class="reel-action-btn js-like-reel" title="Like">
            <div class="reel-btn-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
            </div>
            <span class="reel-btn-lbl">Like</span>
          </button>

          <button type="button" class="reel-action-btn js-bookmark-reel ${bookmarked ? 'liked' : ''}" data-url="${escapeHtml(s.url)}" data-title="${escapeHtml(s.title)}" data-uploader="${escapeHtml(uploaderSafe)}" data-thumb="${escapeHtml(thumbHd)}" title="Save Bookmark">
            <div class="reel-btn-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="${bookmarked ? '#f59e0b' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <span class="reel-btn-lbl">${bookmarked ? 'Saved' : 'Save'}</span>
          </button>
          
          <button type="button" class="reel-action-btn js-dislike-reel" title="Dislike">
            <div class="reel-btn-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/></svg>
            </div>
            <span class="reel-btn-lbl">Dislike</span>
          </button>

          <button type="button" class="reel-action-btn js-quick-dl" data-url="${escapeHtml(s.url)}" title="Download Short">
            <div class="reel-btn-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </div>
            <span class="reel-btn-lbl">Download</span>
          </button>

          <button type="button" class="reel-action-btn js-share-reel" data-url="${escapeHtml(s.url)}" title="Share">
            <div class="reel-btn-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </div>
            <span class="reel-btn-lbl">Share</span>
          </button>
        </div>

        <!-- Info Overlay -->
        <div class="reel-info-overlay">
          <div class="reel-creator-row">
            <img class="reel-creator-avatar" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(uploaderSafe)}" loading="lazy" onerror="window.handleAvatarError && window.handleAvatarError(this, '${escapeHtml(uploaderSafe)}');" />
            <span class="reel-uploader-name">
              ${escapeHtml(uploaderSafe)}
              <svg viewBox="0 0 24 24" width="14" height="14" fill="#3ea6ff"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            </span>
            <button type="button" class="reel-sub-pill js-sub-pill">Subscribe</button>
          </div>
          <h4 class="reel-title">${escapeHtml(s.title)}</h4>
          <div class="reel-sound-track">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
            <span>Original Sound • ${escapeHtml(uploaderSafe)}</span>
          </div>
        </div>
      </div>`;
      })
      .join('');

    setupReelObserver();
  }

  function setupReelObserver() {
    if (reelObserver) reelObserver.disconnect();

    const options = {
      root: els.shortsReelContainer,
      threshold: 0.5,
    };

    reelObserver = new IntersectionObserver((entries) => {
      if (activeTab !== 'shorts') return;

      entries.forEach((entry) => {
        const iframe = entry.target.querySelector('iframe');
        if (entry.isIntersecting) {
          if (iframe && iframe.dataset.src && iframe.src !== iframe.dataset.src) {
            iframe.src = iframe.dataset.src;
          }
          const url = entry.target.dataset.url;
          const title = entry.target.dataset.title;
          const uploader = entry.target.dataset.uploader;
          const videoId = entry.target.dataset.videoId;
          saveWatchHistory({
            title,
            uploader,
            thumbnail: getCleanThumbnail(videoId),
            url,
          });

          const cards = Array.from(els.shortsReelContainer.querySelectorAll('.reel-card'));
          const currentIdx = cards.indexOf(entry.target);
          if (currentIdx >= cards.length - 3 && shortsVideos.length < MAX_SHORTS && hasMoreShorts) {
            loadScienceShorts(false, true);
          }
        } else {
          if (iframe && iframe.src) {
            iframe.src = '';
          }
        }
      });
    }, options);

    const cards = els.shortsReelContainer.querySelectorAll('.reel-card');
    cards.forEach((c) => reelObserver.observe(c));
  }

  // ================= DIRECT FALLBACKS =================
  async function fetchDirectCurated(category, page = 1) {
    const topicMap = {
      science_all: 'Veritasium 3Blue1Brown Kurzgesagt science 4k',
      physics_space: 'PBS Space Time Astrum quantum astrophysics',
      math_tech: '3Blue1Brown Numberphile computer science math',
      engineering: 'Real Engineering ColdFusion technology inventions',
      biology_health: 'Huberman Lab Real Science microbiology neuroscience',
      documentaries: 'BBC Earth National Geographic nature science 4k',
    };
    const query = topicMap[category] || 'Veritasium science documentary 4k';

    for (const mirror of MIRRORS) {
      try {
        const res = await fetch(`${mirror}/api/v1/search?q=${encodeURIComponent(query)}&page=${page}&type=video`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            return data
              .filter((v) => v.videoId && (!v.lengthSeconds || v.lengthSeconds > 60))
              .slice(0, 24)
              .map((i) => ({
                id: i.videoId,
                title: i.title,
                uploader: i.author || 'Science Channel',
                duration: i.lengthSeconds || 0,
                views: i.viewCount || 0,
                thumbnail: getCleanThumbnail(i.videoId),
                avatar: (i.authorThumbnails && i.authorThumbnails[0]?.url) || '',
                url: `https://www.youtube.com/watch?v=${i.videoId}`,
              }));
          }
        }
      } catch (_) {}
    }
    return [];
  }

  async function fetchDirectShorts(page = 1) {
    for (const mirror of MIRRORS) {
      try {
        const res = await fetch(`${mirror}/api/v1/search?q=%23shorts%20science%20physics&page=${page}&type=video`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            return data
              .filter((v) => v.videoId && (!v.lengthSeconds || v.lengthSeconds <= 90))
              .slice(0, 24)
              .map((i) => ({
                id: i.videoId,
                title: (i.title || '').replace(/#shorts/gi, '').trim() || 'Science Short',
                uploader: i.author || 'Creator',
                duration: i.lengthSeconds || 30,
                views: i.viewCount || 0,
                thumbnail: getCleanThumbnail(i.videoId),
                avatar: (i.authorThumbnails && i.authorThumbnails[0]?.url) || '',
                url: `https://www.youtube.com/shorts/${i.videoId}`,
              }));
          }
        }
      } catch (_) {}
    }
    return [];
  }

  async function searchDirect(query) {
    for (const mirror of MIRRORS) {
      try {
        const res = await fetch(`${mirror}/api/v1/search?q=${encodeURIComponent(query)}&type=all`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            let ch = null;
            const vids = [];
            for (const item of data) {
              if (item.type === 'channel' && !ch) {
                const name = item.author || 'Channel';
                ch = {
                  name: name,
                  handle: `@${name.replace(/\s+/g, '').toLowerCase()}`,
                  avatar: (item.authorThumbnails && item.authorThumbnails[item.authorThumbnails.length - 1]?.url) || (item.authorThumbnails && item.authorThumbnails[0]?.url) || getChannelAvatar(name),
                  subCount: item.subCount ? `${item.subCount} subscribers` : 'Official Channel',
                  videoCount: `${item.videoCount || 20} videos`,
                  description: item.description || 'Curated Channel',
                  verified: true,
                };
              } else if (item.videoId) {
                vids.push({
                  id: item.videoId,
                  title: item.title,
                  uploader: item.author || 'Creator',
                  duration: item.lengthSeconds || 0,
                  views: item.viewCount || 0,
                  thumbnail: getCleanThumbnail(item.videoId),
                  avatar: (item.authorThumbnails && item.authorThumbnails[0]?.url) || '',
                  url: `https://www.youtube.com/watch?v=${item.videoId}`,
                });
              }
            }
            return { channel: ch, items: vids.slice(0, 24) };
          }
        }
      } catch (_) {}
    }
    return { channel: null, items: [] };
  }

  // ================= AD-SHIELD MODAL PLAYER & RELATED VIDEOS =================
  function openAdFreePlayer(url, title = 'Video', author = 'Curated Science Channel', views = '') {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/i);
    const videoId = match ? match[1] : '';

    currentPlaying = { url, title, videoId, author, views };

    // Save to Watch History (Past 100)
    saveWatchHistory({
      title,
      uploader: author,
      thumbnail: getCleanThumbnail(videoId),
      url,
    });

    hideFloatingPlayer();

    els.modalTitle.textContent = title;
    els.modalAuthorBadge.textContent = author;
    if (els.modalAuthorAvatar) {
      els.modalAuthorAvatar.src = getChannelAvatar(author);
      els.modalAuthorAvatar.alt = author;
    }
    els.modalViewsBadge.textContent = views;
    els.modalDlBtn.dataset.url = url;
    els.modalCopyLinkBtn.dataset.url = url;

    if (videoId) {
      els.modalIframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;
      loadRelatedVideos(videoId);
    } else {
      els.modalIframe.src = url;
      hide(els.relatedList);
    }

    show(els.videoModal);
    document.body.style.overflow = 'hidden';
  }

  function closeAdFreePlayer() {
    els.modalIframe.src = '';
    hide(els.videoModal);
    document.body.style.overflow = '';
  }

  async function loadRelatedVideos(videoId) {
    show(els.relatedSkel);
    hide(els.relatedList);

    const base = getServerUrl();
    let related = [];

    try {
      if (base) {
        const res = await fetch(`${base}/api/related?videoId=${videoId}`);
        const data = await res.json();
        related = data.items || [];
      } else {
        related = await fetchDirectCurated('science_all');
      }
    } catch (_) {
      related = await fetchDirectCurated('science_all');
    } finally {
      hide(els.relatedSkel);
      renderRelatedVideos(related);
    }
  }

  function renderRelatedVideos(items) {
    if (!items || items.length === 0) {
      hide(els.relatedList);
      return;
    }

    show(els.relatedList);
    els.relatedList.innerHTML = items
      .slice(0, 15)
      .map((r) => {
        const videoId = r.id || extractVideoId(r.url) || '';
        const thumbHd = getCleanThumbnail(videoId, r.thumbnail);
        const uploader = r.uploader || 'Science Channel';

        return `<div class="related-item js-swap-video" data-url="${escapeHtml(r.url)}" data-title="${escapeHtml(r.title)}" data-uploader="${escapeHtml(uploader)}" data-views="${escapeHtml(fmtViews(r.views))}">
        <div class="related-thumb-wrap">
          <img src="${escapeHtml(thumbHd)}" alt="" loading="lazy" onload="if(this.naturalWidth && this.naturalWidth <= 120){this.src='icons/logo.svg';this.classList.add('fallback-logo-thumb');}" onerror="if(!this.dataset.tried){this.dataset.tried=1;this.src='https://i.ytimg.com/vi/${videoId || 'dQw4w9WgXcQ'}/mqdefault.jpg';}else{this.src='icons/logo.svg';this.classList.add('fallback-logo-thumb');}" />
          <span class="v-dur-badge">${fmtDuration(r.duration)}</span>
        </div>
        <div class="related-info">
          <h5 class="related-title">${escapeHtml(r.title)}</h5>
          <span class="related-uploader">${escapeHtml(uploader)}</span>
          <span class="related-views">${fmtViews(r.views)}</span>
        </div>
        <div class="related-actions">
          <button type="button" class="btn-icon-sm js-swap-video" title="Play Now">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </button>
          <button type="button" class="btn-icon-sm js-quick-dl" data-url="${escapeHtml(r.url)}" title="Download">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
        </div>
      </div>`;
      })
      .join('');
  }

  // ================= FLOATING MINI PLAYER DOCK (PiP) =================
  function minimizeToFloatingPlayer() {
    if (!currentPlaying || !currentPlaying.videoId) {
      closeAdFreePlayer();
      return;
    }

    els.modalIframe.src = '';
    hide(els.videoModal);
    document.body.style.overflow = '';

    els.floatingTitle.textContent = currentPlaying.title || 'Playing Video';
    els.floatingIframe.src = `https://www.youtube-nocookie.com/embed/${currentPlaying.videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;

    show(els.floatingMiniPlayer);
    showToast('Video docked in floating mini-player', '');
  }

  function expandFloatingPlayer() {
    if (!currentPlaying) return;
    hideFloatingPlayer();
    openAdFreePlayer(currentPlaying.url, currentPlaying.title, currentPlaying.author, currentPlaying.views);
  }

  function hideFloatingPlayer() {
    els.floatingIframe.src = '';
    hide(els.floatingMiniPlayer);
  }

  // ================= DOWNLOAD ENGINE =================
  async function analyzeLink(url) {
    if (!url) return;
    setAnalyzingState(true);
    hide(els.mediaPreviewCard);

    const base = getServerUrl();
    let data = null;

    try {
      if (base) {
        const res = await fetch(`${base}/api/info`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        if (res.ok) {
          data = await res.json();
        } else {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Server returned ${res.status}`);
        }
      } else {
        data = await extractDirectMeta(url);
      }

      if (!data) throw new Error('Could not read video information.');

      currentMeta = data;
      renderResultCard(data);
      saveDownloadHistory(data, url);
    } catch (err) {
      showToast(err.message || 'Analysis failed.', 'err');
    } finally {
      setAnalyzingState(false);
    }
  }

  function setAnalyzingState(loading) {
    if (els.analyzeBtn) els.analyzeBtn.disabled = loading;
    if (loading) {
      hide(els.analyzeBtnText);
      show(els.analyzeBtnLoader);
    } else {
      show(els.analyzeBtnText);
      hide(els.analyzeBtnLoader);
    }
  }

  async function extractDirectMeta(url) {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/i);
    if (match) {
      const id = match[1];
      for (const mirror of MIRRORS) {
        try {
          const res = await fetch(`${mirror}/api/v1/videos/${id}`);
          if (res.ok) {
            const j = await res.json();
            return {
              title: j.title,
              uploader: j.author,
              duration: j.lengthSeconds || 0,
              views: j.viewCount || 0,
              thumbnail: getCleanThumbnail(id),
              webpageUrl: `https://www.youtube.com/watch?v=${id}`,
              maxHeight: 1080,
            };
          }
        } catch (_) {}
      }
      return {
        title: 'YouTube Video (' + id + ')',
        uploader: 'YouTube Creator',
        duration: 0,
        views: 0,
        thumbnail: getCleanThumbnail(id),
        webpageUrl: `https://www.youtube.com/watch?v=${id}`,
        maxHeight: 1080,
      };
    }
    throw new Error('Please configure a VPS server in Settings for non-YouTube downloads.');
  }

  function renderResultCard(meta) {
    if (els.previewThumb) {
      els.previewThumb.src = meta.thumbnail || 'icons/logo.svg';
      els.previewThumb.onload = function () {
        if (this.naturalWidth && this.naturalWidth <= 120) {
          this.src = 'icons/logo.svg';
          this.classList.add('fallback-logo-thumb');
        }
      };
      els.previewThumb.onerror = function () {
        this.src = 'icons/logo.svg';
        this.classList.add('fallback-logo-thumb');
      };
    }
    if (els.previewDuration) els.previewDuration.textContent = fmtDuration(meta.duration);
    if (els.previewTitle) els.previewTitle.textContent = meta.title || 'Video';
    if (els.previewUploader) els.previewUploader.textContent = meta.uploader || 'Creator';
    if (els.previewViews) els.previewViews.textContent = fmtViews(meta.views);

    const maxHeight = Number(meta.maxHeight) || 1080;
    const qualities = [
      { id: 'best', label: 'Highest (1080p/4K)' },
      { id: '1080', label: '1080p Full HD', min: 1080 },
      { id: '720', label: '720p HD', min: 720 },
      { id: '480', label: '480p SD', min: 480 },
      { id: '360', label: '360p Fast', min: 360 },
    ].filter((q) => !q.min || maxHeight >= q.min);

    if (els.videoQualitiesList) {
      els.videoQualitiesList.innerHTML = qualities
        .map((q, idx) => `<button type="button" class="q-chip${idx === 0 ? ' active' : ''}" data-val="${q.id}">${q.label}</button>`)
        .join('');
    }

    const audioOpts = [
      { id: 'best', label: 'Original (320kbps)' },
      { id: '192', label: '192kbps MP3' },
      { id: '128', label: '128kbps Fast' },
    ];
    if (els.audioQualitiesList) {
      els.audioQualitiesList.innerHTML = audioOpts
        .map((a, idx) => `<button type="button" class="q-chip${idx === 0 ? ' active' : ''}" data-val="${a.id}">${a.label}</button>`)
        .join('');
    }

    selectedFormat = { type: 'video', quality: qualities[0]?.id || 'best', audioExt: 'mp3' };
    updateExecuteBtnLabel();

    show(els.mediaPreviewCard);
    els.mediaPreviewCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function updateExecuteBtnLabel() {
    if (!els.executeDownloadBtn) return;
    const span = els.executeDownloadBtn.querySelector('span');
    if (!span) return;
    if (selectedFormat.type === 'video') {
      const q = selectedFormat.quality === 'best' ? 'Highest' : `${selectedFormat.quality}p`;
      span.textContent = `Download Video (${q})`;
    } else {
      span.textContent = `Download Audio (MP3)`;
    }
  }

  function startDownload() {
    if (!currentMeta) return;
    const base = getServerUrl();
    const params = new URLSearchParams();
    params.set('url', currentMeta.webpageUrl);
    params.set('title', currentMeta.title || 'download');

    if (selectedFormat.type === 'audio') {
      params.set('audio', '1');
      params.set('format', 'mp3');
    } else {
      params.set('q', selectedFormat.quality);
    }

    const endpoint = `${base}/api/download?${params.toString()}`;

    const a = document.createElement('a');
    a.href = endpoint;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showToast('Download started in background 🚀', '');
  }

  // ================= BOOKMARKS MANAGER =================
  function getBookmarks() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.BOOKMARKS) || '[]');
    } catch {
      return [];
    }
  }

  function isBookmarked(url) {
    if (!url) return false;
    const list = getBookmarks();
    return list.some((b) => b.url === url);
  }

  function toggleBookmark(item) {
    if (!item || !item.url) return false;
    const list = getBookmarks();
    const existingIdx = list.findIndex((b) => b.url === item.url);
    let added = false;

    if (existingIdx >= 0) {
      list.splice(existingIdx, 1);
      added = false;
      showToast('Removed from Bookmarks');
    } else {
      list.unshift({
        title: item.title || 'Untitled',
        author: item.uploader || item.author || 'Science Creator',
        thumbnail: item.thumbnail || item.thumb || 'icons/logo.svg',
        url: item.url,
        timestamp: Date.now(),
      });
      added = true;
      showToast('Saved to Bookmarks ⭐');
    }

    localStorage.setItem(STORAGE.BOOKMARKS, JSON.stringify(list));
    updateHistoryCounts();

    $$(`.js-bookmark-toggle[data-url="${CSS.escape(item.url)}"]`).forEach((btn) => {
      btn.classList.toggle('bookmarked', added);
      const icon = btn.querySelector('svg');
      if (icon) icon.setAttribute('fill', added ? '#f59e0b' : 'none');
      const span = btn.querySelector('span');
      if (span) span.textContent = added ? 'Saved' : 'Save';
    });

    $$(`.js-bookmark-reel[data-url="${CSS.escape(item.url)}"]`).forEach((btn) => {
      btn.classList.toggle('liked', added);
      const icon = btn.querySelector('svg');
      if (icon) icon.setAttribute('fill', added ? '#f59e0b' : 'none');
      const span = btn.querySelector('.reel-btn-lbl');
      if (span) span.textContent = added ? 'Saved' : 'Save';
    });

    if (activeTab === 'history' && activeHistorySubtab === 'bookmarks') {
      renderCurrentHistory(els.historyFilterInput?.value || '');
    }

    return added;
  }

  // ================= SEPARATED HISTORY (WATCH VS BOOKMARK VS DOWNLOAD) =================
  function getWatchHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.WATCH_HISTORY) || '[]');
    } catch {
      return [];
    }
  }

  function saveWatchHistory(item) {
    if (!item || !item.url) return;
    const list = getWatchHistory();
    const existingIdx = list.findIndex((x) => x.url === item.url);
    const videoId = extractVideoId(item.url);
    const entry = {
      title: item.title || 'Untitled',
      author: item.uploader || item.author || 'Creator',
      thumbnail: getCleanThumbnail(videoId, item.thumbnail),
      url: item.url,
      timestamp: Date.now(),
    };

    if (existingIdx >= 0) list.splice(existingIdx, 1);
    list.unshift(entry);
    localStorage.setItem(STORAGE.WATCH_HISTORY, JSON.stringify(list.slice(0, 100)));
    updateHistoryCounts();
  }

  function getDownloadHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.DOWNLOAD_HISTORY) || '[]');
    } catch {
      return [];
    }
  }

  function saveDownloadHistory(meta, url) {
    const list = getDownloadHistory();
    const existingIdx = list.findIndex((x) => x.url === url);
    const videoId = extractVideoId(url);
    const item = {
      title: meta.title || 'Untitled',
      author: meta.uploader || 'Creator',
      duration: meta.duration || 0,
      thumbnail: getCleanThumbnail(videoId, meta.thumbnail),
      url,
      timestamp: Date.now(),
    };

    if (existingIdx >= 0) list.splice(existingIdx, 1);
    list.unshift(item);
    localStorage.setItem(STORAGE.DOWNLOAD_HISTORY, JSON.stringify(list.slice(0, 50)));
    updateHistoryCounts();
  }

  function updateHistoryCounts() {
    const watchCount = getWatchHistory().length;
    const bookmarkCount = getBookmarks().length;
    const dlCount = getDownloadHistory().length;

    if (els.histWatchCount) els.histWatchCount.textContent = watchCount;
    if (els.histBookmarkCount) els.histBookmarkCount.textContent = bookmarkCount;
    if (els.histDownloadCount) els.histDownloadCount.textContent = dlCount;
    if (els.navHistoryCount) els.navHistoryCount.textContent = watchCount + bookmarkCount + dlCount;
  }

  function renderCurrentHistory(filterQuery = '') {
    let list = [];
    if (activeHistorySubtab === 'watched') list = getWatchHistory();
    else if (activeHistorySubtab === 'bookmarks') list = getBookmarks();
    else list = getDownloadHistory();

    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      list = list.filter((i) => (i.title || '').toLowerCase().includes(q) || (i.author || '').toLowerCase().includes(q));
    }

    if (list.length === 0) {
      hide(els.historyList);
      show(els.historyEmptyState);
      const emptyP = els.historyEmptyState.querySelector('p');
      if (emptyP) {
        emptyP.textContent =
          activeHistorySubtab === 'watched'
            ? 'No watched videos yet. Videos and shorts you play will appear here (up to 100).'
            : activeHistorySubtab === 'bookmarks'
            ? 'No bookmarks saved yet. Tap "Save" on any video to bookmark it.'
            : 'No downloaded media yet. Videos you analyze and download will appear here.';
      }
      return;
    }

    show(els.historyList);
    hide(els.historyEmptyState);

    els.historyList.innerHTML = list
      .map(
        (h, idx) => {
          const videoId = extractVideoId(h.url);
          const thumbSrc = getCleanThumbnail(videoId, h.thumbnail);

          return `<div class="hist-item">
          <img class="hist-thumb" src="${escapeHtml(thumbSrc)}" alt="" onload="if(this.naturalWidth && this.naturalWidth <= 120){this.src='icons/logo.svg';this.classList.add('fallback-logo-thumb');}" onerror="this.onerror=null;this.src='icons/logo.svg';this.classList.add('fallback-logo-thumb');" />
          <div class="hist-meta">
            <div class="hist-title">${escapeHtml(h.title)}</div>
            <div class="hist-sub">${escapeHtml(h.author)} &bull; ${new Date(h.timestamp).toLocaleDateString()} ${new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <div class="hist-actions">
            <button type="button" class="btn-secondary btn-sm js-hist-watch" data-url="${escapeHtml(h.url)}" data-title="${escapeHtml(h.title)}" data-uploader="${escapeHtml(h.author)}">Watch</button>
            <button type="button" class="btn-primary btn-sm js-hist-dl" data-url="${escapeHtml(h.url)}">Download</button>
            <button type="button" class="btn-danger-outline btn-sm js-hist-del" data-idx="${idx}" data-url="${escapeHtml(h.url)}" data-type="${activeHistorySubtab}">&times;</button>
          </div>
        </div>`;
        },
      )
      .join('');
  }

  // ================= EVENT LISTENERS =================
  function initListeners() {
    // Navigation Clicks
    [...els.desktopNavItems, ...els.mobileNavItems].forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Quick Focus Mode
    if (els.quickBlockShortsBtn) {
      els.quickBlockShortsBtn.addEventListener('click', () => {
        setBlockShorts(!isShortsBlocked);
        showToast(isShortsBlocked ? 'Shorts Blocked (Focus Mode Active)' : 'Shorts Enabled');
      });
    }

    // Refresh Buttons
    if (els.headerRefreshBtn) {
      els.headerRefreshBtn.addEventListener('click', () => {
        if (activeTab === 'shorts') loadScienceShorts(true);
        else loadScienceFeed(currentCategory, true);
        showToast('Refreshed recommendations');
      });
    }
    if (els.feedRefreshTrigger) {
      els.feedRefreshTrigger.addEventListener('click', () => {
        loadScienceFeed(currentCategory, true);
        showToast('Loaded fresh science content');
      });
    }
    if (els.shortsRefreshBtn) {
      els.shortsRefreshBtn.addEventListener('click', () => {
        loadScienceShorts(true);
      });
    }

    // Feed Load More Button (Pagination up to 100)
    if (els.feedLoadMoreBtn) {
      els.feedLoadMoreBtn.addEventListener('click', () => {
        loadScienceFeed(currentCategory, false, true);
      });
    }

    // Trending Search Tags
    $$('.js-tag-search').forEach((tagBtn) => {
      tagBtn.addEventListener('click', () => {
        const tag = tagBtn.dataset.tag;
        if (tag && els.youtubeSearchInput) {
          els.youtubeSearchInput.value = tag;
          performSearch(tag);
        }
      });
    });

    // Shorts Desktop Reel Navigation (Next / Prev Arrows)
    const reelPrev = $('#reel-nav-prev');
    const reelNext = $('#reel-nav-next');
    if (reelPrev && els.shortsReelContainer) {
      reelPrev.addEventListener('click', () => {
        const step = els.shortsReelContainer.clientHeight || window.innerHeight * 0.8;
        els.shortsReelContainer.scrollBy({ top: -step, behavior: 'smooth' });
        setTimeout(activateVisibleShort, 350);
      });
    }
    if (reelNext && els.shortsReelContainer) {
      reelNext.addEventListener('click', () => {
        const step = els.shortsReelContainer.clientHeight || window.innerHeight * 0.8;
        els.shortsReelContainer.scrollBy({ top: step, behavior: 'smooth' });
        setTimeout(activateVisibleShort, 350);
      });
    }

    // Keyboard Arrow navigation for Reels
    window.addEventListener('keydown', (e) => {
      if (activeTab === 'shorts' && els.shortsReelContainer) {
        const step = els.shortsReelContainer.clientHeight || window.innerHeight * 0.8;
        if (e.key === 'ArrowDown' || e.key === 'j') {
          e.preventDefault();
          els.shortsReelContainer.scrollBy({ top: step, behavior: 'smooth' });
          setTimeout(activateVisibleShort, 350);
        } else if (e.key === 'ArrowUp' || e.key === 'k') {
          e.preventDefault();
          els.shortsReelContainer.scrollBy({ top: -step, behavior: 'smooth' });
          setTimeout(activateVisibleShort, 350);
        }
      }
    });

    // Search Input Form
    if (els.youtubeSearchForm) {
      els.youtubeSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        performSearch(els.youtubeSearchInput.value);
      });
    }
    if (els.youtubeSearchInput) {
      els.youtubeSearchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounce);
        const q = e.target.value;
        if (!q) {
          hide(els.clearSearchBtn);
          hide(els.channelCardContainer);
          loadScienceFeed(currentCategory);
        } else {
          show(els.clearSearchBtn);
          searchDebounce = setTimeout(() => performSearch(q), 450);
        }
      });
    }
    if (els.clearSearchBtn) {
      els.clearSearchBtn.addEventListener('click', () => {
        els.youtubeSearchInput.value = '';
        hide(els.clearSearchBtn);
        hide(els.channelCardContainer);
        loadScienceFeed(currentCategory);
      });
    }

    // Category Chips
    els.categoryChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        loadScienceFeed(chip.dataset.cat);
      });
    });

    // History Sub-tabs (Watch vs Bookmarks vs Download)
    els.historySubtabs.forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        els.historySubtabs.forEach((b) => b.classList.remove('active'));
        tabBtn.classList.add('active');
        activeHistorySubtab = tabBtn.dataset.histTab;
        renderCurrentHistory(els.historyFilterInput?.value || '');
      });
    });

    // Delegated Clicks
    document.addEventListener('click', (e) => {
      // Play Video
      const playBtn = e.target.closest('.js-play-video');
      if (playBtn && !e.target.closest('.js-bookmark-toggle') && !e.target.closest('.js-quick-dl')) {
        const card = playBtn.closest('[data-url]');
        if (card) {
          openAdFreePlayer(
            card.dataset.url,
            card.dataset.title || 'Science Video',
            card.dataset.uploader || 'Science Channel',
            card.dataset.views || '',
          );
        }
        return;
      }

      // Bookmark Toggle on Video Card
      const bmToggle = e.target.closest('.js-bookmark-toggle');
      if (bmToggle) {
        e.stopPropagation();
        toggleBookmark({
          url: bmToggle.dataset.url,
          title: bmToggle.dataset.title,
          uploader: bmToggle.dataset.uploader,
          thumbnail: bmToggle.dataset.thumb,
        });
        return;
      }

      // Bookmark Toggle on Shorts Reel
      const bmReel = e.target.closest('.js-bookmark-reel');
      if (bmReel) {
        e.stopPropagation();
        toggleBookmark({
          url: bmReel.dataset.url,
          title: bmReel.dataset.title,
          uploader: bmReel.dataset.uploader,
          thumbnail: bmReel.dataset.thumb,
        });
        return;
      }

      // Swap Video from Related List
      const swapBtn = e.target.closest('.js-swap-video');
      if (swapBtn && !e.target.closest('.js-quick-dl')) {
        const item = swapBtn.closest('[data-url]');
        if (item) {
          openAdFreePlayer(
            item.dataset.url,
            item.dataset.title || 'Video',
            item.dataset.uploader || 'Creator',
            item.dataset.views || '',
          );
        }
        return;
      }

      // Browse Creator / Channel Card
      const channelBtn = e.target.closest('.js-browse-channel');
      if (channelBtn) {
        const q = channelBtn.dataset.query;
        if (q) {
          els.youtubeSearchInput.value = q;
          performSearch(q);
        }
        return;
      }

      // Quick Download from Feed / Reels
      const dlBtn = e.target.closest('.js-quick-dl');
      if (dlBtn) {
        e.stopPropagation();
        const url = dlBtn.dataset.url;
        if (url) {
          switchTab('downloader');
          if (els.mediaUrlInput) els.mediaUrlInput.value = url;
          analyzeLink(url);
        }
        return;
      }

      // Like Reel / Short
      const likeBtn = e.target.closest('.js-like-reel');
      if (likeBtn) {
        likeBtn.classList.toggle('liked');
        const isLiked = likeBtn.classList.contains('liked');
        showToast(isLiked ? 'Added to liked shorts!' : 'Removed from liked shorts');
        return;
      }

      // Dislike Reel / Short
      const dislikeBtn = e.target.closest('.js-dislike-reel');
      if (dislikeBtn) {
        dislikeBtn.classList.toggle('liked');
        showToast('Feedback noted: Less like this');
        return;
      }

      // Subscribe / Follow Creator
      const subBtn = e.target.closest('.js-sub-pill');
      if (subBtn) {
        subBtn.classList.toggle('subscribed');
        const isSub = subBtn.classList.contains('subscribed');
        subBtn.textContent = isSub ? 'Subscribed' : 'Subscribe';
        showToast(isSub ? 'Subscribed to creator channel!' : 'Unsubscribed');
        return;
      }

      // Toggle Sound / Mute / Unmute on Reel
      const soundBtn = e.target.closest('.js-toggle-sound');
      if (soundBtn) {
        const card = soundBtn.closest('.reel-card');
        if (card) {
          const iframe = card.querySelector('iframe');
          if (iframe && iframe.contentWindow) {
            const isCurrentlyMuted = soundBtn.querySelector('.icon-muted');
            if (isCurrentlyMuted) {
              iframe.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
              iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
              soundBtn.innerHTML = `
                <svg class="icon-unmuted" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              `;
              showToast('Audio unmuted 🔊');
            } else {
              iframe.contentWindow.postMessage('{"event":"command","func":"mute","args":""}', '*');
              soundBtn.innerHTML = `
                <svg class="icon-muted" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              `;
              showToast('Audio muted 🔇');
            }
          }
        }
        return;
      }

      // Share Reel
      const shareBtn = e.target.closest('.js-share-reel');
      if (shareBtn) {
        const url = shareBtn.dataset.url;
        if (url) {
          if (navigator.share) {
            navigator.share({ title: 'Science Short', url }).catch(() => {
              navigator.clipboard.writeText(url).catch(() => {});
              showToast('Short link copied to clipboard!');
            });
          } else {
            navigator.clipboard.writeText(url).catch(() => {});
            showToast('Short link copied to clipboard!');
          }
        }
        return;
      }

      // Open Sponsor Modal
      const openSponsorBtn = e.target.closest('.js-open-sponsor');
      if (openSponsorBtn) {
        show(els.sponsorModal);
        return;
      }

      // Close Sponsor Modal
      if (e.target.closest('#close-sponsor-modal') || e.target === els.sponsorModal) {
        hide(els.sponsorModal);
        return;
      }

      // Copy Solana Address
      const copySolBtn = e.target.closest('.js-copy-sol');
      if (copySolBtn) {
        const addr = copySolBtn.dataset.address || 'DfL2H7rAaocxpyNYdefV7aybNCSBVJiUSGAn3RDFKRb7';
        navigator.clipboard.writeText(addr).then(() => {
          showToast('Solana (SOL) address copied to clipboard! 🚀');
        }).catch(() => {
          showToast('Address: ' + addr);
        });
        return;
      }

      // Format Tab Switch in Downloader
      const fTab = e.target.closest('.fmt-tab');
      if (fTab) {
        els.fmtTabs.forEach((t) => t.classList.remove('active'));
        fTab.classList.add('active');
        const isAudio = fTab.dataset.fmt === 'audio';
        selectedFormat.type = isAudio ? 'audio' : 'video';
        if (isAudio) {
          hide(els.videoQualitiesList);
          show(els.audioQualitiesList);
        } else {
          show(els.videoQualitiesList);
          hide(els.audioQualitiesList);
        }
        updateExecuteBtnLabel();
        return;
      }

      // Quality Chip Selection in Downloader
      const qChip = e.target.closest('.q-chip');
      if (qChip) {
        const parent = qChip.parentElement;
        Array.from(parent.children).forEach((c) => c.classList.remove('active'));
        qChip.classList.add('active');
        const val = qChip.dataset.val || qChip.dataset.quality;
        if (selectedFormat.type === 'video') {
          selectedFormat.quality = val;
        } else {
          selectedFormat.audioExt = 'mp3';
        }
        updateExecuteBtnLabel();
        return;
      }

      // History Actions
      const histWatch = e.target.closest('.js-hist-watch');
      if (histWatch) {
        openAdFreePlayer(histWatch.dataset.url, histWatch.dataset.title, histWatch.dataset.uploader);
        return;
      }
      const histDl = e.target.closest('.js-hist-dl');
      if (histDl) {
        switchTab('downloader');
        if (els.mediaUrlInput) els.mediaUrlInput.value = histDl.dataset.url;
        analyzeLink(histDl.dataset.url);
        return;
      }
      const histDel = e.target.closest('.js-hist-del');
      if (histDel) {
        const idx = Number(histDel.dataset.idx);
        const type = histDel.dataset.type;
        if (type === 'watched') {
          const list = getWatchHistory();
          list.splice(idx, 1);
          localStorage.setItem(STORAGE.WATCH_HISTORY, JSON.stringify(list));
        } else if (type === 'bookmarks') {
          const list = getBookmarks();
          list.splice(idx, 1);
          localStorage.setItem(STORAGE.BOOKMARKS, JSON.stringify(list));
        } else {
          const list = getDownloadHistory();
          list.splice(idx, 1);
          localStorage.setItem(STORAGE.DOWNLOAD_HISTORY, JSON.stringify(list));
        }
        renderCurrentHistory(els.historyFilterInput?.value || '');
        updateHistoryCounts();
        return;
      }
    });

    // Downloader Actions
    if (els.analyzeBtn) {
      els.analyzeBtn.addEventListener('click', () => {
        if (els.mediaUrlInput) analyzeLink(els.mediaUrlInput.value.trim());
      });
    }
    if (els.pasteBtn) {
      els.pasteBtn.addEventListener('click', async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            els.mediaUrlInput.value = text.trim();
            analyzeLink(text.trim());
          }
        } catch (_) {
          showToast('Could not read clipboard. Please paste manually.', 'err');
        }
      });
    }
    if (els.executeDownloadBtn) {
      els.executeDownloadBtn.addEventListener('click', startDownload);
    }

    // Modal Player Controls
    if (els.modalCloseBtn) {
      els.modalCloseBtn.addEventListener('click', closeAdFreePlayer);
    }
    if (els.modalFloatBtn) {
      els.modalFloatBtn.addEventListener('click', minimizeToFloatingPlayer);
    }
    if (els.modalDlBtn) {
      els.modalDlBtn.addEventListener('click', () => {
        const url = els.modalDlBtn.dataset.url;
        if (url) {
          closeAdFreePlayer();
          switchTab('downloader');
          if (els.mediaUrlInput) els.mediaUrlInput.value = url;
          analyzeLink(url);
        }
      });
    }
    if (els.modalCopyLinkBtn) {
      els.modalCopyLinkBtn.addEventListener('click', async () => {
        const url = els.modalCopyLinkBtn.dataset.url;
        if (url) {
          await navigator.clipboard.writeText(url).catch(() => {});
          showToast('Video link copied to clipboard!');
        }
      });
    }

    // Floating Mini-Player Controls
    if (els.floatingExpandBtn) {
      els.floatingExpandBtn.addEventListener('click', expandFloatingPlayer);
    }
    if (els.floatingCloseBtn) {
      els.floatingCloseBtn.addEventListener('click', hideFloatingPlayer);
    }

    // History Filter & Clear Current Log
    if (els.historyFilterInput) {
      els.historyFilterInput.addEventListener('input', (e) => {
        renderCurrentHistory(e.target.value);
      });
    }
    if (els.clearAllHistory) {
      els.clearAllHistory.addEventListener('click', () => {
        const isWatch = activeHistorySubtab === 'watched';
        const isBm = activeHistorySubtab === 'bookmarks';
        const label = isWatch ? 'Watch History' : isBm ? 'Saved Bookmarks' : 'Download History';
        if (confirm(`Are you sure you want to clear ${label}?`)) {
          if (isWatch) {
            localStorage.removeItem(STORAGE.WATCH_HISTORY);
          } else if (isBm) {
            localStorage.removeItem(STORAGE.BOOKMARKS);
          } else {
            localStorage.removeItem(STORAGE.DOWNLOAD_HISTORY);
          }
          renderCurrentHistory();
          updateHistoryCounts();
          showToast(`${label} cleared.`);
        }
      });
    }

    // Settings
    if (els.prefBlockShorts) {
      els.prefBlockShorts.checked = isShortsBlocked;
      els.prefBlockShorts.addEventListener('change', (e) => {
        setBlockShorts(e.target.checked);
      });
    }
    if (els.vpsSaveBtn) {
      els.vpsSaveBtn.addEventListener('click', () => {
        const url = (els.vpsUrlInput.value || '').trim();
        if (url) {
          localStorage.setItem(STORAGE.SERVER, url);
          showToast('Custom VPS URL saved!');
          els.vpsStatusPill.textContent = 'Custom VPS Active';
          els.vpsStatusPill.className = 'status-pill focus';
        } else {
          localStorage.removeItem(STORAGE.SERVER);
          showToast('Reset to Direct Standalone Mode');
          els.vpsStatusPill.textContent = 'Direct Mode (No VPS)';
          els.vpsStatusPill.className = 'status-pill direct';
        }
      });
    }
    if (els.vpsTestBtn) {
      els.vpsTestBtn.addEventListener('click', async () => {
        const url = (els.vpsUrlInput.value || '').trim() || getServerUrl();
        if (!url) {
          showToast('Direct Standalone mode is ready.');
          return;
        }
        try {
          const res = await fetch(`${url}/health`);
          if (res.ok) {
            const j = await res.json();
            showToast(`Server online! yt-dlp: ${j.ytdlp ? 'Ready' : 'Missing'}`);
          } else {
            showToast(`Server returned status ${res.status}`, 'err');
          }
        } catch (_) {
          showToast('Could not reach server URL.', 'err');
        }
      });
    }
    if (els.prefFeedTopicSelect) {
      const savedTopic = localStorage.getItem(STORAGE.FEED_TOPIC) || 'science_all';
      els.prefFeedTopicSelect.value = savedTopic;
      currentCategory = savedTopic;

      els.prefFeedTopicSelect.addEventListener('change', (e) => {
        const topic = e.target.value;
        localStorage.setItem(STORAGE.FEED_TOPIC, topic);
        currentCategory = topic;

        els.categoryChips.forEach((c) => {
          c.classList.toggle('active', c.dataset.cat === topic);
        });

        loadScienceFeed(topic);
        showToast('Feed topic preference updated!');
      });
    }

    if (els.btnCheckUpdates) {
      els.btnCheckUpdates.addEventListener('click', () => {
        checkForUpdates(true);
      });
    }

    if (els.prefThemeSelect) {
      const savedTheme = localStorage.getItem(STORAGE.THEME) || 'dark';
      els.prefThemeSelect.value = savedTheme;
      document.documentElement.setAttribute('data-theme', savedTheme);

      els.prefThemeSelect.addEventListener('change', (e) => {
        const t = e.target.value;
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem(STORAGE.THEME, t);
      });
    }
    if (els.themeBtn) {
      els.themeBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'midnight' : current === 'midnight' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem(STORAGE.THEME, next);
        if (els.prefThemeSelect) els.prefThemeSelect.value = next;
      });
    }
  }

  // ================= UPDATE CHECKER & VERSION NOTIFIER =================
  function checkForUpdates(manual = false) {
    if (manual) {
      showToast('Checking for latest updates...');
      if (els.updateStatusText) {
        els.updateStatusText.textContent = 'Checking GitHub releases...';
      }
    }

    fetch('https://api.github.com/repos/Saff9/video-downloder/releases/latest', { cache: 'no-store' })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('No release');
      })
      .then((data) => {
        const remoteTag = String(data.tag_name || data.name || '').replace(/^v/, '');
        if (remoteTag && remoteTag > APP_VERSION) {
          if (els.updateStatusText) {
            els.updateStatusText.innerHTML = `🚀 <strong style="color:#38bdf8;">v${escapeHtml(remoteTag)} available!</strong> <a href="${data.html_url || 'https://github.com/Saff9/video-downloder'}" target="_blank" style="color:#fbbf24;text-decoration:underline;margin-left:6px;">Download APK</a>`;
          }
          showToast(`New VideoFetch v${remoteTag} available! Open Settings to update.`, 'focus');
        } else {
          if (els.updateStatusText) {
            els.updateStatusText.textContent = `✓ You are running the latest version (v${APP_VERSION}).`;
          }
          if (manual) showToast(`You are on the latest build (v${APP_VERSION}).`);
        }
      })
      .catch(() => {
        if (els.updateStatusText) {
          els.updateStatusText.textContent = `✓ You are running the latest build (v${APP_VERSION}).`;
        }
        if (manual) showToast(`You are on the latest build (v${APP_VERSION}).`);
      });
  }

  // ================= APP INITIALIZATION =================
  function init() {
    initServiceWorker();
    initListeners();
    updateHistoryCounts();
    setBlockShorts(isShortsBlocked);

    // Initial load: saved feed topic or default science_all
    const initialTopic = localStorage.getItem(STORAGE.FEED_TOPIC) || 'science_all';
    loadScienceFeed(initialTopic);

    // Background update check
    setTimeout(() => checkForUpdates(false), 2500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();