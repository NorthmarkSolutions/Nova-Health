# HMS Agent Team — Antigravity Setup Guide

Same seven personas as the Claude Code version, reformatted for Antigravity's
custom-agent schema. A couple of honest caveats up front:

- Antigravity's custom-agent support is genuinely new (shipped with
  Antigravity 2.0 / the Antigravity CLI; IDE support is still catching up
  per Google's own announcement). The field names below are the ones
  confirmed in Google's documentation and blog post as of now —
  `name`, `description`, `commandExecutionPolicy`. If you add fields like
  `model`, `tools`, `skills`, or `mcpServers` and one gets rejected, that
  field likely isn't live in your build yet — check Google's current
  Custom Agents Guide (linked from antigravity.google/blog/introducing-custom-agents)
  before assuming the file is broken.
- I kept the frontmatter minimal and put all the real instruction in the
  Markdown body, which is the part guaranteed to work regardless of which
  optional fields your Antigravity version supports.

## Step 1 — Place the files

```
your-hms-project/
└── .agents/
    └── agents/
        ├── product-manager.md
        ├── design-agent.md
        ├── database-agent.md
        ├── backend-agent.md
        ├── frontend-agent.md
        ├── testing-agent.md
        └── documentation-agent.md
```

This is the **workspace-scoped** location — commit it to your repo so the
whole agent team travels with the project. (There's also a **global**
location, `~/.gemini/config/agents/`, if you ever want an agent available
across every project — not what you want for HMS-specific personas.)

## Step 2 — Open the project in Antigravity

Open `your-hms-project` as a workspace in the Antigravity IDE, or launch
via the CLI:

```bash
cd your-hms-project
agy
```

## Step 3 — Confirm the agents are recognized

Antigravity gives custom agents **execution symmetry** — unlike Claude
Code's subagents, you can either:
- Select an agent directly from the agent dropdown in the IDE (or
  `agy --agent product-manager` from the CLI) and talk to it as your main
  session, or
- Let a coordinator (`product-manager`) delegate to the others as
  subagents during a normal session.

Check the agent dropdown / `agy --list-agents` (or equivalent in your
version) to confirm all seven loaded.

## Step 4 — Kick off planning

Same pattern as Claude Code: put the roadmap and the enterprise spec
where product-manager can read them (e.g. `docs/hms-roadmap.md`,
`docs/enterprise-hms-spec.md`), then either select `product-manager`
directly or prompt your main session:

```
Use the product-manager agent to read docs/hms-roadmap.md and
docs/enterprise-hms-spec.md. Have it ask design-agent, database-agent,
backend-agent, frontend-agent, testing-agent, and documentation-agent for
their plan for Phase 1 (Reception, OPD, Billing), then compile one unified
step-by-step plan for me to review before anyone writes code.
```

## Step 5 — Review, greenlight, repeat per phase

Same "plan → your approval → design → database → backend → frontend →
testing → docs" loop as the Claude Code version. Repeat for Phase 2
(Laboratory, IPD) and Phase 3 (Operation Theatre).

## `commandExecutionPolicy` — what I set and why

- `database-agent`, `backend-agent`, `frontend-agent`, `testing-agent`:
  `commandExecutionPolicy: auto` — these need to run migrations, dev
  servers, and test suites repeatedly; `auto` lets standard build/test
  commands run without a prompt every time, while Antigravity's own
  dedicated execution filter still gates genuinely risky commands (like
  deletions) behind manual approval regardless of this setting.
- `product-manager`, `design-agent`, `documentation-agent`: left unset
  (default/manual) — these agents plan, write specs, and write docs; they
  shouldn't be running shell commands autonomously in the first place.

If your Antigravity version exposes finer-grained permission levels
(`acceptEdits`, `bypassPermissions`) or the nested lifecycle-hooks schema
(`PreInvocation`, `PreToolUse`), those are worth layering in once you've
confirmed the exact syntax from the docs — I didn't guess at that schema
here since I couldn't verify it precisely.

## Difference from the Claude Code version, at a glance

| | Claude Code | Antigravity |
|---|---|---|
| Folder | `.claude/agents/` | `.agents/agents/` |
| Model backend | Claude (Opus/Sonnet/Haiku) | Gemini |
| Model pinned per agent? | Yes (`model:` field) | Set via IDE's "Change Model" per agent, not in frontmatter here |
| Tool restriction field | `tools:` | Not set here — see caveat above |
| Can you talk to a specialist directly? | No, subagent-only | Yes — execution symmetry |
