/* Release background user apps; leave foreground, system and Home infrastructure alone. */
'use strict';
var L=require('./luna'),HOME='com.gathin.tvhome';
function eligible(app,foreground,visible){
 var id=app&&app.id;
 if(!id||id===foreground||id===HOME||!visible[id])return false;
 if(app.defaultWindowType!=='card')return false;
 if(/^org\.webosbrew\./.test(id))return false;
 // AirPlay is a shared receiver preloaded again by the OS after termination.
 if(id==='airplay')return false;
 if(/^(com\.webos\.|com\.palm\.)/.test(id)&&id!=='com.webos.app.browser')return false;
 return ['web','native_mvpd','native_builtin','native'].indexOf(app.appType)>=0;
}
function Cleaner(call,log){this.call=call||L.call;this.log=log||function(){};this.timer=null;this.busy=false;this.generation=0;this.lastAttempt={};}
Cleaner.prototype.schedule=function(){var self=this;clearTimeout(this.timer);this.generation++;this.timer=setTimeout(function(){self.clean();},1400);};
Cleaner.prototype.clean=function(){
 if(this.busy){this.schedule();return Promise.resolve([]);}this.busy=true;
 var self=this,ticket=this.generation,closed=[];
 return Promise.all([
  this.call('luna://com.webos.applicationManager/running',{}),
  this.call('luna://com.webos.applicationManager/getForegroundAppInfo',{}),
  this.call('luna://com.webos.applicationManager/listLaunchPoints',{})
 ]).then(function(results){
  var running=results[0],front=results[1],points=results[2],visible={};
  if(!running.returnValue||!front.returnValue||!front.appId||!points.returnValue)return;
  (points.launchPoints||[]).forEach(function(p){if(!p.hidden)visible[p.id]=true;});
  var candidates=(running.running||[]).filter(function(a){return eligible(a,front.appId,visible);});
  return candidates.reduce(function(previous,app){return previous.then(function(){
   if(ticket!==self.generation)return;
   var now=Date.now();if(self.lastAttempt[app.id]&&now-self.lastAttempt[app.id]<30000)return;
   return self.call('luna://com.webos.applicationManager/getForegroundAppInfo',{}).then(function(current){
    if(ticket!==self.generation||!current.returnValue||current.appId!==front.appId||!eligible(app,current.appId,visible))return;
    self.lastAttempt[app.id]=Date.now();
    var uri=app.appType==='web'?'luna://com.palm.webappmanager/killApp':'luna://com.webos.applicationManager/closeByAppId';
    var params=app.appType==='web'?{appId:app.id}:{id:app.id};
    return self.call(uri,params,3500).then(function(result){if(result.returnValue)closed.push(app.id);});
   });
  });},Promise.resolve());
 }).then(function(){self.busy=false;if(closed.length)self.log('Background apps released: '+closed.length);return closed;},function(){self.busy=false;return closed;});
};
Cleaner.prototype.stop=function(){clearTimeout(this.timer);this.generation++;};
module.exports={Cleaner:Cleaner,eligible:eligible};
