import {defineConfig,mergeConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import browser from './vite.config.js';
export default defineConfig(({command})=>mergeConfig(browser,{
 resolve:{alias:command==='build'?[
  {find:/^\.\/record-actions\.js$/,replacement:fileURLToPath(new URL('./src/native-actions.js',import.meta.url))},
  {find:/^\.\/app-store\.js$/,replacement:fileURLToPath(new URL('./src/app-store.native.js',import.meta.url))},
 ]:[]},
 build:{outDir:'dist-native'},
}));
