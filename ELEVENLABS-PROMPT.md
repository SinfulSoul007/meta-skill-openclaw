# Build Prompt: ElevenLabs Voice Integration for Meta-Skill

You are adding **voice output** to the Meta-Skill project — an OpenClaw skill that generates other skills. After the Meta-Skill creates and deploys a new skill, it should generate a spoken voice confirmation and send it as an audio message via Telegram.

## Context

The Meta-Skill lives at `~/.openclaw/workspace/skills/meta-skill/`. When it generates a new skill, it writes files to `~/.openclaw/workspace/skills/{skill-name}/`. Right now, it sends a text confirmation. We want it to ALSO send an audio confirmation using ElevenLabs TTS.

OpenClaw supports sending audio via: `openclaw message send --media <filepath>`

The ElevenLabs API key is stored in the environment variable `ELEVENLABS_API_KEY`.

## What to Build

### 1. Voice generation script: `meta-skill/scripts/voice_confirm.sh`

A bash script that:
- Takes a skill name and a trigger phrase as arguments
- Constructs a short, natural confirmation message like: "Skill deployed: {name}. Try it out by saying: {trigger phrase}."
- Calls the ElevenLabs TTS API to generate audio
- Saves the audio to `/tmp/skillforge-{name}.mp3`
- Sends it via `openclaw message send --media /tmp/skillforge-{name}.mp3 --message "🔊 Skill '{name}' is live!"`
- Cleans up the temp file after sending

**ElevenLabs API call:**
```bash
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "MESSAGE_HERE",
    "model_id": "eleven_multilingual_v2",
    "voice_settings": {
      "stability": 0.5,
      "similarity_boost": 0.75
    }
  }' \
  --output /tmp/skillforge-SKILLNAME.mp3
```

The voice ID `21m00Tcm4TlvDq8ikWAM` is the default "Rachel" voice. It's fine for demos.

**The script must:**
- Check that `ELEVENLABS_API_KEY` is set, skip gracefully if not (don't break the skill)
- Check that `curl` is available
- Handle API errors (rate limit, bad key) gracefully — print a warning but don't fail the skill deployment
- Be executable (`chmod +x`)
- Work on macOS

### 2. Update `meta-skill/SKILL.md`

Add a new **Step 7.5** (between the current validate and test steps) in the Core Workflow section. After validation passes, run the voice confirmation:

```markdown
### Step 7.5: Voice Confirmation (if ElevenLabs is configured)

If the ELEVENLABS_API_KEY environment variable is set, generate a spoken confirmation:

```bash
bash {baseDir}/scripts/voice_confirm.sh "{skill-name}" "{example trigger phrase}"
```

This sends an audio message to the user confirming the skill was deployed.
If ELEVENLABS_API_KEY is not set, skip this step silently.
```

**Important:** This step must be optional. If ElevenLabs is not configured, the skill should work exactly as before. The voice is a bonus, not a requirement.

### 3. Update the SKILL.md frontmatter

Add `ELEVENLABS_API_KEY` as an optional env requirement. Update the metadata section:

```yaml
metadata:
  openclaw:
    requires:
      bins:
        - node
      env:
        - ELEVENLABS_API_KEY
```

### 4. Update `.env.example`

Add this line to the project's `.env.example`:

```
# ElevenLabs API key (optional — enables voice confirmations)
# Get a free key at: https://elevenlabs.io
ELEVENLABS_API_KEY=
```

### 5. Also update `.env` if it exists

Add the same `ELEVENLABS_API_KEY=` line (empty, user fills it in).

## Testing

1. Set your ElevenLabs API key: `export ELEVENLABS_API_KEY=your_key_here`
2. Run the script directly:
   ```bash
   bash meta-skill/scripts/voice_confirm.sh "test-skill" "test my skill"
   ```
3. Check that `/tmp/skillforge-test-skill.mp3` was created and is a valid audio file
4. If OpenClaw is running, verify the audio message appears in Telegram

## Important Notes

- Do NOT break existing functionality. Voice is additive only.
- The script should complete in under 5 seconds (ElevenLabs is fast)
- Keep the spoken text SHORT — one sentence, max two. Don't narrate an essay.
- If the API fails, log a warning and move on. Never block skill deployment for voice.
- Only modify these files:
  - `meta-skill/scripts/voice_confirm.sh` (new)
  - `meta-skill/SKILL.md` (add step 7.5 + update frontmatter)
  - `.env.example` (add ELEVENLABS_API_KEY line)
  - `.env` (add ELEVENLABS_API_KEY line if file exists)
