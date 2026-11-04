import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';

const root=path.resolve('src-tauri/gen/android/app/build/outputs/apk');
function apks(directory){
 return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
  const file=path.join(directory,entry.name);
  return entry.isDirectory()?apks(file):file.endsWith('.apk')&&!/unsigned|debug/i.test(file)?[file]:[];
 });
}
const candidates=apks(root);
if(candidates.length!==1)throw new Error('Expected exactly one signed release APK. Build with --apk --target aarch64 first.');
const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT;
if(!sdk)throw new Error('Set ANDROID_HOME to verify the APK signature.');
const verification=spawnSync(path.join(process.env.JAVA_HOME,'bin',process.platform==='win32'?'java.exe':'java'),[
 '-jar',path.join(sdk,'build-tools/36.0.0/lib/apksigner.jar'),'verify','--verbose',candidates[0],
],{encoding:'utf8',windowsHide:true});
if(verification.error||verification.status!==0)throw new Error(verification.stderr||verification.error?.message||'APK signature verification failed.');
const version=JSON.parse(fs.readFileSync('package.json','utf8')).version;
if(!/^\d+\.\d+\.\d+$/.test(version))throw new Error('Invalid application version.');
const filename=`PocketPlan-${version}-android-arm64.apk`;
fs.mkdirSync('artifacts',{recursive:true});
const output=path.join('artifacts',filename);
fs.copyFileSync(candidates[0],output);
const checksum=crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex');
fs.writeFileSync('artifacts/SHA256SUMS-android.txt',`${checksum}  ${filename}\n`);
console.log(`Verified signed Android APK: ${output}`);
