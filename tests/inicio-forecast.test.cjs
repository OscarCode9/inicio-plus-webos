const test=require('node:test'),assert=require('node:assert/strict'),M=require('../app/weather-model.js');
const time=s=>Date.parse(s)/1000;
test('tomorrow follows the city date across UTC midnight, not array position',()=>{
 const now=Date.parse('2026-10-22T02:00:00Z');
 const result=M.project({daily:{time:[time('2026-10-21T06:00:00Z'),time('2026-10-22T06:00:00Z')],temperature_2m_max:[22,27],precipitation_probability_max:[0,null]}},now,-360);
 assert.equal(result.tomorrow.max,27);assert.equal(result.tomorrow.rain,null);
});
test('cached old forecasts cannot masquerade as tomorrow',()=>{assert.equal(M.project({daily:{time:[time('2026-10-21T06:00:00Z')]}},Date.parse('2026-10-23T02:00:00Z'),-360).tomorrow,null);});
test('hours exclude elapsed predictions and preserve missing rain',()=>{const now=Date.now(),times=Array.from({length:15},(_,i)=>Math.floor(now/1000)+(i-2)*3600),d=M.project({hourly:{time:times,temperature_2m:times.map(()=>20),precipitation_probability:times.map(()=>null)}},now,-360);assert.equal(d.hours.length,8);assert.ok(d.hours[0].time*1000>=now);assert.equal(d.hours[0].rain,null);});
