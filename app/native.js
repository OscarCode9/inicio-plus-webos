/* Native on-TV integration. Pairing and computer connectivity are not required. */
(function(){
 'use strict';var bridges=[];
 function exec(command,callback){
  if(typeof PalmServiceBridge==='undefined'){callback(null);return;}
  var bridge=new PalmServiceBridge(),done=false,timer=setTimeout(function(){finish(null);},16000);bridges.push(bridge);
  function finish(value){if(done)return;done=true;clearTimeout(timer);var i=bridges.indexOf(bridge);if(i>=0)bridges.splice(i,1);callback(value);}
  bridge.onservicecallback=function(raw){try{var r=JSON.parse(raw);if(!r.returnValue){finish(null);return;}finish(JSON.parse(r.stdoutString));}catch(e){finish(null);}};
  try{bridge.call('luna://org.webosbrew.hbchannel.service/exec',JSON.stringify({command:command}));}catch(e){finish(null);}
 }
 window.InicioNative={network:function(cb){exec('/usr/bin/node /var/lib/inicio/native.js network',cb);},inventory:function(cb){exec('/usr/bin/node /var/lib/inicio/native.js inventory',cb);},channel:function(id,cb){if(!/^[A-Za-z0-9_.:-]{1,128}$/.test(id)){cb({ok:false});return;}exec('/usr/bin/node /var/lib/inicio/native.js channel '+id,cb);}};
}());
