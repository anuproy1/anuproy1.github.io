const contentRoot = document.getElementById('siteContent');
const brand = document.getElementById('brand');
const siteNav = document.getElementById('siteNav');
const siteFooter = document.getElementById('siteFooter');
const themeToggle = document.getElementById('themeToggle');
const menuToggle = document.getElementById('menuToggle');
const searchToggle = document.getElementById('searchToggle');
const searchPanel = document.getElementById('searchPanel');
const searchInput = document.getElementById('siteSearch');
const searchClose = document.getElementById('searchClose');
const searchResults = document.getElementById('searchResults');

const layoutRenderers = {
  text: renderTextSection,
  chips: renderChipsSection,
  cards: renderCardsSection,
  publications: renderPublicationsSection,
  projects: renderProjectsSection,
  posts: renderPostsSection,
  contact: renderContactSection
};

init();

async function init() {
  try {
    const data = await loadContent();
    renderSite(data);
    setupTheme(data.site?.defaultTheme || 'light');
    setupMenu();
    setupSearch(data);
  } catch (error) {
    console.error(error);
    contentRoot.innerHTML = `
      <section class="error-state">
        <h1>Content could not be loaded</h1>
        <p>Run this site through a local web server or GitHub Pages, and confirm that <code>content.json</code> contains valid JSON.</p>
      </section>
    `;
  }
}

