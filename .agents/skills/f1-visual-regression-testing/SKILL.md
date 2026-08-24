---
name: f1-visual-regression-testing
description: Create or review deterministic visual and behavioral regression tests for F1 dashboard charts, responsive layouts, and presentation states. Use for screenshot or rendered-chart stability, not general end-to-end navigation.
---

# F1 Visual Regression Testing

Use visual baselines selectively for relationships that functional assertions cannot adequately protect.

## Before taking screenshots

Assert the underlying chart or component contract first:

- correct series, driver or constructor identity, units, axes, and ordering;
- correct unavailable, partial, stale, empty, and error messages;
- accessible labels, legends, controls, and non-color-only distinctions;
- position 1 at the top of position charts;
- explicit gaps for missing laps and clear invalid, pit, retirement, or inferred states.

A screenshot must not be the only evidence that the data is correct.

## Deterministic rendering

- Use a fixed viewport, device scale, timezone, locale, current time, dataset, and color scheme.
- Wait for fonts and chart rendering to finish.
- Disable nondeterministic transitions for capture while separately testing reduced-motion support.
- Seed stable lap, stint, position, comparison, and news examples; do not fetch live data.
- Mask only genuinely variable, irrelevant regions. Do not mask the feature under test.
- Prefer component or focused-region captures over full-page baselines when the regression surface is local.

## Baseline scope

Capture high-value states rather than every permutation:

- dense and sparse lap-time series;
- mixed compounds and incomplete tire stints;
- retirements and missing position data;
- desktop and mobile comparison layouts;
- long names, large values, empty data, and stale-data notices;
- light/dark modes only if both are supported.

Review a baseline update as a product change. Do not automatically accept new images because a branch changed CSS.

## Failure review

Classify failures as expected design change, rendering nondeterminism, environment drift, or real regression. Fix the cause rather than increasing pixel tolerance until the test passes. Keep baseline artifacts small and document the command and platform used to update them.
