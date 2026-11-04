import fs from 'node:fs';
import path from 'node:path';

const origin='http://127.0.0.1:5173';
const transformed=await fetch(`${origin}/src/main.js`);
if(!transformed.ok)throw new Error(`Source transform failed: HTTP ${transformed.status}`);
const client=await (await fetch(`${origin}/@vite/client`)).text();
const token=client.match(/const wsToken\s*=\s*"([^"]+)"/)?.[1];
const socket=new WebSocket(`ws://127.0.0.1:5173/${token?`?token=${encodeURIComponent(token)}`:''}`,'vite-hmr');
const source=path.resolve('src/main.js'),marker='\n// Temporary live-reload verification.\n';
let timeout;
try{
 await new Promise((resolve,reject)=>{
  timeout=setTimeout(()=>reject(new Error('Live-reload socket did not connect')),5000);
  socket.addEventListener('open',()=>{clearTimeout(timeout);resolve();},{once:true});
  socket.addEventListener('error',()=>reject(new Error('Live-reload socket failed')),{once:true});
 });
 const reload=new Promise((resolve,reject)=>{
  timeout=setTimeout(()=>reject(new Error('Source changes did not trigger a page reload')),5000);
  socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.type==='full-reload'||message.type==='update'){clearTimeout(timeout);resolve();}});
 });
 fs.appendFileSync(source,marker);
 await reload;
 const response=await fetch(`${origin}/src/main.js`);
 if(!response.ok)throw new Error('Updated source failed to transform');
 console.log('PASS: source transform, live-reload WebSocket, and automatic reload after a source change.');
}finally{
 clearTimeout(timeout);socket.close();
 const current=fs.readFileSync(source,'utf8');
 if(current.includes(marker))fs.writeFileSync(source,current.replace(marker,''));
}