async function loadContent() {
  const previewData = new URLSearchParams(window.location.search).get('preview') === '1'
    ? localStorage.getItem('portfolioPreviewContent')
    : null;

  if (previewData) return JSON.parse(previewData);

  const response = await fetch('content.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to load content.json: ${response.status}`);
  return response.json();
}

function renderSite(data) {
  const site = data.site || {};
  const hero = data.hero || {};
  const sections = Array.isArray(data.sections) ? data.sections.filter(section => section.enabled !== false) : [];
  const featuredIds = new Set(Array.isArray(site.heroSectionIds) ? site.heroSectionIds : []);
  const heroSections = sections.filter(section => featuredIds.has(section.id));
  const mainSections = sections.filter(section => !featuredIds.has(section.id));

  document.title = site.title || 'Portfolio';
  brand.textContent = site.brand || hero.name || 'Portfolio';
  brand.href = `#${safeId(hero.id || 'home')}`;
  siteFooter.textContent = site.footer || '';

  renderNavigation(hero, sections);
  contentRoot.replaceChildren(renderHero(hero, heroSections), ...mainSections.map(renderSection));
}

function renderNavigation(hero, sections) {
  const links = [];
  if (hero.navLabel) links.push({ id: hero.id || 'home', label: hero.navLabel });
  sections.forEach(section => {
    if (section.navLabel) links.push({ id: section.id, label: section.navLabel });
  });

  siteNav.innerHTML = links.map(link => `
    <a href="#${safeId(link.id)}">${escapeHtml(link.label)}</a>
  `).join('');
}

function renderHero(hero, featuredSections) {
  const section = createElement('section', 'hero');
  section.id = safeId(hero.id || 'home');
  section.innerHTML = `
    <div class="profile-card">
      ${renderAvatar(hero)}
      <h1>${escapeHtml(hero.name || '')}</h1>
      ${hero.pronouns ? `<p class="pronouns">${escapeHtml(hero.pronouns)}</p>` : ''}
      ${hero.headline ? `<h2>${escapeHtml(hero.headline)}</h2>` : ''}
      ${hero.affiliation ? `<p class="affiliation">${escapeHtml(hero.affiliation)}</p>` : ''}
      ${hero.location ? `<p class="location">${escapeHtml(hero.location)}</p>` : ''}
      <div class="socials">${renderLinkList(hero.socialLinks)}</div>
    </div>
    <div class="hero-content">
      <div class="summary">
        ${renderTitleRow(hero.summaryTitle || 'Professional Summary', 'summary')}
        <p>${escapeHtml(hero.summary || '')}</p>
        ${hero.resumeUrl ? renderButtonLink(hero.resumeUrl, hero.resumeLabel || 'Download Resume') : ''}
      </div>
      <div class="hero-features"></div>
    </div>
  `;

  const featureRoot = section.querySelector('.hero-features');
  featuredSections.forEach(feature => {
    const block = createElement('section', `hero-feature hero-feature-${safeClass(feature.layout)}`);
    block.id = safeId(feature.id);
    block.append(createTitleRow(feature.title, feature.id || feature.layout), layoutRenderers[feature.layout]?.(feature) || renderTextSection(feature));
    featureRoot.append(block);
  });
  return section;
}

function renderAvatar(hero) {
  if (hero.imageUrl) {
    return `<div class="avatar"><img src="${safeUrl(hero.imageUrl)}" alt="${escapeAttribute(hero.name || 'Profile portrait')}"></div>`;
  }
  return `<div class="avatar avatar-fallback" aria-label="Profile initials">${escapeHtml(hero.avatarText || initials(hero.name))}</div>`;
}

function renderSection(sectionData) {
  const renderer = layoutRenderers[sectionData.layout] || renderTextSection;
  const section = createElement('section', `content-section layout-${safeClass(sectionData.layout || 'text')}`);
  section.id = safeId(sectionData.id || sectionData.title);

  const header = createElement('div', 'section-heading');
  header.innerHTML = `
    ${sectionData.kicker ? `<p class="eyebrow">${escapeHtml(sectionData.kicker)}</p>` : ''}
    ${renderTitleRow(sectionData.title || 'Untitled Section', sectionData.id || sectionData.layout)}
    ${sectionData.description ? `<p>${escapeHtml(sectionData.description)}</p>` : ''}
  `;
  section.append(header, renderer(sectionData));
  return section;
}

function renderTextSection(section) {
  const wrapper = createElement('div', 'text-content');
  const paragraphs = Array.isArray(section.paragraphs) ? section.paragraphs : [];
  wrapper.innerHTML = paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('');
  return wrapper;
}

function renderChipsSection(section) {
  const wrapper = createElement('div', 'chips');
  wrapper.innerHTML = getItems(section).map(item => `<span>${escapeHtml(item)}</span>`).join('');
  return wrapper;
}

function renderCardsSection(section) {
  const wrapper = createElement('div', 'cards');
  wrapper.innerHTML = getItems(section).map(item => `
    <article class="mini-card">
      <span class="card-icon" aria-hidden="true">${sectionIcon(section.id || 'cards')}</span>
      <div class="mini-card-content">
        <h3>${escapeHtml(item.title || '')}</h3>
        ${item.period ? `<p class="card-period">${escapeHtml(item.period)}</p>` : ''}
        ${item.subtitle ? `<p class="card-subtitle">${escapeHtml(item.subtitle)}</p>` : ''}
        ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
        ${renderBulletList(item.details)}
        ${item.url ? renderTextLink(item.url, item.linkLabel || 'Learn more') : ''}
      </div>
    </article>
  `).join('');
  return wrapper;
}

function renderPublicationsSection(section) {
  const wrapper = createElement('div', 'paper-list editorial-grid');
  wrapper.innerHTML = getItems(section).map((item, index) => `
    <article class="editorial-card publication-card">
      ${renderMedia(item, item.category || item.venue || 'Publication', index)}
      <div class="editorial-body">
        ${item.category ? `<span class="tag">${escapeHtml(item.category)}</span>` : ''}
        <h3>${escapeHtml(item.title || '')}</h3>
        ${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ''}
        <div class="card-meta">
          <span>${escapeHtml(item.authors || '')}</span>
          <span>${escapeHtml([item.venue, item.year].filter(Boolean).join(', '))}</span>
          ${item.readTime ? `<span>${escapeHtml(item.readTime)}</span>` : ''}
        </div>
        ${item.url ? renderTextLink(item.url, 'Read more') : ''}
      </div>
    </article>
  `).join('');
  return wrapper;
}

function renderProjectsSection(section) {
  const wrapper = createElement('div', 'project-grid editorial-grid');
  wrapper.innerHTML = getItems(section).map((item, index) => `
    <article class="editorial-card project-card">
      ${renderMedia(item, item.visual || 'Project', index)}
      <div class="editorial-body">
        ${item.category ? `<span class="tag">${escapeHtml(item.category)}</span>` : ''}
        <h3>${escapeHtml(item.title || '')}</h3>
        <p>${escapeHtml(item.summary || '')}</p>
        ${item.url ? renderTextLink(item.url, item.linkLabel || 'View project') : ''}
      </div>
    </article>
  `).join('');
  return wrapper;
}

function renderPostsSection(section) {
  const wrapper = createElement('div', 'post-grid');
  wrapper.innerHTML = getItems(section).map((item, index) => `
    <article class="editorial-card post-card">
      ${renderMedia(item, item.category || 'Post', index)}
      <div class="editorial-body">
        ${item.category ? `<span class="tag">${escapeHtml(item.category)}</span>` : ''}
        <h3>${escapeHtml(item.title || '')}</h3>
        <p>${escapeHtml(item.summary || '')}</p>
        <div class="card-meta">
          <span>${escapeHtml(item.date || '')}</span>
          ${item.readTime ? `<span>${escapeHtml(item.readTime)}</span>` : ''}
        </div>
        ${item.url ? renderTextLink(item.url, item.linkLabel || 'Read more') : ''}
      </div>
    </article>
  `).join('');
  return wrapper;
}

function renderMedia(item, fallback, index) {
  if (item.imageUrl) {
    return `<div class="editorial-media"><img src="${safeUrl(item.imageUrl)}" alt="${escapeAttribute(item.title || fallback)}" loading="lazy"></div>`;
  }
  return `<div class="editorial-media media-placeholder media-tone-${index % 4}"><span>${escapeHtml(fallback)}</span></div>`;
}

function renderContactSection(section) {
  const wrapper = createElement('div', 'contact-list');
  wrapper.innerHTML = getItems(section).map(item => `
    <div class="contact-item">
      <span>${escapeHtml(item.label || '')}</span>
      ${item.url
        ? `<a href="${safeUrl(item.url)}"${externalAttributes(item.url)}>${escapeHtml(item.value || item.url)}</a>`
        : `<strong>${escapeHtml(item.value || '')}</strong>`}
    </div>
  `).join('');
  return wrapper;
}

function renderLinkList(links) {
  if (!Array.isArray(links)) return '';
  return links.filter(link => link.label && link.url).map(link => `
    <a href="${safeUrl(link.url)}"${externalAttributes(link.url)} aria-label="${escapeAttribute(link.label)}" title="${escapeAttribute(link.label)}">
      ${escapeHtml(socialMark(link.label))}
    </a>
  `).join('');
}

function renderButtonLink(url, label) {
  return `<a class="btn" href="${safeUrl(url)}"${externalAttributes(url)}>${escapeHtml(label)}</a>`;
}

function renderTextLink(url, label) {
  return `<a class="text-link" href="${safeUrl(url)}"${externalAttributes(url)}>${escapeHtml(label)} <span aria-hidden="true">-&gt;</span></a>`;
}

function renderBulletList(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderTitleRow(title, iconKey) {
  return `<div class="title-row"><span class="section-icon" aria-hidden="true">${sectionIcon(iconKey)}</span><h2>${escapeHtml(title)}</h2></div>`;
}

function createTitleRow(title, iconKey) {
  const wrapper = createElement('div', 'title-row');
  wrapper.innerHTML = `<span class="section-icon" aria-hidden="true">${sectionIcon(iconKey)}</span><h2>${escapeHtml(title)}</h2>`;
  return wrapper;
}

function sectionIcon(key = '') {
  const normalized = String(key).toLowerCase();
  if (normalized.includes('education')) return '<svg viewBox="0 0 24 24"><path d="m3 9 9-5 9 5-9 5-9-5Z"></path><path d="M7 12v4c3 2 7 2 10 0v-4"></path></svg>';
  if (normalized.includes('interest')) return '<svg viewBox="0 0 24 24"><path d="m12 2 1.2 4.2L17 8l-3.8 1.8L12 14l-1.2-4.2L7 8l3.8-1.8L12 2Z"></path><path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z"></path></svg>';
  if (normalized.includes('research') || normalized.includes('publication')) return '<svg viewBox="0 0 24 24"><path d="M6 4h12v16H6z"></path><path d="M9 8h6M9 12h6M9 16h4"></path></svg>';
  if (normalized.includes('experience')) return '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M8 7V4h8v3M3 12h18"></path></svg>';
  if (normalized.includes('project')) return '<svg viewBox="0 0 24 24"><path d="M4 5h7l2 2h7v12H4z"></path><path d="m9 15 2-2-2-2M13 15h3"></path></svg>';
  if (normalized.includes('post')) return '<svg viewBox="0 0 24 24"><path d="M5 3h14v18H5z"></path><path d="M8 7h8M8 11h8M8 15h5"></path></svg>';
  if (normalized.includes('contact')) return '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m4 7 8 6 8-6"></path></svg>';
  return '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"></rect><circle cx="9" cy="10" r="2"></circle><path d="M7 15h10M14 9h3M14 12h3"></path></svg>';
}

function setupSearch(data) {
  const records = buildSearchRecords(data);
  searchToggle.addEventListener('click', () => {
    searchPanel.hidden = !searchPanel.hidden;
    if (!searchPanel.hidden) searchInput.focus();
  });
  searchClose.addEventListener('click', closeSearch);
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
      searchResults.replaceChildren();
      return;
    }
    const matches = records.filter(record => record.text.includes(query)).slice(0, 8);
    searchResults.innerHTML = matches.length
      ? matches.map(record => `<a href="#${safeId(record.id)}">${escapeHtml(record.title)}</a>`).join('')
      : '<p>No matching section found.</p>';
  });
  searchResults.addEventListener('click', event => {
    if (event.target.matches('a')) closeSearch();
  });
}

