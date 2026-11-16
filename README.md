# Frame — Website template inspiration

A responsive, original template discovery frontend inspired by a stock-image search experience. Built with HTML, CSS, and vanilla JavaScript. No installation or build step required.

## Features
- 12 original SVG template previews; no external stock-photo licenses required
- Live search, category and minimal-style filters, sorting, and empty state
- Favorites stored locally in your browser
- Accessible detail dialogs and downloadable SVG previews
- Responsive desktop and mobile layouts

This is a frontend demonstration. It does not include accounts, payments, uploads, a production stock catalog, or downloadable full website templates. Google Fonts is optional; local font fallbacks work offline.

## Preview
Open index.html in a browser, or run `python3 -m http.server 8000` in this directory and visit http://localhost:8000.

## Publish on GitHub Pages
1. Create a GitHub repository and upload this entire folder, including .github/workflows/pages.yml, to the main branch.
2. In repository Settings → Pages → Build and deployment, select GitHub Actions.
3. Run the Deploy to GitHub Pages workflow (or push a commit to main).
4. Open the deployment URL shown by the workflow.

All asset links are relative, so repository subpath hosting works.

## Customize
Edit templates in app.js, branding and copy in index.html, and colors/layout in style.css.
