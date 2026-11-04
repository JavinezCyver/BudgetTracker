document.addEventListener('keydown',event=>{
 if((event.ctrlKey||event.metaKey)&&['+','=','-','_','0'].includes(event.key))event.preventDefault();
});
document.addEventListener('wheel',event=>{
 if(event.ctrlKey||event.metaKey)event.preventDefault();
},{passive:false});
document.addEventListener('gesturestart',event=>event.preventDefault(),{passive:false});
