import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveConfig} from 'vite';
import {loadApplication} from '../src/app-store.js';
import {createTransaction} from '../src/record-actions.js';
import {starterWallets} from '../src/wallets.js';

test('native development also supports browser preview without a Rust connection',async()=>{
 const serve=await resolveConfig({configFile:'vite.native.config.js',configLoader:'runner'},'serve');
 const build=await resolveConfig({configFile:'vite.native.config.js',configLoader:'runner'},'build');
 assert.ok(!serve.resolve.alias.some(alias=>alias.find.test?.('./app-store.js')));
 assert.ok(build.resolve.alias.some(alias=>alias.find.test?.('./app-store.js')));
 const initial={schemaVersion:3,hasAddedWallet:false,wallets:starterWallets(),transactions:[]};
 const saved=JSON.stringify(initial);
 globalThis.localStorage={getItem:()=>saved,setItem(){throw new Error('Loading must preserve this saved record.');}};
 try{assert.deepEqual(await loadApplication(initial),initial);}finally{delete globalThis.localStorage;}
});

test('shared development adapters still load and send financial actions to Rust in Tauri',async()=>{
 const data={schemaVersion:3,_revision:4,wallets:starterWallets(),transactions:[]};
 globalThis.window={__TAURI__:{core:{invoke:async(command)=>{
  assert.equal(command,'load_snapshot');
  return {data,analysis:{netWorth:0,assets:0,liabilities:0}};
 }}}};
 try{
  assert.equal(await loadApplication(),data);
  const request=createTransaction(data,{amount:'25'});
  assert.equal(request.nativeAction.type,'create_transaction');assert.equal(request.revision,4);
 }finally{delete globalThis.window;}
});
