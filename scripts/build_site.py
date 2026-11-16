# 올릴 묶음 만들기 — 저장소 파일을 _site/에 복사하고, 복사본 안의 옛 GitHub Pages 주소만 새 주소로 바꾼다(저장소 파일은 그대로).
#   python scripts/build_site.py _site
# 2026-11-16 주소 정리: PC에만 있던 tools/unity/cf-world/build_cf_world.py(10-20, 11-13 고침)를 저장소 안으로 옮김. 규칙은 그대로라 결과가 지금 공개판과 바이트까지 같다(11-16 대조).
import os, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, '_site'))
# '.git'은 파일로도 뺀다: git worktree로 꺼낸 폴더에서는 .git이 PC 경로가 적힌 파일이라 그대로 올라갈 수 있다(11-16 점검)
SKIP_DIRS = {'.git', '.github', 'node_modules', '__pycache__', 'relay', 'relay-cf', 'design', 'scripts', '_site'}
SKIP_FILES = {'.git', 'CLAUDE.md', 'README.md', 'push-github.bat', '.gitignore', '.gitattributes', '.nojekyll', 'HANDOFF.md'}
TEXT = ('.html', '.js', '.json', '.webmanifest', '.css', '.mjs')
SUBS = [
    ('https://humanteacher89-cell.github.io/hangul-france/', 'https://humanssaem-hangul-france.pages.dev/'),
    ('https://humanteacher89-cell.github.io/my-3d-world/', 'https://humanssaem-world.pages.dev/'),
    ('https://humanteacher89-cell.github.io/apps/', 'https://humanssaem-apps.pages.dev/apps/'),
]

shutil.rmtree(OUT, ignore_errors=True)
count = changed = 0
for root, dirs, files in os.walk(ROOT):
    if os.path.abspath(root).startswith(OUT):
        dirs[:] = []
        continue
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for f in files:
        if f in SKIP_FILES or f.endswith('.bak'):
            continue
        s = os.path.join(root, f)
        d = os.path.join(OUT, os.path.relpath(s, ROOT))
        os.makedirs(os.path.dirname(d), exist_ok=True)
        count += 1
        if f.endswith(TEXT):
            t = open(s, encoding='utf-8').read()   # 읽을 때 CRLF는 LF로(옛 스크립트와 같게)
            n = t
            for a, b in SUBS:
                n = n.replace(a, b)
            changed += n != t
            if 'github.io' in n:
                print('  남은 github.io:', os.path.relpath(d, OUT))
            open(d, 'w', encoding='utf-8', newline='').write(n)
        else:
            shutil.copy2(s, d)
print(f'묶음: 파일 {count}개, 주소 바꾼 파일 {changed} → {OUT}')