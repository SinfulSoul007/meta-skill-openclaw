# The Meta-Skill 🦞

An [OpenClaw](https://openclaw.ai) workspace skill that autonomously generates, validates, tests, and deploys new OpenClaw skills from natural language descriptions. It is itself a skill that creates other skills.

Built for **HackPSU 2026** — College of IST / OpenClaw Track.

## Live Dashboard

**[Open Dashboard](https://absent-northwest-hitting-judicial.trycloudflare.com)** — real-time skill gallery, chat feed, and event log.

> The dashboard URL changes on restart. If the link above is stale, start it locally:
> ```bash
> node dashboard/server.js    # → http://localhost:3000
> cloudflared tunnel --url http://localhost:3000  # → public URL
> ```

## What It Does

Tell the Meta-Skill what you want in plain English. It creates a complete, working OpenClaw skill and deploys it to your workspace — no manual file editing required.

```
You: "I want a skill that monitors Hacker News and texts me the top stories every morning"

Meta-Skill:
  1. Parses your request
  2. Designs the skill (name, triggers, tools, schedule)
  3. Generates a complete SKILL.md with API calls, formatting, error handling
  4. Writes files to ~/.openclaw/workspace/skills/
  5. Validates the output
  6. Reports back with a test command

You now have a working skill. Just say "What's on Hacker News?" and it runs.
```

## How It's Different from OpenClaw's Built-in `skill-creator`

| | Built-in skill-creator | Meta-Skill |
|---|---|---|
| Input | You write SKILL.md manually | Natural language description |
| Output | Guidelines and tips | Complete deployed skill |
| Validation | Manual | Automated |
| Testing | Manual | Automated |
| Deployment | Manual file creation | Automatic to workspace |
| Iteration | Edit files yourself | "Edit my skill to also..." |

The built-in `skill-creator` is a **cookbook**. The Meta-Skill is a **chef**.

## Architecture

```
~/.openclaw/workspace/skills/meta-skill/
├── SKILL.md                         <- The Meta-Skill itself (agent reads this)
├── scripts/
│   ├── validate_skill.sh            <- Validates generated SKILL.md syntax
│   ├── test_skill.sh                <- Tests a generated skill structure
│   ├── list_existing_skills.sh      <- Lists workspace skills (avoids collisions)
│   └── voice_confirm.sh             <- ElevenLabs TTS voice confirmation (optional)
├── references/
│   ├── skill_format_guide.md        <- Complete SKILL.md format spec
│   ├── available_tools.md           <- What tools the agent can use
│   ├── example_skills.md            <- 7 example skills for few-shot learning
│   └── common_patterns.md           <- Reusable skill patterns
└── assets/
    └── skill_template.md            <- Base template for generated skills
```

## Live Dashboard

A zero-dependency web dashboard (`dashboard/`) shows skill generation in real-time:

- **Skill Gallery** — cards for each generated skill, with purple glow animation on new ones
- **Skill Inspector** — full SKILL.md preview with syntax highlighting
- **Live Chat** — streams user/bot messages from Telegram in real-time
- **Event Log** — skill created/updated/deleted events

```
dashboard/
├── server.js          <- Node.js server (REST API + SSE + polling)
└── public/
    ├── index.html
    ├── style.css
    └── app.js
```

No `npm install` needed — vanilla HTML/CSS/JS + Node.js `http` and `fs` only.

## Setup

### Prerequisites

- [OpenClaw](https://openclaw.ai) installed (`npm install -g openclaw@latest`)
- [Anthropic API key](https://console.anthropic.com)
- At least one channel connected (Telegram is easiest for demos)

### Install

```bash
git clone https://github.com/SinfulSoul007/meta-skill-openclaw.git
cd meta-skill-openclaw

# Configure your API key and channel tokens
cp .env.example .env
nano .env  # fill in your keys

# Load environment
set -a && source .env && set +a

# Deploy the meta-skill to your OpenClaw workspace
./scripts/setup.sh

# Start OpenClaw
openclaw gateway
```

### Run the Dashboard

```bash
node dashboard/server.js
# Open http://localhost:3000

# Optional: expose publicly via Cloudflare Tunnel
cloudflared tunnel --url http://localhost:3000
```

### Test It

```bash
# Via CLI
openclaw tui
# Say: "Create a skill that tells me a random joke"

# Or text your bot on Telegram:
# "Create a skill that checks if my favorite websites are down"
```

## Workspace Identity

The agent runs as **SkillForge** with a lobster emoji (🦞). Its personality and behavior are defined in:

- `workspace/IDENTITY.md` — name, emoji, vibe
- `workspace/SOUL.md` — behavior rules, self-sufficiency, output rules

Key behaviors:
- Auto-installs missing tools (pdflatex, pandoc, etc.) via Homebrew
- Sends generated files (PDFs, images) directly through Telegram
- Compiles LaTeX to PDF locally instead of telling users to use Overleaf

## Usage

### Creating Skills

Say any of these to trigger the Meta-Skill:
- "Create a skill that ..."
- "Build me a skill for ..."
- "I want a skill that ..."
- "Make a skill to ..."
- "Generate a new skill for ..."

### Managing Skills

- `"list my skills"` — Show all workspace skills
- `"show skill {name}"` — Display a skill's contents
- `"edit skill {name}"` — Modify an existing skill
- `"delete skill {name}"` — Remove a skill

### Example Requests

| Request | What Gets Generated |
|---------|-------------------|
| "A skill that checks stock prices" | API calls to Yahoo Finance, price formatting, alert thresholds |
| "LaTeX cheatsheet for my class" | Generates .tex, compiles to PDF, sends via Telegram |
| "Monitor a website for changes" | URL tracking, hash comparison, change detection |
| "Organize my Downloads folder" | File scanning, extension-based sorting, move commands |
| "Daily Hacker News digest" | HN API integration, story formatting, cron suggestion |

## Project Structure

```
meta-skill-openclaw/
├── openclaw.json          # Agent config (SkillForge agent)
├── .env.example           # Required API keys and tokens
├── scripts/
│   ├── setup.sh           # Deploys meta-skill to workspace
│   └── demo.sh            # Live demo watcher (terminal)
├── dashboard/             # Live web dashboard (no deps)
│   ├── server.js
│   └── public/
├── workspace/             # Agent identity files
│   ├── IDENTITY.md
│   └── SOUL.md
└── meta-skill/            # The skill itself (deployed to workspace)
    ├── SKILL.md
    ├── scripts/
    ├── references/
    └── assets/
```

## Tech Stack

- **[OpenClaw](https://openclaw.ai)** — Agent orchestration, skill system, channel integration
- **Claude Haiku 4.5** (via Anthropic API) — LLM backend
- **Vanilla Node.js** — Dashboard server (zero dependencies)
- **Cloudflare Tunnel** — Public dashboard access
- **Bash** — Helper scripts for validation and testing
- **Telegram** — User-facing channel

---

Built for HackPSU 2026 — College of IST / OpenClaw Track
