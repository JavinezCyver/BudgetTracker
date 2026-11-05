import test from 'node:test';
import assert from 'node:assert/strict';
import {androidAppGradle,prepareAndroid} from './prepare-android.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

test('Android release signing uses a private external key and preserves debug configuration',()=>{
 const source='android {\n compileSdk = 37\n targetSdk = 37\n    buildTypes {\n getByName("debug") { isDebuggable = true }\n getByName("release") {\n optimization { enable = true }\n }\n }\n}';
 const configured=androidAppGradle(source);
 assert.ok(configured.includes('compileSdk = 36'));
 assert.ok(configured.includes('targetSdk = 36'));
 assert.ok(configured.includes('isMinifyEnabled = false'));
 assert.ok(configured.includes('System.getenv("POCKETPLAN_ANDROID_KEYSTORE")'));
 assert.ok(configured.includes('signingConfig = it'));
 assert.ok(configured.includes('getByName("debug") { isDebuggable = true }'));
 assert.equal(androidAppGradle(configured),configured);
 assert.throws(()=>androidAppGradle('unexpected template'));
});

test('Android release preparation disables minification in existing signed projects too',()=>{
 const source='android {\n    // POCKETPLAN_ANDROID_KEYSTORE\n    buildTypes {\n getByName("release") { isMinifyEnabled = true }\n }\n}';
 const configured=androidAppGradle(source);
 assert.ok(configured.includes('isMinifyEnabled = false'));
 assert.ok(!configured.includes('isMinifyEnabled = true'));
 assert.equal(androidAppGradle(configured),configured);
});

test('Android packaging refuses unsigned, ambiguous or unverifiable APKs without publishing artifacts',()=>{
 const parent=path.resolve('.android-build');fs.mkdirSync(parent,{recursive:true});
 const root=fs.mkdtempSync(path.join(parent,'package-test-'));
 const releases=path.join(root,'src-tauri/gen/android/app/build/outputs/apk/release');fs.mkdirSync(releases,{recursive:true});
 const script=fileURLToPath(new URL('./package-android.mjs',import.meta.url));
 const env={...process.env};delete env.ANDROID_HOME;delete env.ANDROID_SDK_ROOT;
 const run=()=>spawnSync(process.execPath,[script],{cwd:root,env,encoding:'utf8',windowsHide:true});
 try{
  fs.writeFileSync(path.join(releases,'app-release-unsigned.apk'),'not a signed APK');
  let result=run();assert.notEqual(result.status,0);assert.match(result.stderr,/exactly one signed release APK/);
  fs.writeFileSync(path.join(releases,'one-release.apk'),'not a signed APK');
  result=run();assert.notEqual(result.status,0);assert.match(result.stderr,/Set ANDROID_HOME/);
  fs.writeFileSync(path.join(releases,'two-release.apk'),'not a signed APK');
  result=run();assert.notEqual(result.status,0);assert.match(result.stderr,/exactly one signed release APK/);
  assert.equal(fs.existsSync(path.join(root,'artifacts')),false);
 }finally{assert.equal(path.dirname(root),parent);fs.rmSync(root,{recursive:true});}
});

test('Android preparation keeps both Gradle plugin classpaths compatible with the wrapper',()=>{
 const parent=path.resolve('.android-build');fs.mkdirSync(parent,{recursive:true});
 const root=fs.mkdtempSync(path.join(parent,'gradle-test-'));
 const files={
  'app/build.gradle.kts':'android {\n compileSdk = 37\n targetSdk = 37\n    buildTypes {\n getByName("release") { }\n }\n}',
  'build.gradle.kts':'classpath("com.android.tools.build:gradle:9.3.1")',
  'buildSrc/build.gradle.kts':'implementation("com.android.tools.build:gradle:9.3.1")',
  'gradle/wrapper/gradle-wrapper.properties':'distributionUrl=https\\://services.gradle.org/distributions/gradle-9.6.1-bin.zip',
 };
 try{
  for(const [relative,body] of Object.entries(files)){
   const file=path.join(root,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,body);
  }
  prepareAndroid(root);prepareAndroid(root);
  for(const relative of ['build.gradle.kts','buildSrc/build.gradle.kts'])assert.match(fs.readFileSync(path.join(root,relative),'utf8'),/com\.android\.tools\.build:gradle:9\.1\.0/);
  assert.match(fs.readFileSync(path.join(root,'gradle/wrapper/gradle-wrapper.properties'),'utf8'),/gradle-9\.3\.1-all\.zip/);
  assert.ok(fs.existsSync(path.join(root,'app/src/main/res/mipmap-mdpi/ic_launcher.png')));
  assert.equal(fs.readFileSync(path.join(root,'app/src/main/java/com/folio/budget/MainActivity.kt'),'utf8'),fs.readFileSync('src-tauri/android/MainActivity.kt','utf8'));
 }finally{assert.equal(path.dirname(root),parent);fs.rmSync(root,{recursive:true});}
});
