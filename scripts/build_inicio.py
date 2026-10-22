#!/usr/bin/env python3
"""Build only the current launcher, keeping recovery and private tools out of the IPK."""
import json,pathlib,shutil
ROOT=pathlib.Path(__file__).resolve().parents[1]
APP=ROOT/'app';STAGE=ROOT/'build/inicio-active'
def build():
 if STAGE.exists():shutil.rmtree(STAGE)
 STAGE.mkdir(parents=True)
 for n in ['index.html','style.css','app.js','ambient.js','weather-model.js','studio.js','config.js','config.local.js','connection.js','connection.local.js','inventory.js','inventory.local.js','landscapes.js','model.js','wallpaper.js','native.js','appinfo.json','icon.png','largeIcon.png']:
  p=APP/n
  if p.exists():shutil.copy2(p,STAGE/n)
 for d in ['fonts','logos']:
  (STAGE/d).mkdir()
  for p in (APP/d).iterdir():
   if d=='fonts' and not p.name.startswith('Inter'):continue
   if p.is_file():shutil.copy2(p,STAGE/d/p.name)
 raw=(APP/'landscapes.js').read_text();photos=json.loads(raw[raw.index('['):raw.rindex(']')+1]);(STAGE/'wallpapers').mkdir()
 for p in photos:
  for key in ['src','thumb','blur']:shutil.copy2(APP/p[key],STAGE/p[key])
 shutil.copy2(APP/'wallpapers/ATTRIBUTION.json',STAGE/'wallpapers/ATTRIBUTION.json')
 print('Paquete Inicio+ preparado sin la interfaz anterior.')
if __name__=='__main__':build()
