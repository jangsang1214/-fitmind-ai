# GARANG Today Rebuild v1

## Goal
Rebuild Today from functional contracts instead of layering a new theme over legacy presentation.

## Preserved contracts
- State Intelligence remains the state source.
- Decision Intelligence remains the decision owner.
- Plan Execution remains the daily-plan truth source.
- Existing router and canonical mutation owners remain unchanged.
- Existing app shell navigation remains functional.

## New presentation ownership
- `06_features/ui/runtime/garang-today-rebuild-v1.js` renders a fresh Today DOM.
- `03_styles/runtime/garang-rebuild-system-v1.css` owns the rebuild visual system.
- Legacy Today DOM remains mounted only for rollback/canonical action compatibility and is hidden from presentation while the rebuild is active.

## Visual system
One coherent palette only:
- ink black background
- warm ivory primary text
- neutral warm gray secondary hierarchy
- restrained vermilion as the only brand accent

Status differences should primarily use typography, opacity, spacing, line weight, and progress amount instead of independent semantic colors.

## Hierarchy
GARANG decision -> current state -> training/recovery/nutrition -> one next action -> progressive disclosure evidence.

## Motion
The legacy accumulation/ink-water motion loader is disabled on this rebuild branch. Decorative water/drop animation is not part of the new system.

## Acceptance criteria
1. Today does not use legacy cards/orbs/moon-jar visuals as its presentation base.
2. Today data still comes from existing deterministic GARANG intelligence contracts.
3. Route/action behavior still uses existing owners.
4. No decorative water/drop animation loads.
5. Desktop/mobile remain usable without overflow or clipped primary actions.
6. Main is not merged until Founder visual approval and release-gate evidence.
