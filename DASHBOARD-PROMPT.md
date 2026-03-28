# Build Prompt: Meta-Skill Live Dashboard

You are building a **live dashboard** for the Meta-Skill project — an OpenClaw skill that autonomously generates other skills from natural language. The dashboard is the visual component that makes the invisible file generation exciting and demo-ready for hackathon judges.

## Context

The Meta-Skill lives at `~/.openclaw/workspace/skills/meta-skill/`. When a user texts a Telegram bot "Create a skill that checks stock prices", the agent generates a complete SKILL.md file and deploys it to `~/.openclaw/workspace/skills/{skill-name}/`. The dashboard watches this directory and shows everything happening in real-time.

The project repo is at: `/path/to/meta-skill-openclaw/` (adjust to wherever the repo is cloned).

## What to Build

A single-page web dashboard inside `dashboard/` in the project root. Zero external dependencies — vanilla HTML/CSS/JS + a Node.js server with `fs` and `http` only. No npm install. No React. No frameworks.

### Architecture

```
dashboard/
├── server.js          <- Node.js server (static files + REST API + SSE for real-time)
└── public/
    ├── index.html     <- Dashboard UI
    ├── style.css      <- Styling
    └── app.js         <- Client-side logic
```

### Server (server.js)

Node.js HTTP server on port 3000 that does three things:

1. **Serves static files** from `public/`

2. **REST API endpoints:**
   - `GET /api/skills` — Returns JSON array of all skills in `~/.openclaw/workspace/skills/`. For each skill, parse the SKILL.md frontmatter and return:
     ```json
     {
       "name": "stock-price-alert",
       "description": "Monitor stock prices and...",
       "version": "1.0.0",
       "path": "/Users/x/.openclaw/workspace/skills/stock-price-alert",
       "files": ["SKILL.md", "scripts/fetch.sh"],
       "lineCount": 85,
       "hasScripts": true,
       "createdAt": "2026-03-28T14:30:00Z",
       "modifiedAt": "2026-03-28T14:35:00Z"
     }
     ```
   - `GET /api/skills/:name` — Returns full SKILL.md content for a specific skill
   - `GET /api/stats` — Returns aggregate stats:
     ```json
     {
       "totalSkills": 5,
       "totalLines": 423,
       "totalScripts": 3,
       "latestSkill": "stock-price-alert",
       "metaSkillPresent": true
     }
     ```

3. **Server-Sent Events (SSE):**
   - `GET /api/events` — SSE stream. Use `fs.watch` on `~/.openclaw/workspace/skills/` to detect new/changed/deleted skills. Push events:
     ```json
     {"type": "skill_created", "name": "stock-price-alert", "timestamp": "..."}
     {"type": "skill_updated", "name": "stock-price-alert", "timestamp": "..."}
     {"type": "skill_deleted", "name": "stock-price-alert", "timestamp": "..."}
     ```

### Frontend Design

The dashboard should feel like a **mission control / command center** — dark theme, clean, modern. Think: GitHub Actions dashboard meets Vercel deployment logs.

**Color palette:**
- Background: `#0a0a0f` (near-black)
- Cards: `#12121a` with `#1a1a2e` border
- Accent: `#6c5ce7` (purple) for active/new states
- Success: `#00b894` (green)
- Text: `#e0e0e0` primary, `#888` secondary
- Glow effects on new skill cards (subtle purple pulse animation)

**Layout (single page, no scrolling ideally):**

