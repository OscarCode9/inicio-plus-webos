/* On-TV network status and current weather. No computer service is required. */
(function(){
 'use strict';
 var $=function(id){return document.getElementById(id);},cfg=CONFIG.weather,last=null,pending=false,networkPending=false,weatherFailed=false,forecastBody=null;
 var cloud='<path d="M12 33h24a9 9 0 0 0 0-18 13 13 0 0 0-24-2 10 10 0 0 0 0 20z"/>';
 var sun='<circle cx="24" cy="24" r="9"/><path d="M24 3v6m0 30v6M3 24h6m30 0h6M9 9l4 4m22 22 4 4M9 39l4-4m22-22 4-4"/>';
 var moon='<path d="M34 35A18 18 0 0 1 18 5a19 19 0 1 0 21 28z"/>';
 function condition(code,day){
  if(typeof code!=='number')return {text:'Sin datos',icon:cloud};
  if(code===0)return {text:day?'Despejado':'Noche despejada',icon:day?sun:moon};
  if(code<=2)return {text:'Parcialmente nublado',icon:cloud};
  if(code===3)return {text:'Nublado',icon:cloud};
  if(code===45||code===48)return {text:'Niebla',icon:cloud+'<path d="M8 40h30m-26 6h22"/>'};
  if([71,73,75,77,85,86].indexOf(code)>=0)return {text:'Nieve',icon:cloud+'<path d="M15 39v6m-3-3h6m12-3v6m-3-3h6"/>'};
  if(code>=95)return {text:'Tormenta',icon:cloud+'<path d="m25 34-7 8h8l-5 8"/>'};
  if([51,53,55,56,57].indexOf(code)>=0)return {text:'Llovizna',icon:cloud+'<path d="m16 39-2 5m12-5-2 5m12-5-2 5"/>'};
  if([61,63,65,66,67,80,81,82].indexOf(code)>=0)return {text:'Lluvia',icon:cloud+'<path d="m16 38-4 9m14-9-4 9m14-9-4 9"/>'};
  return {text:'Condición no disponible',icon:cloud};
 }
 function valid(c){return c&&typeof c.temperature_2m==='number'&&isFinite(c.temperature_2m)&&typeof c.weather_code==='number'&&typeof c.time==='number';}
 function render(failed){
  if(!last){$('weatherCondition').textContent=failed?'Clima no disponible':'Consultando clima…';$('weatherUpdated').textContent=failed?'Se reintentará automáticamente · Open-Meteo':'Datos de Open-Meteo';renderForecast();return;}
  var c=last.current,age=Date.now()-c.time*1000,stale=failed||weatherFailed||age>90*60000||age< -15*60000,desc=condition(c.weather_code,c.is_day===1);
  $('weatherTemp').textContent=Math.round(c.temperature_2m)+'°';
  $('weatherCondition').textContent=desc.text;
  $('weatherIcon').innerHTML='<svg viewBox="0 0 48 52">'+desc.icon+'</svg>';
  var details=[];if(typeof c.apparent_temperature==='number')details.push('Sensación '+Math.round(c.apparent_temperature)+'°');if(typeof c.relative_humidity_2m==='number')details.push('Humedad '+Math.round(c.relative_humidity_2m)+'%');
  $('weatherDetails').textContent=details.join('  ·  ');
  // Use the configured UTC offset: this TV's old timezone database still applies Mexican DST.
  var date=new Date(c.time*1000+CONFIG.utcOffsetMinutes*60000),time=('0'+date.getUTCHours()).slice(-2)+':'+('0'+date.getUTCMinutes()).slice(-2);
  $('weatherUpdated').textContent=(stale?'Sin actualizar · ':'Actualizado ')+time+' · Open-Meteo';
  $('weather').classList.toggle('stale',stale);renderForecast();
 }
 function weather(){
  if(pending||!cfg||document.hidden)return;pending=true;
  var x=new XMLHttpRequest();x.open('GET','https://api.open-meteo.com/v1/forecast?latitude='+encodeURIComponent(cfg.latitude)+'&longitude='+encodeURIComponent(cfg.longitude)+'&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day&hourly=temperature_2m,precipitation_probability,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum&forecast_days=3&timeformat=unixtime&timezone='+encodeURIComponent(cfg.timezone||'America/Mexico_City'),true);x.timeout=12000;
  function failed(){pending=false;weatherFailed=true;render(true);}
  x.onload=function(){pending=false;try{var d=JSON.parse(x.responseText);if(x.status!==200||!valid(d.current))throw Error('Unavailable');last={current:d.current,hourly:d.hourly,daily:d.daily};weatherFailed=false;try{localStorage.setItem('inicio.weather.'+cfg.city,JSON.stringify(last));}catch(e){}render(false);}catch(e){failed();}};
  x.onerror=x.ontimeout=failed;try{x.send();}catch(e){failed();}
 }
 function element(tag,cls,text){var e=document.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;}
 function measure(value,suffix){return value===null?'—':Math.round(value)+suffix;}
 function timeLabel(t){var d=new Date(t*1000+CONFIG.utcOffsetMinutes*60000);return ('0'+d.getUTCHours()).slice(-2)+':'+('0'+d.getUTCMinutes()).slice(-2);}
 function icon(desc){var e=element('div','forecastIcon');e.innerHTML='<svg viewBox="0 0 48 52">'+desc.icon+'</svg>';return e;}
 function renderForecast(){
  if(!forecastBody)return;forecastBody.innerHTML='';
  if(!last||!last.hourly){forecastBody.appendChild(element('p','empty',weatherFailed?'No se pudo actualizar el pronóstico. Se reintentará automáticamente.':'Consultando el pronóstico…'));return;}
  var model=InicioWeatherModel.project(last,Date.now(),CONFIG.utcOffsetMinutes),stale=weatherFailed||Date.now()-last.current.time*1000>90*60000;
  forecastBody.appendChild(element('p','forecastLead',stale?'Último pronóstico guardado · sin actualizar':'Próximas 8 horas'));
  var row=element('div','forecastHours');model.hours.forEach(function(h){var desc=condition(h.code,h.day),card=element('article','forecastHour');card.appendChild(element('time','',timeLabel(h.time)));card.appendChild(icon(desc));card.appendChild(element('strong','',measure(h.temp,'°')));card.appendChild(element('span','forecastCondition',desc.text));card.appendChild(element('small','forecastRain','Lluvia '+measure(h.rain,'%')));row.appendChild(card);});
  if(!model.hours.length)row.appendChild(element('p','empty','No hay horas futuras disponibles.'));forecastBody.appendChild(row);
  var tomorrow=element('section','forecastTomorrow');tomorrow.appendChild(element('h2','','Mañana'));var t=model.tomorrow;
  if(t){var desc=condition(t.code,true);tomorrow.appendChild(icon(desc));var summary=element('div','tomorrowSummary');summary.appendChild(element('strong','',desc.text));summary.appendChild(element('span','','Máxima '+measure(t.max,'°')+' · Mínima '+measure(t.min,'°')));tomorrow.appendChild(summary);var rain=element('div','tomorrowRain');rain.appendChild(element('strong','',measure(t.rain,'%')));rain.appendChild(element('span','','Probabilidad de lluvia'));rain.appendChild(element('small','',t.amount===null?'Cantidad no disponible':t.amount.toFixed(1)+' mm de precipitación'));tomorrow.appendChild(rain);}
  else tomorrow.appendChild(element('p','','Pronóstico de mañana no disponible.'));forecastBody.appendChild(tomorrow);
  forecastBody.appendChild(element('p','forecastCredit', 'Probabilidades y temperaturas previstas · Hora local · Open-Meteo'));
 }
 window.InicioWeather={show:function(body){forecastBody=body;renderForecast();weather();},hide:function(){forecastBody=null;}};
 function network(){
  if(networkPending||document.hidden)return;
  if(!window.InicioNative||!InicioNative.network)return;networkPending=true;
  InicioNative.network(function(r){networkPending=false;var good=r&&r.ok;
   $('networkName').textContent=good?r.name:'Red no disponible';
   $('networkDetail').textContent=good?(r.connected?(r.internet?(r.type==='ethernet'?'Cable · Conectado':'Wi-Fi · Conectado'):'Sin acceso a Internet'):'Sin conexión'):'No se pudo consultar';
   $('networkStatus').classList.toggle('offline',!good||!r.connected||!r.internet);
  });
 }
 $('location').textContent=CONFIG.location;
 $('weatherCity').textContent=cfg.city;
 try{var cached=JSON.parse(localStorage.getItem('inicio.weather.'+cfg.city));if(cached&&valid(cached.current))last=cached;}catch(e){}
 render(false);network();weather();
 setInterval(network,30000);setInterval(weather,600000);setInterval(function(){if(!document.hidden)render(false);},60000);
 document.addEventListener('visibilitychange',function(){if(!document.hidden){network();weather();}});
 document.addEventListener('webOSRelaunch',function(){network();weather();});
}());
