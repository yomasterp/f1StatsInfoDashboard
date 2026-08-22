# Project Directives

This document records standing project directions from the user. Review it before starting or preparing work.

## Repository and version control

- Work only in this repository.
- Do not run Git commands other than `pull`, `fetch`, or commands that create a branch.
- Before performing a commit, push, pull-request action, branch-protection change, or any other otherwise restricted Git or GitHub action, ask the user for explicit confirmation; perform it only after they approve.
- Complete feature and fix work on a dedicated branch to track it through version control.
- Use `feature/work_item` for feature branches.
- Use `fix/work_item` for fix branches.
- When preparing a pull request, use the `prepare-pr` skill and provide a detailed explanation of everything being merged.

## Requirements process

- Read `requirements.md` before project work.
- Tackle requirements in order, using requirement-aligned branch names.
- Mark a requirement complete only after its pull request has been merged and closed; do not mark it complete merely because feature work is finished or its branch has been pushed.
- Add comprehensive automated tests that cover identified gaps, and run ESLint as part of every relevant change.
- Do not confirm work is complete until all relevant tests, type checks, builds, migrations, and ESLint checks pass.
- Run Fallow for relevant TypeScript or JavaScript changes to detect codebase-level risks beyond linting and type checks.
- When Python is introduced, provide and run pytest coverage; add the appropriate formatter, linter, and type checks for production Python code.
- When another language is introduced, add and run that ecosystem's relevant test, lint, formatting, type-checking, and build tooling before confirming work is complete.
- Run the GitHub Actions pull-request checks for every pull request targeting `main`, and require the successful check before merging.
- Record future user directives in this document and refer to them while working.

## Design and user experience

- Build a modern, information-first interface that is easy to scan and pleasant to use on desktop and mobile.
- Use smooth, restrained transitions that respect reduced-motion preferences and never obscure access to information.
- Use an original palette that combines classic motorsport/F1-inspired red, black, and white with warm beige and cool blue accents, while preserving accessible contrast and non-color-only status indicators.
- Take only high-level inspiration from Scuderia Ferrari F1 Team's Instagram presence: editorial pacing, confident contrast, and motorsport energy. Do not copy its imagery, logos, layouts, official fonts, team artwork, or any branding that could imply endorsement.
