import { useState, useEffect, useCallback, useRef } from "react";

// â”€â”€â”€ Theme & Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const THEMES = { light: "light", dark: "dark", auto: "auto" };

const NAV_SECTIONS = [
  {
    group: null,
    items: [
      { id: "home", label: "Home", icon: "â—‰", key: "1" },
      { id: "about", label: "About", icon: "âŠ•", key: "2" },
      { id: "essays", label: "Essays", icon: "âœŽ", key: "3" },
      { id: "portfolio", label: "Portfolio Ideas", icon: "â—ˆ", key: "4" },
      { id: "bookshelf", label: "Bookshelf", icon: "â–¤", key: "5" },
    ],
  },
  {
    group: "Resources",
    items: [
      { id: "music", label: "Music", icon: "â™«", key: "6" },
      { id: "videos", label: "Videos", icon: "â–¶", key: "7" },
      { id: "podcasts", label: "Podcasts", icon: "â—‰", key: "8" },
      { id: "learning", label: "Learning", icon: "âˆž", key: "9" },
    ],
  },
  {
    group: "Stay in touch",
    items: [
      { id: "contact", label: "Contact", icon: "âœ‰", key: "/" },
    ],
  },
];

const EXTERNAL_LINKS = [
  { label: "Newsletter", icon: "â†—", url: "https://investing1012dot0.substack.com/" },
  { label: "Twitter", icon: "â†—", url: "https://twitter.com/kwharrison13" },
  { label: "LinkedIn", icon: "â†—", url: "https://www.linkedin.com/in/kyle-harrison-9274b278/" },
];

const ESSAYS = [
  { tag: "Work 2024", title: "The Hardening of the Great Softening", excerpt: "For some reason, right around summertime each year I find myself reflecting on the nature of work and my relationship with it." },
  { tag: "Work 2024", title: "The Renaissance of Rise and Grind", excerpt: "In politics, there is this concept of a \"third rail.\" On a subway, there are two rails that the train runs on, and then the third rail is charged with electricity to power the trains." },
  { tag: "Work 2024", title: "Toil We Must", excerpt: "When I left home for the first time and was living on my own I started reflecting on my life growing up with my parents." },
  { tag: "Hall of Fame 2023", title: "The Rise of The Cash Man", excerpt: "I think it will surprise no one to find that the best place to start writing about a venture-backed Adam Neumann fever dream is with Disneyland." },
];

const PORTFOLIO_IDEAS = [
  { title: "Investing 101 2.0", desc: "The art of investing is taking finite resources (time, energy, money, attention) and employing them to optimize an outcome." },
  { title: "Live The Library", desc: "\"When you find a writer whose words enter your mind with deep impact and influence, pay attention.\"" },
  { title: "Historical Futurism", desc: "Ever since I came across the Institute For The Future, I've been fascinated with how people predict the future." },
  { title: "Open-Source Knowledge", desc: "More people should treat their ideas like software that is open source, and in active development." },
];

const BOOKS = [
  { title: "John Quincy Adams: Militant Spirit", author: "James Traub" },
  { title: "Poor Charlie's Almanack", author: "Peter Kaufman (Editor)" },
  { title: "Reinventing Knowledge", author: "Ian F. McNeely & Lisa Wolverton" },
  { title: "The Courage To Be Disliked", author: "Ichiro Kishimi & Fumitake Koga" },
  { title: "The Good Earth", author: "Pearl S. Buck" },
  { title: "Leap of Faith", author: "Bob Bennett" },
];

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const css = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --bg: #FAFAF8;
  --bg-sidebar: #F2F1EE;
  --bg-card: #FFFFFF;
  --text: #1A1A18;
  --text-secondary: #6B6B66;
  --text-tertiary: #9C9C96;
  --accent: #C0392B;
  --accent-hover: #A93226;
  --border: #E4E3DF;
  --nav-hover: rgba(0,0,0,0.04);
  --nav-active: rgba(180,77,45,0.08);
  --nav-active-border: var(--accent);
  --tag-bg: #F0EFEB;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.06);
  --shadow-lg: 0 12px 40px rgba(0,0,0,0.1);
  --radius: 8px;
  --font-display: 'Newsreader', Georgia, serif;
  --font-body: 'DM Sans', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

