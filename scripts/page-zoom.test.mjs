import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('page zoom is blocked while scrolling, typing and copy shortcuts remain usable',()=>{
 const listeners={};
 vm.runInNewContext(fs.readFileSync('src/page-zoom.js','utf8'),{document:{addEventListener(type,handler){listeners[type]=handler;}}});
 const blocked=(type,fields)=>{let prevented=false;listeners[type]({...fields,preventDefault(){prevented=true;}});return prevented;};
 for(const key of ['+','=','-','_','0'])assert.equal(blocked('keydown',{key,ctrlKey:true}),true);
 assert.equal(blocked('keydown',{key:'+',metaKey:true}),true);
 assert.equal(blocked('keydown',{key:'-',ctrlKey:false}),false);
 assert.equal(blocked('keydown',{key:'c',ctrlKey:true}),false);
 assert.equal(blocked('wheel',{ctrlKey:true}),true);
 assert.equal(blocked('wheel',{}),false);
 assert.equal(blocked('gesturestart',{}),true);
});
