# GARANG Food Data Foundation v2

Status: foundation / no runtime mutation

## Goal

Make food knowledge trustworthy before Nutrition Intelligence v2 uses it for stronger decisions.

This phase intentionally does not change visible Nutrition UI, Today, Record, Coach surfaces, user state schema, or canonical write owners. It is safe to develop in parallel with the Design consolidation work.

## Quality contract

Every canonical food row has one of four quality states:

- `verified`: traceable provider + dataset + source record ID are present.
- `approximate`: useful reference value, but not strong enough to claim exact official provenance.
- `estimated`: explicitly estimated/synthetic. It must never be promoted implicitly.
- `unknown`: provenance or quality is unresolved.

`verified` is a claim, not a default. The quality gate fails verified rows that do not carry traceable provenance.

## Canonical ingestion boundary

`02_core/food-data-foundation-v2.js` converts the legacy Food DB shape into a canonical read-only representation with:

- stable food ID and names
- aliases and category
- serving display text
- declared gram basis
- normalized macro/micro nutrient keys
- explicit quality state
- provider / dataset / record ID provenance

Source-specific raw API parsing stays outside this canonical boundary. A source adapter must first map the provider payload into this normalized contract. This avoids coupling GARANG recommendation logic to vendor-specific field names.

## Official source registry

`04_data/knowledge/food-source-registry-v2.json` registers the intended source hierarchy.

1. MFDS K-FIND for Korean foods and Korean prepared-food datasets.
2. USDA FoodData Central as international/English fallback.

API keys are server/tooling secrets and must never be committed or shipped to the browser bundle.

## Quality gate

The gate blocks:

- missing stable food ID or name
- invalid gram basis
- negative nutrition values
- physically impossible macro values per 100 g
- implausible energy density
- duplicate stable IDs
- `verified` values without traceable provenance
- estimated sources mislabeled as verified

Large macro-to-calorie disagreement, unresolved quality, duplicate normalized names, and alias collisions are surfaced as audit warnings first because mixed dishes and naming ambiguity can be legitimate and require review rather than blind deletion.

Run:

```sh
npm run audit:food-data
```

## Deterministic eval boundary

`coach-nutrition-eval-v2.json` is the first stable behavior set for future Intelligence changes. It checks that:

- pain always produces caution
- insufficient evidence collects data
- stable high-readiness evidence may progress
- fatigue reduces/recovery-loads the plan
- longitudinal execution gaps prevent automatic progression
- Nutrition remains saved-record grounded, read-only, and fails closed when required profile evidence is missing

The LLM remains explanation-only. These evals protect the rule: **GARANG decides → LLM explains → User confirms → GARANG acts.**

## Next phase

After this foundation is GREEN:

1. run the full current Food DB audit and triage warnings,
2. add authenticated/offline ingestion tooling for official source exports/API payloads,
3. migrate high-use Korean foods from approximate/estimated to traceable verified records,
4. build Nutrition Intelligence v2 on top of quality-aware data,
5. only then connect richer knowledge grounding into Coach explanations.
