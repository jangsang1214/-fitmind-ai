from pathlib import Path
import json

# Fix the historical duplicate script syntax so the repository-wide syntax checker is green.
p=Path('script_3.js')
s=p.read_text()
bad='${s.readiness.score!=null?` (${s.readiness.score}/100)`:``)}'
good='${s.readiness.score!=null?` (${s.readiness.score}/100)`:``}'
if bad not in s:
    raise SystemExit('script_3.js syntax target not found')
p.write_text(s.replace(bad,good,1))

# runtime-manifest must describe the real production entry, not historical reference layers.
manifest={
  'version':'0.11.0-beta.1',
  'entry':'index.html',
  'branch':'main',
  'deployRoot':'.',
  'styles':[
    'styles.css',
    'garang-target-ui.css',
    'garang-functional-recovery.css',
    'garang-runtime-final.css',
    'garang-brand-runtime-v2.css',
    'garang-polish-v3.css',
    'garang-font-logo-v1.css',
    'garang-stability-v1.css'
  ],
  'scripts':[
    'firebase-config.js',
    'garang-services-config.js',
    'data-schema.js',
    'performance.js',
    'garang-auth-bootstrap.js',
    'app.js',
    'garang-functional-recovery.js',
    'garang-brand-runtime-v2.js',
    'garang-polish-v3.js',
    'garang-polish-v3-fix.js',
    'garang-coach-home-hotfix.js'
  ],
  'data':[
    'exercise-db.json',
    'food-db.json',
    'exercise_knowledge.jsonl',
    'food_knowledge.jsonl',
    'fitmind_rules.jsonl',
    'fitmind_sft.jsonl',
    'synthetic_korean_dialogue_v6.jsonl'
  ],
  'assets':[
    'manifest.webmanifest',
    'sw.js',
    'garang-mark.svg',
    'garang-app-icon.svg'
  ]
}
Path('runtime-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
