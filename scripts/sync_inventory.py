#!/usr/bin/env python3
"""Refresh the offline fallback from the television's native live inventory."""
import json
from pathlib import Path
from tv_ssh import run

def main():
    result = run('/usr/bin/node /var/lib/inicio/native.js inventory', 20)
    if result.returncode:
        raise SystemExit('No se pudo consultar la TV; se conserva el inventario anterior.')
    response = json.loads(result.stdout)
    if not response.get('ok'):
        raise SystemExit('La TV no está lista; se conserva el inventario anterior.')
    data = response['data']
    target = Path(__file__).resolve().parents[1] / 'app/inventory.local.js'
    target.write_text('window.TV_INVENTORY = ' + json.dumps(data, ensure_ascii=False) + ';\n')
    print(f"Inventario actualizado: {len(data['apps'])} apps y {len(data['channels'])} canales.")

if __name__ == '__main__':
    main()
