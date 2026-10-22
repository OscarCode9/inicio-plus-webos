const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('network status reads directly without root process and excludes private connection fields',()=>{
 const calls=[],ctx={window:{},setTimeout(){return 1;},clearTimeout(){},PalmServiceBridge:function(){this.call=(uri,payload)=>{calls.push(uri);this.onservicecallback(JSON.stringify({returnValue:true,isInternetConnectionAvailable:true,wifi:{state:'connected',ssid:'Example Wi-Fi',ipAddress:'private-value',passphrase:'private-value'}}));};}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../app/native.js'),'utf8'),ctx);
 let result;ctx.window.InicioNative.network(value=>result=value);
 assert.deepEqual(calls,['luna://com.webos.service.connectionmanager/getStatus']);
 assert.equal(result.name,'Example Wi-Fi');assert.equal(result.connected,true);assert.equal(result.internet,true);assert.equal(result.type,'wifi');assert.equal(JSON.stringify(result).includes('private-value'),false);
});
