/* Stop LG from reloading ordinary user apps after the owner has closed them. */
'use strict';
var fs=require('fs'),L=require('./luna'),KEY='com.webos.service.preloadmanager.supportAppList';
function canDisable(id){return typeof id==='string'&&id!=='airplay'&&id!=='google.assistant'&&id!=='amazon.alexapr'&&!/^org\.webosbrew\./.test(id)&&(!/^(com\.webos\.|com\.palm\.)/.test(id)||id==='com.webos.app.browser')&&id!=='com.gathin.tvhome';}
function project(list,installed){return list.map(function(entry){var copy=JSON.parse(JSON.stringify(entry));if(installed.indexOf(copy.id)>=0&&canDisable(copy.id))copy.isEnabled=false;return copy;});}
function apply(){return Promise.all([
 L.call('luna://com.webos.service.config/getConfigs',{configNames:[KEY]}),
 L.call('luna://com.webos.applicationManager/listLaunchPoints',{})
]).then(function(results){
 var read=results[0],apps=results[1],list=read.configs&&read.configs[KEY];
 if(!read.returnValue||!Array.isArray(list)||!apps.returnValue)return {ok:false,disabled:[]};
 var installed=(apps.launchPoints||[]).filter(function(a){return !a.hidden;}).map(function(a){return a.id;}),next=project(list,installed);
 var disabled=next.filter(function(e){return canDisable(e.id)&&installed.indexOf(e.id)>=0&&e.isEnabled===false;}).map(function(e){return e.id;});
 if(!fs.existsSync('/var/lib/inicio/preload-before.json'))fs.writeFileSync('/var/lib/inicio/preload-before.json',JSON.stringify(list),{mode:384});
 fs.writeFileSync('/var/lib/inicio/preload-disabled.json',JSON.stringify(disabled),{mode:384});
 var payload={configs:{}};payload.configs[KEY]=next;
 var saved=JSON.stringify(list)===JSON.stringify(next)?Promise.resolve({returnValue:true}):L.call('luna://com.webos.service.config/setConfigs',payload);
 return saved.then(function(r){if(!r.returnValue)return {ok:false,disabled:[]};var applied=true;return disabled.reduce(function(chain,id){return chain.then(function(){return L.call('luna://com.webos.service.preloadmanager/setPreloadPolicy',{application:{id:id,isEnabled:false}}).then(function(live){if(!live.returnValue)applied=false;});});},Promise.resolve()).then(function(){return {ok:applied,disabled:disabled};});});
});}
if(require.main===module)apply().then(function(r){console.log(JSON.stringify(r));}).catch(function(){console.log(JSON.stringify({ok:false,disabled:[]}));});
module.exports={canDisable:canDisable,project:project,apply:apply};
