# The Meta-Skill

An [OpenClaw](https://openclaw.ai) workspace skill that autonomously generates, validates, tests, and deploys new OpenClaw skills from natural language descriptions. It is itself a skill that creates other skills.

Built for **HackPSU 2026** — College of IST / OpenClaw Track.

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
│   └── list_existing_skills.sh      <- Lists workspace skills (avoids collisions)
├── references/
│   ├── skill_format_guide.md        <- Complete SKILL.md format spec
│   ├── available_tools.md           <- What tools the agent can use
│   ├── example_skills.md            <- 7 example skills for few-shot learning
│   └── common_patterns.md           <- Reusable skill patterns
└── assets/
    └── skill_template.md            <- Base template for generated skills
```

## Setup

### Prerequisites

- [OpenClaw](https://openclaw.ai) installed (`npm install -g openclaw@latest`)
- [Anthropic API key](https://console.anthropic.com)
- At least one channel connected (Telegram is easiest for demos)

### Install

```bash
git clone https://github.com/YOUR_USERNAME/meta-skill-openclaw.git
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

### Test It

```bash
# Via CLI
openclaw agent --message "Create a skill that tells me a random joke"

# Or text your bot on Telegram/Discord:
# "Create a skill that checks if my favorite websites are down"
```

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
| "Organize my Downloads folder" | File scanning, extension-based sorting, move commands |
| "Monitor a website for changes" | URL tracking, hash comparison, change detection |
| "Format my meeting notes" | Text parsing, structured output, file saving |
| "Bootstrap a new Python project" | Directory scaffolding, config files, git init |
| "Daily Hacker News digest" | HN API integration, story formatting, cron suggestion |

## Demo

For live demos, use the watcher script to show skills appearing in real-time:

```bash
# Terminal 1: Watch the skills directory
./scripts/demo.sh

# Terminal 2 (or phone): Talk to the agent
# "Create a skill that checks if any of my favorite websites are down"
# Watch it appear in Terminal 1!
```

## Project Structure

```
meta-skill-openclaw/
├── openclaw.json          # Agent config (SkillForge agent)
├── .env.example           # Required API keys and tokens
├── scripts/
│   ├── setup.sh           # Deploys meta-skill to workspace
│   └── demo.sh            # Live demo watcher
└── meta-skill/            # The skill itself (deployed to workspace)
    ├── SKILL.md
    ├── scripts/
    ├── references/
    └── assets/
```

## Tech Stack

- **[OpenClaw](https://openclaw.ai)** — Agent orchestration, skill system, channel integration
- **Claude Sonnet** (via Anthropic API) — LLM backend
- **Bash/Python** — Helper scripts for validation and testing
- **Telegram/Discord** — User-facing channels

---

Built for HackPSU 2026 — College of IST / OpenClaw Track
