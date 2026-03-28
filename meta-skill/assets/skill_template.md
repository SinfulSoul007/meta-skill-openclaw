---
name: {{SKILL_NAME}}
description: >
  {{SKILL_DESCRIPTION}}
version: 1.0.0
{{#IF_ENV_VARS}}
metadata:
  openclaw:
    requires:
      env:
        {{ENV_VARS}}
{{/IF_ENV_VARS}}
{{#IF_BINS}}
metadata:
  openclaw:
    requires:
      bins:
        {{BINS}}
{{/IF_BINS}}
---

# {{SKILL_TITLE}}

## Instructions

{{INSTRUCTIONS}}

## Error Handling

{{ERROR_HANDLING}}

## Examples

{{EXAMPLES}}
