// Test driver for the real Rust core; this is never bundled into the application.
import {spawnSync} from 'node:child_process';
import path from 'node:path';
export function nativeEngine(request){
 const binary=path.resolve('crates/pocketplan-core/target/debug/pocketplan-engine'+(process.platform==='win32'?'.exe':''));
 const result=spawnSync(binary,[],{input:JSON.stringify(request)+'\n',encoding:'utf8',windowsHide:true,timeout:10000,maxBuffer:32*1024*1024});
 if(result.error)throw result.error;if(result.status!==0)throw new Error(result.stderr||'Rust engine exited unexpectedly.');
 const response=JSON.parse(result.stdout.trim());if(!response.ok)throw new Error(response.error);return response.value;
}
