/* Fixed operations only: live inventory and exact channel selection. No network service. */
'use strict';
var L=require('./luna'),fs=require('fs'),BASE='luna://com.webos.service.apiadapter/tv/';
function inventory(){return Promise.all([
 L.call('luna://com.webos.applicationManager/listLaunchPoints',{}),
 L.call('luna://com.webos.service.iepg/getChannelList',{channelMode:'',channelGroup:['All'],type:2,sort:0}),
 L.call(BASE+'getExternalInputList',{})
]).then(function(r){
 if(!r[0].returnValue||!r[1].returnValue||!r[2].returnValue)throw Error('inventory unavailable');
 return {apps:(r[0].launchPoints||[]).filter(function(p){return !p.hidden&&p.id!=='com.gathin.tvhome';}).map(function(p){return {id:p.id,title:p.title,kind:'app'};}),channels:(r[1].channelList||[]).filter(function(c){return !!c.channelId;}).map(function(c){return {id:c.channelId,title:c.channelName||c.channelNumber||'Canal',number:c.channelNumber||'',kind:'channel'};}),inputs:(r[2].devices||[]).filter(function(d){return !!d.appId;}).map(function(d){return {id:d.appId,title:d.label||d.id,inputId:d.id,connected:!!d.connected,kind:'input'};}),updated:Math.floor(Date.now()/1000),clock:{epochMs:Date.now(),offsetMinutes:-360}};
 });}
function tune(id){return inventory().then(function(data){
 if(!data.channels.some(function(c){return c.id===id;}))return {ok:false,message:'El canal ya no está disponible.'};
 return L.call(BASE+'openChannel',{channelId:id},5000).then(function(r){
  if(!r.returnValue)return {ok:false,message:'La televisión no pudo abrir ese canal.'};
  var tries=0;return new Promise(function(resolve){function check(){L.call('luna://com.webos.service.legacybroadcast.channel/getCurrentChannelId',{},1800).then(function(now){if(now.channelId===id)resolve({ok:true,verified:true});else if(++tries<5)setTimeout(check,200);else resolve({ok:false,message:'No se pudo confirmar el canal seleccionado.'});});}setTimeout(check,250);});
 });
 });}
function network(){return L.call('luna://com.webos.service.connectionmanager/getStatus',{}).then(function(r){
 if(!r.returnValue)return {ok:false};
 var wired=r.wired||{},wifi=r.wifi||{},link=wired.state==='connected'?wired:wifi.state==='connected'?wifi:null;
 return {ok:true,connected:!!link,internet:r.isInternetConnectionAvailable===true,type:link===wired?'ethernet':link?'wifi':'none',name:link===wired?'Ethernet':link?String(wifi.ssid||'Wi-Fi'):'Sin conexión'};
});}
if(require.main===module){
 var task=process.argv[2],p;
 if(task==='inventory')p=inventory().then(function(data){return {ok:true,data:data};});
 else if(task==='network')p=network();
 else if(task==='channel'&&/^[A-Za-z0-9_.:-]{1,128}$/.test(process.argv[3]||''))p=tune(process.argv[3]);
 else p=Promise.resolve({ok:false,message:'Operación no disponible.'});
 p.then(function(r){console.log(JSON.stringify(r));}).catch(function(){console.log(JSON.stringify({ok:false,message:'La televisión no está lista. Reintenta en unos segundos.'}));});
}
module.exports={inventory:inventory,tune:tune,network:network};