[data-theme="dark"] {
  --bg: #141413;
  --bg-sidebar: #1A1A18;
  --bg-card: #1E1E1C;
  --text: #EDEDEA;
  --text-secondary: #9C9C96;
  --text-tertiary: #6B6B66;
  --accent: #E74C3C;
  --accent-hover: #F0605A;
  --border: #2C2C28;
  --nav-hover: rgba(255,255,255,0.04);
  --nav-active: rgba(212,112,78,0.1);
  --tag-bg: #252523;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.2);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.3);
  --shadow-lg: 0 12px 40px rgba(0,0,0,0.4);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body, #root {
  font-family: var(--font-body);
  background: var(--bg);
  color: var(--text);
  height: 100vh;
  overflow: hidden;
}

.app-shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* â”€â”€â”€ Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.sidebar {
  width: 240px;
  min-width: 240px;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 20px 12px;
  overflow-y: auto;
  transition: background 0.3s ease;
}

.sidebar-logo {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 500;
  padding: 4px 12px 20px;
  color: var(--text);
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 10px;
}

.sidebar-logo .logo-mark {
  width: 28px;
  height: 28px;
  background: var(--accent);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  font-style: italic;
}

.nav-group-label {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
  padding: 16px 12px 6px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13.5px;
  font-weight: 400;
  color: var(--text-secondary);
  transition: all 0.15s ease;
  border: 1px solid transparent;
  position: relative;
  user-select: none;
}

.nav-item:hover {
  background: var(--nav-hover);
  color: var(--text);
}

.nav-item.active {
  background: var(--nav-active);
  color: var(--accent);
  font-weight: 500;
  border-color: transparent;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: -1px;
  top: 6px;
  bottom: 6px;
  width: 2.5px;
  background: var(--accent);
  border-radius: 2px;
}

.nav-item-icon {
  width: 20px;
  text-align: center;
  font-size: 14px;
  flex-shrink: 0;
  opacity: 0.7;
}

.nav-item.active .nav-item-icon { opacity: 1; }

.nav-item-key {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  color: var(--text-tertiary);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1px 5px;
  line-height: 1.5;
}

.nav-external {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 12px;
  font-size: 12.5px;
  color: var(--text-tertiary);
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.nav-external:hover {
  color: var(--text-secondary);
  background: var(--nav-hover);
}

.sidebar-footer {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.theme-switcher {
  display: flex;
  gap: 2px;
  padding: 4px 12px;
}

.theme-btn {
  font-family: var(--font-body);
  font-size: 11.5px;
  padding: 4px 10px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.theme-btn:hover { color: var(--text-secondary); }
.theme-btn.active {
  background: var(--bg);
  color: var(--text);
  box-shadow: var(--shadow-sm);
}

/* â”€â”€â”€ Main Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 48px 56px 80px;
  max-width: 780px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.page-enter {
  animation: fadeIn 0.2s ease;
}

h1.page-title {
  font-family: var(--font-display);
  font-size: 38px;
  font-weight: 400;
  letter-spacing: -0.025em;
  line-height: 1.2;
  margin-bottom: 8px;
}

h1.page-title em {
  font-style: italic;
  color: var(--accent);
}

.page-subtitle {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 40px;
  max-width: 560px;
}

.section-heading {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 400;
  letter-spacing: -0.02em;
  margin-bottom: 6px;
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.section-heading .dash {
  color: var(--text-tertiary);
  font-weight: 300;
  font-size: 14px;
  font-family: var(--font-body);
}

.section-divider {
  width: 100%;
  height: 1px;
  background: var(--border);
  margin: 12px 0 24px;
}

/* â”€â”€â”€ Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.update-card {
  display: flex;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid var(--border);
  cursor: default;
  transition: all 0.15s ease;
}

.update-card:last-child { border-bottom: none; }

.update-card:hover {
  padding-left: 4px;
}

.update-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--tag-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  border: 1px solid var(--border);
}

.update-content { flex: 1; min-width: 0; }

.update-title {
  font-size: 14.5px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 4px;
  line-height: 1.3;
}

.update-excerpt {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.update-meta {
  font-size: 11.5px;
  color: var(--text-tertiary);
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.update-tag {
  font-size: 10.5px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--accent);
  background: var(--nav-active);
  padding: 2px 7px;
  border-radius: 3px;
}

/* Portfolio idea cards */
.idea-card {
  padding: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 12px;
  transition: all 0.2s ease;
  cursor: default;
}

.idea-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--accent);
}

.idea-card h3 {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--text);
}

