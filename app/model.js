/* Pure state helpers, shared by the TV and regression tests. ES5 for webOS 5. */
(function(root){
 'use strict';
 var M={intervals:[0,5,10,20,30]};
 M.read=function(store,key,fallback){try{var x=JSON.parse(store.getItem(key));return x===null?fallback:x;}catch(e){return fallback;}};
 M.write=function(store,key,value){try{store.setItem(key,JSON.stringify(value));return true;}catch(e){return false;}};
 M.wallpaperState=function(saved,photos){
  saved=saved||{};var deleted=Array.isArray(saved.deleted)?saved.deleted:[];
  var valid=photos.filter(function(p){return deleted.indexOf(p.id)<0;});
  if(!valid.length){deleted=[];valid=photos.slice();}
  var active=valid.some(function(p){return p.id===saved.active;})?saved.active:(valid[0]||{}).id;
  return {active:active,deleted:deleted,interval:M.intervals.indexOf(saved.interval)>=0?saved.interval:10,fixed:saved.fixed===true};
 };
 M.available=function(state,photos){return photos.filter(function(p){return state.deleted.indexOf(p.id)<0;});};
 M.nextPhoto=function(state,photos,random){var a=M.available(state,photos).filter(function(p){return p.id!==state.active;});return a.length?a[Math.floor(random()*a.length)].id:null;};
 M.deletePhoto=function(state,photos,id){var a=M.available(state,photos);if(a.length<=1)return false;if(state.deleted.indexOf(id)<0)state.deleted.push(id);if(state.active===id)state.active=M.available(state,photos)[0].id;return true;};
 M.gridMove=function(index,key,count,columns){
  if(!count)return 0;
  if(key===37)return Math.max(Math.floor(index/columns)*columns,index-1);
  if(key===39)return Math.min(count-1,Math.floor(index/columns)*columns+columns-1,index+1);
  if(key===38)return Math.max(0,index-columns);
  if(key===40)return Math.min(count-1,index+columns);
  return index;
 };
 M.order=function(list,usage,preferred){return list.map(function(x,i){return {x:x,i:i};}).sort(function(a,b){var ua=usage[a.x.id]||0,ub=usage[b.x.id]||0;if(ua!==ub)return ub-ua;var pa=preferred.indexOf(a.x.id),pb=preferred.indexOf(b.x.id);if(pa<0)pa=999;if(pb<0)pb=999;return pa-pb||a.i-b.i;}).map(function(p){return p.x;});};
 root.InicioModel=M;if(typeof module!=='undefined')module.exports=M;
}(typeof window==='undefined'?global:window));
