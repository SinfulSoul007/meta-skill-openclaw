#!/bin/bash
# Validates a generated SKILL.md file
# Usage: validate_skill.sh <path-to-SKILL.md>

SKILL_FILE="$1"

if [ -z "$SKILL_FILE" ]; then
    echo "Usage: validate_skill.sh <path-to-SKILL.md>"
    exit 1
fi

if [ ! -f "$SKILL_FILE" ]; then
    echo "ERROR: File not found: $SKILL_FILE"
    exit 1
fi

ERRORS=0
WARNINGS=0

echo "Validating: $SKILL_FILE"
echo "---"

# Check frontmatter exists
if ! head -1 "$SKILL_FILE" | grep -q "^---$"; then
    echo "ERROR: Missing YAML frontmatter (must start with ---)"
    ERRORS=$((ERRORS + 1))
fi

# Check name field
if ! grep -q "^name:" "$SKILL_FILE"; then
    echo "ERROR: Missing 'name' field in frontmatter"
    ERRORS=$((ERRORS + 1))
else
    NAME=$(grep "^name:" "$SKILL_FILE" | head -1 | sed 's/name: *//')
    if echo "$NAME" | grep -q "[A-Z ]"; then
        echo "WARNING: Skill name should be kebab-case: $NAME"
        WARNINGS=$((WARNINGS + 1))
    fi
    echo "  Name: $NAME"
fi

# Check description field
if ! grep -q "^description:" "$SKILL_FILE"; then
    echo "ERROR: Missing 'description' field in frontmatter"
    ERRORS=$((ERRORS + 1))
else
    # Get description length (including multi-line)
    DESC_LEN=$(awk '/^description:/{found=1} found && /^[a-z]/ && !/^description:/{found=0} found{print}' "$SKILL_FILE" | wc -c)
    if [ "$DESC_LEN" -lt 30 ]; then
        echo "WARNING: Description seems too short. Include trigger phrases."
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Check closing frontmatter
FRONTMATTER_CLOSES=$(grep -c "^---$" "$SKILL_FILE")
if [ "$FRONTMATTER_CLOSES" -lt 2 ]; then
    echo "ERROR: Frontmatter not properly closed (needs opening and closing ---)"
    ERRORS=$((ERRORS + 1))
fi

# Check body has content
BODY_LINES=$(awk '/^---$/{n++; next} n>=2' "$SKILL_FILE" | wc -l)
if [ "$BODY_LINES" -lt 5 ]; then
    echo "WARNING: Skill body seems very short ($BODY_LINES lines)"
    WARNINGS=$((WARNINGS + 1))
fi

# Check for anti-patterns
if awk '/^---$/{n++; next} n>=2' "$SKILL_FILE" | grep -qi "when to use this skill"; then
    echo "WARNING: 'When to Use' section found in body -- move trigger info to description"
    WARNINGS=$((WARNINGS + 1))
fi

if grep -q "API_KEY\|SECRET\|PASSWORD\|TOKEN" "$SKILL_FILE"; then
    if ! grep -q "requires:" "$SKILL_FILE"; then
        echo "WARNING: References credentials but no requires.env in frontmatter"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Check for hardcoded secrets (actual values, not placeholders)
if grep -qE '(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|xoxb-[0-9]+-[a-zA-Z0-9]+)' "$SKILL_FILE"; then
    echo "ERROR: Possible hardcoded API key detected! Remove it immediately."
    ERRORS=$((ERRORS + 1))
fi

# Line count check
TOTAL_LINES=$(wc -l < "$SKILL_FILE")
if [ "$TOTAL_LINES" -gt 500 ]; then
    echo "WARNING: Skill is $TOTAL_LINES lines. Consider splitting into reference files."
    WARNINGS=$((WARNINGS + 1))
fi

# Check for example interactions
if ! grep -qi "example" "$SKILL_FILE"; then
    echo "WARNING: No example interactions found. Add at least 2 examples."
    WARNINGS=$((WARNINGS + 1))
fi

# Check for error handling
if ! grep -qi "error" "$SKILL_FILE"; then
    echo "WARNING: No error handling section found."
    WARNINGS=$((WARNINGS + 1))
fi

echo "---"
echo "Lines: $TOTAL_LINES | Errors: $ERRORS | Warnings: $WARNINGS"

if [ "$ERRORS" -eq 0 ]; then
    echo "PASS: Validation passed!"
    exit 0
else
    echo "FAIL: Validation failed with $ERRORS error(s)"
    exit 1
fi
