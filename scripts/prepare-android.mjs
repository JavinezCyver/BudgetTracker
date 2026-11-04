import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const signing=`    signingConfigs {
        val keystore = System.getenv("POCKETPLAN_ANDROID_KEYSTORE")
        if (keystore != null) {
            create("release") {
                storeType = "PKCS12"
                storeFile = file(keystore)
                storePassword = System.getenv("POCKETPLAN_ANDROID_PASSWORD")
                keyAlias = "pocketplan"
                keyPassword = System.getenv("POCKETPLAN_ANDROID_PASSWORD")
            }
        }
    }
`;
export function androidAppGradle(source){
 source=source.replace(/compileSdk = \d+/,'compileSdk = 36').replace(/targetSdk = \d+/,'targetSdk = 36')
  .replace(/optimization\s*\{\s*enable = true\s*\}/,'isMinifyEnabled = true');
 if(source.includes('POCKETPLAN_ANDROID_KEYSTORE'))return source;
 if(!source.includes('    buildTypes {')||!source.includes('getByName("release") {'))throw new Error('Unsupported Android template; signing was not configured.');
 return source
  .replace('    buildTypes {',signing+'    buildTypes {')
  .replace('getByName("release") {','getByName("release") {\n            signingConfigs.findByName("release")?.let { signingConfig = it }');
}
export function prepareAndroid(root=path.resolve('src-tauri/gen/android')){
 const app=path.join(root,'app/build.gradle.kts');
 fs.writeFileSync(app,androidAppGradle(fs.readFileSync(app,'utf8')));
 for(const relative of ['build.gradle.kts','buildSrc/build.gradle.kts']){
  const gradle=path.join(root,relative);
  fs.writeFileSync(gradle,fs.readFileSync(gradle,'utf8').replace(/com\.android\.tools\.build:gradle:[\d.]+/g,'com.android.tools.build:gradle:9.1.0'));
 }
 const wrapper=path.join(root,'gradle/wrapper/gradle-wrapper.properties');
 fs.writeFileSync(wrapper,fs.readFileSync(wrapper,'utf8').replace(/gradle-[\d.]+-(bin|all)\.zip/,'gradle-9.3.1-all.zip'));
 fs.cpSync(path.resolve('src-tauri/icons/android'),path.join(root,'app/src/main/res'),{recursive:true});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 prepareAndroid();console.log('Android SDK 36, Gradle 9.3.1 and release signing configured.');
}
