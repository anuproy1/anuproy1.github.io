const editor = document.getElementById('editor');
const statusMessage = document.getElementById('statusMessage');
const openButton = document.getElementById('openButton');
const saveButton = document.getElementById('saveButton');
const downloadButton = document.getElementById('downloadButton');
const copyButton = document.getElementById('copyButton');
const previewButton = document.getElementById('previewButton');

let content = null;
let contentFileHandle = null;

const sectionTemplates = {
  text: {
    id: 'new-text-section',
    title: 'New Text Section',
    navLabel: 'New Section',
    layout: 'text',
    enabled: true,
    paragraphs: ['Add your text here.']
  },
  chips: {
    id: 'new-interests-section',
    title: 'New Interests Section',
    navLabel: 'Interests',
    layout: 'chips',
    enabled: true,
    items: ['New interest']
  },
  cards: {
    id: 'new-card-section',
    title: 'New Card Section',
    navLabel: 'New Section',
    layout: 'cards',
    enabled: true,
    items: [blankItemForLayout('cards')]
  },
  publications: {
    id: 'new-publications-section',
    title: 'New Publications Section',
    navLabel: 'Publications',
    layout: 'publications',
    enabled: true,
    items: [blankItemForLayout('publications')]
  },
  projects: {
    id: 'new-projects-section',
    title: 'New Projects Section',
    navLabel: 'Projects',
    layout: 'projects',
    enabled: true,
    items: [blankItemForLayout('projects')]
  },
  posts: {
    id: 'new-posts-section',
    title: 'New Posts Section',
    navLabel: 'Posts',
    layout: 'posts',
    enabled: true,
    description: 'Add a short section description.',
    items: [blankItemForLayout('posts')]
  },
  contact: {
    id: 'new-contact-section',
    title: 'New Contact Section',
    navLabel: 'Contact',
    layout: 'contact',
    enabled: true,
    items: [blankItemForLayout('contact')]
  }
};

init();

async function init() {
  bindToolbar();
  try {
    const response = await fetch('content.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    content = await response.json();
    validateContent(content);
    renderEditor();
    setStatus('Content loaded. Changes stay in this browser until you save or download the JSON file.');
  } catch (error) {
    console.error(error);
    setStatus('Could not load content.json. Open this folder through a local web server, then reload.', true);
  }
}

function bindToolbar() {
  openButton.addEventListener('click', openContentFile);
  saveButton.addEventListener('click', saveContentFile);
  downloadButton.addEventListener('click', downloadContentFile);
  copyButton.addEventListener('click', copyContentFile);
  previewButton.addEventListener('click', previewContent);
}

function renderEditor() {
  editor.replaceChildren();
  editor.append(
    renderObjectPanel('Site settings', content.site, ['site']),
    renderObjectPanel('Profile and summary', content.hero, ['hero'])
  );

  content.sections.forEach((section, index) => {
    editor.append(renderSectionPanel(section, index));
  });

  editor.append(renderAddSectionPanel());
}

function renderObjectPanel(title, object, path) {
  const panel = element('section', 'editor-panel');
  const header = element('div', 'panel-header');
  header.innerHTML = `<h2>${escapeHtml(title)}</h2>`;
  const fields = element('div', 'fields');
  renderObjectFields(fields, object, path);
  panel.append(header, fields);
  return panel;
}

function renderSectionPanel(section, index) {
  const panel = element('section', 'section-panel');
  const header = element('div', 'section-header');
  const titleGroup = document.createElement('div');
  titleGroup.innerHTML = `
    <div class="section-meta">${escapeHtml(section.layout)} layout</div>
    <h2>${escapeHtml(section.title || `Section ${index + 1}`)}</h2>
  `;

  const controls = element('div', 'button-row');
  controls.append(
    actionButton('Move up', 'muted-button', () => moveSection(index, -1), index === 0),
    actionButton('Move down', 'muted-button', () => moveSection(index, 1), index === content.sections.length - 1),
    actionButton('Delete section', 'danger-button', () => deleteSection(index))
  );
  header.append(titleGroup, controls);

  const fields = element('div', 'fields');
  renderObjectFields(fields, section, ['sections', index]);
  panel.append(header, fields);
  return panel;
}

function renderObjectFields(container, object, path) {
  Object.entries(object).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      container.append(renderArrayField(key, value, [...path, key]));
      return;
    }

    if (value && typeof value === 'object') {
      container.append(renderObjectField(key, value, [...path, key]));
      return;
    }

    container.append(renderPrimitiveField(key, value, [...path, key]));
  });
}

