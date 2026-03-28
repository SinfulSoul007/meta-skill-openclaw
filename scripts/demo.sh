#!/bin/bash
# Demo helper script
# Shows the skills directory in real-time as skills are generated

SKILLS_DIR="$HOME/.openclaw/workspace/skills"

echo "=== Meta-Skill Live Demo ==="
echo "Watching: $SKILLS_DIR"
echo "Press Ctrl+C to stop"
echo ""
echo "--- Current Skills ---"
ls -la "$SKILLS_DIR" 2>/dev/null || echo "(empty)"
echo ""
echo "--- Watching for changes... ---"

# Use fswatch if available, otherwise fall back to polling
if command -v fswatch &> /dev/null; then
    fswatch -r "$SKILLS_DIR" | while read -r event; do
        echo ""
        echo "[$(date '+%H:%M:%S')] Change detected!"
        echo "--- Skills ---"
        for skill_dir in "$SKILLS_DIR"/*/; do
            if [ -f "$skill_dir/SKILL.md" ]; then
                NAME=$(grep "^name:" "$skill_dir/SKILL.md" | head -1 | sed 's/name: *//')
                echo "  $NAME"
            fi
        done
    done
else
    echo "(Install fswatch for real-time updates: brew install fswatch)"
    echo "Polling every 2 seconds instead..."
    LAST=""
    while true; do
        CURRENT=$(ls "$SKILLS_DIR" 2>/dev/null | sort | md5sum)
        if [ "$CURRENT" != "$LAST" ]; then
            LAST="$CURRENT"
            echo ""
            echo "[$(date '+%H:%M:%S')] Skills directory updated:"
            for skill_dir in "$SKILLS_DIR"/*/; do
                if [ -f "$skill_dir/SKILL.md" ]; then
                    NAME=$(grep "^name:" "$skill_dir/SKILL.md" | head -1 | sed 's/name: *//')
                    echo "  $NAME"
                fi
            done
        fi
        sleep 2
    done
fi
