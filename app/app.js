(function(){
 'use strict';
 var $=function(id){return document.getElementById(id);},M=InicioModel;
 var category='apps',selection={channels:0,apps:0},selectedId={channels:null,apps:null},tabFocus=0,zone='tabs',topFocus=0,modal=null,returnFocus=null,modalIndex=0,settingsFocus=0,previewIndex=0,previewPhoto=null,previewReturn=0;
 var inventory=window.TV_INVENTORY||{apps:[],channels:[],inputs:[]},lists={channels:[],apps:[]},usage=M.read(localStorage,'inicio.usage',{}),railOffset=0,bridges=[],buttons=[],settingsButtons=[],previewButtons=[],refreshing=false,tuning=false,lastInventorySignature='',lastSelectionSaved='',rankDirty=false;
 var wallpaper=new InicioWallpapers(window.LANDSCAPES||[],function(){if(modal==='settings'&&!previewPhoto)renderSettings(true);},toast);
 var connection=window.INICIO_CONNECTION||null,clockOffset=typeof CONFIG.utcOffsetMinutes==='number'?CONFIG.utcOffsetMinutes:null;
 if(inventory.clock)clockOffset=inventory.clock.offsetMinutes;
 function toast(message){$('toast').textContent=message;$('toast').classList.add('shown');clearTimeout(toast.timer);toast.timer=setTimeout(function(){$('toast').classList.remove('shown');},4200);}
 function luna(uri,payload,callback){
  try{var b=new PalmServiceBridge();bridges.push(b);b.onservicecallback=function(raw){var r;try{r=JSON.parse(raw);}catch(e){r={returnValue:false};}var i=bridges.indexOf(b);if(i>=0)bridges.splice(i,1);callback(r);};b.call(uri,JSON.stringify(payload));}
  catch(e){callback({returnValue:false});}
 }
 function request(path,data,callback){
  if(window.InicioNative&&!request.fallback){var method=path==='/inventory'?'inventory':path==='/channel'?'channel':null;if(method){var done=function(result){if(result){callback(result);return;}request.fallback=true;request(path,data,function(r){request.fallback=false;callback(r);});};if(method==='channel')InicioNative.channel(data.channelId,done);else InicioNative.inventory(done);return;}}
  if(!connection||!connection.url){callback({ok:false,message:'La conexión con la televisión aún no está configurada.'});return;}
  var x=new XMLHttpRequest();x.open(data?'POST':'GET',connection.url+path,true);x.timeout=20000;x.setRequestHeader('X-Inicio-Capability',connection.capability);
  if(data)x.setRequestHeader('Content-Type','application/json');
  var done=false;function finish(r){if(!done){done=true;callback(r);}}
  x.onload=function(){try{finish(JSON.parse(x.responseText));}catch(e){finish({ok:false});}};x.onerror=x.ontimeout=function(){finish({ok:false,message:'No hay conexión con el Mac. Las aplicaciones siguen disponibles.'});};
  x.send(data?JSON.stringify(data):null);
 }
 function launch(id,title){luna('luna://com.webos.applicationManager/launch',{id:id,params:{}},function(r){if(r.returnValue===false)toast('No se ha podido abrir '+title+'.');});}
 function remember(item){rankDirty=true;usage[item.id]=(usage[item.id]||0)+1;M.write(localStorage,'inicio.usage',usage);}
 function activate(item){
  if(!item||tuning)return;
  if(item.kind==='channel'){
   tuning=true;toast('Abriendo '+item.title+'…');
   request('/channel',{channelId:item.id},function(r){tuning=false;if(r.ok){remember(item);$('toast').classList.remove('shown');}else toast(r.message||'No se pudo confirmar el canal.');});
  }else{remember(item);launch(item.id,item.title);}
 }
 function rebuild(){
  var channels=inventory.channels||[],apps=(inventory.apps||[]).slice();
  // System affordances are retained alongside every launchable installed app.
  if(!apps.some(function(a){return a.id===CONFIG.liveTvApp;}))apps.push({id:CONFIG.liveTvApp,title:'TV en directo',kind:'app'});
  (inventory.inputs||[]).forEach(function(i){if(!apps.some(function(a){return a.id===i.id;}))apps.push(i);});
  lists.channels=M.order(channels,usage,[]);lists.apps=M.order(apps,usage,CONFIG.preferredApps||[]);
  ['channels','apps'].forEach(function(c){var found=-1;lists[c].some(function(x,i){if(x.id===selectedId[c]){found=i;return true;}return false;});selection[c]=found>=0?found:Math.min(selection[c],Math.max(0,lists[c].length-1));});
  renderRail();if(modal==='all')renderAll(true);
 }
 function refresh(){
  if(refreshing)return;refreshing=true;
  request('/inventory',null,function(r){refreshing=false;if(r.ok&&r.data){inventory=r.data;if(inventory.clock)clockOffset=inventory.clock.offsetMinutes;clock();var signature=JSON.stringify([inventory.apps,inventory.channels,inventory.inputs]);if(signature!==lastInventorySignature||rankDirty){rankDirty=false;lastInventorySignature=signature;M.write(localStorage,'inicio.inventory',inventory);rebuild();}$('syncStatus').textContent='';}else $('syncStatus').textContent='Inventario guardado · sin conexión';});
 }
 function tile(item,index,grid){
  var el=document.createElement('button');el.type='button';el.className='tile';el.setAttribute('aria-label',item.title+(item.number?' · '+item.number:''));
  var logo=CONFIG.logos&&CONFIG.logos[item.id];
  if(logo){var img=document.createElement('img');img.className='logo';img.alt='';img.src=logo;el.appendChild(img);img.onerror=function(){img.style.display='none';var span=document.createElement('span');span.className='wordmark';span.textContent=item.title;el.insertBefore(span,el.firstChild);};}
  else{var word=document.createElement('span');word.className='wordmark';word.textContent=item.title;el.appendChild(word);}
  var label=document.createElement('small');label.textContent=item.title+(!grid&&item.number?' · '+item.number:'');el.appendChild(label);
  if(grid&&item.number){var n=document.createElement('span');n.className='number';n.textContent=item.number;el.appendChild(n);}
  el.onmouseenter=function(){if(previewPhoto||modal&&!grid||!modal&&grid)return;if(grid){modalIndex=index;zone='all';}else{selection[category]=index;selectedId[category]=item.id;zone='rail';}paintFocus();};
  el.onclick=function(){if(grid){modalIndex=index;zone='all';}else{selection[category]=index;selectedId[category]=item.id;zone='rail';}paintFocus();activate(item);};return el;
 }
 function renderRail(){
  var rail=$('rail');rail.innerHTML='';buttons=lists[category].map(function(item,i){var el=tile(item,i,false);rail.appendChild(el);return el;});
  if(!buttons.length){var empty=document.createElement('div');empty.className='empty';empty.textContent=category==='channels'?'No hay canales sintonizados disponibles.':'No hay aplicaciones disponibles.';rail.appendChild(empty);}
  rail.classList.remove('contentFade');void rail.offsetWidth;rail.classList.add('contentFade');paintFocus();
 }
 function setCategory(c){
  if(category===c)return;category=c;tabFocus=0;
  $('appsTab').setAttribute('aria-selected','true');railOffset=0;renderRail();
 }
 function clearFocus(){Array.prototype.forEach.call(document.querySelectorAll('.focused'),function(e){e.classList.remove('focused');});}
 function focus(el,scroll){if(!el)return;el.classList.add('focused');el.focus({preventScroll:true});if(scroll)scrollIntoModal(el);}
 function scrollIntoModal(el){var body=$('overlayBody'),r=el.getBoundingClientRect(),b=body.getBoundingClientRect();if(r.bottom>b.bottom)body.scrollTop+=r.bottom-b.bottom+12;else if(r.top<b.top)body.scrollTop-=b.top-r.top+12;}
 function paintFocus(){
  clearFocus();
  if(previewPhoto){focus(previewButtons[previewIndex]);return;}
  if(modal){if(zone==='close')focus($('closeOverlay'));else if(modal==='all')focus($('overlayBody').querySelectorAll('.tile')[modalIndex],true);else focus(settingsButtons[settingsFocus],true);return;}
  if(zone==='weather')focus($('weather'));
  else if(zone==='top')focus(topFocus?$('settings'):$('apple'));
  else if(zone==='tabs')focus(tabFocus?$('channelsTab'):$('appsTab'));
  else if(zone==='allButton')focus($('all'));
  else if(zone==='rail')focus(buttons[selection[category]]);
  var position={channels:selection.channels,apps:selection.apps,channelsId:(lists.channels[selection.channels]||{}).id,appsId:(lists.apps[selection.apps]||{}).id},positionKey=JSON.stringify(position);if(positionKey!==lastSelectionSaved){lastSelectionSaved=positionKey;M.write(localStorage,'inicio.selection',position);}
  var rail=$('rail'),chosen=buttons[selection[category]];
  if(chosen){var left=chosen.offsetLeft,right=left+chosen.offsetWidth,w=$('railViewport').clientWidth;if(left<railOffset+17)railOffset=Math.max(0,left-17);else if(right>railOffset+w-17)railOffset=right-w+17;var max=Math.max(0,rail.scrollWidth-w);railOffset=Math.max(0,Math.min(railOffset,max));rail.style.transform='translateX('+(-railOffset)+'px)';}
 }
 function snapshot(){return {zone:zone,category:category,tab:tabFocus,top:topFocus,index:selection[category],offset:railOffset};}
 function openOverlay(type){
  if(modal)return;returnFocus=snapshot();modal=type==='tv'?'all':type;if(type==='tv')category='channels';wallpaper.pause(true);$('overlay').classList.remove('hidden');$('home').setAttribute('aria-hidden','true');zone=modal==='all'?'all':(modal==='studio'||modal==='weather')?'close':'settings';
  if(modal==='all'){modalIndex=selection[category];renderAll(false);}else if(modal==='studio'){renderStudio();}else if(modal==='weather'){$('eyebrow').textContent='EL TIEMPO';$('overlayTitle').textContent=CONFIG.weather.city;$('overlaySubtitle').textContent='Próximas horas y mañana';if(window.InicioWeather)InicioWeather.show($('overlayBody'));}else{settingsFocus=0;renderSettings(false);}paintFocus();
 }
 function closeOverlay(){
  if(previewPhoto){closePreview();return;}
  if(modal==='studio'&&window.InicioStudio)InicioStudio.hide();if(modal==='weather'&&window.InicioWeather)InicioWeather.hide();modal=null;$('overlay').classList.add('hidden');$('home').removeAttribute('aria-hidden');$('overlayBody').innerHTML='';settingsButtons=[];
  if(returnFocus){category=returnFocus.category;zone=returnFocus.zone;tabFocus=returnFocus.tab;topFocus=returnFocus.top;selection[category]=returnFocus.index;railOffset=returnFocus.offset;renderRail();}
  wallpaper.pause(false);paintFocus();
 }
 function renderAll(preserve){
  var scroll=$('overlayBody').scrollTop;$('eyebrow').textContent='TU TELEVISIÓN';$('overlayTitle').textContent=category==='channels'?'Todos los canales':'Todas las apps';
  $('overlaySubtitle').textContent=category==='channels'?lists.channels.length+' canales disponibles':(inventory.apps||[]).length+' apps · TV en directo y '+(inventory.inputs||[]).length+' entradas';
  var body=$('overlayBody');body.innerHTML='';var grid=document.createElement('div');grid.className='grid';lists[category].forEach(function(it,i){grid.appendChild(tile(it,i,true));});body.appendChild(grid);
  modalIndex=Math.min(modalIndex,Math.max(0,lists[category].length-1));body.scrollTop=preserve?scroll:0;paintFocus();
 }
 function action(text,handler,cls){var b=document.createElement('button');b.type='button';b.className=cls||'action';b.textContent=text;b.onclick=handler;return b;}
 function settingsBind(el,row,col){
  el.dataset.row=String(row);el.dataset.col=String(col);var i=settingsButtons.length;settingsButtons.push(el);el.onmouseenter=function(){if(previewPhoto)return;settingsFocus=i;zone='settings';paintFocus();};return el;
 }
 function openApple(){openOverlay('studio');}
 function renderStudio(){ $('eyebrow').textContent='TU UNIVERSO';$('overlayTitle').textContent='Mis canales';$('overlaySubtitle').textContent='YouTube · próximas producciones';if(window.InicioStudio)InicioStudio.show($('overlayBody'));paintFocus(); }
 function renderSettings(preserve){
  if(modal!=='settings'||previewPhoto)return;var old=settingsFocus,scroll=$('overlayBody').scrollTop;settingsButtons=[];
  $('eyebrow').textContent='A TU RITMO';$('overlayTitle').textContent='Ajustes';$('overlaySubtitle').textContent='Paisajes, rotación y accesos';var body=$('overlayBody');body.innerHTML='';
  var bar=document.createElement('div');bar.className='settingsBar';var label=document.createElement('span');label.className='label';label.textContent='Cambiar paisaje';bar.appendChild(label);
  M.intervals.forEach(function(n,i){var b=action(n?n+' minutos':'Desactivado',function(){wallpaper.interval(n);},'choice'+(wallpaper.state.interval===n?' selected':''));b.setAttribute('aria-pressed',String(wallpaper.state.interval===n));bar.appendChild(settingsBind(b,0,i));});body.appendChild(bar);
  var actions=document.createElement('div');actions.className='settingsActions';var restore=action('Restaurar eliminadas'+(wallpaper.state.deleted.length?' · '+wallpaper.state.deleted.length:''),function(){wallpaper.restore();toast('Paisajes restaurados.');});actions.appendChild(settingsBind(restore,1,0));body.appendChild(actions);
  var gallery=document.createElement('div');gallery.className='gallery';M.available(wallpaper.state,wallpaper.photos).forEach(function(p,i){
   var b=action('',function(){openPreview(p.id);},'landscapeCard'+(p.id===wallpaper.state.active?' active':''));b.setAttribute('aria-label','Vista previa de '+p.name);var img=document.createElement('img');img.src=p.thumb;img.alt='';b.appendChild(img);var c=document.createElement('span');c.className='caption';var t=document.createElement('strong');t.textContent=p.name;c.appendChild(t);var credit=document.createElement('small');credit.textContent=p.author+' · '+p.license;c.appendChild(credit);b.appendChild(c);gallery.appendChild(settingsBind(b,2+Math.floor(i/4),i%4));});body.appendChild(gallery);
  var note=document.createElement('p');note.className='settingsNote';note.textContent=(wallpaper.state.fixed?'Paisaje fijo. Elige «Usar y rotar» en una vista previa para reanudar la rotación.':wallpaper.state.interval?'La rotación se pausa mientras recorres Ajustes o Ver todos.':'Rotación desactivada.')+' Las fotografías se guardan en la TV.';body.appendChild(note);
  var system=action('Ajustes de la televisión',function(){launch('com.palm.app.settings','Ajustes de la televisión');});body.appendChild(settingsBind(system,2+Math.ceil(M.available(wallpaper.state,wallpaper.photos).length/4),0));
  settingsFocus=Math.min(preserve?old:0,settingsButtons.length-1);body.scrollTop=preserve?scroll:0;paintFocus();
 }
 function openPreview(id){
  var p=wallpaper.find(id);if(!p)return;previewReturn=settingsFocus;previewPhoto=p;previewIndex=0;wallpaper.pause(true);$('previewTitle').textContent=p.name;$('previewCredit').textContent=p.author+' · '+p.license+' · '+p.licenseUrl+'\n'+p.changes;
  var load=new Image();load.onload=function(){if(!previewPhoto||previewPhoto.id!==id)return;$('previewPhoto').style.backgroundImage='url("'+p.src+'")';$('preview').classList.remove('hidden');$('overlay').setAttribute('aria-hidden','true');paintFocus();};load.onerror=function(){previewPhoto=null;toast('No se pudo cargar la vista previa.');paintFocus();};load.src=p.src;
  var a=$('previewActions');a.innerHTML='';previewButtons=[];
  [['Mantener fijo',function(){wallpaper.select(id,true,function(ok){if(ok){closePreview();toast('Paisaje fijo.');}});}],['Usar y rotar',function(){if(!wallpaper.state.interval)wallpaper.interval(10);wallpaper.select(id,false,function(ok){if(ok){closePreview();toast('Rotación activada.');}});}],['Eliminar',function(){wallpaper.remove(id,function(ok){if(ok){closePreview();toast('Paisaje eliminado. Puedes restaurarlo en Ajustes.');}});}],['Volver',closePreview]].forEach(function(spec,i){var b=action(spec[0],spec[1]);b.onmouseenter=function(){previewIndex=i;paintFocus();};previewButtons.push(b);a.appendChild(b);});
 }
 function closePreview(){previewPhoto=null;$('preview').classList.add('hidden');$('previewPhoto').style.backgroundImage='none';$('overlay').removeAttribute('aria-hidden');settingsFocus=previewReturn;renderSettings(true);paintFocus();}
 function moveSettings(key){
  var current=settingsButtons[settingsFocus];if(!current)return;var row=+current.dataset.row,col=+current.dataset.col,candidates=[];
  settingsButtons.forEach(function(b,i){var r=+b.dataset.row,c=+b.dataset.col;if(key===37&&r===row&&c<col||key===39&&r===row&&c>col||key===38&&r<row||key===40&&r>row)candidates.push({i:i,r:r,c:c});});
  candidates.sort(function(a,b){return key===37?b.c-a.c:key===39?a.c-b.c:Math.abs(a.r-row)-Math.abs(b.r-row)||Math.abs(a.c-col)-Math.abs(b.c-col);});
  if(candidates.length)settingsFocus=candidates[0].i;else if(key===38)zone='close';paintFocus();
 }
 function keyboard(event){
  var k=event.keyCode;if([37,38,39,40,13,461,27,8,9].indexOf(k)<0)return;event.preventDefault();
  if(k===461||k===27||k===8){if(previewPhoto)closePreview();else if(modal)closeOverlay();else{zone='tabs';tabFocus=0;paintFocus();}return;}
  if(previewPhoto){if(k===37)previewIndex=Math.max(0,previewIndex-1);if(k===39||k===9)previewIndex=Math.min(previewButtons.length-1,previewIndex+1);if(k===13&&previewButtons[previewIndex])previewButtons[previewIndex].click();paintFocus();return;}
  if(modal){
   if(modal==='studio'||modal==='weather'){if(k===13)closeOverlay();else if(k===40)$('overlayBody').scrollTop+=220;else if(k===38)$('overlayBody').scrollTop-=220;return;}
   if(zone==='close'){if(k===13)closeOverlay();else if(k===40){zone=modal==='all'?'all':'settings';paintFocus();}return;}
   if(k===13){if(modal==='all')activate(lists[category][modalIndex]);else if(settingsButtons[settingsFocus])settingsButtons[settingsFocus].click();return;}
   if(modal==='all'){if(k===38&&modalIndex<7)zone='close';else modalIndex=M.gridMove(modalIndex,k,lists[category].length,7);paintFocus();}else moveSettings(k);return;
  }
  if(k===13){if(zone==='weather'){openOverlay('weather');}else if(zone==='top'){if(topFocus)openOverlay('settings');else openApple();}else if(zone==='tabs'){if(tabFocus)openOverlay('tv');else setCategory('apps');}else if(zone==='rail')activate(lists[category][selection[category]]);else if(zone==='allButton')openOverlay('all');paintFocus();return;}
  if(zone==='weather'){if(k===38){zone='top';topFocus=0;}if(k===40||k===37){zone='tabs';tabFocus=0;}}
  else if(zone==='top'){if(k===37)topFocus=0;if(k===39)topFocus=1;if(k===40)zone='weather';}
  else if(zone==='tabs'){if(k===37)tabFocus=0;if(k===39)tabFocus=1;if(k===38)zone='weather';if(k===40)zone=lists[category].length?'rail':'allButton';}
  else if(zone==='rail'){if(k===37)selection[category]=Math.max(0,selection[category]-1);if(k===39)selection[category]=Math.min(lists[category].length-1,selection[category]+1);if(k===38){zone='tabs';tabFocus=0;}if(k===40)zone='allButton';var it=lists[category][selection[category]];if(it)selectedId[category]=it.id;}
  else if(zone==='allButton'){if(k===38)zone=lists[category].length?'rail':'tabs';}
  paintFocus();
 }
 function clock(){var d=new Date(),h=d.getHours();if(clockOffset!==null){d=new Date(Date.now()+clockOffset*60000);h=d.getUTCHours();}$('greeting').textContent=h>=6&&h<12?'Buenos días':h>=12&&h<20?'Buenas tardes':'Buenas noches';$('clock').textContent=('0'+h).slice(-2)+':'+('0'+(clockOffset!==null?d.getUTCMinutes():d.getMinutes())).slice(-2);try{$('date').textContent=d.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',timeZone:clockOffset!==null?'UTC':undefined});}catch(e){$('date').textContent=d.toLocaleDateString();}}
 $('weather').onclick=function(){if(modal||previewPhoto)return;zone='weather';openOverlay('weather');};$('weather').onmouseenter=function(){if(modal||previewPhoto)return;zone='weather';paintFocus();};
 $('apple').onclick=openApple;$('settings').onclick=function(){openOverlay('settings');};
 [$('apple'),$('settings')].forEach(function(el,i){el.onmouseenter=function(){if(modal||previewPhoto)return;zone='top';topFocus=i;paintFocus();};});
 [$('appsTab'),$('channelsTab')].forEach(function(el,i){el.onmouseenter=function(){if(modal)return;zone='tabs';tabFocus=i;paintFocus();};el.onclick=function(){if(modal)return;zone='tabs';tabFocus=i;if(i)openOverlay('tv');else setCategory('apps');paintFocus();};});
 $('all').onclick=function(){zone='allButton';openOverlay('all');};$('all').onmouseenter=function(){if(modal)return;zone='allButton';paintFocus();};$('closeOverlay').onclick=closeOverlay;$('closeOverlay').onmouseenter=function(){if(previewPhoto)return;zone='close';paintFocus();};
 document.addEventListener('keydown',keyboard);window.addEventListener('resize',function(){wallpaper.align();paintFocus();});
 document.addEventListener('visibilitychange',function(){if(document.hidden){wallpaper.pause(true);}else{wallpaper.pause(!!modal);clock();refresh();}});
 document.addEventListener('webOSRelaunch',function(){if(previewPhoto)closePreview();if(modal)closeOverlay();setCategory('apps');zone='tabs';tabFocus=0;paintFocus();refresh();});
 var savedSelection=M.read(localStorage,'inicio.selection',null);if(savedSelection){['channels','apps'].forEach(function(c){selection[c]=Math.max(0,Number(savedSelection[c])||0);selectedId[c]=savedSelection[c+'Id']||null;});}
 var saved=M.read(localStorage,'inicio.inventory',null);if(saved&&saved.apps&&saved.channels){inventory=saved;if(inventory.clock)clockOffset=inventory.clock.offsetMinutes;}
 lastInventorySignature=JSON.stringify([inventory.apps,inventory.channels,inventory.inputs]);rebuild();clock();setInterval(clock,10000);refresh();setInterval(function(){if(!document.hidden&&!modal)refresh();},120000);
 // Read-only diagnostic state; no credentials, device addresses or control bypasses.
 window.InicioDiagnostics=function(){return {category:category,zone:zone,selection:{channels:selection.channels,apps:selection.apps},counts:{channels:lists.channels.length,apps:(inventory.apps||[]).length,accesses:lists.apps.length,inputs:(inventory.inputs||[]).length},modal:modal,preview:previewPhoto&&previewPhoto.id,wallpaper:{active:wallpaper.state.active,deleted:wallpaper.state.deleted.slice(),fixed:wallpaper.state.fixed,interval:wallpaper.state.interval,paused:wallpaper.paused,busy:wallpaper.busy,preloaded:wallpaper.next&&wallpaper.next.id},railOffset:railOffset};};
}());
