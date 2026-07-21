(() => {
  'use strict';

  const properties = Array.isArray(window.TABANJI_PROPERTIES) ? window.TABANJI_PROPERTIES : [];
  const grid = document.getElementById('property-grid');
  const favoriteCount = document.querySelector('.favorite-count');
  const storageKey = 'tabanji_estates_favorites';
  const legacyStorageKey = ['vel', 'mont_favorites'].join('');

  const migrateFavorites = () => {
    try {
      if (localStorage.getItem(storageKey) !== null) return;
      const legacyValue = localStorage.getItem(legacyStorageKey);
      if (legacyValue === null) return;
      const parsed = JSON.parse(legacyValue);
      if (!Array.isArray(parsed)) return;
      const safeFavorites = parsed.map(Number).filter(Number.isFinite);
      localStorage.setItem(storageKey, JSON.stringify(safeFavorites));
      localStorage.removeItem(legacyStorageKey);
    } catch (_) {
      // Ignore unavailable storage and malformed legacy data without affecting the page.
    }
  };

  migrateFavorites();

  const escapeHTML = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));

  const getFavorites = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(saved) ? saved.map(Number).filter(Number.isFinite) : [];
    } catch (error) {
      // Storage may be unavailable or contain invalid data; fail safely.
      return [];
    }
  };

  const saveFavorites = (favorites) => {
    try { localStorage.setItem(storageKey, JSON.stringify(favorites)); }
    catch (error) { /* Storage can be unavailable in private browsing contexts. */ }
  };

  const formatPrice = (property) => `$${Number(property.price).toLocaleString('en-US')}${property.pricePeriod ? ` / ${property.pricePeriod}` : ''}`;

  const propertyCard = (property, favorites) => {
    const active = favorites.includes(property.id);
    const arabic = window.TabanjiI18n?.language === 'ar';
    const displayTitle = arabic ? property.titleAr : property.title;
    const displayLocation = arabic ? property.locationAr : property.location;
    return `
      <article class="property-card reveal" data-property-id="${property.id}">
        <a class="property-media" href="property.html?id=${property.id}" aria-label="View ${escapeHTML(displayTitle)}">
          <img src="${escapeHTML(property.mainImage)}" alt="${escapeHTML(displayTitle)}" loading="lazy">
          <span class="badge">${escapeHTML(property.exclusive ? 'Exclusive' : property.featured ? 'Featured' : property.status)}</span>
          <span class="button card-view">View Property</span>
        </a>
        <button class="favorite-button${active ? ' active' : ''}" type="button" aria-label="${active ? 'Remove from' : 'Add to'} favorites" aria-pressed="${active}"><i data-lucide="heart"></i></button>
        <div class="property-info">
          <h3>${escapeHTML(displayTitle)}</h3>
          <p class="property-location">${escapeHTML(displayLocation)}</p>
          <p class="property-price">${formatPrice(property)}</p>
          <div class="property-meta">${property.bedrooms ? `<span><i data-lucide="bed-double"></i>${property.bedrooms} Beds</span>` : ''}${property.bathrooms ? `<span><i data-lucide="bath"></i>${property.bathrooms} Baths</span>` : ''}<span><i data-lucide="maximize"></i>${escapeHTML(property.area)} m²</span></div>
        </div>
      </article>`;
  };

  const updateFavoriteUI = () => {
    const favorites = getFavorites();
    if (favoriteCount) favoriteCount.textContent = String(favorites.length);
    document.querySelectorAll('.property-card').forEach((card) => {
      const button = card.querySelector('.favorite-button');
      const active = favorites.includes(Number(card.dataset.propertyId));
      button?.classList.toggle('active', active);
      button?.setAttribute('aria-pressed', String(active));
      button?.setAttribute('aria-label', `${active ? 'Remove from' : 'Add to'} favorites`);
    });
  };

  if (grid) {
    grid.innerHTML = properties.filter((property) => property.featured || property.exclusive).slice(0, 6).map((property) => propertyCard(property, getFavorites())).join('');
    grid.addEventListener('click', (event) => {
      const button = event.target.closest('.favorite-button');
      if (!button) return;
      const card = button.closest('.property-card');
      const id = Number(card?.dataset.propertyId);
      const favorites = getFavorites();
      const isSaved = favorites.includes(id);
      const updated = isSaved ? favorites.filter((item) => item !== id) : [...favorites, id];
      saveFavorites(updated);
      updateFavoriteUI();
      window.Tabanji?.showToast(isSaved ? 'Property removed from favorites.' : 'Property added to favorites.');
    });
  }
  updateFavoriteUI();

  const searchForm = document.getElementById('property-search');
  let searchMode = 'Buy';
  searchForm?.querySelectorAll('[data-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      searchMode = button.dataset.mode;
      searchForm.querySelectorAll('[data-mode]').forEach((item) => item.classList.toggle('active', item === button));
    });
  });

  searchForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const filters = Object.fromEntries(new FormData(searchForm).entries());
    const query = new URLSearchParams({ operation: searchMode.toLowerCase() });
    Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, value); });
    window.location.href = `properties.html?${query}`;
  });

  const moreFilters = document.querySelector('.more-filters');
  const mobileFilters = document.getElementById('mobile-filters');
  moreFilters?.addEventListener('click', () => {
    const open = mobileFilters.classList.toggle('open');
    moreFilters.setAttribute('aria-expanded', String(open));
    moreFilters.firstChild.textContent = open ? 'Fewer Filters ' : 'More Filters ';
  });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealItems = document.querySelectorAll('.reveal');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver((entries, instance) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); instance.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px' });
    revealItems.forEach((item) => observer.observe(item));
  }

  window.addEventListener('load', () => { if (window.lucide) window.lucide.createIcons(); });
  document.addEventListener('tabanji:languagechange', () => {
    if (!grid) return;
    grid.innerHTML = properties.filter((property) => property.featured || property.exclusive).slice(0, 6).map((property) => propertyCard(property, getFavorites())).join('');
    updateFavoriteUI();
    if (window.lucide) window.lucide.createIcons();
  });
  window.addEventListener('storage', (event) => { if (event.key === storageKey) updateFavoriteUI(); });
})();
