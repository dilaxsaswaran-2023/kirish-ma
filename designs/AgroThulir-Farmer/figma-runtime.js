/* Native Figma renderer: no network, dependencies, credentials or device access. */
async function buildAgroThulir() {
  const created=[]; const refs={}; const links=[]; const components={}; const styleJobs=[];
  /** @template {{id: string}} T @param {T} n @returns {T} */
  const book=n=>{created.push(n.id);return n;};
  const rgb=h=>({r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255});
  const page=book(figma.createPage());page.name='AgroThulir · Farmer flows';await figma.setCurrentPageAsync(page);
  await Promise.all(['Regular','Medium','Semi Bold','Bold'].map(style=>figma.loadFontAsync({family:'Inter',style})));
  const primitives=figma.variables.createVariableCollection('AT · Primitives');
  const semantic=figma.variables.createVariableCollection('AT · Theme');
  const tokens={};
  for(const [key,value] of Object.entries(THEME)) {
    const raw=figma.variables.createVariable('raw/'+key,primitives,'COLOR');raw.scopes=[];raw.setValueForMode(primitives.defaultModeId,rgb(value));raw.setVariableCodeSyntax('WEB','var(--at-raw-'+key+')');
    const v=figma.variables.createVariable('color/'+key,semantic,'COLOR');v.scopes=['FRAME_FILL','SHAPE_FILL','TEXT_FILL','STROKE_COLOR'];v.setValueForMode(semantic.defaultModeId,{type:'VARIABLE_ALIAS',id:raw.id});v.setVariableCodeSyntax('WEB','var(--at-'+key+')');tokens[key]=v;
  }
  const numbers={};for(const [name,value,scope] of [['gap',12,'GAP'],['padding',16,'GAP'],['radius',20,'CORNER_RADIUS']]){
    const v=figma.variables.createVariable('space/'+name,semantic,'FLOAT');v.scopes=[scope];v.setValueForMode(semantic.defaultModeId,value);v.setVariableCodeSyntax('WEB','var(--at-'+name+')');numbers[name]=v;
  }
  const styles={};for(const [name,size,style] of [['Title',28,'Bold'],['Value',36,'Bold'],['Body',16,'Semi Bold'],['Small',14,'Regular'],['Label',12,'Semi Bold']]){
    const st=figma.createTextStyle();st.name='AT/'+name;st.fontName={family:'Inter',style};st.fontSize=size;st.lineHeight={unit:'PERCENT',value:135};styles[name]=st;
  }
  function paint(key){return figma.variables.setBoundVariableForPaint({type:'SOLID',color:rgb(THEME[key]||key)},'color',tokens[key]);}
  function fills(n,key){n.fills=[paint(key)];}
  function border(n,key='line'){n.strokes=[paint(key)];n.strokeWeight=1;}
  function frame(p,name,w,h,bg='white',r=20){const n=book(figma.createFrame());n.name=name;p.appendChild(n);n.resize(w,h);fills(n,bg);n.cornerRadius=r;n.clipsContent=false;return n;}
  function stack(p,name,w,dir='VERTICAL',gap=12,pad=0,bg=null){const n=book(figma.createFrame());n.name=name;p.appendChild(n);n.layoutMode=dir;n.primaryAxisSizingMode='AUTO';n.counterAxisSizingMode='FIXED';n.resize(w,1);n.itemSpacing=gap;n.paddingTop=n.paddingBottom=n.paddingLeft=n.paddingRight=pad;n.fills=[];if(bg)fills(n,bg);n.cornerRadius=20;for(const corner of ['topLeftRadius','topRightRadius','bottomLeftRadius','bottomRightRadius'])n.setBoundVariable(corner,numbers.radius);if(gap===12)n.setBoundVariable('itemSpacing',numbers.gap);return n;}
  function text(p,value,style='Body',color='ink',width){const n=book(figma.createText());p.appendChild(n);n.name=String(value);n.fontName=styles[style].fontName;n.fontSize=styles[style].fontSize;n.lineHeight={unit:'PERCENT',value:135};n.characters=String(value);fills(n,color);n.textAutoResize='HEIGHT';if(width)n.resize(width,n.height);styleJobs.push([n,styles[style].id]);return n;}
  function icon(p,name,size=28,color='green'){const n=book(figma.createNodeFromSvg(svgIcon(name,THEME[color],size)));p.appendChild(n);n.name='Icon / '+name;n.resize(size,size);return n;}
  function badge(p,name,size=48,color='green',bg='sage'){const n=frame(p,'Equipment / '+name,size,size,bg,size/2);const ic=icon(n,name,size*.56,color);ic.x=(size-ic.width)/2;ic.y=(size-ic.height)/2;return n;}
  function link(n,to){if(to){n.name+=' → '+to;links.push([n,to]);}return n;}
  function line(p,x,y,w,h){const n=book(figma.createRectangle());p.appendChild(n);n.name='Water pipe';n.x=x;n.y=y;n.resize(w,h);fills(n,'green');n.cornerRadius=2;return n;}
  const foundation=stack(page,'00 · Design guide & components',860,'VERTICAL',20,28,'paper');foundation.x=80;foundation.y=80;
  text(foundation,'AgroThulir', 'Value');text(foundation,'Farmer controls · Clickable prototype','Title');text(foundation,'Motor + valve control, directional water paths, run order, schedules and alerts.','Body', 'muted',800);
  text(foundation,'Start with any of the seven flows in Present mode. Fields and device feedback use sample values.','Small','muted',800);
  const swatches=stack(foundation,'Palette',800,'HORIZONTAL',12);for(const key of ['forest','green','lime','sage','amber','red']){const sw=stack(swatches,key,118,'VERTICAL',8);frame(sw,key,110,48,key,12);text(sw,key,'Small');}
  const iconMasters={}; const iconShelf=stack(foundation,'Equipment & action icons',800,'VERTICAL',12);
  for(let offset=0;offset<Object.keys(ICONS).length;offset+=12){const rr=stack(iconShelf,'Icon row',800,'HORIZONTAL',24);for(const name of Object.keys(ICONS).slice(offset,offset+12)){const c=book(figma.createComponent());rr.appendChild(c);c.name='AT/Icon/'+name;c.description='Outlined '+name+' icon. Fixed 24px vector geometry.';c.resize(24,24);c.fills=[];icon(c,name,24,'white');iconMasters[name]=c;}}
  const family=stack(foundation,'Action button components',800,'VERTICAL',12);
  for(const tone of ['green','outline','red','amber']){
    const c=book(figma.createComponent());family.appendChild(c);c.name='AT/Button/Tone='+tone;c.description='Primary action, 56px minimum touch height. Icon + concise label. Uses theme variables.';c.layoutMode='HORIZONTAL';c.primaryAxisSizingMode='FIXED';c.counterAxisSizingMode='FIXED';c.resize(368,56);c.itemSpacing=12;c.paddingLeft=c.paddingRight=18;c.counterAxisAlignItems='CENTER';c.primaryAxisAlignItems='CENTER';c.cornerRadius=18;fills(c,tone==='outline'?'white':tone);if(tone==='outline')border(c);const ic=book(iconMasters.check.createInstance());c.appendChild(ic);ic.name='Action icon';for(const v of ic.findAll(n=>n.type==='VECTOR'))if(v.strokes.length)v.strokes=[paint(tone==='outline'?'green':'white')];const t=text(c,'Continue','Body',tone==='outline'?'green':'white');t.name='Label';components[tone]=c;
  }
  function button(p,item,w=368){const b=book(components[item.tone||'green'].createInstance());p.appendChild(b);b.resize(w,56);const t=b.findOne(n=>n.type==='TEXT'&&n.name==='Label');t.characters=item.label;const ic=b.findOne(n=>n.name==='Action icon');ic.swapComponent(iconMasters[item.icon]||iconMasters.next);for(const v of ic.findAll(n=>n.type==='VECTOR'))if(v.strokes.length)v.strokes=[paint(item.tone==='outline'?'green':'white')];
    b.name='Button / '+item.label;return link(b,item.to);}
  function tinyButton(p,name,to,ic='next',bg='white'){const b=frame(p,name,48,48,bg,24);const i=icon(b,ic,24);i.x=i.y=12;return link(b,to);}
  function row(p,it,w=368){const c=stack(p,'Card / '+it.label,w,'HORIZONTAL',12,16,'white');border(c);c.counterAxisAlignItems='CENTER';const tone=it.tone||'green',bg=tone==='amber'?'amberBg':tone==='red'?'redBg':'sage';badge(c,it.icon,48,tone,bg);const col=stack(c,'Text',w-124,'VERTICAL',4);text(col,it.label,'Body','ink',w-124);if(it.sub)text(col,it.sub,'Small','muted',w-124);if(it.to)icon(c,'next',20,'muted');return link(c,it.to);}
  function note(p,it,w=368){const tone=it.tone||'green',bg=tone==='red'?'redBg':tone==='amber'?'amberBg':'sage';const c=stack(p,'Message / '+it.label,w,'HORIZONTAL',12,16,bg);icon(c,it.icon,24,tone);const t=stack(c,'Message text',w-68,'VERTICAL',4);text(t,it.label,'Body',tone,w-68);if(it.sub)text(t,it.sub,'Small',tone,w-68);return c;}
  function topology(p,state){
    const c=frame(p,'Topology / '+state,368,350,'white',24);border(c);
    for(let x=16;x<360;x+=24)for(let y=16;y<342;y+=24){const d=book(figma.createEllipse());c.appendChild(d);d.x=x;d.y=y;d.resize(2,2);fills(d,'line');}
    if(state==='empty'){badge(c,'flow',76).x=146;const b=c.children[c.children.length-1];b.y=100;const t=text(c,'Add a motor to begin','Body','muted',300);t.x=34;t.y=200;return c;}
    const hasMotor=state!=='valveOnly',hasValve=!['motor'].includes(state),conn=['connected','branch','saved'].includes(state);
    if(conn){line(c,184,119,3,state==='branch'?36:74);if(state!=='branch'){const a=icon(c,'next',20);a.rotation=-90;a.x=174;a.y=155;link(a,'pathLink');}}
    if(state==='branch'){line(c,184,152,110,3);line(c,292,153,3,40);}
    function node(x,y,ic,label,to){const n=frame(c,'Node / '+label,136,88,'paper',20);border(n,'green');n.x=x;n.y=y;badge(n,ic,44).x=46;n.children[n.children.length-1].y=8;const t=text(n,label,'Small','ink',128);t.textAlignHorizontal='CENTER';t.x=4;t.y=58;link(n,to);return n;}
    if(hasMotor)node(116,30,'motor','Motor 01',state==='motor'?'pathPickerValve':state==='nodes'?'pathSource':'pathLink');
    if(hasValve)node(state==='branch'?30:116,204,'valve','Valve A',state==='source'?'pathConnected':'pathLink');
    if(state==='branch'){line(c,98,152,86,3);line(c,97,153,3,51);node(226,204,'valve','Valve C','pathBranchPick');}
    function port(x,y,to,selected){const hit=frame(c,'Port / '+(selected?'selected':'tap'),48,48,'white',24);hit.fills=[];hit.x=x-24;hit.y=y-24;const d=book(figma.createEllipse());hit.appendChild(d);d.x=d.y=14;d.resize(20,20);fills(d,selected?'lime':'green');d.strokes=[paint('white')];d.strokeWeight=3;link(hit,to);}
    if(hasMotor)port(184,119,'pathSource',state==='source');if(hasValve)port(state==='branch'?98:184,204,'pathConnected',state==='source');if(state==='branch')port(294,204,'pathBranch',false);
    const label=text(c,conn?'Water direction →':'Outlet ●     →     ● Inlet','Small','muted',316);label.x=26;label.y=312;
    return c;
  }
  function item(p,it){
    if(it.type==='button')return button(p,it);
    if(it.type==='row')return row(p,it);
    if(it.type==='note')return note(p,it);
    if(it.type==='hero'){const tone=it.tone||'forest';const c=stack(p,'Focus / '+it.value,368,'VERTICAL',10,22,tone);const top=stack(c,'Status',324,'HORIZONTAL',12);top.counterAxisAlignItems='CENTER';badge(top,it.icon,56,tone==='forest'?'lime':'white',tone==='forest'?'green':tone);text(top,it.label,'Label','white',252);text(c,it.value,'Value','white',324);if(it.sub)text(c,it.sub,'Small','white',324);return c;}
    if(it.type==='field'){const c=stack(p,'Field / '+it.label,368,'VERTICAL',7,16,'white');border(c);text(c,it.label,'Small','muted',330);const v=stack(c,'Value',336,'HORIZONTAL',10);icon(v,it.icon,24);text(v,it.value,'Body','ink',290);return link(c,it.to);}
    if(it.type==='steps'){const c=stack(p,'Step sequence',368,'VERTICAL',0,16,'white');border(c);it.items.forEach((a,i)=>{const r=stack(c,'Step '+(i+1),336,'HORIZONTAL',14,0);r.paddingTop=r.paddingBottom=12;r.counterAxisAlignItems='CENTER';badge(r,a[0],44);const col=stack(r,'Step label',274,'VERTICAL',4);text(col,a[1],'Body','ink',274);text(col,a[2],'Small','muted',274);});return c;}
    if(it.type==='metrics'){const r=stack(p,'Live readings',368,'HORIZONTAL',12);for(const a of it.items){const c=stack(r,a[2],178,'VERTICAL',8,16,'white');border(c);icon(c,a[0],24);text(c,a[1],'Title','ink',146);text(c,a[2],'Small','muted',146);}return r;}
    if(it.type==='tiles'){const c=stack(p,'Quick actions',368,'VERTICAL',12);for(let i=0;i<it.items.length;i+=2){const r=stack(c,'Action row',368,'HORIZONTAL',12);for(const a of it.items.slice(i,i+2)){const t=stack(r,a[1],178,'VERTICAL',10,16,'white');border(t);badge(t,a[0],44);text(t,a[1],'Body','ink',146);link(t,a[2]);}}return c;}
    if(it.type==='choices'){const c=stack(p,it.label,368,'VERTICAL',10);text(c,it.label,'Body');for(const a of it.items)row(c,{icon:a[4]?'check':a[0],label:a[1],sub:a[2],to:a[3],tone:a[4]?'green':'amber'});return c;}
    if(it.type==='topology')return topology(p,it.state);
    if(it.type==='days'){const c=stack(p,'Repeat every day',368,'VERTICAL',12,16,'white');text(c,'Every day','Body');const r=stack(c,'Days',336,'HORIZONTAL',6);for(const s of ['M','T','W','T','F','S','S']){const d=frame(r,'Selected day',42,42,'sage',21);const t=text(d,s,'Small','green',42);t.textAlignHorizontal='CENTER';t.y=10;}return c;}
    if(it.type==='scan'){const c=frame(p,'Scan controller QR code',368,270,'sage',24);const i=icon(c,'qr',156);i.x=106;i.y=40;const t=text(c,'Place code inside the square','Small','muted',320);t.x=24;t.y=228;return c;}
    if(it.type==='welcome'){const c=frame(p,'Field illustration',368,190,'sage',24);const svg='<svg xmlns="http://www.w3.org/2000/svg" width="368" height="190" viewBox="0 0 368 190"><rect width="368" height="190" fill="#EDF3E4"/><circle cx="295" cy="40" r="24" fill="#D5ED9C"/><path d="M0 116Q100 42 200 118T400 106V190H0Z" fill="#BED294"/><path d="M-30 175Q120 60 390 173M-30 210Q120 95 390 208M-30 245Q120 130 390 243" fill="none" stroke="#236244" stroke-width="19"/></svg>';const n=book(figma.createNodeFromSvg(svg));c.appendChild(n);return c;}
    if(it.type==='chart'){const c=stack(p,'Water use chart',368,'VERTICAL',12,18,'white');text(c,'Water use · Today','Body');const bars=stack(c,'Litre bars',332,'HORIZONTAL',10);bars.counterAxisAlignItems='MAX';for(const h of [30,55,125,165,85,45,22]){const b=frame(bars,'Water volume',34,h,'green',8);}text(c,'00:00          06:00          12:00','Small','muted');return c;}
  }
  const groups=[...new Set(SCREENS.map(s=>s.group))];const groupCounts={};
  for(const spec of SCREENS){const g=groups.indexOf(spec.group),ix=groupCounts[spec.group]||0;groupCounts[spec.group]=ix+1;
    const s=frame(page,spec.id+' · '+spec.title,412,892,'paper',28);s.clipsContent=true;s.x=1060+ix*468;s.y=80+g*1010;refs[spec.id]=s;
    const status=frame(s,'Status bar',412,28,'paper',0);const tm=text(status,'9:41','Label');tm.x=22;tm.y=8;const wi=icon(status,'wifi',18);wi.x=336;wi.y=7;const bat=text(status,'100%','Label');bat.x=359;bat.y=8;
    const header=stack(s,'Screen header',368,'HORIZONTAL',12);header.x=22;header.y=40;header.counterAxisAlignItems='CENTER';if(spec.back)tinyButton(header,'Back',spec.back,'back');else badge(header,'leaf',48);
    const heading=stack(header,'Heading',304,'VERTICAL',5);text(heading,spec.title,'Title','ink',304);text(heading,spec.subtitle,'Small','muted',304);
    const viewport=frame(s,'Scroll content',412,spec.nav?658:748,'paper',0);viewport.x=0;viewport.y=140;viewport.clipsContent=true;viewport.overflowDirection='VERTICAL';
    const body=stack(viewport,'Content',368,'VERTICAL',14);body.x=22;body.y=8;body.paddingBottom=24;for(const it of spec.items)item(body,it);
    if(spec.nav){const nav=stack(s,'Bottom navigation',412,'HORIZONTAL',0,10,'white');nav.x=0;nav.y=810;nav.resize(412,82);nav.primaryAxisSizingMode='FIXED';nav.counterAxisSizingMode='FIXED';nav.paddingLeft=nav.paddingRight=14;
      for(const [ic,label,id] of [['home','Home','home'],['pin','Sites','sites'],['flow','Paths','paths'],['bell','Alerts','alerts']]){const n=stack(nav,'Tab / '+label,96,'VERTICAL',4,6,spec.nav===({home:'home',sites:'sites',paths:'flows',alerts:'alerts'}[id])?'sage':'white');n.counterAxisAlignItems='CENTER';icon(n,ic,24);text(n,label,'Label','green');link(n,id);}
    }
  }
  for(const [node,styleId] of styleJobs)await node.setTextStyleIdAsync(styleId);
  const transition={type:'DISSOLVE',easing:{type:'EASE_OUT'},duration:0.18};
  for(const [node,dest] of links){if(!refs[dest])throw new Error('Unknown prototype target '+dest);await node.setReactionsAsync([{trigger:{type:'ON_CLICK'},actions:[{type:'NODE',destinationId:refs[dest].id,navigation:'NAVIGATE',transition,resetScrollPosition:true}]}]);}
  for(const [id,[dest,seconds]]of Object.entries(TIMED))await refs[id].setReactionsAsync([{trigger:{type:'AFTER_TIMEOUT',timeout:seconds},actions:[{type:'NODE',destinationId:refs[dest].id,navigation:'NAVIGATE',transition,resetScrollPosition:true}]}]);
  page.flowStartingPoints=FLOWS.map(([id,name])=>({nodeId:refs[id].id,name}));
  figma.viewport.scrollAndZoomIntoView([refs.welcome,refs.home]);
  return{createdNodeIds:[page.id,...page.findAll(()=>true).map(n=>n.id)],screenCount:SCREENS.length,clickConnections:links.length,timedConnections:Object.keys(TIMED).length,flowCount:FLOWS.length,pageId:page.id};
}
buildAgroThulir().then(result=>{console.log(result);figma.closePlugin('AgroThulir: '+result.screenCount+' screens and '+result.clickConnections+' click connections created.');}).catch(error=>{console.error(error);figma.closePlugin('Build stopped: '+error.message);});
