# Open Core Security

A responsive React + Vite website for an independent, community-driven cybersecurity initiative.

## Included
- Responsive landing page and mobile navigation
- About and community principles
- Proposed CTF event showcase (clearly marked as not scheduled)
- Searchable and filterable cybersecurity domains
- Organizer contact action and GitHub profile link
- GitHub Pages deployment workflow

## Run locally
Requires Node.js 18+.

1. Run npm install
2. Run npm run dev
3. Open the local URL printed by Vite.

## Build
Run npm run build. The production site is generated in dist/.

## Deploy to GitHub Pages
1. In the repository, open Settings → Pages.
2. Select GitHub Actions as the deployment source.
3. Push to main. The included workflow builds and publishes the site.

## Before publishing
Review the organizer contact details in src/App.jsx. Operation: Blackout is a proposed concept, not a scheduled or open event. Publish dates, rules, challenge content, and registration only after they are finalized.

The current site is a frontend only. It does not yet store registrations, run CTF challenges, validate flags, or provide a live leaderboard.