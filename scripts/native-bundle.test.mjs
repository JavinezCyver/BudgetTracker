import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWallet,createTransaction,preferencesAction} from '../src/native-actions.js';
test('native adapters send intents without calculating or accepting final balances',()=>{
 const original={_revision:7,wallets:[],transactions:[]},data=structuredClone(original);
 const request=createWallet(data,{name:'Bank',amount:'100'});assert.deepEqual(request,{nativeAction:{type:'create_wallet',fields:{name:'Bank',amount:'100'},id:''},revision:7});assert.deepEqual(data,original);
 assert.equal(createTransaction(data,{amount:'100'}).nativeAction.type,'create_transaction');assert.equal(preferencesAction(data,{summaryColor:'teal'}).revision,7);
});
test('native source does not expose the former arbitrary save_data command',()=>{
 const entry=fs.readFileSync('src-tauri/src/lib.rs','utf8'),backend=fs.readFileSync('src-tauri/src/backend.rs','utf8');
 assert.ok(!entry.includes('save_data'));assert.ok(!backend.includes('save_data'));assert.ok(entry.includes('execute_action'));assert.ok(backend.includes('window.label()'));
});
