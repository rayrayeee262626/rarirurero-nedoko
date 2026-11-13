"""Run the shared browser suite against the isolated preview output."""
from pathlib import Path
import subprocess
import sys
raise SystemExit(subprocess.call([sys.executable, str(Path(__file__).with_name('browser-smoke.py')), '--preview', *sys.argv[1:]]))
