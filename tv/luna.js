/* Spawned Luna client: keep stdin open until the response arrives on webOS 5. */
'use strict';
var cp=require('child_process');
function call(uri,payload,timeout){return new Promise(function(resolve){
 var p=cp.spawn('/usr/bin/luna-send',['-n','1',uri,JSON.stringify(payload||{})]),out='',done=false;
 var timer=setTimeout(function(){finish({returnValue:false,errorText:'Luna timeout'});p.kill();},timeout||3500);
 function finish(value){if(done)return;done=true;clearTimeout(timer);if(p.stdin)p.stdin.end();resolve(value);}
 p.stdout.on('data',function(b){out+=b.toString();try{var value=JSON.parse(out.trim());finish(value);}catch(e){}});
 p.stderr.resume();p.on('error',function(){finish({returnValue:false,errorText:'Luna unavailable'});});p.on('close',function(){if(!done){try{finish(JSON.parse(out.trim()));}catch(e){finish({returnValue:false,errorText:'Invalid Luna response'});}}});
});}
function subscribe(uri,payload,callback){
 var p=cp.spawn('/usr/bin/luna-send',['-i',uri,JSON.stringify(payload||{})]),pending='';
 p.stdout.on('data',function(b){pending+=b.toString();var lines=pending.split('\n');pending=lines.pop();lines.forEach(function(line){try{callback(JSON.parse(line));}catch(e){}});});p.stderr.resume();return p;
}
module.exports={call:call,subscribe:subscribe};
