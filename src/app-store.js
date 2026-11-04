import {validateBudget} from './budget.js';
import {migrateWallets} from './wallets.js';
import {repairUnassignedTransactions} from './wallet-assignment.js';
import {nativeBackend} from './record-actions.js';
import * as native from './app-store.native.js';
export async function loadApplication(initial){
 if(nativeBackend())return native.loadApplication();
 const saved=JSON.parse(localStorage.getItem('folio-data')||'null');if(saved===null)return initial;
 validateBudget(saved);const next=repairUnassignedTransactions(migrateWallets(saved));if(next!==saved)await saveApplication(next);return next;
}
export async function saveApplication(next){
 if(nativeBackend())return native.saveApplication(next);
 validateBudget(next);localStorage.setItem('folio-data',JSON.stringify(next));return next;
}
