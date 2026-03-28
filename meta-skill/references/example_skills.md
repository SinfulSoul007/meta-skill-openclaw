# Example Skills for Few-Shot Learning

Use these as patterns when generating new skills. Each demonstrates a
different capability pattern.

---

## Example 1: API Monitoring Skill (cron + curl + formatting)

```yaml
---
name: stock-price-alert
description: >
  Monitor stock prices and alert when they cross a threshold. Use when the user
  asks to watch a stock, set a price alert, track stock prices, or monitor
  their portfolio. Triggers on "stock", "price alert", "ticker", "portfolio".
version: 1.0.0
---
```

```markdown
# Stock Price Alert

## Instructions

### Setting Up an Alert

When the user wants to track a stock:

1. Ask for the ticker symbol and threshold price (above/below)
2. Save the alert to `{baseDir}/data/alerts.json`:
   ```bash
   mkdir -p {baseDir}/data
   echo '{"ticker":"AAPL","threshold":200,"direction":"above"}' >> {baseDir}/data/alerts.json
   ```

### Checking Prices

To check a stock price:
```bash
curl -s "https://query1.finance.yahoo.com/v8/finance/chart/{TICKER}?interval=1d&range=1d" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d['chart']['result'][0]['meta']['regularMarketPrice'])"
```

### Alert Evaluation

Compare current price against saved thresholds. If triggered:
- Send message: "{TICKER} crossed ${THRESHOLD}! Current price: ${PRICE}"
- Remove the triggered alert from alerts.json

## Error Handling
- If the API returns an error, report: "Couldn't fetch price for {TICKER}. Check the ticker symbol."
- If no alerts are configured, suggest: "No alerts set. Try: 'Alert me when AAPL goes above $200'"

## Examples
User: "Watch TSLA and tell me if it drops below $150"
Agent: "Alert set: I'll notify you when TSLA drops below $150."

User: "What's Apple's stock price?"
Agent: "AAPL is currently trading at $198.50."
```

---

## Example 2: File Organizer Skill (filesystem + shell)

```yaml
---
name: downloads-organizer
description: >
  Organize the Downloads folder by sorting files into subdirectories by type.
  Use when the user says "clean up downloads", "organize my files",
  "sort downloads", or "my downloads folder is a mess".
version: 1.0.0
---
```

