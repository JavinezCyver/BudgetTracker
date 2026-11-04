import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {providerOptions} from '../src/bank-cards.js';

const directory=path.resolve('.responsive-check');fs.mkdirSync(directory,{recursive:true});
const css=['style','theme','responsive','wallet-reference','selects'].map(name=>fs.readFileSync(`src/${name}.css`,'utf8')).join('\n');
const source=fs.readFileSync('src/selects.js','utf8');
const fixture=`<!doctype html><style>${css}</style><dialog class="compact-wallet-dialog"><form><label>Card design<select name="provider">${providerOptions()}</select></label><label>Account type<select name="kind"><option value="asset">Asset</option><option value="liability">Liability</option></select></label></form></dialog><script>${source}</script>`;
const html=`<!doctype html><pre id="results">RUNNING</pre><script>
(async()=>{const results=[];for(const width of [320,390,540,768,1440]){const frame=document.createElement('iframe');frame.style.cssText='width:'+width+'px;height:640px;border:0';const loaded=new Promise(resolve=>frame.onload=resolve);frame.srcdoc=${JSON.stringify(fixture).replaceAll('<',String.fromCharCode(92)+'u003c')};document.body.append(frame);await loaded;const doc=frame.contentDocument,win=frame.contentWindow;doc.querySelector('dialog').showModal();await new Promise(resolve=>setTimeout(resolve,0));const failures=[],button=doc.querySelector('.select-trigger'),menu=doc.querySelector('.select-menu');if(doc.querySelectorAll('.select-trigger').length!==2)failures.push('auto enhancement');button.click();if(!menu.matches(':popover-open'))failures.push('menu not open');const rect=menu.getBoundingClientRect();if(rect.left<0||rect.right>width||rect.top<0||rect.bottom>640)failures.push('menu outside screen');menu.lastElementChild.click();if(new win.FormData(doc.querySelector('form')).get('provider')!=='rcbc')failures.push('form value');if(menu.matches(':popover-open'))failures.push('selection did not close');button.click();button.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Home',bubbles:true}));button.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));if(doc.querySelector('select').value!=='folio')failures.push('keyboard selection');button.click();doc.body.dispatchEvent(new win.Event('pointerdown',{bubbles:true}));if(menu.matches(':popover-open'))failures.push('outside close');results.push({width,failures});frame.remove();}document.querySelector('#results').textContent=JSON.stringify(results);})().catch(error=>document.querySelector('#results').textContent=error.stack);
</script>`;
const file=path.join(directory,'selects.html');fs.writeFileSync(file,html);
const result=spawnSync(process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--disable-gpu','--disable-software-rasterizer','--no-sandbox','--no-first-run',`--user-data-dir=${path.join(directory,'chrome-selects')}`,'--dump-dom','--virtual-time-budget=10000',pathToFileURL(file).href],{encoding:'utf8',timeout:45000,maxBuffer:8*1024*1024,windowsHide:true});
if(result.error)throw result.error;
const content=result.stdout.match(/<pre id="results">([^<]*)<\/pre>/)?.[1];
if(!content||content==='RUNNING')throw new Error('Browser checks did not finish: '+result.stderr.slice(-500));
const results=JSON.parse(content.replaceAll('&quot;','"').replaceAll('&amp;','&'));
for(const row of results)console.log(`${row.width}px: ${row.failures.length?row.failures.join(', '):'PASS — popup bounds, form values, keyboard, outside click'}`);
if(results.some(row=>row.failures.length))process.exitCode=1;
