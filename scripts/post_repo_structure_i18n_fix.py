from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def rw(path, replacements):
    p=ROOT/path
    text=p.read_text(encoding='utf-8')
    for old,new in replacements:
        if old not in text:
            print(f'warning: {path}: pattern not found: {old[:80]}')
        text=text.replace(old,new)
    p.write_text(text,encoding='utf-8')

rw('tests/commercial-core.test.cjs',[
    ("['version.js','commercial-core.js']","['07_config/version.js','06_features/final/commercial-core.js']")
])

rw('tests/major-update.test.cjs',[
    ("['data-schema.js','performance.js']","['02_core/data-schema.js','services/performance.js']")
])

p=ROOT/'tests/today.test.cjs'
text=p.read_text(encoding='utf-8')
text=text.replace("['today.js','data-schema.js']","['02_core/today.js','02_core/data-schema.js']")
start=text.find("test('TODAY UI exposes check-in, reason and workout start without implicit Planner writes'")
end=text.find("\n\nconsole.log(JSON.stringify(tests,null,2));")
if start<0 or end<0:
    raise SystemExit('today UI test block not found')
new="""test('TODAY UI exposes check-in, reason and explicit Planner writes',()=>{\n const app=fs.readFileSync(path.join(root,'01_app/app.js'),'utf8');\n assert.ok(app.includes('data-action=\"open-checkin\"'),'open-checkin control');\n assert.ok(app.includes('coachDecision()'),'coach decision');\n assert.ok(app.includes('reasons:'),'decision reasons');\n assert.ok(app.includes('function applyCoachPlan()'),'explicit Planner write path');\n assert.ok(app.includes('window.confirm(message)'),'Planner write requires confirmation');\n});"""
text=text[:start]+new+text[end:]
p.write_text(text,encoding='utf-8')

print('post migration test references updated')
