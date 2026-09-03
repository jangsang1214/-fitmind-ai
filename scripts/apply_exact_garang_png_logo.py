from __future__ import annotations

import base64
import json
import re
import sys
from pathlib import Path


def replace_or_fail(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"missing expected token for {label}: {old!r}")
    return text.replace(old, new)


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: apply_exact_garang_png_logo.py <base64-source> <target-repo>")

    source = Path(sys.argv[1])
    root = Path(sys.argv[2])
    png = base64.b64decode(source.read_text(encoding="utf-8").strip())
    if not png.startswith(b"\x89PNG\r\n\x1a\n"):
        raise SystemExit("decoded GARANG logo is not a PNG")

    assets = root / "05_assets"
    assets.mkdir(parents=True, exist_ok=True)
    logo_path = assets / "garang-logo-exact.png"
    logo_path.write_bytes(png)

    # Build a square PWA icon while keeping the user-supplied mark itself unchanged in shape.
    try:
        from PIL import Image
        from io import BytesIO

        mark = Image.open(BytesIO(png)).convert("RGBA")
        canvas = Image.new("RGBA", (512, 512), (5, 6, 5, 255))
        target_h = 400
        target_w = round(mark.width * target_h / mark.height)
        mark = mark.resize((target_w, target_h), Image.Resampling.LANCZOS)
        canvas.alpha_composite(mark, ((512 - target_w) // 2, (512 - target_h) // 2))
        canvas.convert("RGB").save(assets / "garang-app-icon-exact.png", "PNG", optimize=True)
    except Exception as exc:
        print(f"Pillow icon generation fallback: {exc}")
        (assets / "garang-app-icon-exact.png").write_bytes(png)

    # Remove the previous active logo assets. Historical screenshots/mockups stay untouched.
    for legacy in (assets / "garang-mark.svg", assets / "garang-app-icon.svg"):
        if legacy.exists():
            legacy.unlink()

    index = root / "index.html"
    text = index.read_text(encoding="utf-8")
    text = re.sub(r'<link rel="icon" href="\./05_assets/garang-app-icon\.svg[^\"]*" type="image/svg\+xml">',
                  '<link rel="icon" href="./05_assets/garang-app-icon-exact.png?v=exact-png-20260904" type="image/png">', text)
    text = re.sub(r'<img src="\./05_assets/garang-mark\.svg[^\"]*" alt="GARANG">',
                  '<img src="./05_assets/garang-logo-exact.png?v=exact-png-20260904" alt="GARANG">', text)
    index.write_text(text, encoding="utf-8")

    app = root / "01_app/app.js"
    text = app.read_text(encoding="utf-8")
    text = text.replace("./garang-mark.svg", "./05_assets/garang-logo-exact.png?v=exact-png-20260904")
    text = text.replace("./05_assets/garang-mark.svg", "./05_assets/garang-logo-exact.png?v=exact-png-20260904")
    app.write_text(text, encoding="utf-8")

    brand = root / "06_features/ui/runtime/garang-brand-runtime-v2.js"
    text = brand.read_text(encoding="utf-8")
    text = text.replace("   - exact GARANG mark rendered from SVG code, never an image", "   - exact GARANG mark uses the user-approved PNG asset")
    pattern = re.compile(r"  function markSVG\(className='garang-code-mark'\) \{.*?\n  \}\n\n  function svgNode", re.S)
    replacement = """  function markPNG(className='garang-code-mark') {\n    return `<img class=\"${className} garang-exact-logo\" src=\"./05_assets/garang-logo-exact.png?v=exact-png-20260904\" alt=\"GARANG\" draggable=\"false\">`;\n  }\n\n  function svgNode"""
    text, count = pattern.subn(replacement, text, count=1)
    if count != 1:
        raise SystemExit("could not replace legacy markSVG implementation")
    text = text.replace("markSVG(", "markPNG(")
    replace_pattern = re.compile(r"  function replaceBrandMarks\(root=document\) \{.*?\n  \}\n\n  function bodySVG", re.S)
    replace_impl = """  function replaceBrandMarks(root=document) {\n    root.querySelectorAll('img').forEach(img => {\n      const src=img.getAttribute('src')||'';\n      if (!/garang-(?:mark|app-icon)\\.svg/i.test(src)) return;\n      img.src='./05_assets/garang-logo-exact.png?v=exact-png-20260904';\n      img.alt='GARANG';\n      img.classList.add('garang-exact-logo');\n    });\n  }\n\n  function bodySVG"""
    text, count = replace_pattern.subn(replace_impl, text, count=1)
    if count != 1:
        raise SystemExit("could not replace legacy replaceBrandMarks implementation")
    brand.write_text(text, encoding="utf-8")

    css = root / "03_styles/runtime/garang-brand-runtime-v2.css"
    c = css.read_text(encoding="utf-8")
    c += """\n/* User-approved GARANG PNG logo */\n.garang-exact-logo{display:block;object-fit:contain;object-position:center;background:transparent}\n.g2-message-avatar .garang-exact-logo{width:22px;height:34px}\n.g2-empty-inner>.garang-exact-logo{width:54px;height:86px;margin-inline:auto}\n.g2-sidebar-brand>.garang-exact-logo{width:28px;height:44px}\n.g2-chat-head>.garang-exact-logo{width:24px;height:38px;flex:0 0 auto}\n"""
    css.write_text(c, encoding="utf-8")

    for filename in ("garang-workout-standard.svg", "garang-running-standard.svg"):
        p = assets / filename
        if not p.exists():
            continue
        s = p.read_text(encoding="utf-8")
        s, count = re.subn(
            r'    <g transform="translate\(82 1533\) scale\(\.42\)">.*?    </g>\n',
            '    <image href="garang-logo-exact.png" x="82" y="1528" width="52" height="92" preserveAspectRatio="xMidYMid meet"/>\n',
            s,
            count=1,
            flags=re.S,
        )
        if count != 1:
            raise SystemExit(f"could not replace legacy logo in {filename}")
        p.write_text(s, encoding="utf-8")

    manifest = root / "07_config/manifest.webmanifest"
    data = json.loads(manifest.read_text(encoding="utf-8"))
    data["icons"] = [
        {
            "src": "../05_assets/garang-app-icon-exact.png?v=exact-png-20260904",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any maskable",
        }
    ]
    manifest.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    runtime_manifest = root / "runtime-manifest.json"
    rm = json.loads(runtime_manifest.read_text(encoding="utf-8"))
    assets_list = [x for x in rm.get("assets", []) if x not in {"05_assets/garang-mark.svg", "05_assets/garang-app-icon.svg"}]
    for x in ("05_assets/garang-logo-exact.png", "05_assets/garang-app-icon-exact.png"):
        if x not in assets_list:
            assets_list.append(x)
    rm["assets"] = assets_list
    runtime_manifest.write_text(json.dumps(rm, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    sw = root / "02_core/sw-runtime.js"
    s = sw.read_text(encoding="utf-8")
    s = re.sub(r"const CACHE='[^']+';", "const CACHE='garang-exact-png-logo-v1-20260904';", s, count=1)
    s = s.replace('"./05_assets/garang-mark.svg",', '"./05_assets/garang-logo-exact.png",')
    s = s.replace('"./05_assets/garang-app-icon.svg",', '"./05_assets/garang-app-icon-exact.png",')
    sw.write_text(s, encoding="utf-8")

    # Ensure no active source still points at the deleted SVG logo assets.
    active_files = [
        root / "index.html",
        root / "01_app/app.js",
        root / "06_features/ui/runtime/garang-brand-runtime-v2.js",
        root / "07_config/manifest.webmanifest",
        root / "runtime-manifest.json",
        root / "02_core/sw-runtime.js",
    ]
    leftovers = []
    for p in active_files:
        body = p.read_text(encoding="utf-8")
        if "garang-mark.svg" in body or "garang-app-icon.svg" in body or "function markSVG" in body:
            leftovers.append(str(p.relative_to(root)))
    if leftovers:
        raise SystemExit("legacy active logo reference remains: " + ", ".join(leftovers))

    print("Applied exact GARANG PNG logo to app, Coach, PWA icon, and certification assets.")


if __name__ == "__main__":
    main()
