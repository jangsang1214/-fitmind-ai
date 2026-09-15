from pathlib import Path
import re

TARGETS = [
    'tests/browser-conversational-intelligence.test.cjs',
    'tests/browser-daily-plan-draft.test.cjs',
    'tests/browser-golden-path-complete.test.cjs',
    'tests/browser-golden-path.test.cjs',
    'tests/browser-mobile-button-audit.test.cjs',
    'tests/browser-mobile-layout-boundary.test.cjs',
    'tests/browser-mobile-stability-stress.test.cjs',
    'tests/browser-nutrition-recommendation.test.cjs',
    'tests/browser-plan-execution.test.cjs',
    'tests/browser-settings-touch-regression.test.cjs',
    'tests/browser-simplified-shell.test.cjs',
    'tests/browser-today-action-flow.test.cjs',
    'tests/browser-today-checkin-override.test.cjs',
    'tests/browser-today-visual-parity.test.cjs',
    'tests/browser-truth-surface.test.cjs',
    'tests/browser-webkit-regression.test.cjs',
]

REQUIRE = "const {installAuthenticatedFirebaseMock}=require('./helpers/authenticated-browser-fixture.cjs');\n"

for name in TARGETS:
    p = Path(name)
    s = p.read_text()
    original = s
    if REQUIRE not in s:
        marker = "const {startStaticServer}=require('./helpers/static-server.cjs');\n"
        if marker in s:
            s = s.replace(marker, marker + REQUIRE, 1)
        elif s.startswith("'use strict';\n"):
            s = s.replace("'use strict';\n", "'use strict';\n" + REQUIRE, 1)
        else:
            raise SystemExit(f'{name}: cannot place authenticated fixture require')

    # Retain each test's original state seed, but scope it to a real authenticated account.
    s = s.replace("localStorage.setItem('garang_demo','1');", '')
    s = s.replace("localStorage.setItem('garang_demo', '1');", '')
    s = s.replace('garang_demo_state_v3', 'garang_user_mock-user_v3')

    if 'installAuthenticatedFirebaseMock(context)' not in s:
        match = re.search(r'(?P<indent>[ \t]*)await context\.addInitScript', s)
        if not match:
            raise SystemExit(f'{name}: no context.addInitScript found for auth mock insertion')
        insert = f"{match.group('indent')}await installAuthenticatedFirebaseMock(context);\n"
        s = s[:match.start()] + insert + s[match.start():]

    if "setItem('garang_demo'" in s or 'garang_demo_state_v3' in s:
        raise SystemExit(f'{name}: legacy demo boot fixture remains')
    if s == original:
        raise SystemExit(f'{name}: migration made no change')
    p.write_text(s)

# Freeze the browser-suite invariant so future tests cannot silently resurrect demo-as-auth.
p = Path('tests/no-demo-entry.test.cjs')
s = p.read_text()
needle = "assert.match(app,/storageKey=SIGNED_OUT_KEY/);console.log('signed-out demo entry removal: PASS');"
replacement = """assert.match(app,/storageKey=SIGNED_OUT_KEY/);
const browserFiles=fs.readdirSync('tests').filter(name=>/^browser-.*\\.test\\.cjs$/.test(name));
for(const file of browserFiles){const source=fs.readFileSync(`tests/${file}`,'utf8');assert.equal(/localStorage\\.setItem\\(['\"]garang_demo['\"]/.test(source),false,`${file} must not use the retired demo flag as an auth fixture`);}
console.log('signed-out demo entry removal: PASS',JSON.stringify({browserFiles:browserFiles.length}));"""
if needle not in s:
    raise SystemExit('no-demo-entry contract marker not found')
p.write_text(s.replace(needle,replacement,1))

print(f'migrated {len(TARGETS)} browser fixtures to authenticated account scope')
