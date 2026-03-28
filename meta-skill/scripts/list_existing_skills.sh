#!/bin/bash
# Lists all existing workspace and managed skills to avoid name collisions
# Usage: list_existing_skills.sh

echo "=== Workspace Skills ==="
if [ -d ~/.openclaw/workspace/skills ]; then
    FOUND=0
    for skill_dir in ~/.openclaw/workspace/skills/*/; do
        if [ -f "$skill_dir/SKILL.md" ]; then
            NAME=$(grep "^name:" "$skill_dir/SKILL.md" | head -1 | sed 's/name: *//')
            DESC=$(grep -A3 "^description:" "$skill_dir/SKILL.md" | head -1 | sed 's/description: *//' | cut -c1-80)
            VERSION=$(grep "^version:" "$skill_dir/SKILL.md" | head -1 | sed 's/version: *//')
            LINES=$(wc -l < "$skill_dir/SKILL.md" | tr -d ' ')

            # Check for scripts
            SCRIPTS=""
            if [ -d "$skill_dir/scripts" ]; then
                SCRIPT_COUNT=$(ls "$skill_dir/scripts/" 2>/dev/null | wc -l | tr -d ' ')
                SCRIPTS=" | $SCRIPT_COUNT scripts"
            fi

            echo "  $NAME (v${VERSION:-0.0.0}) -- ${LINES} lines${SCRIPTS}"
            echo "    $DESC"
            FOUND=$((FOUND + 1))
        fi
    done
    if [ "$FOUND" -eq 0 ]; then
        echo "  (no skills found)"
    fi
    echo "  Total: $FOUND workspace skill(s)"
else
    echo "  (directory not found)"
fi

echo ""
echo "=== Managed Skills ==="
if [ -d ~/.openclaw/skills ]; then
    FOUND=0
    for skill_dir in ~/.openclaw/skills/*/; do
        if [ -f "$skill_dir/SKILL.md" ]; then
            NAME=$(grep "^name:" "$skill_dir/SKILL.md" | head -1 | sed 's/name: *//')
            echo "  $NAME"
            FOUND=$((FOUND + 1))
        fi
    done
    if [ "$FOUND" -eq 0 ]; then
        echo "  (no skills found)"
    fi
    echo "  Total: $FOUND managed skill(s)"
else
    echo "  (directory not found)"
fi
