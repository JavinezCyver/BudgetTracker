export const APP_TIME_ZONE='Asia/Manila';
const formatter=new Intl.DateTimeFormat('en-US',{timeZone:APP_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});

// Derive calendar wall-clock fields independently of the system timezone.
export function manilaNow(instant=new Date()){
 const fields=Object.fromEntries(formatter.formatToParts(instant).filter(part=>part.type!=='literal').map(part=>[part.type,Number(part.value)]));
 return new Date(fields.year,fields.month-1,fields.day,fields.hour,fields.minute,fields.second,instant.getMilliseconds());
}
export const manilaDateKey=(instant=new Date())=>{
 const date=manilaNow(instant);
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
};
export function millisecondsUntilManilaMidnight(instant=new Date()){
 const now=manilaNow(instant);
 return 86400000-((now.getHours()*3600+now.getMinutes()*60+now.getSeconds())*1000+now.getMilliseconds())+100;
}
export function watchPhilippineDay(onChange){
 let lastDate=manilaDateKey(),timer;
 const check=()=>{const key=manilaDateKey();if(key!==lastDate&&onChange()!==false)lastDate=key;};
 const schedule=()=>{timer=setTimeout(()=>{check();schedule();},millisecondsUntilManilaMidnight());};
 window.addEventListener('focus',check);window.addEventListener('pageshow',check);
 document.addEventListener('visibilitychange',check);document.addEventListener('close',check,true);schedule();
 return ()=>{clearTimeout(timer);window.removeEventListener('focus',check);window.removeEventListener('pageshow',check);document.removeEventListener('visibilitychange',check);document.removeEventListener('close',check,true);};
}
