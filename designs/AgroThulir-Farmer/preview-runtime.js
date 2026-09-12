const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=(name,color='green',size=28)=>svgIcon(name,THEME[color]||color,size);
const attr=to=>to?`data-to="${escapeHtml(to)}" role="button" tabindex="0"`:'';
const badge=(name,color='green')=>`<span class="badge ${color}">${icon(name,color)}</span>`;
function topology(state){
 if(state==='empty')return `<div class="topology empty">${badge('flow')}<b>Add a motor to begin</b></div>`;
 let motor=state!=='valveOnly',valve=state!=='motor',connected=['connected','saved','branch'].includes(state),branch=state==='branch';
 let arrows=connected?`<svg class="pipes" viewBox="0 0 368 350"><defs><marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="#236244" stroke-width="2"/></marker></defs><path d="${branch?'M184 118V154H98V202M184 154H294V202':'M184 118V202'}" fill="none" stroke="#236244" stroke-width="3" marker-end="url(#arrowhead)"/></svg>`:'';
 const node=(ic,label,x,y,to)=>`<div class="eqnode" style="left:${x}px;top:${y}px" ${attr(to)}>${badge(ic)}<b>${label}</b></div>`;
 const port=(x,y,to,active)=>`<button class="port ${active?'selected':''}" style="left:${x-24}px;top:${y-24}px" data-to="${to}" aria-label="${to==='pathSource'?'Select motor outlet':'Connect valve inlet'}"><span></span></button>`;
 return `<div class="topology">${arrows}${motor?node('motor','Motor 01',116,30,state==='motor'?'pathPickerValve':state==='nodes'?'pathSource':'pathLink'):''}${valve?node('valve','Valve A',branch?30:116,204,state==='source'?'pathConnected':'pathLink'):''}${branch?node('valve','Valve C',226,204,'pathBranchPick'):''}${motor?port(184,119,'pathSource',state==='source'):''}${valve?port(branch?98:184,204,'pathConnected',state==='source'):''}${branch?port(294,204,'pathBranch',false):''}<small>${connected?'Water direction →':'Outlet ●   →   ● Inlet'}</small></div>`;
}
function renderItem(i){const E=escapeHtml;
 if(i.type==='button')return `<button class="action ${i.tone||'green'}" data-to="${i.to}">${icon(i.icon,i.tone==='outline'?'green':'white',24)}<span>${E(i.label)}</span></button>`;
 if(i.type==='row')return `<div class="card row" ${attr(i.to)}>${badge(i.icon,i.tone||'green')}<div class="copy"><b>${E(i.label)}</b><small>${E(i.sub||'')}</small></div>${i.to?icon('next','muted',20):''}</div>`;
 if(i.type==='note')return `<div class="note ${i.tone||'green'}">${icon(i.icon,i.tone||'green',24)}<div class="copy"><b>${E(i.label)}</b>${i.sub?`<small>${E(i.sub)}</small>`:''}</div></div>`;
 if(i.type==='hero')return `<div class="hero ${i.tone||'forest'}"><div class="hero-top">${badge(i.icon,'lime')}<label>${E(i.label)}</label></div><strong>${E(i.value)}</strong>${i.sub?`<p>${E(i.sub)}</p>`:''}</div>`;
 if(i.type==='field')return `<div class="card field" ${attr(i.to)}><small>${E(i.label)}</small><div>${icon(i.icon)}<b>${E(i.value)}</b>${i.to?icon('next','muted',18):''}</div></div>`;
 if(i.type==='steps')return `<div class="card steps">${i.items.map(a=>`<div class="step">${badge(a[0])}<div class="copy"><b>${E(a[1])}</b><small>${E(a[2])}</small></div></div>`).join('')}</div>`;
 if(i.type==='metrics')return `<div class="metrics">${i.items.map(a=>`<div class="card metric">${icon(a[0], 'green',24)}<strong>${E(a[1])}</strong><small>${E(a[2])}</small></div>`).join('')}</div>`;
 if(i.type==='tiles')return `<div class="tiles">${i.items.map(a=>`<div class="card tile" ${attr(a[2])}>${badge(a[0])}<b>${E(a[1])}</b></div>`).join('')}</div>`;
 if(i.type==='choices')return `<div class="choices"><b>${E(i.label)}</b>${i.items.map(a=>`<div class="card row ${a[4]?'chosen':''}" ${attr(a[3])}>${badge(a[4]?'check':a[0],a[4]?'green':'amber')}<div class="copy"><b>${E(a[1])}</b><small>${E(a[2])}</small></div></div>`).join('')}</div>`;
 if(i.type==='topology')return topology(i.state);
 if(i.type==='days')return `<div class="card"><b>Every day</b><div class="days">${['M','T','W','T','F','S','S'].map(x=>`<span>${x}</span>`).join('')}</div></div>`;
 if(i.type==='scan')return `<div class="scan">${icon('qr','green',156)}<small>Place code inside the square</small></div>`;
 if(i.type==='welcome')return `<div class="field-art"><svg viewBox="0 0 368 190"><rect width="368" height="190" fill="#EDF3E4"/><circle cx="295" cy="40" r="24" fill="#D5ED9C"/><path d="M0 116Q100 42 200 118T400 106V190H0Z" fill="#BED294"/><path d="M-30 175Q120 60 390 173M-30 210Q120 95 390 208M-30 245Q120 130 390 243" fill="none" stroke="#236244" stroke-width="19"/></svg></div>`;
 if(i.type==='chart')return `<div class="card"><b>Water use · Today</b><div class="bars">${[30,55,125,165,85,45,22].map(h=>`<i style="height:${h}px"></i>`).join('')}</div><small>00:00　　　　　06:00　　　　　12:00</small></div>`;
 throw new Error('Unknown block '+i.type);
}
let current='welcome',timer=null;const byId=Object.fromEntries(SCREENS.map(x=>[x.id,x]));
function renderScreen(id){const s=byId[id];return `<div class="phone" data-screen="${s.id}"><div class="status"><b>9:41</b><span>${icon('wifi','ink',17)} 100%</span></div><header>${s.back?`<button class="back" data-to="${s.back}" aria-label="Back">${icon('back')}</button>`:badge('leaf')}<div class="copy"><h1>${escapeHtml(s.title)}</h1><small>${escapeHtml(s.subtitle)}</small></div></header><main class="content ${s.nav?'':'full'}">${s.items.map(renderItem).join('')}</main>${s.nav?`<nav>${[['home','Home','home'],['pin','Sites','sites'],['flow','Paths','paths'],['bell','Alerts','alerts']].map(a=>`<button data-to="${a[2]}" class="${s.nav===({home:'home',sites:'sites',paths:'flows',alerts:'alerts'}[a[2]])?'active':''}">${icon(a[0],'green',24)}<small>${a[1]}</small></button>`).join('')}</nav>`:''}</div>`;}
function go(id){if(!byId[id])throw new Error('Missing screen '+id);clearTimeout(timer);current=id;document.querySelector('#stage').innerHTML=renderScreen(id);document.querySelector('#screenSelect').value=id;document.querySelector('#current').textContent=byId[id].group+' / '+byId[id].title;history.replaceState(null,'','#'+id);if(TIMED[id]&&document.querySelector('#auto').checked)timer=setTimeout(()=>go(TIMED[id][0]),TIMED[id][1]*1000);}
document.querySelector('#screenSelect').innerHTML=SCREENS.map(s=>`<option value="${s.id}">${s.group} · ${escapeHtml(s.title)} [${s.id}]</option>`).join('');
document.querySelector('#flowButtons').innerHTML=FLOWS.map(([id,label])=>`<button data-to="${id}">${escapeHtml(label)}</button>`).join('');
document.addEventListener('click',e=>{const el=e.target.closest('[data-to]');if(el)go(el.dataset.to);});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[role="button"][data-to]')){e.preventDefault();go(e.target.dataset.to);}});
document.querySelector('#screenSelect').addEventListener('change',e=>go(e.target.value));
document.querySelector('#auto').addEventListener('change',()=>go(current));
go(byId[location.hash.slice(1)]?location.hash.slice(1):'welcome');
window.AGRO={go,byId,renderScreen,SCREENS};
