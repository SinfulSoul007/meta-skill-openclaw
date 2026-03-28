# Available OpenClaw Tools

These are the built-in tools that any generated skill can reference in its
instructions. The skill doesn't enable these — it just tells the agent how
to use them. The user must have the tool enabled in their config.

## exec / shell
Run arbitrary shell commands. Most powerful and common tool.
- Run scripts: `python3 script.py`, `bash script.sh`, `node script.js`
- API calls: `curl -s "https://api.example.com/data"`
- File operations: `mkdir`, `cp`, `mv`, `cat`, `grep`, `find`
- System info: `date`, `whoami`, `uname`, `df`
- Package management: `pip install`, `npm install`, `brew install`

## web_search
Search the web. Returns snippets from top results.
- Current events, news, documentation lookups
- Finding API endpoints or documentation

## read
Read file contents. Supports text files, JSON, YAML, etc.

## write
Write content to files. Create or overwrite files.

## browser
Full browser automation (requires browser.enabled in config):
- Navigate to URLs
- Click elements, fill forms
- Take screenshots
- Extract text/data from pages
- Monitor page changes

## Channels (messaging)
Skills don't directly send messages — the agent's response IS the message.
But skills can instruct the agent on how to format responses for the
user's channel (WhatsApp, Telegram, Discord, etc.).

## Cron
Not a tool per se — configured in openclaw.json under the skill's entries.
Skills can suggest cron configurations for the user to add.
