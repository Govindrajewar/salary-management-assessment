# AI Usage

This project was built with an AI coding assistant (Claude Code) as a pair-programming tool, under direct review at every step.

## Where it helped
- Scaffolding boilerplate: Django app/migration structure, DRF serializers/viewsets, Vite/React/TS project setup, shadcn/ui component wiring.
- Generating the test suites (backend `pytest` and frontend Vitest/RTL) from a described scope, then reviewing and adjusting assertions.
- Drafting this documentation set (requirements, architecture, data model, API design, decisions, trade-offs, testing strategy, performance) from the actual implemented code, to keep docs and code in sync rather than aspirational.

## What stayed human-driven
- Domain decisions: what's in/out of scope, how currency segmentation works, the audit-trail and optimistic-concurrency design — see decisions.md.
- Every generated change was read and reasoned about before being kept; nothing was committed without understanding what it does and why.

## Why disclose this
Transparency about tooling is part of an honest account of how the work was produced, same as crediting a library or a reference implementation.
