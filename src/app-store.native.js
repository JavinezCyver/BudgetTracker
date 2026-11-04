import {BudgetError} from './budget.js';
import {receiveSnapshot} from './native-metrics.js';
const invoke=(command,args)=>window.__TAURI__.core.invoke(command,args);
export async function loadApplication(){
 try{return receiveSnapshot(await invoke('load_snapshot'));}catch(error){throw new BudgetError(String(error));}
}
export async function saveApplication(request){
 if(!request?.nativeAction)throw new BudgetError('Native changes must use an application action.');
 try{return receiveSnapshot(await invoke('execute_action',{action:request.nativeAction,revision:request.revision}));}catch(error){throw new BudgetError(String(error));}
}
