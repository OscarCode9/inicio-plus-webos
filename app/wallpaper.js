(function(root){
 'use strict';
 var M=root.InicioModel;
 function Wallpapers(photos,changed,notify){
  this.photos=photos;this.changed=changed;this.notify=notify;this.storage=root.localStorage;
  this.state=M.wallpaperState(M.read(this.storage,'inicio.wallpapers',{}),photos);
  this.front=0;this.shown=null;this.next=null;this.paused=false;this.busy=false;this.token=0;this.cleanup=null;this.last=Date.now();
  this.layers=[document.getElementById('photoA'),document.getElementById('photoB')];
  this.show(this.state.active,true);var self=this;
  this.timer=setInterval(function(){self.tick();},1000);
 }
 Wallpapers.prototype.find=function(id){return this.photos.filter(function(p){return p.id===id;})[0];};
 Wallpapers.prototype.save=function(){if(!M.write(this.storage,'inicio.wallpapers',this.state))this.notify('No se pudo guardar la preferencia.');};
 Wallpapers.prototype.load=function(p,done){
  var full=new Image(),blur=new Image(),loaded=0,ended=false;
  function ready(){if(++loaded===2&&!ended){ended=true;done(null,{id:p.id,full:full,blur:blur});}}
  function fail(){if(!ended){ended=true;done(new Error('image'));}}
  full.onload=ready;blur.onload=ready;full.onerror=fail;blur.onerror=fail;full.src=p.src;blur.src=p.blur;
 };
 Wallpapers.prototype.align=function(){
  var r=document.getElementById('tray').getBoundingClientRect(),w=innerWidth,h=innerHeight;
  Array.prototype.forEach.call(document.querySelectorAll('.trayBlur'),function(el){el.style.backgroundSize=w+'px '+h+'px';el.style.backgroundPosition=(-r.left)+'px '+(-r.top)+'px';});
 };
 Wallpapers.prototype.paint=function(p,first){
  clearTimeout(this.cleanup);var self=this,back=first?this.front:1-this.front,old=this.front;
  this.layers[back].style.backgroundImage='url("'+p.src+'")';
  var classes=['.blurA','.blurB'];
  Array.prototype.forEach.call(document.querySelectorAll(classes[back]),function(el){el.style.backgroundImage='url("'+p.blur+'")';el.style.opacity='1';});
  this.layers[back].classList.add('visible');
  if(!first){this.layers[old].classList.remove('visible');Array.prototype.forEach.call(document.querySelectorAll(classes[old]),function(el){el.style.opacity='0';});}
  this.front=back;this.shown=p.id;this.last=Date.now();this.align();
  document.getElementById('photoLabel').textContent=p.name;
  this.cleanup=setTimeout(function(){if(old!==self.front){self.layers[old].style.backgroundImage='none';Array.prototype.forEach.call(document.querySelectorAll(classes[old]),function(el){el.style.backgroundImage='none';});}self.busy=false;self.preload();},first?0:850);
 };
 Wallpapers.prototype.show=function(id,first,done){
  var self=this,p=this.find(id);if(!p)return;var ticket=++this.token;this.busy=true;
  function finish(err){if(ticket!==self.token)return;if(err){self.busy=false;self.notify('No se ha podido cargar el paisaje. Se conserva el anterior.');if(done)done(false);return;}
   self.state.active=id;self.save();self.paint(p,first||!self.shown);self.changed();if(done)done(true);
  }
  if(this.next&&this.next.id===id){finish(null);this.next=null;}
  else this.load(p,finish);
 };
 Wallpapers.prototype.preload=function(){
  var self=this;if(this.state.fixed||!this.state.interval){this.next=null;return;}
  var id=M.nextPhoto(this.state,this.photos,Math.random);if(!id||this.next&&this.next.id===id)return;
  var ticket=this.token;
  this.next=null;this.load(this.find(id),function(err,images){if(!err&&ticket===self.token&&self.state.active!==id)self.next=images;});
 };
 Wallpapers.prototype.tick=function(){
  if(this.paused||document.hidden||this.busy||this.state.fixed||!this.state.interval)return;
  if(Date.now()-this.last>=this.state.interval*60000){var id=this.next&&this.next.id||M.nextPhoto(this.state,this.photos,Math.random);if(id)this.show(id);else this.last=Date.now();}
 };
 Wallpapers.prototype.pause=function(pause){this.paused=pause;this.last=Date.now();};
 Wallpapers.prototype.interval=function(minutes){if(M.intervals.indexOf(minutes)<0)return;this.state.interval=minutes;this.last=Date.now();this.save();this.next=null;this.preload();this.changed();};
 Wallpapers.prototype.select=function(id,fixed,done){this.state.fixed=fixed;this.next=null;this.show(id,false,done);};
 Wallpapers.prototype.remove=function(id,done){
  if(M.available(this.state,this.photos).length<=1){this.notify('Conserva al menos un paisaje; puedes restaurar los eliminados.');if(done)done(false);return;}
  var self=this,active=this.state.active;
  function remove(){M.deletePhoto(self.state,self.photos,id);self.save();self.next=null;self.preload();self.changed();if(done)done(true);}
  if(id===active){var next=M.available(this.state,this.photos).filter(function(p){return p.id!==id;})[0];this.show(next.id,false,function(ok){if(ok)remove();else if(done)done(false);});}else remove();
 };
 Wallpapers.prototype.restore=function(){this.state.deleted=[];this.save();this.preload();this.changed();};
 root.InicioWallpapers=Wallpapers;
}(window));
