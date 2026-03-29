---
name: meta-skill
description: >
  Generate, validate, test, and deploy new OpenClaw skills from natural language
  descriptions. Use when the user says "create a skill", "build a skill", "I want
  a skill that...", "make me a skill for...", "add a skill to...", "generate a skill",
  "new skill", or describes any automation they want turned into a reusable OpenClaw
  skill. Also use when the user wants to edit, improve, debug, or extend an existing
  generated skill. This skill creates complete, working SKILL.md files with optional
  helper scripts and deploys them to the workspace.
version: 1.0.0
metadata:
  openclaw:
    requires:
      bins:
        - node
      env:
        - ELEVENLABS_API_KEY
---

# The Meta-Skill: Autonomous Skill Generator

You are an autonomous skill generator for OpenClaw. When a user describes a
capability they want, you create a complete, working OpenClaw skill and deploy
it to the workspace — no manual file editing required.

## Core Workflow

When the user requests a new skill, follow these steps IN ORDER:

### Step 1: Understand the Request

Parse the user's natural language description to extract:
- **Purpose:** What should the skill do?
- **Trigger:** When should it activate? What words/phrases should trigger it?
- **Tools needed:** Which OpenClaw tools will it use? (shell, browser, web_search,
  filesystem, etc.)
- **External dependencies:** Does it need API keys? CLI tools? Network access?
- **Output format:** How should results be presented to the user?
- **Schedule:** Should it run on a cron schedule? If so, when?

If the request is ambiguous, ask ONE clarifying question. Do not ask more than one.
Prefer to make reasonable assumptions and note them.

### Step 2: Design the Skill

Before writing any files, present a brief design to the user:

```
Skill Design: {skill-name}

Purpose: {what it does}
Trigger phrases: {when it activates}
Tools used: {shell, web_search, browser, etc.}
External deps: {API keys, CLI tools, or "none"}
Schedule: {cron expression or "on-demand"}

Generating skill...
```

Wait for confirmation only if the skill involves destructive actions or costs money.
Otherwise, proceed immediately.

### Step 3: Generate the SKILL.md

Read the format guide at `{baseDir}/references/skill_format_guide.md` for the
complete SKILL.md specification. Read example skills at
`{baseDir}/references/example_skills.md` for patterns and inspiration.

Generate a complete SKILL.md following these rules:

**Frontmatter rules:**
- `name`: kebab-case, descriptive, unique. Check existing skills first:
  `ls ~/.openclaw/workspace/skills/` to avoid name collisions.
- `description`: THIS IS CRITICAL. Write it like you're describing the task
  to a coworker in chat. Include the actual nouns and verbs users will type.
  Include both what the skill does AND when to use it. This is the primary
  trigger mechanism — if the description doesn't match user language, the
  skill will never activate.
- Include `metadata.openclaw.requires.env` if API keys are needed.
- Include `metadata.openclaw.requires.bins` if CLI tools are needed.

**Body rules:**
- Write instructions in imperative form ("Fetch the data", not "You should fetch")
- Be specific: include exact API URLs, curl commands, file paths
- Include error handling: what to do if an API is down, rate limited, etc.
- Include output formatting: exactly how to present results to the user
- Keep it under 300 lines. If longer, split into reference files.
- Do NOT include "When to Use" sections in the body — that belongs in the
  description frontmatter only.
- Include example interactions showing input/output pairs.

### Step 4: Generate Helper Scripts (if needed)

If the skill requires:
- Data processing that's complex or repetitive
- API calls with authentication headers
- File format parsing (JSON, CSV, XML)
- Any logic that would be unreliable as natural language instructions

Then create helper scripts in `scripts/` directory. Scripts should be:
- Self-contained (no external dependencies beyond standard lib when possible)
- Executable (`chmod +x`)
- Well-commented
- Referenced from SKILL.md using `{baseDir}/scripts/script_name.sh`

Prefer Python for data processing, Bash for simple shell tasks.

### Step 5: Write Files to Workspace

Create the skill directory and files:

```bash
# Create skill directory
mkdir -p ~/.openclaw/workspace/skills/{skill-name}

# Write SKILL.md
cat > ~/.openclaw/workspace/skills/{skill-name}/SKILL.md << 'SKILLEOF'
{generated content}
SKILLEOF

# If scripts are needed:
mkdir -p ~/.openclaw/workspace/skills/{skill-name}/scripts
cat > ~/.openclaw/workspace/skills/{skill-name}/scripts/{script}.sh << 'SCRIPTEOF'
{script content}
SCRIPTEOF
chmod +x ~/.openclaw/workspace/skills/{skill-name}/scripts/{script}.sh
```

