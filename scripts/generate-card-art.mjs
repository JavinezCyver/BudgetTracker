import fs from 'node:fs';

// Code-native vector artwork: no enlarged screenshots or embedded bitmap images.
const chip=`<g transform="translate(20 66)"><rect width="38" height="29" rx="5" fill="url(#chip)" stroke="#777e83" stroke-width=".7"/><path d="M0 9h12m14 0h12M0 20h12m14 0h12M12 0v7l3 3v9l-3 3v7M26 0v7l-3 3v9l3 3v7M15 10h8m-8 9h8" fill="none" stroke="#92989b" stroke-width=".8"/></g>`;
const designs={
 gcash:{colors:['#0542be','#0039ad'],ink:'#fff',brand:`<g fill="none" stroke="#f0f8ff"><circle cx="27" cy="26" r="14" stroke-width="1.2" opacity=".55"/><path d="M37 19a11 11 0 1 0 0 14V26H27" stroke-width="2.4"/><path d="M40 15a17 17 0 0 0-7-5" stroke-width="1.7"/></g><text x="49" y="34" font-size="24" font-weight="650" fill="#f5faff">GCash</text>`,pattern:`<path d="M288 40C255 1 185 9 157 65S143 161 181 190" fill="none" stroke="#1466df" stroke-width="19"/><path d="M283 66c-27-31-75-28-94 7s-9 81 26 96" fill="none" stroke="#1261da" stroke-width="18"/><path d="M287 88c-14-24-44-24-59-10s-20 42-3 57c17 17 42 10 50-1v-22h-39" fill="none" stroke="#1768de" stroke-width="17" stroke-linejoin="round"/>`},
 salmon:{colors:['#f4a0d0','#a1e0d1'],ink:'#fff',brand:'Salmon',pattern:'<path d="M0 176 280 0v176" fill="#9aedd1" opacity=".15"/>'},
 atome:{colors:['#fff0bb','#a9dceb'],ink:'#161a19',brand:'atome ∧',pattern:'<path d="m147 157 50-99q6-12 13-1l43 61-28 5-20-27-27 61Z" fill="#dbf9ff" stroke="#fff" stroke-opacity=".65" stroke-width="1.5"/>'},
 bpi:{colors:['#a00617','#65000c'],ink:'#fff',brand:'♜ BPI',pattern:'<path d="m90-25 190 150M140-25 280 90M160 176l120-100" stroke="#d32937" stroke-width="1"/><path d="m130 0 150 128V0" fill="#b10d20" opacity=".5"/>'},
 maya:{colors:['#bb0751','#8a003a'],ink:'#fff',brand:'maya',pattern:'<path d="M130 176v-40c0-55 57-55 57-8v48m0-48c0-47 57-47 57 8v40" fill="none" stroke="#e4347e" stroke-opacity=".4" stroke-width="22"/>'},
 unionbank:{colors:['#d8e6e7','#e6e9d1'],ink:'#41494c',brand:'Uᵇ UnionBank',pattern:'<path d="M145 0h73v109c0 60-89 60-89 0V0h37v103c0 20 16 20 16 0V0" fill="#b4c7c9" opacity=".5"/>'},
 maribank:{colors:['#ff6500','#ff8a00'],ink:'#fff',brand:'Ⓜ MariBank',pattern:'<path d="M96 176c53-85 110-121 184-83v83" fill="#ffac20"/><path d="M135 176c47-56 99-74 145-43v43" fill="#ff920f"/><path d="M85 176c88-7 145-43 195-44v44" fill="#ffe7ba"/>'},
 cimb:{colors:['#c30b24','#e32f35'],ink:'#fff',brand:'◩ CIMB',pattern:'<path d="M168-20c-55 77 118 49 57 134s-86 14-93 72" fill="none" stroke="#f29963" stroke-width="35"/><path d="M275-10c-12 99-103 58-65 148" fill="none" stroke="#087b94" stroke-width="30"/><path d="M246-20c-59 65 73 82 28 178" fill="none" stroke="#a92c71" stroke-width="28"/>'},
 bdo:{colors:['#08246e','#003aa7'],ink:'#fff4bd',brand:'BDO',pattern:'<path d="M-35 118c119-36 186 17 254 78" fill="none" stroke="#2552b4" stroke-width="36"/><path d="M-35 118c119-36 186 17 254 78" fill="none" stroke="#5478c2" stroke-width="1"/>'},
 landbank:{colors:['#123e27','#092819'],ink:'#fff',brand:'◉ LANDBANK',pattern:'<path d="M121 176c60-90 113-88 175-103-21 51-56 91-108 103" fill="#5c991e"/><path d="M189 176c27-57 62-70 104-78-12 35-36 66-73 78" fill="#91bd12"/><path d="M118 176c20-45 98-58 152-71" fill="none" stroke="#a5c52e" stroke-opacity=".5"/>'},
 wise:{colors:['#cdf164','#a5d834'],ink:'#1c3410',brand:'ϟwise',pattern:'<path d="m135-10 71 88-73 108h57l84-111-73-85Z" fill="#6c9b22" opacity=".2"/>'},
 rcbc:{colors:['#b69245','#88652c'],ink:'#fff',brand:'⬡ RCBC',pattern:'<path d="m103 43 71-40 72 42v83l-71 42-72-42Z" fill="#e7cf8b" fill-opacity=".15" stroke="#f2dfac" stroke-opacity=".35"/><path d="m174 3 71 42v83l-71 42Z" fill="#fff1c4" opacity=".08"/>'},
};
fs.mkdirSync('src/assets/card-art',{recursive:true});
for(const [id,design]of Object.entries(designs)){
 const brand=design.brand.startsWith('<')?design.brand:`<text x="17" y="34" font-size="${id==='landbank'||id==='unionbank'?21:26}" font-weight="650" fill="${design.ink}" letter-spacing="-.5">${design.brand}</text>`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="280" height="176" viewBox="0 0 280 176"><defs><linearGradient id="bg" x2="1" y2=".65"><stop stop-color="${design.colors[0]}"/><stop offset="1" stop-color="${design.colors[1]}"/></linearGradient><linearGradient id="chip" x2="1" y2="1"><stop stop-color="#f0f1e9"/><stop offset=".45" stop-color="#b8bdbd"/><stop offset=".7" stop-color="#e7e8e0"/><stop offset="1" stop-color="#a3abad"/></linearGradient></defs><rect width="280" height="176" fill="url(#bg)"/>${design.pattern}<g font-family="Arial,Helvetica,sans-serif">${brand}</g>${chip}</svg>`;
 fs.writeFileSync(`src/assets/card-art/${id}.svg`,svg);
}
console.log(`Generated ${Object.keys(designs).length} scalable card designs.`);
