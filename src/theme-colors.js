// Recolor shared interface tokens while retaining their lightness and opacity.
// Provider card artwork and warning/error colors keep their original colors.
export function colorParts(hex){
 const raw=hex.replace('#',''),full=raw.length<=4?[...raw].map(char=>char+char).join(''):raw;
 const [r,g,b]=[0,2,4].map(index=>parseInt(full.slice(index,index+2),16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min,light=(max+min)/2;
 let hue=0;if(delta){if(max===r)hue=((g-b)/delta)%6;else if(max===g)hue=(b-r)/delta+2;else hue=(r-g)/delta+4;hue=(hue*60+360)%360;}
 return {hue,saturation:delta?delta/(1-Math.abs(2*light-1)):0,light,alpha:full.length===8?parseInt(full.slice(6),16)/255:1};
}
export function themedColor(hex,hue,mode='dark'){
 const color=colorParts(hex);
 const light=mode==='light'?1-color.light:color.light;
 return `hsl(${hue} ${(color.saturation*100).toFixed(2)}% ${(light*100).toFixed(2)}% / ${color.alpha.toFixed(4)})`;
}
