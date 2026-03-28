# Common Skill Patterns

## Pattern: API + Parse + Format

For skills that call an API and present results:

```markdown
## Fetching Data
```bash
RESPONSE=$(curl -s "https://api.example.com/endpoint")
echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for item in data['results'][:5]:
    print(f\"- {item['title']}: {item['value']}\")
"
```
```

## Pattern: File Monitoring + Diff

For skills that watch for changes:

```markdown
## Check for Changes
```bash
# Save current state
NEW=$(curl -s "https://example.com/data" | md5sum)
OLD=$(cat {baseDir}/data/last_hash.txt 2>/dev/null || echo "")

if [ "$NEW" != "$OLD" ]; then
    echo "$NEW" > {baseDir}/data/last_hash.txt
    echo "CHANGED"
else
    echo "NO_CHANGE"
fi
```
```

## Pattern: User Data Persistence

For skills that remember user preferences:

```markdown
## Saving User Data
```bash
mkdir -p {baseDir}/data
cat > {baseDir}/data/user_prefs.json << 'EOF'
{json content}
EOF
```

## Loading User Data
```bash
cat {baseDir}/data/user_prefs.json
```
```

## Pattern: Multi-Step Wizard

For skills that need multiple rounds of user input:

```markdown
## Setup Wizard

Step 1: Ask the user for {input_1}.
Step 2: Based on their answer, ask for {input_2}.
Step 3: Confirm all inputs:
  "Here's what I'll set up:
   - Setting A: {input_1}
   - Setting B: {input_2}
   Proceed? (yes/no)"
Step 4: Execute the setup.
```

## Pattern: Scheduled Report

For skills that run on a cron schedule:

```markdown
## Daily Report Generation

1. Gather data:
   ```bash
   # Get today's data
   DATA=$(curl -s "https://api.example.com/daily")
   ```

2. Format report (see Formatting section)

3. Present to user

4. Suggest cron setup if not already configured:
   "Want this daily at 9am? Add to your openclaw.json:
   skills.entries.{skill-name}.cron = '0 9 * * *'"
```

## Pattern: Error Handling Boilerplate

Always include error handling in generated skills:

```markdown
## Error Handling

- If a network request fails: Report the error clearly and suggest retry
- If required data is missing: Tell the user what's needed
- If a file doesn't exist: Create it or inform the user
- If permissions are denied: Suggest the fix (chmod, sudo, etc.)
- If a dependency is missing: Offer to install it
```

## Pattern: Data Storage with JSONL

For skills that accumulate data over time:

```markdown
## Adding a Record
```bash
mkdir -p {baseDir}/data
echo '{"key":"value","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' >> {baseDir}/data/records.jsonl
```

## Reading Records
```bash
cat {baseDir}/data/records.jsonl | python3 -c "
import sys, json
records = [json.loads(line) for line in sys.stdin if line.strip()]
for r in records:
    print(f\"  {r['key']}: {r['timestamp']}\")
print(f\"\nTotal: {len(records)} records\")
"
```

## Clearing Records
```bash
> {baseDir}/data/records.jsonl
echo "All records cleared."
```
```
