/* Forecast projection with explicit local dates and missing-value handling. */
(function(root){
 'use strict';
 function dateKey(epoch,offset){return new Date(epoch*1000+offset*60000).toISOString().slice(0,10);}
 function number(v){return typeof v==='number'&&isFinite(v)?v:null;}
 function at(obj,key,i){return obj&&obj[key]&&obj[key][i];}
 function project(data,now,offset){
  var hourly=data.hourly||{},daily=data.daily||{},hours=[],tomorrow=null,key=dateKey(now/1000+86400,offset);
  (hourly.time||[]).forEach(function(t,i){if(t*1000<now||hours.length>=8)return;hours.push({time:t,temp:number(at(hourly,'temperature_2m',i)),rain:number(at(hourly,'precipitation_probability',i)),code:number(at(hourly,'weather_code',i)),day:at(hourly,'is_day',i)===1});});
  (daily.time||[]).some(function(t,i){if(dateKey(t,offset)!==key)return false;tomorrow={code:number(at(daily,'weather_code',i)),max:number(at(daily,'temperature_2m_max',i)),min:number(at(daily,'temperature_2m_min',i)),rain:number(at(daily,'precipitation_probability_max',i)),amount:number(at(daily,'precipitation_sum',i))};return true;});
  return {hours:hours,tomorrow:tomorrow};
 }
 var api={project:project};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.InicioWeatherModel=api;
}(this));
