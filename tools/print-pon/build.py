from pathlib import Path
import shutil,json
root=Path(__file__).resolve().parents[2]
source=root/'managed-sites/print-pon'
expected=set(json.loads((root/'tools/print-pon/recovered-release.json').read_text())['files'])|{'404.html'}
actual={str(p.relative_to(source)) for p in source.rglob('*') if p.is_file()}
assert actual==expected, 'Unexpected or missing source files'
out=root/'dist'
if out.exists():shutil.rmtree(out)
shutil.copytree(source,out)
print('Print PON build: 15 public files in dist/')
