from pathlib import Path
from bs4 import BeautifulSoup
import re, subprocess, json, sys
root=Path(__file__).resolve().parents[1]
checks=[]
def chk(name, ok, detail=''):
    checks.append((name, bool(ok), detail))

html=(root/'index.html').read_text(encoding='utf-8')
soup=BeautifulSoup(html,'html.parser')
ids=[x.get('id') for x in soup.find_all(attrs={'id':True})]
chk('static duplicate ids', len(ids)==len(set(ids)), f'{len(ids)} ids')
refs=[]
for tag,attr in [('script','src'),('link','href'),('img','src')]:
    for el in soup.find_all(tag):
        v=el.get(attr)
        if v and not re.match(r'^(https?:|data:|#)',v): refs.append(v.split('?')[0])
missing=[r for r in refs if not (root/r).exists()]
chk('runtime local references', not missing, 'missing='+','.join(missing) if missing else f'{len(refs)} refs')
nav=[b.get('data-page') for b in soup.select('#bottomNav [data-page]')]
chk('4 core navigation', nav==['today','coach','log','progress'], str(nav))

for js in ['app.js','garang-services-config.js','sw.js','firebase-config.js']:
    p=subprocess.run(['node','--check',str(root/js)],capture_output=True,text=True)
    chk(f'JS syntax {js}',p.returncode==0,(p.stderr or '').strip())

app=(root/'app.js').read_text(encoding='utf-8')
css=(root/'styles.css').read_text(encoding='utf-8')
rules=(root/'firestore.rules').read_text(encoding='utf-8')
manifest=json.loads((root/'manifest.webmanifest').read_text(encoding='utf-8'))
required=[
 ('onboarding', 'function onboardingPage'),('coach engine','function coachDecision'),('memory v2','memory.entries'),
 ('planner write confirmation','function applyCoachPlan'),('progress','function progressPage'),('weekly review','function weeklyReview'),
 ('meal scan','function analyzeMealScan'),('cloud retry','function queueCloudSync'),('account scoped local storage','garang_user_${u.uid}_v3'),
 ('body intelligence','function bodyPage'),('error capture','function captureError'),('analytics base','function trackEvent')]
for name,needle in required: chk(name,needle in app,needle)
chk('4-column bottom nav css', '.bottom-nav{position:fixed' in css and 'grid-template-columns:repeat(4,1fr)' in css)
chk('mobile 320 breakpoint', '@media(max-width:360px)' in css)
chk('mobile 560 breakpoint', '@media(max-width:560px)' in css)
chk('firestore user isolation', 'request.auth.uid == userId' in rules)
chk('manifest scoped start', manifest.get('start_url')=='./' and manifest.get('scope')=='./')
chk('service worker cache bumped','garang-commercial-kore-2026-09-02-v2' in (root/'sw.js').read_text())
chk('settings restored','function settingsPage' in app and 'languageSetting' in app and 'plan-compare' in css)
chk('workout muscle map','function muscleMapSvg' in app and 'muscle-zone' in css and 'TARGET BODY' in app)
chk('visual nutrition','nutrition-visual-hero' in app and 'meal-camera-stage' in css and 'manual-entry' in css)
chk('settings top entry','settingsTopBtn' in html and "$('settingsTopBtn').onclick" in app)

failed=[x for x in checks if not x[1]]
for name,ok,detail in checks:
    print(('PASS' if ok else 'FAIL'), name, ('- '+detail if detail else ''))
print(f'\nTOTAL {len(checks)-len(failed)}/{len(checks)} PASS')
sys.exit(1 if failed else 0)
