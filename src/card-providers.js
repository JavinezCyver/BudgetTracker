export const providers=[['folio','PocketPlan'],['salmon','Salmon'],['atome','atome'],['gcash','GCash'],['bpi','BPI'],['maya','maya'],['unionbank','UnionBank'],['maribank','MariBank'],['cimb','CIMB'],['bdo','BDO'],['landbank','LANDBANK'],['wise','wise'],['rcbc','RCBC']];
export function normalizeProvider(value){
 if(typeof value!=='string')return null;
 const normalized=value.trim().toLowerCase();
 return providers.find(([id,label])=>id===normalized||label.toLowerCase()===normalized)?.[0]||null;
}
export function walletLabel(wallet){
 if(['assets','liabilities'].includes(wallet.id))return wallet.name;
 const provider=normalizeProvider(wallet.provider)||providers.find(([id,label])=>id!=='folio'&&String(wallet.name||'').toLowerCase().includes(label.toLowerCase()))?.[0]||'folio';
 const label=providers.find(([id])=>id===provider)[1];
 return `${String(wallet.name||'').toUpperCase()} – ${label}`;
}
