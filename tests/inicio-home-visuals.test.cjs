const test=require('node:test'),assert=require('node:assert/strict'),H=require('../tv/prepare-home-visuals');
test('native lifecycle can toggle visibility without drawing the stock tree',()=>{
 const src='import QtQuick 2.7\nFocusScope {\n id: rootWindow\n visible: false\n focus: true\n function launch() { rootWindow.visible = true; }\n}\n';
 const out=H.hideVisuals(src);assert.match(out,/visible: true\n    opacity: 0/);assert.match(out,/function launch\(\) \{ rootWindow.visible = true; \}/);assert.equal(H.hideVisuals(out),out);
});
test('existing root opacity is replaced once without affecting children',()=>{const out=H.hideVisuals('Item {\n    visible: true\n    opacity: 1\n    focus: true\n    Item { opacity: .5 }\n}');assert.match(out,/opacity: 0/);assert.match(out,/Item \{ opacity: .5 \}/);assert.equal((out.match(/opacity: 0/g)||[]).length,1);});
test('unexpected firmware layout is refused instead of guessing',()=>{assert.throws(()=>H.hideVisuals('Item { property bool active: false }'),/Unsupported/);});
