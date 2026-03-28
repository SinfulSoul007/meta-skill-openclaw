#!/bin/bash
# Meta-Skill Setup Script
# Deploys the meta-skill to the OpenClaw workspace skills directory

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SKILL_SOURCE="$PROJECT_DIR/meta-skill"
SKILL_TARGET="$HOME/.openclaw/workspace/skills/meta-skill"

echo "=== Meta-Skill Setup ==="
echo ""

# Check OpenClaw is installed
if ! command -v openclaw &> /dev/null; then
    echo "ERROR: OpenClaw is not installed."
    echo "Install it with: npm install -g openclaw@latest"
    echo "Then run: openclaw onboard --install-daemon"
    exit 1
fi
echo "PASS: OpenClaw is installed ($(openclaw --version 2>/dev/null || echo 'version unknown'))"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed."
    echo "Install it with: brew install node@22"
    exit 1
fi
echo "PASS: Node.js is installed ($(node --version))"

# Check for API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo ""
    echo "WARNING: ANTHROPIC_API_KEY is not set."
    echo "Run: cp .env.example .env && nano .env"
    echo "Then: set -a && source .env && set +a"
fi

# Create workspace skills directory
mkdir -p "$HOME/.openclaw/workspace/skills"
echo "PASS: Workspace skills directory exists"

# Deploy meta-skill
if [ -d "$SKILL_TARGET" ]; then
    echo ""
    echo "Meta-skill already exists at $SKILL_TARGET"
    read -p "Overwrite? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping deployment. Existing skill preserved."
        exit 0
    fi
    rm -rf "$SKILL_TARGET"
fi

# Copy skill files
cp -r "$SKILL_SOURCE" "$SKILL_TARGET"
echo "PASS: Meta-skill deployed to $SKILL_TARGET"

# Make scripts executable
chmod +x "$SKILL_TARGET/scripts/"*.sh
echo "PASS: Scripts made executable"

# Verify deployment
echo ""
echo "--- Verifying deployment ---"
bash "$SKILL_TARGET/scripts/validate_skill.sh" "$SKILL_TARGET/SKILL.md"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "The meta-skill is now deployed. To use it:"
echo ""
echo "  1. Start OpenClaw:  openclaw gateway"
echo "  2. Say:  'Create a skill that tells me a random joke'"
echo "  3. Watch it generate a complete skill automatically!"
echo ""
echo "Skill location: $SKILL_TARGET"
echo ""
echo "Files deployed:"
find "$SKILL_TARGET" -type f | sort | while read -r f; do
    echo "  $(echo "$f" | sed "s|$SKILL_TARGET/||")"
done
