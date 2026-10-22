#!/usr/bin/env python3
"""Deploy only the fixed inventory/channel/network helper to an already rooted TV."""
from pathlib import Path
from tv_ssh import run, upload

root = Path(__file__).resolve().parents[1]
result = run('mkdir -p /var/lib/inicio && chmod 700 /var/lib/inicio')
if result.returncode:
    raise SystemExit('Native helper directory unavailable.')
for name in ('luna.js', 'native.js'):
    result = upload(root / 'tv' / name, '/var/lib/inicio/' + name)
    if result.returncode:
        raise SystemExit('Could not deploy the native helper.')
print('Fixed native helpers deployed. Boot and Home routing were not changed.')
