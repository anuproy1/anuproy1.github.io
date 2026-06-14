const contentRoot = document.getElementById('siteContent');
const brand = document.getElementById('brand');
const siteNav = document.getElementById('siteNav');
const siteFooter = document.getElementById('siteFooter');
const themeToggle = document.getElementById('themeToggle');
const menuToggle = document.getElementById('menuToggle');

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

  if (previewData) {
    return JSON.parse(previewData);
  }

  const response = await fetch('content.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Unable to load content.json: ${response.status}`);
  }
  return response.json();
}

function renderSite(data) {
  const site = data.site || {};
  const hero = data.hero || {};
  const sections = Array.isArray(data.sections) ? data.sections.filter(section => section.enabled !== false) : [];

  document.title = site.title || 'Portfolio';
  brand.textContent = site.brand || hero.name || 'Portfolio';
  brand.href = `#${safeId(hero.id || 'home')}`;
  siteFooter.textContent = site.footer || '';

  renderNavigation(hero, sections);
  contentRoot.replaceChildren(renderHero(hero), ...sections.map(renderSection));
}

function renderNavigation(hero, sections) {
  const links = [];
  if (hero.navLabel) {
    links.push({ id: hero.id || 'home', label: hero.navLabel });
  }

  sections.forEach(section => {
    if (section.navLabel) {
      links.push({ id: section.id, label: section.navLabel });
    }
  });

  siteNav.innerHTML = links.map(link => `
    <a href="#${safeId(link.id)}">${escapeHtml(link.label)}</a>
  `).join('');
}

function renderHero(hero) {
  const section = createElement('section', 'hero');
  section.id = safeId(hero.id || 'home');
  section.innerHTML = `
    <div class="profile-card reveal">
      <div class="avatar" aria-label="Profile initials">${escapeHtml(hero.avatarText || initials(hero.name))}</div>
      <h1>${escapeHtml(hero.name || '')}</h1>
      ${hero.location ? `<p class="pronoun">${escapeHtml(hero.location)}</p>` : ''}
      ${hero.headline ? `<h2>${escapeHtml(hero.headline)}</h2>` : ''}
      ${hero.affiliation ? `<p>${escapeHtml(hero.affiliation)}</p>` : ''}
      <div class="socials">${renderLinkList(hero.socialLinks)}</div>
    </div>
    <div class="summary reveal">
      <p class="eyebrow">About</p>
      <h2>${escapeHtml(hero.summaryTitle || 'Professional Summary')}</h2>
      <p>${escapeHtml(hero.summary || '')}</p>
      ${hero.resumeUrl ? renderButtonLink(hero.resumeUrl, hero.resumeLabel || 'Download Resume') : ''}
    </div>
  `;
  return section;
}

function renderSection(sectionData) {
  const renderer = layoutRenderers[sectionData.layout] || renderTextSection;
  const section = createElement('section', `content-section layout-${safeClass(sectionData.layout || 'text')}`);
  section.id = safeId(sectionData.id || sectionData.title);

  const header = createElement('div', 'section-heading');
  header.innerHTML = `
    ${sectionData.kicker ? `<p class="eyebrow">${escapeHtml(sectionData.kicker)}</p>` : ''}
    <h2>${escapeHtml(sectionData.title || 'Untitled Section')}</h2>
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
      <h3>${escapeHtml(item.title || '')}</h3>
      ${item.subtitle ? `<p class="card-subtitle">${escapeHtml(item.subtitle)}</p>` : ''}
      ${item.period ? `<p class="card-period">${escapeHtml(item.period)}</p>` : ''}
      ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
      ${renderBulletList(item.details)}
      ${item.url ? renderTextLink(item.url, item.linkLabel || 'Learn more') : ''}
    </article>
  `).join('');
  return wrapper;
}

function renderPublicationsSection(section) {
  const wrapper = createElement('div', 'paper-list');
  wrapper.innerHTML = getItems(section).map(item => `
    <article class="publication-card">
      <p class="publication-authors">${escapeHtml(item.authors || '')}</p>
      <h3>${item.url ? `<a href="${safeUrl(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title || '')}</a>` : escapeHtml(item.title || '')}</h3>
      <p>${escapeHtml([item.venue, item.year].filter(Boolean).join(', '))}</p>
    </article>
  `).join('');
  return wrapper;
}

function renderProjectsSection(section) {
  const wrapper = createElement('div', 'project-grid');
  wrapper.innerHTML = getItems(section).map(item => `
    <article class="project-card">
      <div class="project-img">${escapeHtml(item.visual || 'Project')}</div>
      <div class="project-body">
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
  wrapper.innerHTML = getItems(section).map(item => `
    <article class="post-card">
      ${item.category ? `<span class="tag">${escapeHtml(item.category)}</span>` : ''}
      <h3>${escapeHtml(item.title || '')}</h3>
      ${item.date ? `<p class="post-date">${escapeHtml(item.date)}</p>` : ''}
      <p>${escapeHtml(item.summary || '')}</p>
      ${item.url ? renderTextLink(item.url, item.linkLabel || 'Read more') : ''}
    </article>
  `).join('');
  return wrapper;
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
    <a href="${safeUrl(link.url)}"${externalAttributes(link.url)}>${escapeHtml(link.label)}</a>
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

function getItems(section) {
  return Array.isArray(section.items) ? section.items : [];
}

function createElement(tag, className) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  return element;
}

function setupTheme(defaultTheme) {
  const storedTheme = localStorage.getItem('portfolioTheme');
  applyTheme(storedTheme || defaultTheme);

  themeToggle.addEventListener('click', () => {
    const nextTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
    localStorage.setItem('portfolioTheme', nextTheme);
    applyTheme(nextTheme);
  });
}

function applyTheme(theme) {
  const dark = theme === 'dark';
  document.body.classList.toggle('dark', dark);
  themeToggle.textContent = dark ? 'Light' : 'Dark';
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

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 3).map(part => part[0]).join('').toUpperCase();
}

function safeId(value = '') {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
}

function safeClass(value = '') {
  return String(value).replace(/[^a-z0-9_-]/gi, '') || 'default';
}

function safeUrl(value = '') {
  const url = String(value).trim();
  if (/^(https?:|mailto:|tel:)/i.test(url) || /^[./#]/.test(url) || /^[\w-]+\//.test(url)) {
    return escapeAttribute(url);
  }
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
