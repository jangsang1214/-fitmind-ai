# GARANG Official Food Ingestion v2

## Goal
Replace low-confidence nutrition values only when an official K-FIND or USDA record is traceable and structurally safe.

## Source policy
- Korea primary: MFDS K-FIND / 식품의약품안전처 식품영양성분DB정보.
- Global fallback: USDA FoodData Central.
- `verified` requires provider + dataset + source record ID and complete core nutrients (kcal/protein/carbs/fat).
- Serving text is display metadata. Recommendation math uses the normalized gram basis.
- Existing GARANG food records are never overwritten automatically.

## Pipeline
1. Acquire official JSON from an approved source.
2. Normalize with `02_core/food-source-adapters-v2.js`.
3. Run Food Data Foundation v2 assessment.
4. Generate exact name/alias replacement proposals against the current `food-db.json`.
5. Review ambiguous/unmatched rows separately.
6. Only after review may a later change update canonical food records.

## CLI
Offline K-FIND/API-response import:

```bash
npm run import:food:official -- --source kfind --input /path/raw.json --dataset KDDB --output /tmp/kfind-normalized.json --existing 04_data/knowledge/food-db.json --proposal /tmp/kfind-proposal.json
```

USDA search (API key stays in environment, never source control):

```bash
USDA_FDC_API_KEY=... npm run import:food:official -- --source usda-fdc --query "chicken breast" --output /tmp/usda-normalized.json --existing 04_data/knowledge/food-db.json --proposal /tmp/usda-proposal.json
```

## Safety
- No API keys are committed or printed by the adapter.
- K-FIND live fetching is intentionally not hard-coded because access requires an approved public-data portal key and the exact service contract must come from the approved application.
- USDA live search is optional and requires `USDA_FDC_API_KEY` in the execution environment.
- Contract fixtures verify parsing behavior; they are not production nutrition records.
- Promotion to `verified` is fail-closed when provenance or core nutrients are missing.

## External verification state
As of 2026-09-15, adapter and proposal generation are repository-verifiable. Live bulk ingestion and replacement counts remain UNKNOWN until an approved K-FIND/USDA authenticated data pull is executed.
