---
name: popup-questions
description: >-
  Present interview and clarification questions via the ask_question popup prompt
  instead of listing them in chat. Use whenever a skill (such as grilling,
  /grill-me, or similar) or task asks the user rounds of questions, design-tree
  decisions, or requirement clarifications.
---

Deliver user-facing interview and clarification questions through the `ask_question` tool (popup prompt) rather than listing them all as inline text in chat.

## Rules

1. **Override inline question templates.** When another skill (such as `grilling` or `/grill-me`) specifies a chat-formatted question list (e.g., `❓ **Q1**`), translate those questions into an `ask_question` call instead of printing the list in your message.
2. **Ask in focused rounds.** Put only settled, independent frontier questions into each `ask_question` call (typically 1–4 questions per popup). Wait for the user's answers before asking dependent follow-up questions.
3. **Structure each popup question cleanly:**
   - `question`: State one clear decision or question with enough context to answer on its own.
   - `options`: List concrete choices, unnumbered and without an `Other` option (the UI adds both). Place your recommended choice first, prefixed with `(Recommended) `.
   - `is_multi_select`: Set `true` only when the user can pick more than one option; otherwise `false`.
4. **Keep trivial prompts in plain text.** For a single trivial yes/no confirmation or a purely open-ended prompt with no meaningful choices, ask directly in plain text.