function renderPrimitiveField(key, value, path) {
  const label = element('label', `field${isWideField(key) ? ' wide' : ''}${typeof value === 'boolean' ? ' checkbox-field' : ''}`);
  const labelText = document.createElement('span');
  labelText.textContent = formatLabel(key);

  if (typeof value === 'boolean') {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = value;
    input.addEventListener('change', () => setAtPath(path, input.checked));
    label.append(input, labelText);
    return label;
  }

  const input = isLongField(key)
    ? document.createElement('textarea')
    : document.createElement('input');

  if (input.tagName === 'INPUT') {
    input.type = key.toLowerCase().includes('url') ? 'url' : 'text';
  }
  input.value = value ?? '';
  if (key === 'layout') {
    input.readOnly = true;
    input.title = 'Choose a section layout when adding a new section.';
  }
  input.addEventListener('input', () => {
    setAtPath(path, input.value);
    if (key === 'title' && path[0] === 'sections') {
      const heading = input.closest('.section-panel')?.querySelector('.section-header h2');
      if (heading) heading.textContent = input.value || 'Untitled Section';
    }
  });
  label.append(labelText, input);
  return label;
}

function renderObjectField(key, object, path) {
  const fieldset = element('fieldset', 'object-field');
  const legend = document.createElement('legend');
  legend.textContent = formatLabel(key);
  const fields = element('div', 'fields');
  renderObjectFields(fields, object, path);
  fieldset.append(legend, fields);
  return fieldset;
}

function renderArrayField(key, array, path) {
  const wrapper = element('div', 'array-field');
  const header = element('div', 'array-header');
  const label = document.createElement('span');
  label.textContent = `${formatLabel(key)} (${array.length})`;
  header.append(label, actionButton('Add item', 'muted-button', () => addArrayItem(path)));

  const items = element('div', 'array-items');
  if (array.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No items yet. Use Add item to create one.';
    items.append(empty);
  }

  array.forEach((item, index) => {
    items.append(typeof item === 'object' && item !== null
      ? renderObjectArrayItem(item, index, path)
      : renderPrimitiveArrayItem(item, index, path));
  });

  wrapper.append(header, items);
  return wrapper;
}

function renderObjectArrayItem(item, index, path) {
  const wrapper = element('div', 'array-item');
  const header = element('div', 'item-header');
  const title = document.createElement('strong');
  title.textContent = item.title || item.label || `Item ${index + 1}`;
  const controls = element('div', 'button-row');
  controls.append(
    actionButton('Up', 'muted-button', () => moveArrayItem(path, index, -1), index === 0),
    actionButton('Down', 'muted-button', () => moveArrayItem(path, index, 1), index === getAtPath(path).length - 1),
    actionButton('Remove', 'danger-button', () => removeArrayItem(path, index))
  );
  header.append(title, controls);

  const fields = element('div', 'fields');
  renderObjectFields(fields, item, [...path, index]);
  wrapper.append(header, fields);
  return wrapper;
}

function renderPrimitiveArrayItem(item, index, path) {
  const row = element('div', 'primitive-row');
  const input = document.createElement('input');
  input.type = 'text';
  input.value = item ?? '';
  input.setAttribute('aria-label', `Item ${index + 1}`);
  input.addEventListener('input', () => setAtPath([...path, index], input.value));
  row.append(input, actionButton('Remove', 'danger-button', () => removeArrayItem(path, index)));
  return row;
}

