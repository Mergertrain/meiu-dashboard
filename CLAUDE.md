# MeiU Dashboard

## Overview
A beautiful, mobile-first status dashboard where Wei can check the progress of projects that MeiU (his AI assistant) is orchestrating via Claude Code. Think of it as MeiU's notebook — showing what she's working on, what's done, what's in progress.

## Tech Stack
- **Framework**: React + Vite (fast, modern, simple)
- **Styling**: Tailwind CSS (utility-first, beautiful defaults)
- **Data**: Static JSON file (`data/status.json`) — MeiU updates this file and redeploys
- **Deployment**: GitHub Pages (free, simple)
- **No backend needed** — purely static, data comes from JSON committed to the repo

## Design Requirements
- **Mobile-first** — Wei checks this from his phone when away from PC
- **Beautiful** — clean, modern, warm aesthetic. Think: Notion meets Linear meets a cozy notebook
- **Color scheme**: Warm tones — soft pinks (🌸 MeiU's vibe), warm grays, gentle accents
- **Dark mode**: Support both light and dark, auto-detect system preference
- **Responsive**: Perfect on phone, tablet, and desktop

## Pages / Views
1. **Dashboard** (home): Overview of all projects — cards showing name, status, progress bar, last updated
2. **Project Detail**: Click a project → see full task list, activity log, decisions made, links (repo, deploy URL)
3. **Activity Feed**: Timeline of recent actions across all projects (optional, nice-to-have)

## Data Schema (`data/status.json`)
```json
{
  "lastUpdated": "2026-02-24T06:44:00Z",
  "projects": [
    {
      "id": "meiu-dashboard",
      "name": "MeiU Dashboard",
      "description": "Project status dashboard",
      "status": "in-progress",
      "progress": 30,
      "repo": "https://github.com/Mergertrain/meiu-dashboard",
      "deployUrl": "https://mergertrain.github.io/meiu-dashboard",
      "tasks": [
        {
          "id": "t1",
          "role": "PE",
          "title": "Architecture & design",
          "status": "done",
          "completedAt": "2026-02-24T06:50:00Z"
        },
        {
          "id": "t2",
          "role": "SDE",
          "title": "Build UI components",
          "status": "in-progress"
        }
      ],
      "activity": [
        {
          "timestamp": "2026-02-24T06:50:00Z",
          "role": "PE",
          "message": "Designed architecture: React + Vite + Tailwind, deployed to GitHub Pages"
        }
      ],
      "decisions": [
        "React + Vite for speed and simplicity",
        "Tailwind for styling",
        "Static JSON for data — no backend needed"
      ]
    }
  ]
}
```

## Conventions
- Use conventional commits (feat:, fix:, docs:, ci:, test:)
- Write tests for utility functions
- Keep components small and focused
- Handle empty states gracefully (no projects, no tasks, etc.)
- All text should be friendly and warm — this is MeiU's space 🌸

## Current Status
- [ ] PE: Architecture & design
- [ ] SDE: Build the UI
- [ ] QA: Tests
- [ ] DevOps: GitHub Pages deployment + CI
