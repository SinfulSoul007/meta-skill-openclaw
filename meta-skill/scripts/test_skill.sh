#!/bin/bash
# Tests a generated skill by verifying its structure and optionally triggering it
# Usage: test_skill.sh <skill-name> [--trigger "test message"]

SKILL_NAME="$1"
TRIGGER_FLAG="$2"
TRIGGER_MSG="$3"

if [ -z "$SKILL_NAME" ]; then
    echo "Usage: test_skill.sh <skill-name> [--trigger \"test message\"]"
    exit 1
fi

SKILL_DIR="$HOME/.openclaw/workspace/skills/$SKILL_NAME"

echo "Testing skill: $SKILL_NAME"
echo "---"

# Check skill directory exists
if [ ! -d "$SKILL_DIR" ]; then
    echo "FAIL: Skill directory not found: $SKILL_DIR"
    exit 1
fi
echo "PASS: Skill directory exists"

# Check SKILL.md exists
if [ ! -f "$SKILL_DIR/SKILL.md" ]; then
    echo "FAIL: SKILL.md not found in $SKILL_DIR"
    exit 1
fi
echo "PASS: SKILL.md exists"

# Run validation
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SCRIPT_DIR/validate_skill.sh" ]; then
    echo ""
    echo "--- Validation ---"
    bash "$SCRIPT_DIR/validate_skill.sh" "$SKILL_DIR/SKILL.md"
    VALID=$?
    if [ "$VALID" -ne 0 ]; then
        echo "FAIL: Validation failed"
        exit 1
    fi
fi

# Check scripts are executable
if [ -d "$SKILL_DIR/scripts" ]; then
    echo ""
    echo "--- Script Checks ---"
    for script in "$SKILL_DIR/scripts/"*; do
        if [ -f "$script" ]; then
            if [ -x "$script" ]; then
                echo "PASS: $script is executable"
            else
                echo "WARNING: $script is not executable (run: chmod +x $script)"
            fi
        fi
    done
fi

# Trigger test if requested
if [ "$TRIGGER_FLAG" = "--trigger" ] && [ -n "$TRIGGER_MSG" ]; then
    echo ""
    echo "--- Trigger Test ---"
    echo "Sending: $TRIGGER_MSG"
    openclaw agent --message "$TRIGGER_MSG" 2>&1
fi

echo ""
echo "--- Result ---"
echo "PASS: Skill '$SKILL_NAME' structure is valid"
