const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function harness(){
 const nodes={},timers=[],requests=[];const $=id=>nodes[id]||(nodes[id]={textContent:'',innerHTML:'',classList:{toggle(k,v){this[k]=v;}}});
 function XHR(){requests.push(this);}XHR.prototype.open=function(){};XHR.prototype.send=function(){};
 const ctx={CONFIG:{utcOffsetMinutes:-360,location:'CIUDAD DE EJEMPLO',weather:{city:'Ciudad de ejemplo',latitude:19.43,longitude:-99.13}},document:{getElementById:$,hidden:false,addEventListener(){}},window:{InicioNative:{}},InicioNative:{network(cb){cb({ok:true,connected:true,internet:true,type:'wifi',name:'<script>SSID</script>'});}},localStorage:{getItem(){return null;},setItem(){}},XMLHttpRequest:XHR,setInterval(fn){timers.push(fn);},Date,JSON,Math,isFinite,encodeURIComponent};
 vm.runInNewContext(fs.readFileSync(require.resolve('../app/ambient.js'),'utf8'),ctx);
 return {nodes,requests,timers};
}
test('SSID is rendered as text and does not enter remote navigation',()=>{const h=harness();assert.equal(h.nodes.networkName.textContent,'<script>SSID</script>');assert.equal(h.nodes.networkName.innerHTML,'');assert.equal(h.nodes.networkDetail.textContent,'Wi-Fi · Conectado');});
test('weather fetch failure stays marked stale across periodic rendering',()=>{const h=harness(),x=h.requests[0];x.status=200;x.responseText=JSON.stringify({current:{time:Math.floor(Date.now()/1000),temperature_2m:22.4,weather_code:0,is_day:0,relative_humidity_2m:54,apparent_temperature:21}});x.onload();assert.equal(h.nodes.weatherTemp.textContent,'22°');assert.equal(h.nodes.weatherCondition.textContent,'Noche despejada');h.timers[1]();h.requests[1].onerror();h.timers[2]();assert.match(h.nodes.weatherUpdated.textContent,/Sin actualizar/);assert.equal(h.nodes.weather.classList.stale,true);});
test('missing live weather never fabricates a temperature',()=>{const h=harness();h.requests[0].status=200;h.requests[0].responseText='{"current":{"temperature_2m":null}}';h.requests[0].onload();assert.equal(h.nodes.weatherCondition.textContent,'Clima no disponible');assert.equal(h.nodes.weatherTemp,undefined);});
