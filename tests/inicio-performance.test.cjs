const test=require('node:test'),assert=require('node:assert/strict'),P=require('../tv/performance');
function app(id,type='web',window='card'){return{id,appType:type,defaultWindowType:window};}
test('foreground, Home, system components and Homebrew are protected',()=>{
 const ids=['airplay','active','com.gathin.tvhome','com.webos.app.fullhome','com.webos.app.livetv','com.palm.app.settings','org.webosbrew.hbchannel'],visible=Object.fromEntries(ids.map(x=>[x,true]));
 for(const id of ids)assert.equal(P.eligible(app(id),'active',visible),false,id);
 assert.equal(P.eligible(app('third.party','web','overlay'),'active',{'third.party':true}),false);
 assert.equal(P.eligible(app('third.party'),'active',{}),false);
});
function fixture(current=()=> 'com.gathin.tvhome'){
 const calls=[],apps=[app('netflix','native_mvpd'),app('example.web'),app('com.webos.app.fullhome','native','home'),app('com.gathin.tvhome')];
 const call=async(uri,p)=>{calls.push({uri,p});if(uri.endsWith('/running'))return{returnValue:true,running:apps};if(uri.endsWith('/listLaunchPoints'))return{returnValue:true,launchPoints:apps.map(a=>({id:a.id}))};if(uri.endsWith('/getForegroundAppInfo'))return{returnValue:true,appId:current()};return{returnValue:true};};
 return {cleaner:new P.Cleaner(call),calls};
}
test('native apps close via SAM; web apps terminate via WAM',async()=>{const h=fixture();assert.deepEqual(await h.cleaner.clean(),['netflix','example.web']);assert.ok(h.calls.some(c=>c.uri.endsWith('/closeByAppId')&&c.p.id==='netflix'));assert.ok(h.calls.some(c=>c.uri.endsWith('/killApp')&&c.p.appId==='example.web'));assert.equal(h.calls.filter(c=>/closeByAppId|killApp/.test(c.uri)).length,2);});
test('a foreground change cancels background termination',async()=>{let n=0;const h=fixture(()=>++n===1?'com.gathin.tvhome':'netflix');assert.deepEqual(await h.cleaner.clean(),[]);assert.equal(h.calls.filter(c=>/closeByAppId|killApp/.test(c.uri)).length,0);});
test('reopened background workers are not closed in a rapid retry loop',async()=>{const h=fixture();await h.cleaner.clean();assert.deepEqual(await h.cleaner.clean(),[]);assert.equal(h.calls.filter(c=>/closeByAppId|killApp/.test(c.uri)).length,2);});
