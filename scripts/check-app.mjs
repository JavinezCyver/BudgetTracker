import {nativeEngine} from './native-engine.mjs';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {createServer} from 'vite';
import {providers} from '../src/bank-cards.js';
import {starterWallets} from '../src/wallets.js';

const nativeMode=process.argv.includes('--native');
const devServer=process.argv.includes('--dev')?await createServer({configFile:'vite.native.config.js',configLoader:'runner',server:{middlewareMode:true}}):null;
const directory=path.resolve('.responsive-check');fs.mkdirSync(directory,{recursive:true});
const sizes=[[280,640],[320,568],[360,640],[390,844],[430,932],[540,720],[600,800],[601,800],[760,900],[761,900],[768,1024],[820,1180],[1024,768],[1280,800],[1440,900],[1920,1080],[2560,1440],[3840,2160],[568,320],[667,375],[844,390],[932,430],[320,320],[390,360]];
const seed={schemaVersion:3,hasAddedWallet:true,wallets:[...starterWallets(),...providers.map(([provider,label],index)=>({id:`wallet-${index}`,name:`${label} savings account`,kind:index%3===0?'liability':'asset',provider,network:'visa',balance:1234567.89,type:'Savings',color:'green'}))],transactions:[{id:1,name:'Monthly salary',category:'Income',wallet:'wallet-2',amount:5000,date:new Date().toISOString().slice(0,10)}]};
seed.loans=[{id:'preview-loan',person:'Alex Santos',principal:1500,issuedDate:seed.transactions[0].date,dueDate:'',note:'Example record',wallet:null,transactionId:null,repayments:[],createdAt:Date.now()}];
seed.goals=[{id:'preview-goal',name:'Travel fund',target:1500,targetDate:'',note:'Example goal',entries:[],createdAt:Date.now()}];
const harness=`<!doctype html><pre id="results">RUNNING</pre><script>
${fs.readFileSync('scripts/browser-flows.js','utf8')}
const seed=${JSON.stringify(seed)},sizes=${JSON.stringify(sizes)};
const pause=()=>new Promise(resolve=>setTimeout(resolve,20));
(async()=>{localStorage.setItem('folio-data',JSON.stringify(seed));const results=[];
for(const [width,height]of sizes){const frame=document.createElement('iframe');frame.style.cssText='border:0;display:block;width:'+width+'px;height:'+height+'px';frame.src='/';document.body.append(frame);const failures=[];let doc;
for(let i=0;i<300;i++){doc=frame.contentDocument;if(doc?.querySelector('[data-page]'))break;await pause();}
if(!doc?.querySelector('[data-page]'))throw new Error('App did not initialize');
const win=frame.contentWindow;const check=label=>{if(doc.documentElement.scrollWidth>doc.documentElement.clientWidth+1)failures.push(label+': horizontal overflow');};
if(width>760){
 const title=doc.querySelector('.pocketplan-wordmark').getBoundingClientRect(),account=doc.querySelector('.sidebar-account').getBoundingClientRect(),toggle=doc.querySelector('#sidebar-toggle'),button=toggle.getBoundingClientRect(),sidebar=doc.querySelector('.sidebar').getBoundingClientRect();
 if(title.right>button.left-3||button.right>sidebar.right||Math.abs(title.left-account.left)>1)failures.push('sidebar branding overlaps or is misaligned');
 toggle.click();if(toggle.getAttribute('aria-expanded')!=='false')failures.push('sidebar collapse failed');
 toggle.click();if(toggle.getAttribute('aria-expanded')!=='true')failures.push('sidebar expand failed');
}
for(const page of ['Dashboard','Wallets','Calendar','Transactions','Income','Who Owes You','Goals','Investments','Budget plan','Settings']){doc.querySelector('[data-page="'+page+'"]').click();await pause();check(page);
if(page==='Settings'){if(!doc.querySelector('#app-updates-title')||doc.querySelector('#add,#summary-add-wallet'))failures.push('Settings update section or actions incorrect');}
if(page==='Wallets'){for(const layout of ['grid','list','stack']){const before=doc.querySelector('.bank-card');doc.querySelector('[data-wallet-view="'+layout+'"]').click();await pause();if(doc.querySelector('.bank-card')!==before)failures.push('layout rebuilt cards');check('Wallets '+layout);const bounds=[];for(const card of doc.querySelectorAll('.bank-card')){const rect=card.getBoundingClientRect();if(card.classList.contains('vector-card')){const art=card.querySelector('.bank-art svg');if(!art||art.getBoundingClientRect().width===0)failures.push('missing vector artwork');if(card.classList.contains('bank-maribank')&&!art?.textContent.includes('MariBank'))failures.push('MariBank logo missing');}if(card.classList.contains('bank-gcash')){const chip=card.querySelector('.bank-chip').getBoundingClientRect(),balance=card.querySelector('.bank-balance').getBoundingClientRect();if(balance.top-chip.bottom<6)failures.push(layout+': chip overlaps balance');}const name=card.querySelector('.bank-wallet-name');if(!name||win.getComputedStyle(name).display==='none'||name.getBoundingClientRect().height===0)failures.push(layout+': wallet name hidden');if(rect.right>doc.documentElement.clientWidth+1)failures.push(layout+': card outside viewport');if(layout==='list')bounds.push(Math.round(rect.height));for(const selector of ['.bank-balance h2','.bank-options']){const element=card.querySelector(selector),r=element.getBoundingClientRect();if(r.right>rect.right+1||r.left<rect.left-1||r.bottom>rect.bottom+1)failures.push(layout+': '+selector+' clipped');}}if(layout==='list'&&Math.max(...bounds)-Math.min(...bounds)>1)failures.push('unequal list card heights');}
doc.querySelector('#add,#summary-add-wallet').click();await pause();const modal=doc.querySelector('dialog'),rect=modal.getBoundingClientRect();if(rect.left<0||rect.right>doc.documentElement.clientWidth+1||rect.top<0||rect.bottom>height+1)failures.push('dialog outside viewport');const trigger=modal.querySelector('.select-trigger');if(!trigger)failures.push('custom select missing');else{trigger.click();await pause();const menu=modal.querySelector('.select-menu'),r=menu.getBoundingClientRect();if(r.left<0||r.right>width||r.top<0||r.bottom>height)failures.push('dropdown outside viewport');menu.children[[...modal.querySelector('select').options].findIndex(option=>option.value==='gcash')].click();if(new win.FormData(modal.querySelector('form')).get('provider')!=='gcash')failures.push('dropdown value not saved');}modal.close();await pause();failures.push(...await checkTransactionDatePicker(doc,win,width,height));}
}
if(doc.querySelector('[data-page="Who Owes You"]')){
 doc.querySelector('[data-page="Who Owes You"]').click();doc.querySelector('#add,#summary-add-wallet').click();await pause();
 const loanModal=doc.querySelector('#modal'),r=loanModal.getBoundingClientRect();
 if(r.left<0||r.right>doc.documentElement.clientWidth+1||r.top<0||r.bottom>height+1||loanModal.scrollWidth>loanModal.clientWidth+1)failures.push('lending form outside viewport');
 doc.querySelector('#close-loan').click();
}
doc.querySelector('[data-page="Goals"]').click();doc.querySelector('#add,#summary-add-wallet').click();await pause();
const goalModal=doc.querySelector('#modal'),goalRect=goalModal.getBoundingClientRect();
if(goalRect.left<0||goalRect.right>doc.documentElement.clientWidth+1||goalRect.top<0||goalRect.bottom>height+1||goalModal.scrollWidth>goalModal.clientWidth+1)failures.push('goal form outside viewport');
doc.querySelector('#close-goal').click();doc.querySelector('[data-goal-fund]').click();await pause();
const fundRect=goalModal.getBoundingClientRect();if(fundRect.left<0||fundRect.right>doc.documentElement.clientWidth+1||fundRect.top<0||fundRect.bottom>height+1||goalModal.scrollWidth>goalModal.clientWidth+1)failures.push('goal savings form outside viewport');
doc.querySelector('#close-goal').click();
for(const page of ['Investments','Budget plan']){
doc.querySelector('[data-page="'+page+'"]').click();doc.querySelector('#add,#summary-add-wallet').click();await pause();
const modal=doc.querySelector('#modal'),rect=modal.getBoundingClientRect();
if(!modal.querySelector('#loan-form'))failures.push(page+': wrong form');
if(rect.left<0||rect.right>width+1||rect.top<0||rect.bottom>height+1||modal.scrollWidth>modal.clientWidth+1)failures.push(page+': form outside viewport');
modal.close();await pause();}

doc.querySelector('[data-page="Settings"]').click();const mode=doc.querySelector('[data-toggle-mode]');
if(mode.getAttribute('aria-checked')==='true')mode.click();await pause();
if(doc.documentElement.dataset.displayMode!=='light')failures.push('light mode not applied');
for(const page of ['Dashboard','Wallets','Calendar','Transactions','Income','Who Owes You','Goals','Investments','Budget plan','Settings']){doc.querySelector('[data-page="'+page+'"]').click();await pause();check('Light '+page);}
if(win.getComputedStyle(doc.body).backgroundColor!=='rgb(244, 245, 247)')failures.push('light background not applied');
doc.querySelector('[data-toggle-mode]').click();await pause();if(doc.documentElement.dataset.displayMode!=='dark')failures.push('dark mode not restored');

const bottom=doc.querySelector('.mobile-bottom-nav');
if(width<=760){
 if(win.getComputedStyle(doc.querySelector('.sidebar')).display!=='none')failures.push('phone sidebar still visible');
 const rect=bottom.getBoundingClientRect();if(rect.left<0||rect.right>width+1||Math.abs(rect.bottom-height)>1)failures.push('bottom navigation outside viewport');
 bottom.querySelector('[data-page="Wallets"]').click();await pause();if(!doc.querySelector('main.wallets-page')||doc.querySelector('.main-shell').getBoundingClientRect().left!==0)failures.push('bottom Wallets navigation failed');
 doc.querySelector('#mobile-more-open').click();await pause();const menu=doc.querySelector('#mobile-more'),bounds=menu.getBoundingClientRect();
 if(!menu.open||bounds.left<0||bounds.right>width+1||bounds.top<0||bounds.bottom>height+1||menu.scrollWidth>menu.clientWidth+1)failures.push('More menu outside viewport');
 menu.querySelector('[data-page="Goals"]').click();await pause();if(!doc.querySelector('.goals-page')||doc.querySelector('#mobile-more').open||!doc.querySelector('.mobile-more-active'))failures.push('More menu navigation failed');
 if(parseFloat(win.getComputedStyle(doc.querySelector('main')).paddingBottom)<rect.height+10)failures.push('content can be covered by bottom navigation');
}else if(win.getComputedStyle(bottom).display!=='none')failures.push('phone navigation visible on desktop');

const notice=doc.querySelector('#toast');notice.textContent='Wallet and its transactions deleted';notice.classList.add('visible');await pause();
const noticeBounds=notice.getBoundingClientRect(),noticeStyle=win.getComputedStyle(notice);
if(noticeStyle.visibility!=='visible'||noticeBounds.left<0||noticeBounds.right>width+1||noticeBounds.top<0||noticeBounds.bottom>height)failures.push('notification not visible inside viewport');
if(width<=760&&noticeBounds.bottom>doc.querySelector('.mobile-bottom-nav').getBoundingClientRect().top-4)failures.push('notification covered by bottom navigation');
if(noticeBounds.height>50||parseFloat(noticeStyle.fontSize)>11)failures.push('notification too large');
notice.classList.remove('visible');if(win.getComputedStyle(notice).visibility!=='hidden')failures.push('hidden notification leaves a visible edge');
results.push({width,height,failures:[...new Set(failures)]});frame.remove();}
results.push(await checkFlows(seed));
document.querySelector('#results').textContent=JSON.stringify(results);})().catch(error=>document.querySelector('#results').textContent=JSON.stringify({error:error.stack}));
</script>`;
const root=path.resolve(nativeMode?'dist-native':'dist'),types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'};
const server=http.createServer((request,response)=>{
 if(nativeMode&&request.url==='/__native'){
  let body='';request.on('data',chunk=>body+=chunk);request.on('end',()=>{try{const input=JSON.parse(body);let data=input.command==='load_snapshot'?nativeEngine({op:'migrate',data:input.data}):nativeEngine({data:input.data,action:input.action});if(input.command==='execute_action')data._revision=(input.data._revision||0)+1;response.setHeader('Content-Type','application/json');response.end(JSON.stringify({data,revision:data._revision||0,analysis:nativeEngine({op:'analyze',data})}));}catch(error){response.setHeader('Content-Type','application/json');response.end(JSON.stringify({error:error.message}));}});return;
 }
 if(request.url==='/__checks'){response.setHeader('Content-Type','text/html');response.end(harness);return;}
 if(devServer){devServer.middlewares(request,response,()=>{response.writeHead(404);response.end();});return;}
 const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);response.end();return;}
 try{response.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');const contents=fs.readFileSync(file);response.end(nativeMode&&path.extname(file)==='.html'?contents.toString().replace('<head>','<head>'+"<script>window.__TAURI__={core:{invoke:async(command,args={})=>{if(!['load_snapshot','execute_action'].includes(command))throw new Error('Unexpected native command '+command);const saved=JSON.parse(localStorage.getItem('folio-data')||'null');const result=await fetch('/__native',{method:'POST',body:JSON.stringify({command,data:saved||{schemaVersion:3,hasAddedWallet:false,wallets:[{id:'assets',name:'Assets',kind:'asset',balance:0,type:'What you own',color:'green'},{id:'liabilities',name:'Liabilities',kind:'liability',balance:0,type:'What you owe',color:'peach'}],transactions:[]},...args})}).then(response=>response.json());if(result.error)throw result.error;localStorage.setItem('folio-data',JSON.stringify(result.data));return result;}}};</script>"):contents);}catch{response.writeHead(404);response.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const chrome=spawn(process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--disable-gpu','--disable-software-rasterizer','--no-sandbox','--no-first-run',`--user-data-dir=${path.join(directory,'chrome-app')}`,'--dump-dom','--virtual-time-budget=30000',`http://127.0.0.1:${server.address().port}/__checks`],{windowsHide:true,stdio:['ignore','pipe','pipe']});
let stdout='',stderr='';chrome.stdout.on('data',chunk=>stdout+=chunk);chrome.stderr.on('data',chunk=>stderr+=chunk);
const timeout=setTimeout(()=>chrome.kill(),55000);
try{
 await new Promise((resolve,reject)=>{chrome.on('error',reject);chrome.on('close',resolve);});
 const content=stdout.match(/<pre id="results">([^<]*)<\/pre>/)?.[1];
 if(!content||content==='RUNNING')throw new Error('App verification did not finish: '+stderr.slice(-500));
 const results=JSON.parse(content.replaceAll('&quot;','"').replaceAll('&amp;','&'));if(results.error)throw new Error(results.error);
 for(const result of results)console.log(`${result.width}×${result.height}: ${result.failures.length?result.failures.join(', '):'PASS — 10 pages, 3 card layouts, wallet form, dropdown'}`);
 if(results.some(result=>result.failures.length))process.exitCode=1;
}finally{clearTimeout(timeout);server.close();await devServer?.close();}