```
┌─────────────────────────────────────────────────────────┐
│  🦞 SkillForge Dashboard              [stats bar]       │
│     The Meta-Skill: Live Skill Generation               │
├──────────────────────┬──────────────────────────────────│
│                      │                                   │
│   SKILL GALLERY      │   DETAIL PANEL                   │
│                      │                                   │
│  ┌────────────────┐  │   Skill Name                     │
│  │ skill card     │  │   Description text                │
│  │ name + desc    │  │                                   │
│  │ meta info      │  │   ┌─────────────────────────┐    │
│  └────────────────┘  │   │                         │    │
│                      │   │   SKILL.MD PREVIEW      │    │
│  ┌────────────────┐  │   │   (syntax highlighted    │    │
│  │ skill card     │  │   │    monospace view)       │    │
│  │ NEW ← glow     │  │   │                         │    │
│  └────────────────┘  │   └─────────────────────────┘    │
│                      │                                   │
│  ┌────────────────┐  │   Files: SKILL.md, scripts/...   │
│  │ skill card     │  │   Lines: 85 | Scripts: 1         │
│  └────────────────┘  │   Created: 2 min ago             │
│                      │                                   │
├──────────────────────┴──────────────────────────────────│
│  LIVE FEED                                               │
│  [14:32:05] ✅ Skill "stock-price-alert" created (85 ln)│
│  [14:30:12] ✅ Skill "fun-fact" created (42 lines)      │
│  [14:28:01] 🦞 SkillForge Dashboard started             │
└─────────────────────────────────────────────────────────┘
```

**Key UI behaviors:**

1. **Stats bar** (top right): Show `{N} skills | {N} lines | {N} scripts` in pill badges

2. **Skill gallery** (left panel, ~35% width):
   - Cards for each skill, sorted by most recent first
   - Each card shows: name, first line of description, line count, time ago
   - Click a card to show detail in the right panel
   - **NEW skill animation**: When a skill is created via SSE, the card should slide in from the top with a purple glow pulse that fades after 5 seconds. This is the key demo moment.
   - The meta-skill itself should have a distinct card style (slightly different border color or a small badge)

3. **Detail panel** (right, ~65% width):
   - Shows full info for the selected skill
   - SKILL.md content in a dark code block with monospace font
   - Basic syntax highlighting for YAML frontmatter (just color the `---` delimiters and key names)
   - File list, line count, timestamps

4. **Live feed** (bottom bar, ~80px height):
   - Scrolling log of SSE events with timestamps
   - Color-coded: green for created, blue for updated, red for deleted
   - Auto-scrolls to latest

5. **Empty state**: When no skills exist yet (besides meta-skill), show a centered message:
   "Waiting for skills... Text your bot to create one."
   with a subtle pulse animation

6. **Responsive**: Should look good on a laptop screen connected to a projector (1920x1080). Don't worry about mobile.

### Important Implementation Details

- Parse YAML frontmatter manually (split on `---`, extract `name:`, `description:`, `version:` with regex). Do NOT use a YAML library.
- Use `fs.watch` with recursive option for the SSE watcher. Debounce events by 500ms to avoid duplicates.
- The skills directory is `~/.openclaw/workspace/skills/`. Resolve `~` to `process.env.HOME` in the server.
- Handle the case where the skills directory doesn't exist yet (create it or show a message).
- `server.js` should auto-detect the skills directory path.
- Add a `--port` CLI flag: `node server.js --port 3001`
- CORS headers on API responses (for dev convenience).
- Graceful error handling — if a SKILL.md is malformed, skip it, don't crash.

### Polish Details (these matter for the demo)

- Use `Inter` or system font stack for UI, `JetBrains Mono` or monospace for code
- Subtle CSS transitions on everything (0.2s ease)
- The glow animation on new skills should be visible from 10 feet away (projector distance)
- Add a small "🦞 Built for HackPSU 2026" footer
- The page title should be "SkillForge Dashboard"
- Favicon: use a lobster emoji or just skip it

### Testing

After building, verify:
1. `node dashboard/server.js` starts on port 3000
2. `http://localhost:3000` shows the dashboard
3. Manually create a test skill:
   ```bash
   mkdir -p ~/.openclaw/workspace/skills/test-skill
   echo -e "---\nname: test-skill\ndescription: A test skill.\n---\n\n# Test\n\nHello world." > ~/.openclaw/workspace/skills/test-skill/SKILL.md
   ```
4. The skill card appears in the gallery (via SSE, no refresh needed)
5. Click the card — detail panel shows the SKILL.md content
6. Delete the test skill:
   ```bash
   rm -rf ~/.openclaw/workspace/skills/test-skill
   ```
7. The card disappears and a delete event shows in the live feed

Build the complete dashboard. All 4 files. Make it look great.