function renderAddSectionPanel() {
  const panel = element('section', 'add-section');
  const textGroup = document.createElement('div');
  textGroup.innerHTML = '<h2>Add a new section</h2><span class="section-meta">Choose a reusable layout</span>';

  const controls = element('div', 'add-section-controls');
  const select = document.createElement('select');
  Object.keys(sectionTemplates).forEach(layout => {
    const option = document.createElement('option');
    option.value = layout;
    option.textContent = formatLabel(layout);
    select.append(option);
  });
  controls.append(select, actionButton('Add section', '', () => addSection(select.value)));
  panel.append(textGroup, controls);
  return panel;
}

function addSection(layout) {
  const section = structuredCloneSafe(sectionTemplates[layout]);
  section.id = uniqueSectionId(section.id);
  content.sections.push(section);
  renderEditor();
  setStatus(`${section.title} added. Edit its fields, then preview or save.`);
  document.querySelectorAll('.section-panel')[content.sections.length - 1]?.scrollIntoView({ behavior: 'smooth' });
}

function deleteSection(index) {
  const section = content.sections[index];
  if (!window.confirm(`Delete "${section.title}" and all of its items?`)) return;
  content.sections.splice(index, 1);
  renderEditor();
  setStatus('Section deleted. Save the JSON file to publish this change.');
}

function moveSection(index, direction) {
  const destination = index + direction;
  if (destination < 0 || destination >= content.sections.length) return;
  [content.sections[index], content.sections[destination]] = [content.sections[destination], content.sections[index]];
  renderEditor();
}

function addArrayItem(path) {
  const array = getAtPath(path);
  array.push(newArrayItem(path, array));
  renderEditor();
}

function removeArrayItem(path, index) {
  getAtPath(path).splice(index, 1);
  renderEditor();
}

function moveArrayItem(path, index, direction) {
  const array = getAtPath(path);
  const destination = index + direction;
  if (destination < 0 || destination >= array.length) return;
  [array[index], array[destination]] = [array[destination], array[index]];
  renderEditor();
}

function newArrayItem(path, array) {
  if (array.length) return blankShape(array[0]);
  const key = path.at(-1);
  if (key === 'paragraphs' || key === 'details') return '';
  if (key === 'socialLinks') return { label: '', url: '' };
  if (key === 'items' && path[0] === 'sections') {
    return blankItemForLayout(content.sections[path[1]].layout);
  }
  return '';
}

function blankItemForLayout(layout) {
  const templates = {
    cards: { title: '', subtitle: '', period: '', description: '', details: [] },
    publications: { imageUrl: '', category: '', authors: '', title: '', summary: '', venue: '', year: '', readTime: '', url: '' },
    projects: { imageUrl: '', visual: 'PROJECT', category: '', title: '', summary: '', linkLabel: 'View project', url: '' },
    posts: { imageUrl: '', title: '', date: '', category: '', summary: '', readTime: '', linkLabel: 'Read more', url: '' },
    contact: { label: '', value: '', url: '' },
    chips: ''
  };
  return structuredCloneSafe(templates[layout] ?? { title: '', description: '' });
}

function blankShape(value) {
  if (Array.isArray(value)) return [];
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, blankShape(child)]));
  }
  if (typeof value === 'boolean') return true;
  return '';
}

async function openContentFile() {
  if (!window.showOpenFilePicker) {
    setStatus('Direct file opening is not supported in this browser. Use Download JSON instead.', true);
    return;
  }

  try {
    [contentFileHandle] = await window.showOpenFilePicker({
      types: [{ description: 'JSON files', accept: { 'application/json': ['.json'] } }],
      multiple: false
    });
    const file = await contentFileHandle.getFile();
    const parsed = JSON.parse(await file.text());
    validateContent(parsed);
    content = parsed;
    renderEditor();
    setStatus(`${file.name} opened. Save will write back to this selected file.`);
  } catch (error) {
    if (error.name !== 'AbortError') setStatus(`Could not open the file: ${error.message}`, true);
  }
}

