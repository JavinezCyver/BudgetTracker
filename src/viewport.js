// Update available dialog space without rerendering or losing entered values.
let frame=0;
function update(){
 frame=0;const viewport=window.visualViewport;
 document.documentElement.style.setProperty('--app-viewport-height',`${viewport?.height||window.innerHeight}px`);
 document.documentElement.style.setProperty('--app-viewport-top',`${viewport?.offsetTop||0}px`);
}
function schedule(){if(!frame)frame=requestAnimationFrame(update);}
update();window.addEventListener('resize',schedule,{passive:true});
window.visualViewport?.addEventListener('resize',schedule,{passive:true});
window.visualViewport?.addEventListener('scroll',schedule,{passive:true});
