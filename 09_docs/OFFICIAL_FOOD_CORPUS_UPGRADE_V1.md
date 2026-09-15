# Official Food Corpus Upgrade v1

Date: 2026-09-15

## Purpose

Replace fabricated/approximate nutrition values with traceable official values without changing GARANG food IDs, names, aliases, categories, serving labels, or product navigation.

This stage is deliberately fail-closed. Ambiguous branded products and semantic mismatches are not auto-promoted.

## Founder-provided official source evidence

- `20260828_음식DB_19617건.xlsx`
  - SHA-256: `1ef3551f9a1d0ee87891d6306fa22bbd6a7ffcc90f2c70a4a184dbfe3fce6ea6`
  - rows: 19,617
- duplicate upload `20260828_음식DB_19617건 (1).xlsx`
  - identical SHA-256, ignored as duplicate
- `20260828_가공식품DB_316734건.xlsx`
  - SHA-256: `b074d98e75d2d087dc1b193f0056affbf9afd14524c9ccb556cb2b20978504f7`
  - reserved for manual/branded matching; not used for automatic replacement in v1
- `식품성분표(10개정판).xlsx`
  - SHA-256: `271cc431f2991b3c0c049ec6e05fb59a040319e984ab71468184530de61dec50`
  - reserved for later raw-ingredient mapping; not used for automatic replacement in v1

## Automatic replacement policy

The source pool contains 482 K-FIND rows satisfying:

1. `식품기원명 = 가정식(분석 함량)`
2. `영양성분함량기준량 = 100g`
3. all ten GARANG-tracked nutrient values are present
4. a traceable K-FIND record ID exists

The first committed safe batch is intentionally only five exact primary-name matches: `현미밥`, `잡곡밥`, `보리밥`, `하이라이스`, `카스텔라`.

Auto-apply additionally requires:

- exact normalized primary-name match; aliases are not used
- target is not already verified
- packaged-serving semantic risk (`봉`, `팩`, `캔`, `병`) is excluded
- explicit semantic denylist is respected (`라면` in v1)

## Safety invariants

- canonical food count remains 500
- `food_id`, name, aliases, category, serving, and order are preserved
- only nutrition fields, quality, and provenance are replaced
- no UI/runtime navigation change
- no Coach/LLM ownership change
- no state mutation contract change
- no credentials or portal secrets are stored

## Files

- `04_data/knowledge/kfind-home-analyzed-v1.json`: compact official safe-batch source records and source hashes
- `02_core/food-corpus-safe-overrides-v1.js`: deterministic fail-closed plan/apply contract
- `scripts/apply-official-food-overrides.cjs`: report/write utility; canonical write requires explicit `--write`
- `tests/food-data-quality-gate.test.cjs`: validates corpus identity, provenance, exact-match semantics, and official nutrient equality before and after application

## Next batches

After v1 Release Gate is GREEN, expand from the remaining 477 eligible home-meal analyzed rows only where exact semantic equivalence is verified. Branded products from the 316,734-row processed database remain manual-review territory unless a stable product identity rule is added.