```markdown
# Downloads Organizer

## Instructions

When triggered, organize ~/Downloads by file type:

1. Scan the Downloads folder:
   ```bash
   ls -la ~/Downloads/
   ```

2. Create category folders:
   ```bash
   mkdir -p ~/Downloads/{Documents,Images,Videos,Audio,Archives,Code,Other}
   ```

3. Move files by extension:
   ```bash
   # Documents
   mv ~/Downloads/*.{pdf,doc,docx,txt,md,xlsx,csv,pptx} ~/Downloads/Documents/ 2>/dev/null

   # Images
   mv ~/Downloads/*.{jpg,jpeg,png,gif,svg,webp,heic} ~/Downloads/Images/ 2>/dev/null

   # Videos
   mv ~/Downloads/*.{mp4,mov,avi,mkv,webm} ~/Downloads/Videos/ 2>/dev/null

   # Audio
   mv ~/Downloads/*.{mp3,wav,flac,aac,m4a} ~/Downloads/Audio/ 2>/dev/null

   # Archives
   mv ~/Downloads/*.{zip,tar,gz,rar,7z,dmg} ~/Downloads/Archives/ 2>/dev/null

   # Code
   mv ~/Downloads/*.{py,js,ts,html,css,json,yaml,sh} ~/Downloads/Code/ 2>/dev/null
   ```

4. Report what was moved:
   ```bash
   echo "Documents: $(ls ~/Downloads/Documents/ 2>/dev/null | wc -l) files"
   echo "Images: $(ls ~/Downloads/Images/ 2>/dev/null | wc -l) files"
   echo "Videos: $(ls ~/Downloads/Videos/ 2>/dev/null | wc -l) files"
   echo "Audio: $(ls ~/Downloads/Audio/ 2>/dev/null | wc -l) files"
   echo "Archives: $(ls ~/Downloads/Archives/ 2>/dev/null | wc -l) files"
   echo "Code: $(ls ~/Downloads/Code/ 2>/dev/null | wc -l) files"
   ```

## Examples

User: "My downloads folder is a disaster"
Agent: "Let me clean that up! Organized 47 files:
Documents: 12 files | Images: 18 files | Videos: 3 files
Audio: 2 files | Archives: 8 files | Code: 4 files"
```

---

## Example 3: Web Monitoring Skill (browser + cron + notifications)

```yaml
---
name: price-tracker
description: >
  Track product prices on any website and alert on price drops. Use when the
  user wants to monitor a price, track a product, watch for deals, or set up
  price drop alerts. Triggers on "track price", "price drop", "deal alert",
  "monitor price", "watch this product".
version: 1.0.0
metadata:
  openclaw:
    requires:
      config:
        - browser.enabled
---
```

```markdown
# Price Tracker

## Instructions

### Adding a Product to Track

1. User provides a URL
2. Navigate to the URL using browser
3. Extract the product name and current price from the page
4. Save to tracking file:
   ```bash
   echo '{"url":"URL","name":"PRODUCT","price":99.99,"tracked_at":"DATE"}' >> {baseDir}/data/tracked.jsonl
   ```

### Checking Prices (scheduled)

For each tracked product:
1. Open the URL in browser
2. Extract current price
3. Compare with last known price
4. If price dropped:
   - Notify: "Price drop! {PRODUCT} is now ${NEW} (was ${OLD}) -- Save ${DIFF}!"
   - Update tracking file with new price

### Viewing Tracked Products

```bash
cat {baseDir}/data/tracked.jsonl | python3 -c "
import sys, json
for line in sys.stdin:
    p = json.loads(line.strip())
    print(f\"  {p['name']}: \${p['price']} -- {p['url']}\")
"
```

## Error Handling
- If a page structure changed and price can't be found: "Couldn't find the price
  on {URL}. The page layout may have changed. Want me to try again or remove it?"
- If the site blocks access: "This site is blocking automated access. I can try
  again later or you can check manually."
```

---

## Example 4: Text Processing Skill (shell + python script)

```yaml
---
name: meeting-notes-formatter
description: >
  Format rough meeting notes into structured summaries with action items,
  decisions, and key discussion points. Use when the user pastes meeting notes,
  asks to clean up notes, format minutes, or extract action items from a meeting.
version: 1.0.0
---
```

```markdown
# Meeting Notes Formatter

## Instructions

When the user provides raw meeting notes (pasted text or a file):

1. If it's a file, read it:
   ```bash
   cat {filepath}
   ```

2. Analyze the raw notes and extract:
   - **Attendees** mentioned
   - **Key decisions** made
   - **Action items** (who does what by when)
   - **Discussion points** summarized
   - **Open questions** that weren't resolved

3. Format as:

   ```
   # Meeting Notes -- {Date}

   ## Attendees
   - Name 1, Name 2, ...

   ## Key Decisions
   1. Decision with context

   ## Action Items
   - [ ] {Person}: {Task} -- Due: {Date}

   ## Discussion Summary
   Brief paragraphs covering main topics.

   ## Open Questions
   - Question that needs follow-up
   ```

4. Save the formatted notes:
   ```bash
   mkdir -p ~/Documents/meetings
   cat > ~/Documents/meetings/{date}-meeting-notes.md << 'EOF'
   {formatted content}
   EOF
   ```

## Examples

User: *pastes rambling meeting notes*
Agent: "Here are your structured meeting notes:
3 decisions captured
5 action items identified
2 open questions flagged
Saved to ~/Documents/meetings/2026-03-28-meeting-notes.md"
```

---

## Example 5: Multi-Step Automation Skill (shell + web_search + filesystem)

```yaml
---
name: project-bootstrapper
description: >
  Bootstrap a new coding project with the right structure, config files, and
  dependencies. Use when the user says "start a new project", "create a project",
  "bootstrap", "init project", "set up a new repo", or "scaffold".
version: 1.0.0
---
```

```markdown
# Project Bootstrapper

## Instructions

When the user wants to create a new project:

1. Ask what kind of project (or infer from context):
   - Python package
   - Node.js/TypeScript app
   - React app
   - FastAPI backend
   - CLI tool

2. Ask for the project name (or use a reasonable default)

3. Generate the project structure. Example for Python:
   ```bash
   mkdir -p {name}/{name} tests docs
   cd {name}

   # Create files
   cat > pyproject.toml << 'EOF'
   [project]
   name = "{name}"
   version = "0.1.0"
   requires-python = ">=3.10"
   EOF

   cat > {name}/__init__.py << 'EOF'
   """{name} - {description}"""
   __version__ = "0.1.0"
   EOF

   cat > README.md << 'EOF'
   # {name}
   {description}
   ## Setup
   pip install -e .
   EOF

   touch tests/__init__.py
   echo ".venv/" > .gitignore

   git init
   git add .
   git commit -m "Initial project structure"
   ```

4. Report what was created:
   ```bash
   find {name} -type f | head -20
   ```

## Examples

User: "Start a new Python project called datawizbang"
Agent: "Created project 'datawizbang':
- pyproject.toml
- datawizbang/__init__.py
- tests/__init__.py
- README.md
- .gitignore
Git initialized with first commit. Ready to code!"
```

---

## Example 6: Daily Digest Skill (web_search + cron)

```yaml
---
name: hacker-news-digest
description: >
  Monitor Hacker News and send a daily digest of top stories. Use when the user
  asks for tech news, HN updates, top stories, or wants a daily news briefing.
  Triggers on "hacker news", "HN", "tech news", "top stories".
version: 1.0.0
---
```

```markdown
# Hacker News Daily Digest

## Instructions

When triggered, fetch the top stories from Hacker News and present a summary.

### Fetching Stories

1. Fetch top story IDs:
   ```bash
   curl -s "https://hacker-news.firebaseio.com/v0/topstories.json" | python3 -c "import sys,json; ids=json.load(sys.stdin)[:10]; print('\n'.join(str(i) for i in ids))"
   ```

2. For each story ID, fetch details:
   ```bash
   curl -s "https://hacker-news.firebaseio.com/v0/item/{id}.json"
   ```

### Formatting

Present stories as:
- **Title** (score points, N comments)
  Link: {url}
  Brief: One-sentence summary of what the article is about.

### Cron Setup

If the user wants daily delivery, suggest adding to openclaw.json:
```json
{
  "skills": {
    "entries": {
      "hacker-news-digest": {
        "cron": "0 8 * * *"
      }
    }
  }
}
```

## Error Handling
- If the HN API is down: "Hacker News API is currently unreachable. Try again in a few minutes."
- If a story has no URL (Ask HN, Show HN text posts): Display the title and link to the HN discussion page.

## Examples

User: "What's trending on Hacker News?"
Agent: "Here are today's top HN stories:
1. **New Rust compiler achieves 40% faster builds** (482 pts, 127 comments)
   https://example.com/rust-compiler
2. **Show HN: I built a local-first database** (315 pts, 89 comments)
   https://example.com/local-db
..."
```

---

## Example 7: Reminder Skill (cron + notifications)

```yaml
---
name: smart-reminder
description: >
  Set reminders with natural language time expressions. Use when the user says
  "remind me", "set a reminder", "don't let me forget", "alert me at",
  or "remember to". Handles relative times like "in 30 minutes" and absolute
  times like "at 3pm tomorrow".
version: 1.0.0
---
```

```markdown
# Smart Reminder

## Instructions

### Setting a Reminder

1. Parse the user's message for:
   - What to remind them about
   - When (relative or absolute time)

2. Convert time to a cron expression or timestamp:
   - "in 30 minutes" -> calculate absolute time from now
   - "at 3pm" -> 0 15 * * *
   - "every Monday" -> 0 9 * * 1
   - "tomorrow morning" -> 0 9 {tomorrow's date}

3. Save the reminder:
   ```bash
   mkdir -p {baseDir}/data
   echo '{"message":"REMINDER_TEXT","time":"CRON_OR_TIMESTAMP","created":"NOW"}' >> {baseDir}/data/reminders.jsonl
   ```

4. Confirm: "Reminder set: '{REMINDER_TEXT}' at {HUMAN_READABLE_TIME}"

### Listing Reminders

```bash
cat {baseDir}/data/reminders.jsonl 2>/dev/null | python3 -c "
import sys, json
for i, line in enumerate(sys.stdin, 1):
    r = json.loads(line.strip())
    print(f\"  {i}. {r['message']} -- {r['time']}\")
" || echo "No reminders set."
```

## Examples

User: "Remind me to submit the report at 5pm"
Agent: "Reminder set: 'Submit the report' at 5:00 PM today."

User: "Don't let me forget to call Mom on Sunday"
Agent: "Reminder set: 'Call Mom' for Sunday at 9:00 AM."
```