.idea-card p {
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* Book list */
.book-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
}

.book-item:last-child { border-bottom: none; }

.book-cover {
  width: 32px;
  height: 44px;
  background: linear-gradient(135deg, var(--accent) 0%, #8B3520 100%);
  border-radius: 3px;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}

.book-title {
  font-family: var(--font-display);
  font-size: 14.5px;
  font-weight: 500;
  color: var(--text);
  line-height: 1.3;
}

.book-author {
  font-size: 12.5px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

/* Focus/interest badges */
.badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.badge {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-secondary);
  background: var(--tag-bg);
  padding: 5px 11px;
  border-radius: 20px;
  border: 1px solid var(--border);
}

/* Info grid for about */
.info-grid {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 12px 20px;
  margin: 24px 0;
  font-size: 13.5px;
}

.info-label {
  color: var(--text-tertiary);
  font-weight: 500;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding-top: 2px;
}

.info-value {
  color: var(--text);
  line-height: 1.5;
}

.info-value a {
  color: var(--accent);
  text-decoration: none;
}

.info-value a:hover { text-decoration: underline; }

/* Placeholder page */
.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--text-tertiary);
  font-size: 14px;
  gap: 8px;
}

.placeholder-icon {
  font-size: 32px;
  opacity: 0.4;
}

/* â”€â”€â”€ Contact Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeOverlay 0.15s ease;
}

@keyframes fadeOverlay {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 32px;
  width: 440px;
  max-width: 90vw;
  box-shadow: var(--shadow-lg);
  animation: modalIn 0.2s ease;
}

@keyframes modalIn {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal h2 {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 400;
  margin-bottom: 4px;
}

.modal-sub {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.modal-field {
  margin-bottom: 16px;
}

.modal-field label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.modal-field input,
.modal-field textarea {
  width: 100%;
  padding: 10px 12px;
  font-family: var(--font-body);
  font-size: 14px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  outline: none;
  transition: border-color 0.15s ease;
  resize: vertical;
}

.modal-field input:focus,
.modal-field textarea:focus {
  border-color: var(--accent);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

.btn {
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 500;
  padding: 8px 18px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
}

.btn:hover { background: var(--nav-hover); }

.btn-primary {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

.btn-primary:hover {
  background: var(--accent-hover);
}

/* â”€â”€â”€ Responsive (sidebar collapse) â”€â”€â”€â”€â”€â”€â”€â”€ */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 50;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    box-shadow: var(--shadow-lg);
  }
  .sidebar.open { transform: translateX(0); }
  .main-content { padding: 32px 24px 80px; }
  .mobile-header {
    display: flex !important;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
  }
  .hamburger {
    width: 36px;
    height: 36px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-card);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 18px;
    color: var(--text);
  }
}

