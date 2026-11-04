import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {bankCards,providers} from '../src/bank-cards.js';
import {walletHeader,walletToolbar} from '../src/wallet-view.js';

const directory=path.resolve('.responsive-check');
fs.mkdirSync(directory,{recursive:true});
const css=['style','theme','responsive','wallet-summary','wallet-reference','bank-cards','vector-cards'].map(name=>fs.readFileSync(`src/${name}.css`,'utf8')).join('\n');
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const cards=bankCards(providers.map(([provider],index)=>({id:String(index),name:'My wallet',provider,network:'visa',balance:1234567.89,kind:'asset'})),{escape,money:n=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(n)});
const fixture=`<!doctype html><style>${css}</style><aside class="sidebar"></aside><div class="main-shell"><main class="wallets-page">${walletHeader()}${walletToolbar()}<div class="wallet-grid full-wallets wallet-layout-grid">${cards}</div></main></div>`;
const sizes=[[320,568],[360,640],[375,667],[390,844],[430,932],[540,720],[768,1024],[1024,768],[1280,800],[1440,900],[1920,1080],[844,390]];
const html=`<!doctype html><html><body><pre id="results">RUNNING</pre><script>
const fixture=${JSON.stringify(fixture)},sizes=${JSON.stringify(sizes)};
(async()=>{const results=[];for(const [width,height]of sizes){const frame=document.createElement('iframe');frame.style.cssText='border:0;display:block;width:'+width+'px;height:'+height+'px';const loaded=new Promise(resolve=>frame.onload=resolve);frame.srcdoc=fixture;document.body.append(frame);await loaded;const doc=frame.contentDocument;const failures=[];if(doc.documentElement.scrollWidth>width+1)failures.push('page overflow');for(const card of doc.querySelectorAll('.bank-card')){const rect=card.getBoundingClientRect();if(rect.right>width+1)failures.push('card outside viewport '+Math.round(rect.right)+' left='+rect.left+' width='+rect.width+' gridLeft='+doc.querySelector('.wallet-grid').getBoundingClientRect().left+' grid='+doc.querySelector('.wallet-grid').getBoundingClientRect().width+' columns='+frame.contentWindow.getComputedStyle(doc.querySelector('.wallet-grid')).gridTemplateColumns);for(const selector of ['.bank-brand','.bank-balance h2','.bank-chip','.bank-options']){const element=card.querySelector(selector),r=element.getBoundingClientRect();if(r.right>rect.right+1||r.bottom>rect.bottom+1||r.left<rect.left-1||r.top<rect.top-1)failures.push(selector+' clipped');}}results.push({width,height,failures:[...new Set(failures)]});frame.remove();}document.querySelector('#results').textContent=JSON.stringify(results);})().catch(error=>document.querySelector('#results').textContent=error.stack);
</script></body></html>`;
const file=path.join(directory,'check.html');fs.writeFileSync(file,html);
const chrome=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const result=spawnSync(chrome,['--headless','--disable-gpu','--disable-software-rasterizer','--no-sandbox','--no-first-run','--no-default-browser-check',`--user-data-dir=${path.join(directory,'chrome-profile')}`,'--dump-dom','--virtual-time-budget=10000',pathToFileURL(file).href],{encoding:'utf8',timeout:45000,maxBuffer:8*1024*1024,windowsHide:true});
if(result.error)throw result.error;
const content=result.stdout.match(/<pre id="results">([^<]*)<\/pre>/)?.[1];
if(!content||content==='RUNNING')throw new Error(`Browser verification did not complete: ${result.stderr.slice(-1000)}`);
const results=JSON.parse(content.replaceAll('&quot;','"').replaceAll('&amp;','&'));
for(const row of results)console.log(`${row.width}×${row.height}: ${row.failures.length?row.failures.join(', '):'PASS'}`);
if(results.some(row=>row.failures.length))process.exitCode=1;
