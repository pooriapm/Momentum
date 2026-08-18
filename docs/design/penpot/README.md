# Momentum in Penpot

The current design lives in the existing personal Penpot file:

- Name: `Momentum — Product Design System`
- File ID: `3be9e5e1-190f-8090-8008-7628f4bfdd92`

Do not create a replacement file or run an old page-builder against this file.
The retired builders embedded the superseded Indigo/Violet/Coral direction and
the former six-page structure, so they were removed from the repository.

## Canonical token source

[`../tokens.json`](../tokens.json) is authoritative. It contains the Human
Strength palette, Light and Dark modes, and the Liquid Glass v1.1 contract.

`momentum.tokens.json` is only a generated Penpot import artifact. Regenerate it
after changing the canonical token contract:

```sh
npm run design:penpot-tokens
```

Then import the regenerated artifact into the existing Momentum file. Never let
an older exported artifact override the canonical tokens.

## Current page structure

1. `00 · Cover & Getting Started`
2. `01 · Foundations`
3. `02 · Components`
4. `03 · Public + Auth`
5. `04 · Onboarding`
6. `05 · Subscription + Lifecycle`
7. `06 · Today + Execution`
8. `07 · Plan`
9. `08 · Progress`
10. `09 · Me + Account`
11. `10 · Prototype + Handoff`

Penpot is the spatial-composition and prototype source. Storybook is the
executable state and motion source. Product meaning and the exact 132-state
ledger come from the PRD and screen-state inventory.

## Editing rule

Use the connected Penpot MCP session to inspect and make bounded changes in the
existing file. Before writing, confirm the file ID and active page. Do not run a
bulk builder, delete boards by legacy prefixes, or touch another Penpot project.

For continuation context and the current stopping point, read
[`../HANDOFF.md`](../HANDOFF.md).
