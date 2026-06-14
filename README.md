# Dynamic Portfolio Website

This portfolio is designed for GitHub Pages. The page structure and styling stay in place while all visible content is loaded from `content.json`.

## Edit content visually

1. Serve this folder locally or open the deployed GitHub Pages website.
2. Open `admin.html`.
3. Edit the site settings, profile, sections, and section items.
4. Add, remove, or reorder items and complete sections.
5. Select **Preview changes** to check the unsaved version.
6. Select **Save JSON file** and choose this project's `content.json`, or download the file and replace the existing copy.
7. Commit and push `content.json` to publish the update.

The content manager does not need a database. Because GitHub Pages is a static host, it cannot write directly to the GitHub repository without a separate authentication service.

The resume button appears whenever `hero.resumeUrl` contains a valid file path or web URL.

## Run locally

Opening `index.html` directly as a `file://` URL can block JSON loading. Use the VS Code **Live Server** extension, GitHub Pages, or a local server. If Python is installed, run:

```powershell
python -m http.server 8000
```

Then open:

- Website: `http://localhost:8000/`
- Content manager: `http://localhost:8000/admin.html`

## Supported section layouts

- `text`: one or more paragraphs, suitable for research or an about section.
- `chips`: short labels, suitable for interests or skills.
- `cards`: repeatable education, experience, certification, or award cards.
- `publications`: authors, paper title, venue, year, and optional link.
- `projects`: visual label, category, title, summary, and project link.
- `posts`: dated updates with category, summary, and link.
- `contact`: labeled contact details and optional links.

Use **Add a new section** in `admin.html` to create any of these layouts. Navigation links are generated from each enabled section's `navLabel`.

## Example: add higher education

1. Open `admin.html`.
2. Find the Education section.
3. Under Items, select **Add item**.
4. Enter the degree, university, dates, CGPA, and optional details.
5. Preview and save `content.json`.

No changes to `index.html`, `script.js`, or `style.css` are required.

## GitHub Pages deployment

1. Push these files to your GitHub repository.
2. Open repository **Settings > Pages**.
3. Choose **Deploy from a branch**, then select `main` and `/ (root)`.
4. Replace the placeholder GitHub, LinkedIn, and Scholar links through `admin.html`.
