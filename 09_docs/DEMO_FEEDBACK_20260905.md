# GARANG beta feedback — 2026-09-05

## Fixed in this patch
- Today check-in compatibility: the live app's legacy `checkins` shape (`sleep`, scalar `soreness`) is normalized on a clone before Memory/State/Decision Intelligence reads it. The stored app state is not rewritten by this adapter.
- Nutrition manual entry: after `Add`, the manual-entry panel remains open and `Save meal` remains immediately visible/enabled while the meal draft exists.
- Workout exercise selection: dedicated visual-library name search added.
- Hamburger navigation: compact Korean subtitles added below supported route labels, e.g. `Running / 달리기`.

## Feasible but requires media assets
Exercise movement demonstrations (short clips) are technically straightforward to support, but the current `exercise-db.json` has no media URL/asset field and the repository contains no licensed clip set. Commercial implementation should use GARANG-owned or explicitly licensed clips. Recommended next contract:

```json
{
  "exercise_id": "E0001",
  "demo_media": {
    "type": "video",
    "src": "...",
    "poster": "...",
    "duration_sec": 6,
    "license": "owned-or-approved"
  }
}
```

Do not populate production exercise media by scraping arbitrary third-party videos.