function buildSearchRecords(data) {
  const hero = data.hero || {};
  const records = [{ id: hero.id || 'home', title: hero.name || 'Home', text: JSON.stringify(hero).toLowerCase() }];
  (data.sections || []).forEach(section => records.push({
    id: section.id,
    title: section.title,
    text: JSON.stringify(section).toLowerCase()
  }));
  return records;
}

function closeSearch() {
  searchPanel.hidden = true;
  searchInput.value = '';
  searchResults.replaceChildren();
}

function setupTheme(defaultTheme) {
  applyTheme(localStorage.getItem('portfolioTheme') || defaultTheme);
  themeToggle.addEventListener('click', () => {
    const nextTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
    localStorage.setItem('portfolioTheme', nextTheme);
    applyTheme(nextTheme);
  });
}

function applyTheme(theme) {
  const dark = theme === 'dark';
  document.body.classList.toggle('dark', dark);
  themeToggle.textContent = dark ? 'Light' : 'Theme';
}

function setupMenu() {
  menuToggle.addEventListener('click', () => {
    const open = siteNav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
  });
  siteNav.addEventListener('click', event => {
    if (event.target.matches('a')) {
      siteNav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

function getItems(section) {
  return Array.isArray(section.items) ? section.items : [];
}

function createElement(tag, className) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  return element;
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 3).map(part => part[0]).join('').toUpperCase();
}

function socialMark(label = '') {
  const marks = { Email: '@', GitHub: 'GH', LinkedIn: 'in', Scholar: 'GS' };
  return marks[label] || label.slice(0, 2);
}

function safeId(value = '') {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
}

function safeClass(value = '') {
  return String(value).replace(/[^a-z0-9_-]/gi, '') || 'default';
}

function safeUrl(value = '') {
  const url = String(value).trim();
  if (/^(https?:|mailto:|tel:)/i.test(url) || /^[./#]/.test(url) || /^[\w-]+\//.test(url)) return escapeAttribute(url);
  return '#';
}

function externalAttributes(url = '') {
  return /^https?:/i.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '';
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value = '') {
  return escapeHtml(value).replaceAll('`', '&#096;');
}
