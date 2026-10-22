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
 function network(cb){
  if(typeof PalmServiceBridge==='undefined'){cb(null);return;}
  var b=new PalmServiceBridge(),done=false,timer=setTimeout(function(){finish(null);},4000);bridges.push(b);
  function finish(value){if(done)return;done=true;clearTimeout(timer);var i=bridges.indexOf(b);if(i>=0)bridges.splice(i,1);if(value)cb(value);else exec('/usr/bin/node /var/lib/inicio/native.js network',cb);}
  b.onservicecallback=function(raw){try{var r=JSON.parse(raw);if(!r.returnValue){finish(null);return;}var wired=r.wired||{},wifi=r.wifi||{},link=wired.state==='connected'?wired:wifi.state==='connected'?wifi:null;finish({ok:true,connected:!!link,internet:r.isInternetConnectionAvailable===true,type:link===wired?'ethernet':link?'wifi':'none',name:link===wired?'Ethernet':link?String(wifi.ssid||'Wi-Fi'):'Sin conexión'});}catch(e){finish(null);}};
  try{b.call('luna://com.webos.service.connectionmanager/getStatus','{}');}catch(e){finish(null);}
 }
 window.InicioNative={network:network,inventory:function(cb){exec('/usr/bin/node /var/lib/inicio/native.js inventory',cb);},channel:function(id,cb){if(!/^[A-Za-z0-9_.:-]{1,128}$/.test(id)){cb({ok:false});return;}exec('/usr/bin/node /var/lib/inicio/native.js channel '+id,cb);}};
}());
