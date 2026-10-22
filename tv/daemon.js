'use strict';
var fs=require('fs'),L=require('./luna'),cp=require('child_process');
var lock='/tmp/inicio-daemon.lock',power=null,foreground=null,initial=true,lastTick=Date.now(),launching=false,lastLaunch=0,subscriptions=[],generation=0,restartTimer=null,settingPolicy=false;
try{fs.mkdirSync(lock);}catch(e){try{var pid=Number(fs.readFileSync(lock+'/pid','utf8'));process.kill(pid,0);process.exit(0);}catch(ignore){try{fs.unlinkSync(lock+'/pid');fs.rmdirSync(lock);fs.mkdirSync(lock);}catch(err){process.exit(1);}}}
fs.writeFileSync(lock+'/pid',String(process.pid));
function log(s){console.log(new Date().toISOString()+' '+s);}
function enforceHomePolicy(){if(settingPolicy)return;settingPolicy=true;
 L.call('luna://com.webos.settingsservice/setSystemSettings',{category:'general',settings:{homeAutoLaunch:'off'},store:true},2500).then(function(r){settingPolicy=false;log(r.returnValue?'LG auto launch disabled':'LG auto launch setting unavailable');});}
function launch(reason){if(launching||Date.now()-lastLaunch<400)return;launching=true;lastLaunch=Date.now();var tries=0,origin=foreground;
 function retry(){if(tries<6)setTimeout(attempt,700);else{launching=false;log('Inicio unavailable; recovery retained');}}
 function attempt(){tries++;L.call('luna://com.webos.applicationManager/launch',{id:'com.gathin.tvhome'},2500).then(function(r){if(!r.returnValue){retry();return;}setTimeout(function(){L.call('luna://com.webos.applicationManager/getForegroundAppInfo',{},2000).then(function(fg){if(fg.appId==='com.gathin.tvhome'){launching=false;log('Inicio foreground verified: '+reason);}else if(fg.appId&&origin&&fg.appId!==origin&&fg.appId!=='com.webos.app.home'&&fg.appId!=='com.webos.app.fullhome'){launching=false;log('Another app selected; launch retries stopped');}else retry();});},450);});}attempt();}
function subscribeAll(){
 var current=++generation;
 subscriptions.forEach(function(p){try{p.kill();}catch(e){}});subscriptions=[];
 var p=L.subscribe('luna://com.webos.service.tvpower/power/getPowerState',{subscribe:true},function(r){var state=(r.state||'').toLowerCase();if(!state)return;var old=power;power=state;if(state==='active'&&(initial||old&&old!=='active'&&old!=='screen off')){initial=false;enforceHomePolicy();launch('wake');}});subscriptions.push(p);
 var policy=L.subscribe('luna://com.webos.settingsservice/getSystemSettings',{category:'general',keys:['homeAutoLaunch'],subscribe:true},function(r){if(r.settings&&r.settings.homeAutoLaunch==='on')enforceHomePolicy();});subscriptions.push(policy);
 var f=L.subscribe('luna://com.webos.applicationManager/getForegroundAppInfo',{subscribe:true},function(r){if(r.appId)foreground=r.appId;if(r.appId==='com.webos.app.home'||r.appId==='com.webos.app.fullhome')launch('system home fallback');});subscriptions.push(f);
 // Home can be an overlay: getForegroundAppInfo still reports the app beneath it.
 // Observe lifecycle events too, including launches from mobile/CEC/system routes.
 var h=L.subscribe('luna://com.webos.applicationManager/getAppLifeStatus',{subscribe:true},function(r){
  // Wait until Home actually takes focus. Launching earlier races native restore.
  if((r.appId==='com.webos.app.home'||r.appId==='com.webos.app.fullhome')&&r.status==='foreground')launch('home compatibility route');
 });subscriptions.push(h);
 subscriptions.forEach(function(p){p.on('close',function(){if(!stopping&&current===generation&&!restartTimer)restartTimer=setTimeout(function(){restartTimer=null;subscribeAll();},2000);});});
}
var stopping=false;
L.call('luna://org.webosbrew.inputhook.service/start',{},6000).then(function(r){log(r.returnValue?'Home input interception started':'Input interception needs attention');subscribeAll();setTimeout(function(){if(initial){initial=false;launch('boot');}},1500);});
setInterval(function(){var now=Date.now();if(now-lastTick>12000){initial=true;L.call('luna://com.webos.service.tvpower/power/getPowerState',{}).then(function(r){if((r.state||'').toLowerCase()==='active')launch('resume');});}lastTick=now;},1000);
function stop(){stopping=true;subscriptions.forEach(function(p){try{p.kill();}catch(e){}});try{fs.unlinkSync(lock+'/pid');fs.rmdirSync(lock);}catch(e){}process.exit(0);}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
log('Inicio supervisor started');
