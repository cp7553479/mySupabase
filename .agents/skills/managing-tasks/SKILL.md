---
name: managing-tasks
description: Creates, updates, completes, fails, and reviews task Markdown files. Use when the user asks to create a task, change a task, mark a task complete or failed, or review task status.
---

# Managing Tasks

Read the project instructions, requirements document, and relevant task file before making a task change. Use the task directory defined by the project.

## Create

1. Check for an existing matching task.
2. If the requirement is unclear, ask for the smallest missing detail.
3. Create the task file with a concise descriptive name and use this format:

```md
1. [ ] **TASK-001 | Task Title**
   - Work and acceptance criteria; not started.
```

Use the next unused `TASK-###` number. Do not create duplicate tasks.

## Update

Edit the existing task file. Keep the task ID and update its single detail/status line.

## Complete or fail

- Use `[x]` only after the result is verified.
- Use `[!]` when execution fails; state the brief reason and next step.
- Keep `[ ]` for work that is not complete.

## Review Status

Read all relevant task Markdown files and report each task as pending, completed, or failed. Identify missing information or blockers without changing task files.
