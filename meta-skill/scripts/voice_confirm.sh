#!/bin/bash
# voice_confirm.sh — ElevenLabs TTS voice confirmation for deployed skills
# Usage: bash voice_confirm.sh "<skill-name>" "<trigger phrase>"

SKILL_NAME="$1"
TRIGGER_PHRASE="$2"

# Skip gracefully if no API key
if [ -z "$ELEVENLABS_API_KEY" ]; then
  echo "[voice_confirm] ELEVENLABS_API_KEY not set — skipping voice confirmation."
  exit 0
fi

# Check curl is available
if ! command -v curl &>/dev/null; then
  echo "[voice_confirm] curl not found — skipping voice confirmation."
  exit 0
fi

VOICE_ID="21m00Tcm4TlvDq8ikWAM"
OUTPUT_FILE="/tmp/skillforge-${SKILL_NAME}.mp3"
MESSAGE="Skill deployed: ${SKILL_NAME}. Try it out by saying: ${TRIGGER_PHRASE}."

# Call ElevenLabs TTS API
HTTP_STATUS=$(curl -s -o "$OUTPUT_FILE" -w "%{http_code}" \
  -X POST "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"text\": \"${MESSAGE}\",
    \"model_id\": \"eleven_multilingual_v2\",
    \"voice_settings\": {
      \"stability\": 0.5,
      \"similarity_boost\": 0.75
    }
  }")

if [ "$HTTP_STATUS" != "200" ]; then
  echo "[voice_confirm] ElevenLabs API returned HTTP $HTTP_STATUS — skipping voice confirmation."
  rm -f "$OUTPUT_FILE"
  exit 0
fi

# Verify file is non-empty
if [ ! -s "$OUTPUT_FILE" ]; then
  echo "[voice_confirm] Audio file empty — skipping."
  rm -f "$OUTPUT_FILE"
  exit 0
fi

# Send via OpenClaw
if command -v openclaw &>/dev/null; then
  openclaw message send --media "$OUTPUT_FILE" --message "🔊 Skill '${SKILL_NAME}' is live!" 2>/dev/null \
    && echo "[voice_confirm] Voice confirmation sent." \
    || echo "[voice_confirm] openclaw message send failed — skipping."
else
  echo "[voice_confirm] openclaw not found — audio saved to $OUTPUT_FILE but not sent."
fi

# Cleanup
rm -f "$OUTPUT_FILE"
