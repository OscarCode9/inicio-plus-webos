/* Existing Universe schedule integration, presented in Inicio+. Read-only. */
(function(){
 'use strict';
 var snapshot=null,receivedAt=0,pending=false,body=null,opened=false,offset=0;
 var endpoint=(window.INICIO_CONNECTION||{}).jobStatusUrl;
 function el(tag,cls,text){var e=document.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;}
 function stale(){return !receivedAt||Date.now()-receivedAt>65000;}
 function time(value){if(!value||!isFinite(Date.parse(value)))return '—';var d=new Date(Date.parse(value)+((snapshot&&snapshot.utcOffsetMinutes)||-360)*60000);return ('0'+d.getUTCHours()).slice(-2)+':'+('0'+d.getUTCMinutes()).slice(-2);}
 function remaining(job){if(!job.enabled)return 'Desactivado';if(stale())return 'Horario sin confirmar';if(job.state==='running')return 'Producción en curso';var ms=Date.parse(job.nextRunAt)-Date.now()-offset;if(!isFinite(ms))return 'Sin horario confirmado';if(ms<=0)return 'Verificando inicio';var m=Math.ceil(ms/60000),h=Math.floor(m/60);return h?'En '+h+' h '+m%60+' min':'En '+m+' min';}
 function paintMac(){
  var state=document.getElementById('macState'),storage=document.getElementById('macStorage'),activity=document.getElementById('macActivity');if(!state)return;
  var offline=stale(),mac=snapshot&&snapshot.mac;
  state.textContent=offline?(receivedAt?'Mac sin conexión':'Conectando con el Mac…'):'Mac activo';
  document.getElementById('macWidget').classList.toggle('offline',offline);
  storage.textContent=!offline&&mac&&mac.storage?Math.round(mac.storage.freeBytes/1000000000)+' GB libres de '+Math.round(mac.storage.totalBytes/1000000000)+' GB':'Espacio sin confirmar';
  activity.textContent=offline?'Esperando respuesta':!mac?'Estado no disponible':mac.rendering===true?'Renderizando video':mac.producing&&mac.producing.length?'Producción en curso':mac.rendering===false?'Sin render detectado':'Render sin confirmar';
 }
 function paint(){
  paintMac();
  if(!opened||!body||document.hidden)return;body.innerHTML='';
  if(!snapshot){body.appendChild(el('p','studioEmpty','Conectando con tus canales…'));body.appendChild(el('p','settingsNote','Las aplicaciones siguen disponibles mientras se recupera el estado del Mac.'));return;}
  var grid=el('div','studioGrid');
  snapshot.channels.forEach(function(channel,index){
   var daily=(channel.jobs||[]).filter(function(j){return j.kind==='daily';})[0]||{},long=(channel.jobs||[]).filter(function(j){return j.kind==='long';})[0]||{},publication=channel.publication||{};
   var card=el('article','studioChannel '+(index?'cosmos':'history'));
   var eyebrow=el('div','studioEyebrow');var img=document.createElement('img');img.src='logos/youtube.svg';img.alt='YouTube';eyebrow.appendChild(img);eyebrow.appendChild(el('span','','TU CANAL'));card.appendChild(eyebrow);
   card.appendChild(el('h2','',channel.name));
   var state=stale()?'Mac sin conexión':daily.state==='running'?'Produciendo short':long.state==='running'?'Produciendo largo':daily.enabled||long.enabled?'Próxima producción':'Sin programación activa';
   card.appendChild(el('div','studioStatus',state));
   var schedules=el('div','studioSchedules');
   [['SHORT',daily],['LARGO',long]].forEach(function(pair){var item=el('div','studioSchedule');item.appendChild(el('span','studioKind',pair[0]));item.appendChild(el('time','',pair[1].enabled?time(pair[1].nextRunAt):'—'));item.appendChild(el('span','studioCountdown',remaining(pair[1])));schedules.appendChild(item);});card.appendChild(schedules);
   var footer=el('div','studioFooter');footer.appendChild(el('span','studioPublication '+(publication.state==='auth_required'||publication.state==='uncertain'?'attention':''),publication.label||'Publicación sin confirmar'));
   if(publication.title)footer.appendChild(el('p','studioVideoTitle',publication.title));
   if(daily.lastFinishedAt)footer.appendChild(el('span','studioLast','Último short · '+time(daily.lastFinishedAt)+(daily.lastOutcome==='success'?' · completado':' · revisar resultado')));
   card.appendChild(footer);grid.appendChild(card);
  });
  body.appendChild(grid);body.appendChild(el('p','studioNote',stale()?'Sin conexión con el Mac · se conserva la última lectura':'Horarios de Ciudad de México · estado actualizado automáticamente'));
 }
 function refresh(){
  if(pending||document.hidden||!endpoint)return;pending=true;var x=new XMLHttpRequest();x.open('GET',endpoint,true);x.timeout=6000;
  x.onload=function(){pending=false;if(x.status===200)try{var s=JSON.parse(x.responseText);if(Array.isArray(s.channels)&&isFinite(Date.parse(s.servedAt))){snapshot=s;receivedAt=Date.now();offset=Date.parse(s.servedAt)-receivedAt;try{localStorage.setItem('inicio.studio',JSON.stringify(s));}catch(e){}paint();}}catch(e){};};
  x.onerror=x.ontimeout=function(){pending=false;paint();};x.send();
 }
 try{snapshot=JSON.parse(localStorage.getItem('inicio.studio'));}catch(e){}
 window.InicioStudio={show:function(container){opened=true;body=container;paint();refresh();},hide:function(){opened=false;body=null;},diagnostics:function(){return {count:snapshot?snapshot.channels.length:0,stale:stale(),opened:opened};}};
 setInterval(refresh,20000);setInterval(paint,15000);document.addEventListener('visibilitychange',function(){if(!document.hidden)refresh();});refresh();
}());
