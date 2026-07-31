// const {execSync} = require('child_process');
import {execSync} from 'child_process';
import fs from 'fs';
function getVue(){
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  const vueVer=packageJson.devDependencies.vue||'';
  let bigVueVer=vueVer.startsWith('2')?2:vueVer.startsWith('3')?3:2
  return {
    big:bigVueVer,
    ver:vueVer,
    afterInstall:bigVueVer===3?2:3
  }
}
function buildLib(mode){
  const {big}=getVue()
  let installVer=mode===2?'2.7.16':'3.5.13'
  if(big!==mode){
    execSync(`pnpm i vue@${installVer} -D`,{
      stdio: 'inherit',
      cwd: process.cwd()
    })
  }
  execSync(`vite build --mode vue${mode}`,{
    stdio: 'inherit',
    cwd: process.cwd()
  })
}
const currentInstall=getVue()
if(currentInstall.big===3){
  buildLib(3)
}else{
  buildLib(2)
}
buildLib(currentInstall.afterInstall)
fs.unlinkSync('dist/vue2/index.css')
fs.renameSync('dist/vue3/index.css','dist/index.css')