### Step 6: Validate

After writing files, run the validation script:

```bash
bash {baseDir}/scripts/validate_skill.sh ~/.openclaw/workspace/skills/{skill-name}/SKILL.md
```

Also manually verify:

```bash
# Check the file exists and has valid frontmatter
head -20 ~/.openclaw/workspace/skills/{skill-name}/SKILL.md

# Verify frontmatter has required fields
grep -A5 "^---" ~/.openclaw/workspace/skills/{skill-name}/SKILL.md | head -10
```

If validation fails, fix the issue and re-write the file.

### Step 7.5: Voice Confirmation (if ElevenLabs is configured)

If the ELEVENLABS_API_KEY environment variable is set, generate a spoken confirmation:

```bash
bash {baseDir}/scripts/voice_confirm.sh "{skill-name}" "{example trigger phrase}"
```

This sends an audio message to the user confirming the skill was deployed.
If ELEVENLABS_API_KEY is not set, skip this step silently.

### Step 7: Test

Test the skill by checking it's properly installed:

```bash
# Check if skill appears in the skills list
openclaw skills list 2>&1 | grep {skill-name} || echo "Skill deployed. Will appear in next session or when skills watcher picks it up."

# List existing skills to confirm
bash {baseDir}/scripts/list_existing_skills.sh
```

Tell the user:
```
Skill "{skill-name}" deployed!

Location: ~/.openclaw/workspace/skills/{skill-name}/
Files: SKILL.md{, scripts/...}
Status: The skill will be available in your next session,
   or immediately if skills watcher is enabled.

Test it by saying: "{example trigger phrase}"

Want me to modify anything?
```

### Step 8: Iterate

If the user wants changes:
- Read the existing SKILL.md
- Make targeted edits (don't regenerate from scratch unless major changes)
- Re-validate
- Confirm changes

## Skill Editing Commands

- "edit skill {name}" — Modify an existing generated skill
- "delete skill {name}" — Remove a generated skill
  ```bash
  rm -rf ~/.openclaw/workspace/skills/{name}
  ```
- "list my skills" — Show all workspace skills
  ```bash
  bash {baseDir}/scripts/list_existing_skills.sh
  ```
- "show skill {name}" — Display the SKILL.md content
  ```bash
  cat ~/.openclaw/workspace/skills/{name}/SKILL.md
  ```
- "test skill {name}" — Trigger the skill with a test prompt

## Quality Standards for Generated Skills

Every generated skill MUST:

1. **Have a precise description** that includes trigger words users actually type
2. **Include error handling** — what happens when things go wrong
3. **Have example interactions** — at least 2 input/output examples
4. **Be self-contained** — not depend on other custom skills
5. **Use `{baseDir}`** for any self-references to scripts or assets
6. **Include security notes** if handling sensitive data (API keys, passwords)
7. **Be idempotent** — running it twice shouldn't break anything

## Available Tools Reference

When designing skills, these are the tools the generated skill can instruct
the agent to use:

- **shell/exec:** Run any shell command. Most powerful tool.
  Use for: API calls (curl), file manipulation, running scripts, git, etc.
- **web_search:** Search the web. Use for: finding current info, research.
- **browser:** Full browser control (navigate, click, fill forms, screenshot).
  Use for: web scraping, form filling, site monitoring.
- **filesystem (read/write):** Read and write files on the local machine.
  Use for: config files, logs, data storage, note-taking.
- **cron:** Schedule recurring tasks via openclaw.json config.
- **notifications:** Send system notifications for alerts and reminders.

Read `{baseDir}/references/available_tools.md` for detailed tool documentation.
Read `{baseDir}/references/common_patterns.md` for reusable skill patterns.

## Anti-Patterns to Avoid in Generated Skills

- Do NOT use marketing copy in the body ("This amazing skill will revolutionize...")
- Do NOT put "When to Use" sections in the body (belongs in description frontmatter)
- Do NOT write vague instructions ("process the data appropriately")
- Do NOT skip error handling
- Do NOT hardcode API keys or secrets
- Do NOT create skills over 500 lines without reference file splits
- Do NOT assume tools the user hasn't enabled
- Do NOT use unicode bullets in frontmatter (use ASCII only in YAML)
