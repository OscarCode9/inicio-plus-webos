/* Derive small runtime overrides from this TV's files; do not redistribute LG QML. */
'use strict';
var fs=require('fs');
function hideVisuals(source){
 var visible=/^([ \t]*)visible:\s*(true|false)\s*$/m;
 if(!visible.test(source))throw Error('Unsupported Home QML: missing root visibility');
 var index=source.search(visible),prefix=source.slice(0,index),tail=source.slice(index);
 tail=tail.replace(visible,function(_,indent){return indent+'visible: true';});
 var beforeProperties=tail.search(/^[ \t]*(?:focus:|\/\/System|property )/m),head=beforeProperties<0?tail:tail.slice(0,beforeProperties);
 if(/^[ \t]*opacity:/m.test(head))tail=tail.replace(/^[ \t]*opacity:[^\n]*/m,'    opacity: 0');
 else tail=tail.replace(visible,function(line){return line+'\n    opacity: 0';});
 return prefix+tail;
}
if(require.main===module){['home','fullhome'].forEach(function(name){
 var target='/usr/palm/applications/com.webos.app.'+name+'/qml/main.qml';
 var output='/var/lib/inicio/qml-'+name+'-main.qml';
 var source=fs.readFileSync(target,'utf8'),patched=hideVisuals(source);
 if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==patched)fs.writeFileSync(output,patched);
});}
module.exports={hideVisuals:hideVisuals};