@media (min-width: 769px) {
  .mobile-header { display: none !important; }
}
`;

// â”€â”€â”€ Page Components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function HomePage() {
  return (
    <div className="page-enter">
      <h1 className="page-title">
        Mapping the <em>architecture</em> of compounding human potential.
      </h1>
      <p className="page-subtitle">
        General Partner @ Contrary. Founder @ Contrary Research. Father of 4.
        Member of The Church of Jesus Christ of Latter-Day Saints.
      </p>

      <div className="info-grid">
        <span className="info-label">Focus</span>
        <span className="info-value">AI disruption of vertical software â€” which moats survive, and which don't.</span>
        <span className="info-label">Background</span>
        <span className="info-value">Index Ventures Â· Coatue Â· TCV Â· Former Founder</span>
      </div>

      <div style={{ marginTop: 40 }}>
        <h2 className="section-heading">Updates <span className="dash">â€” recent</span></h2>
        <div className="section-divider" />
        <div className="update-card">
          <div className="update-icon">ðŸ“</div>
          <div className="update-content">
            <div className="update-title">Hijacking The Huckster's Hypebook</div>
            <div className="update-excerpt">An analytical essay on the repeatable fundraising playbook used by charismatic founders â€” from outright fraud to "righteous hucksters" who delivered real results.</div>
            <div className="update-meta"><span className="update-tag">Investing 101</span> In progress</div>
          </div>
        </div>
        <div className="update-card">
          <div className="update-icon">ðŸ”¬</div>
          <div className="update-content">
            <div className="update-title">Contrary Research: CR100 Framework</div>
            <div className="update-excerpt">Building a systematic coverage framework focused on 100 key companies across the Contrary portfolio and pipeline.</div>
            <div className="update-meta"><span className="update-tag">Contrary</span> Ongoing</div>
          </div>
        </div>
        <div className="update-card">
          <div className="update-icon">ðŸ¤–</div>
          <div className="update-content">
            <div className="update-title">AI-Proof SaaS Scoring System</div>
            <div className="update-excerpt">Applying a framework across 74 SaaS companies to identify defensible businesses at distressed valuations in an AI-disrupted landscape.</div>
            <div className="update-meta"><span className="update-tag">Research</span> 2024â€“25</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AboutPage() {
  return (
    <div className="page-enter">
      <h1 className="page-title">About</h1>
      <p className="page-subtitle">Research Â· Capital Â· Ideas</p>

      <div className="info-grid">
        <span className="info-label">Role</span>
        <span className="info-value">General Partner @ Contrary Â· Founder @ Contrary Research</span>
        <span className="info-label">Newsletter</span>
        <span className="info-value"><a href="https://investing1012dot0.substack.com/" target="_blank" rel="noreferrer">Investing 101 on Substack â†—</a></span>
        <span className="info-label">Location</span>
        <span className="info-value">Portland, Oregon</span>
        <span className="info-label">Background</span>
        <span className="info-value">Index Ventures Â· Coatue Â· TCV Â· Amazon Â· BYU Â· Cambridge</span>
      </div>

      <div style={{ marginTop: 32 }}>
        <h2 className="section-heading">Interests</h2>
        <div className="section-divider" />
        <div className="badge-row">
          {[
            "Technological Innovation", "Capital Allocation", "Company Building",
            "Religious Intellectualism", "City Building", "People Over Politics",
            "Historical Futurism", "The Language of Discourse", "Ideological Family Trees"
          ].map((t) => <span key={t} className="badge">{t}</span>)}
        </div>
      </div>
    </div>
  );
}

function EssaysPage() {
  return (
    <div className="page-enter">
      <h1 className="page-title">Essays</h1>
      <p className="page-subtitle">Recent writing from Investing 101 and beyond.</p>
      <div className="section-divider" />
      {ESSAYS.map((e, i) => (
        <div className="update-card" key={i}>
          <div className="update-icon">âœŽ</div>
          <div className="update-content">
            <div className="update-title">{e.title}</div>
            <div className="update-excerpt">{e.excerpt}</div>
            <div className="update-meta"><span className="update-tag">{e.tag}</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PortfolioPage() {
  return (
    <div className="page-enter">
      <h1 className="page-title">Portfolio Ideas</h1>
      <p className="page-subtitle">Big ideas worth taking seriously.</p>
      <div className="section-divider" />
      {PORTFOLIO_IDEAS.map((p, i) => (
        <div className="idea-card" key={i}>
          <h3>{p.title}</h3>
          <p>{p.desc}</p>
        </div>
      ))}
    </div>
  );
}

function BookshelfPage() {
  return (
    <div className="page-enter">
      <h1 className="page-title">Bookshelf</h1>
      <p className="page-subtitle">Quake books â€” the ones that shifted my thinking.</p>
      <div className="section-divider" />
      {BOOKS.map((b, i) => (
        <div className="book-item" key={i}>
          <div className="book-cover" style={{ background: `linear-gradient(135deg, hsl(${15 + i * 25}, 55%, 38%) 0%, hsl(${15 + i * 25}, 45%, 25%) 100%)` }} />
          <div>
            <div className="book-title">{b.title}</div>
            <div className="book-author">{b.author}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlaceholderPage({ icon, title, description }) {
  return (
    <div className="page-enter">
      <h1 className="page-title">{title}</h1>
      <p className="page-subtitle">{description}</p>
      <div className="placeholder">
        <div className="placeholder-icon">{icon}</div>
        <span>Content coming soon.</span>
      </div>
    </div>
  );
}

function ContactModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Get in touch</h2>
        <p className="modal-sub">Send a quick note â€” I'll get back to you.</p>
        <div className="modal-field">
          <label>Name</label>
          <input type="text" placeholder="Your name" />
        </div>
        <div className="modal-field">
          <label>Email</label>
          <input type="email" placeholder="you@example.com" />
        </div>
        <div className="modal-field">
          <label>Message</label>
          <textarea rows={4} placeholder="What's on your mind?" />
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary">Send</button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Main App â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function App() {
  const [activePage, setActivePage] = useState("home");
  const [theme, setTheme] = useState("light");
  const [showContact, setShowContact] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef(null);

  const resolvedTheme = theme === "auto"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;

  // Keyboard shortcuts
  const handleKey = useCallback((e) => {
    if (showContact && e.key === "Escape") { setShowContact(false); return; }
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    const keyMap = {};
    NAV_SECTIONS.forEach((s) => s.items.forEach((item) => { keyMap[item.key] = item.id; }));

    if (keyMap[e.key]) {
      if (keyMap[e.key] === "contact") {
        setShowContact(true);
      } else {
        setActivePage(keyMap[e.key]);
        setSidebarOpen(false);
      }
      e.preventDefault();
    }
  }, [showContact]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // Scroll to top on page change
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [activePage]);

  const navigate = (id) => {
    if (id === "contact") {
      setShowContact(true);
    } else {
      setActivePage(id);
      setSidebarOpen(false);
    }
  };

  const renderPage = () => {
    switch (activePage) {
      case "home": return <HomePage />;
      case "about": return <AboutPage />;
      case "essays": return <EssaysPage />;
      case "portfolio": return <PortfolioPage />;
      case "bookshelf": return <BookshelfPage />;
      case "music": return <PlaceholderPage icon="â™«" title="Music" description="Playlists and albums that fuel the work." />;
      case "videos": return <PlaceholderPage icon="â–¶" title="Videos" description="Talks, interviews, and visual essays." />;
      case "podcasts": return <PlaceholderPage icon="â—‰" title="Podcasts" description="Favorite episodes and shows." />;
      case "learning": return <PlaceholderPage icon="âˆž" title="Learning" description="Courses, frameworks, and ongoing education." />;
      default: return <HomePage />;
    }
  };

  return (
    <>
      <style>{css}</style>
      <div className="app-shell" data-theme={resolvedTheme}>
        {/* Sidebar */}
        <nav className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-logo">
            <span className="logo-mark">K</span>
            Justin Culebro
          </div>

          {NAV_SECTIONS.map((section, si) => (
            <div key={si}>
              {section.group && <div className="nav-group-label">{section.group}</div>}
              {section.items.map((item) => (
                <div
                  key={item.id}
                  className={`nav-item ${activePage === item.id && item.id !== "contact" ? "active" : ""}`}
                  onClick={() => navigate(item.id)}
                >
                  <span className="nav-item-icon">{item.icon}</span>
                  {item.label}
                  <span className="nav-item-key">{item.key}</span>
                </div>
              ))}
            </div>
          ))}

          <div style={{ marginTop: 8 }}>
            {EXTERNAL_LINKS.map((link, i) => (
              <a key={i} className="nav-external" href={link.url} target="_blank" rel="noreferrer">
                <span className="nav-item-icon" style={{ fontSize: 12 }}>{link.icon}</span>
                {link.label}
              </a>
            ))}
          </div>

          <div className="sidebar-footer">
            <div className="theme-switcher">
              {Object.keys(THEMES).map((t) => (
                <button
                  key={t}
                  className={`theme-btn ${theme === t ? "active" : ""}`}
                  onClick={() => setTheme(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Main */}
        <main className="main-content" ref={mainRef}>
          <div className="mobile-header">
            <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>â˜°</button>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 500 }}>Justin Culebro</span>
          </div>
          {renderPage()}
        </main>

        {/* Contact Modal */}
        {showContact && <ContactModal onClose={() => setShowContact(false)} />}
      </div>
    </>
  );
}