async function saveContentFile() {
  if (!content) return;
  try {
    validateContent(content);
    if (!contentFileHandle) {
      if (!window.showSaveFilePicker) {
        downloadContentFile();
        return;
      }
      contentFileHandle = await window.showSaveFilePicker({
        suggestedName: 'content.json',
        types: [{ description: 'JSON files', accept: { 'application/json': ['.json'] } }]
      });
    }
    const writable = await contentFileHandle.createWritable();
    await writable.write(jsonText());
    await writable.close();
    setStatus('content.json saved. Commit and push it to publish the changes.');
  } catch (error) {
    if (error.name !== 'AbortError') setStatus(`Could not save the file: ${error.message}`, true);
  }
}

function downloadContentFile() {
  if (!content) return;
  try {
    validateContent(content);
    const blob = new Blob([jsonText()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'content.json';
    link.click();
    URL.revokeObjectURL(url);
    setStatus('content.json downloaded. Replace the project copy with this file to publish.');
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function copyContentFile() {
  if (!content) return;
  try {
    validateContent(content);
    await navigator.clipboard.writeText(jsonText());
    setStatus('JSON copied to the clipboard.');
  } catch (error) {
    setStatus(`Could not copy JSON: ${error.message}`, true);
  }
}

function previewContent() {
  if (!content) return;
  try {
    validateContent(content);
    localStorage.setItem('portfolioPreviewContent', JSON.stringify(content));
    window.open('index.html?preview=1', '_blank', 'noopener');
    setStatus('Preview opened in a new tab. It uses the current unsaved editor content.');
  } catch (error) {
    setStatus(error.message, true);
  }
}

function validateContent(value) {
  if (!value || typeof value !== 'object') throw new Error('The content must be a JSON object.');
  if (!value.site || !value.hero || !Array.isArray(value.sections)) {
    throw new Error('The JSON must include site, hero, and sections data.');
  }
  const ids = value.sections.map(section => section.id).filter(Boolean);
  if (new Set(ids).size !== ids.length) throw new Error('Every section ID must be unique.');
  value.sections.forEach(section => {
    if (!section.id || !section.title || !section.layout) {
      throw new Error('Every section needs an ID, title, and layout.');
    }
  });
}

function uniqueSectionId(base) {
  const existing = new Set(content.sections.map(section => section.id));
  if (!existing.has(base)) return base;
  let number = 2;
  while (existing.has(`${base}-${number}`)) number += 1;
  return `${base}-${number}`;
}

function getAtPath(path) {
  return path.reduce((current, key) => current[key], content);
}

function setAtPath(path, value) {
  const parent = path.slice(0, -1).reduce((current, key) => current[key], content);
  parent[path.at(-1)] = value;
}

function actionButton(label, className, onClick, disabled = false) {
  const button = element('button', `small-button ${className}`.trim());
  button.type = 'button';
  button.textContent = label;
  button.disabled = disabled;
  button.addEventListener('click', onClick);
  return button;
}

function element(tag, className = '') {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

function formatLabel(value) {
  return String(value)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/^./, character => character.toUpperCase());
}

function isLongField(key) {
  return ['summary', 'description', 'footer', 'authors', 'value'].includes(key);
}

function isWideField(key) {
  return isLongField(key) || ['headline', 'title', 'subtitle', 'url', 'resumeUrl', 'imageUrl'].includes(key);
}

function jsonText() {
  return `${JSON.stringify(content, null, 2)}\n`;
}

function structuredCloneSafe(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function setStatus(message, error = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle('error', error);
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
