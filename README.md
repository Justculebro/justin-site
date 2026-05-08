# kwharrison13.com

Personal site for Justin Culebro. Built with [Astro](https://astro.build), deployed to [Vercel](https://vercel.com).

Inspired by [sj.land](https://sj.land) — a productivity-app-style personal site with sidebar navigation, keyboard shortcuts, and instant page switching.

## Setup

1. Install dependencies: `npm install`
2. Run locally: `npm run dev`
3. Build: `npm run build`

Vercel auto-deploys on every push to `main`.

---

## Features

- **Sidebar navigation** with keyboard shortcuts (press 1–9, 0, / to jump between pages)
- **Light / Dark / Auto theme** with persistence via localStorage
- **Contact modal** (press `/`) — overlays without losing context
- **Content collections** — essays live as markdown files, books as JSON
- **Mobile responsive** — sidebar collapses to hamburger menu

---

## How to Update Content

All content lives in `src/content/`. You don't need to touch any code to add new content.

### Adding an Essay

Create a new file in `src/content/essays/` named `your-essay-slug.md`:

```markdown
---
title: "Your Essay Title"
date: "2025-06-01"
tag: "Venture"
excerpt: "One sentence summary shown on the listing page and homepage."
---

Your essay content in markdown here.
```

### Adding a Book

Edit `src/content/books/books.json` and add an entry:

```json
{
  "title": "Book Title",
  "author": "Author Name"
}
```

### Adding a Resource Page

The resource pages (Music, Videos, Podcasts, Learning) are currently placeholders. To populate them, edit the corresponding file in `src/pages/` (e.g., `src/pages/music.astro`).

---

## Project Structure

```
src/
├── components/
│   ├── Sidebar.astro          # App-style sidebar nav
│   ├── ContactModal.astro     # Modal contact form
│   └── PlaceholderPage.astro  # Template for stub pages
├── content/
│   ├── config.ts              # Content collection schemas
│   ├── essays/                # Markdown essay files
│   └── books/
│       └── books.json         # Bookshelf data
├── layouts/
│   └── BaseLayout.astro       # App shell (sidebar + main + scripts)
├── pages/
│   ├── index.astro            # Home
│   ├── about.astro            # About
│   ├── essays/
│   │   ├── index.astro        # Essay listing
│   │   └── [slug].astro       # Individual essay
│   ├── portfolio.astro        # Portfolio Ideas
│   ├── bookshelf.astro        # Bookshelf
│   ├── music.astro            # Placeholder
│   ├── videos.astro           # Placeholder
│   ├── podcasts.astro         # Placeholder
│   └── learning.astro         # Placeholder
└── styles/
    └── global.css             # All styles + theme variables
```
