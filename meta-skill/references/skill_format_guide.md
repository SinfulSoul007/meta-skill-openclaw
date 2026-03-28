# OpenClaw SKILL.md Format Reference

## Structure

Every skill is a directory containing a SKILL.md file:

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter (required)
│   │   ├── name: (required) kebab-case identifier
│   │   └── description: (required) trigger text + what it does
│   └── Markdown body (required) instructions for the agent
└── Optional resources
    ├── scripts/    executable code (Python, Bash, JS)
    ├── references/ docs loaded on demand
    └── assets/     templates, configs, static files
```

## Frontmatter Specification

```yaml
---
name: my-skill-name
description: >
  One to three sentences. First sentence: what the skill does.
  Remaining sentences: when to use it, including trigger phrases.
  This is how OpenClaw decides whether to activate the skill.
version: 1.0.0
metadata:
  openclaw:
    requires:
      env:
        - API_KEY_NAME          # Environment variables needed
      bins:
        - curl                  # CLI tools that must be installed
        - jq
      anyBins:
        - python3               # At least one of these must exist
        - python
      config:
        - browser.enabled       # Config keys that must be set
    primaryEnv: API_KEY_NAME    # Main credential variable
    skillKey: custom-key        # Override config key (rare)
---
```

## Description Writing Rules

The description is the MOST IMPORTANT field. It determines whether the skill
ever gets used. Rules:

1. Use the actual words users type ("send email" not "electronic correspondence")
2. Include the domain nouns ("weather", "email", "GitHub", "stock price")
3. Include action verbs ("check", "send", "monitor", "search", "create")
4. Front-load the most common trigger phrases
5. Keep under 300 characters for the primary description
6. Do NOT use marketing language

Good: "Check weather forecasts and current conditions for any city. Use when
the user asks about weather, temperature, rain, forecast, or what to wear."

Bad: "A comprehensive meteorological data retrieval and analysis framework
for intelligent climate-aware decision support."

## Body Writing Rules

1. Use imperative form ("Fetch the data" not "The skill fetches the data")
2. Include exact commands, URLs, and file paths
3. Structure with clear headers: ## Instructions, ## Examples, ## Error Handling
4. Keep under 300 lines; split into reference files if longer
5. Use `{baseDir}` to reference files in the skill's own directory
6. Do NOT put "When to Use" in the body — it belongs in description only
7. Include at least 2 example interactions

## Reference Files

For skills that need detailed documentation:

```markdown
## For API schemas
Read `{baseDir}/references/api_docs.md` for endpoint details.

## For complex workflows
Read `{baseDir}/references/workflow.md` for the complete process.
```

Reference files are only loaded when the agent determines they're needed,
keeping the context window lean.

## Helper Scripts

For reliable, repeatable operations, create scripts:

```bash
# In SKILL.md, reference scripts like:
Run the processing script:
python3 {baseDir}/scripts/process_data.py --input "$INPUT" --output "$OUTPUT"
```

Script rules:
- Make them executable: `chmod +x`
- Include a shebang: `#!/usr/bin/env python3` or `#!/bin/bash`
- Accept input via arguments or stdin
- Output to stdout
- Exit with meaningful codes (0 = success, 1 = error)
- Include brief usage comments at the top
