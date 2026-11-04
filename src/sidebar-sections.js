const paths={
 transactions:'<path d="M8 6h12M8 12h12M8 18h12M3 6h1M3 12h1M3 18h1"/>',
 income:'<path d="m3 17 6-6 4 3 8-10M15 4h6v6"/>',
 upcoming:'<path d="M4 9a9 9 0 1 0 3-5M3 3v6h6M12 7v5l3 2"/>',
 people:'<circle cx="9" cy="7" r="3"/><path d="M3 20v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M21 20v-3a6 6 0 0 0-4-5"/>',
 goals:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="m12 12 8-8M17 4h3v3"/>',
 investments:'<path d="M3 21h18M5 18V11h3v7M11 18V7h3v11M17 18V3h3v15"/>',
 budget:'<path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6Zm-4 9 3 3 5-6"/>',
 summary:'<path d="M3 17 8 9l5 5 8-10M3 6v15h18"/>',
 statements:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Zm0 0v6h6M8 13h8M8 17h6"/>',
 settings:'<path d="m9 3-.5 2-2 1L4.5 5.5 2.5 9l1.5 1.5v3L2.5 15l2 3.5 2-.5 2 1 .5 2h4l.5-2 2-1 2 .5 2-3.5-1.5-1.5v-3L20 9l-2-3.5-2 .5-2-1-.5-2Z"/><circle cx="11.5" cy="12" r="3"/>',
};
const groups=[
 ['MONEY FLOW',[['Transactions','transactions'],['Income','income'],['Who Owes You','people']]],
 ['PLAN & GROW',[['Goals','goals'],['Investments','investments'],['Budget plan','budget']]],
 ['REPORTS',[['Summary','summary'],['Statements','statements']]],
 ['PREFERENCES',[['Settings','settings']]],
];
export {paths as navigationIcons};
export function sidebarSections(page='Dashboard'){return groups.map(([label,items])=>`<section class="sidebar-extra"><h2 class="nav-label">${label}</h2><nav aria-label="${label}">${items.map(([name,icon])=>`<button type="button" class="nav-item ${['Transactions','Income','Who Owes You','Goals','Investments','Budget plan','Settings'].includes(name)?(page===name?'active':''):'nav-placeholder'}" aria-label="${name}" ${['Transactions','Income','Who Owes You','Goals','Investments','Budget plan','Settings'].includes(name)?`data-page="${name}" aria-current="${page===name?'page':'false'}"`:'aria-disabled="true"'} title="${name}"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[icon]}</svg><span>${name}</span></button>`).join('')}</nav></section>`).join('');}
