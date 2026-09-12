/* AgroThulir farmer mobile prototype. Shared source for Figma and offline preview. */
const THEME={forest:'#133C2C',green:'#236244',lime:'#D5ED9C',sage:'#EDF3E4',paper:'#F8F9F3',white:'#FFFFFF',ink:'#17372A',muted:'#5E7065',line:'#DCE5D7',amber:'#885100',amberBg:'#FFF0CF',red:'#AD3430',redBg:'#FCE8E3',blue:'#2C648A',blueBg:'#E8F2F8'};
const ICONS={
leaf:'<path d="M20 3C9 3 3 8 4 15c1 7 11 6 13-1 1-4 1-7 3-11Z"/><path d="M3 22c3-7 7-11 12-14"/>',
home:'<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8"/>',
pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
motor:'<path d="M2 10h3m14 2h3M6 7h11a2 2 0 0 1 2 2v8H6V7ZM9 4h5v3M5 20h15M8 17v3m9-3v3M9 10v4m3-4v4m3-4v4"/>',
valve:'<path d="M2 9h3l7 4-7 4H2V9Zm20 0h-3l-7 4 7 4h3V9ZM12 4v9M8 4h8"/><circle cx="12" cy="4" r="1"/>',
tank:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 13c4 3 12 3 16 0"/>',
sensor:'<path d="M12 10v12M7 22h10M6 4a8 8 0 0 0 0 12M18 4a8 8 0 0 1 0 12M9 7a4 4 0 0 0 0 6M15 7a4 4 0 0 1 0 6"/>',
cpu:'<rect x="5" y="5" width="14" height="14" rx="3"/><path d="M9 1v4m6-4v4M9 19v4m6-4v4M1 9h4m-4 6h4M19 9h4m-4 6h4"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
flow:'<rect x="2" y="2" width="7" height="7" rx="2"/><rect x="15" y="15" width="7" height="7" rx="2"/><path d="M9 5h6a4 4 0 0 1 4 4v6M5 9v10h10m1-7 3 3 3-3"/>',
calendar:'<rect x="3" y="5" width="18" height="17" rx="3"/><path d="M7 2v6m10-6v6M3 11h18m-13 5 3 3 5-5"/>',
bell:'<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 22h4"/>',
drop:'<path d="M12 2s8 8 8 13a8 8 0 0 1-16 0c0-5 8-13 8-13ZM8 15c0 3 2 4 4 4"/>',
power:'<path d="M12 2v10M6 5a9 9 0 1 0 12 0"/>',
play:'<path d="m7 3 14 9-14 9V3Z"/>',stop:'<rect x="5" y="5" width="14" height="14" rx="2"/>',
check:'<path d="m4 12 5 5L21 5"/>',plus:'<path d="M12 3v18M3 12h18"/>',
back:'<path d="m15 4-8 8 8 8"/>',next:'<path d="m9 4 8 8-8 8"/>',close:'<path d="m5 5 14 14M19 5 5 19"/>',
arrow:'<path d="M2 12h20m-7-7 7 7-7 7"/>',
shield:'<path d="M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6l-9-4Z"/><path d="m7 12 3 3 6-6"/>',
clock:'<circle cx="12" cy="12" r="10"/><path d="M12 5v7l4 3"/>',
alert:'<path d="M12 2 1 21h22L12 2ZM12 9v5m0 3v1"/>',
wifi:'<path d="M2 7a15 15 0 0 1 20 0M5 11a10 10 0 0 1 14 0m-10 4a5 5 0 0 1 6 0"/><circle cx="12" cy="20" r="1"/>',
offline:'<path d="M2 2l20 20M2 7a15 15 0 0 1 4-2M9 3a15 15 0 0 1 13 4M5 11a10 10 0 0 1 5-3m-1 7a5 5 0 0 1 6 0"/><circle cx="12" cy="20" r="1"/>',
qr:'<path d="M2 8V2h6m8 0h6v6M2 16v6h6m8 0h6v-6"/><rect x="6" y="6" width="4" height="4"/><rect x="14" y="6" width="4" height="4"/><path d="M6 14h4v4H6zM14 14h4v4h-4"/>',
edit:'<path d="m16 3 5 5L9 20H4v-5L16 3ZM13 6l5 5"/>',
trash:'<path d="M3 6h18M8 6V3h8v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
link:'<path d="m9 15 6-6M8 12 5 15a3 3 0 0 0 4 4l3-3m0-8 3-3a3 3 0 0 1 4 4l-3 3"/>',
reorder:'<path d="M7 3v18m-3-3 3 3 3-3M17 21V3m-3 3 3-3 3 3"/>',
lock:'<rect x="4" y="10" width="16" height="12" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
chart:'<path d="M3 3v18h19M7 16l4-7 4 3 6-8"/>',
pause:'<path d="M6 3h4v18H6ZM14 3h4v18h-4Z"/>',
search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 7 7"/>'
};
function svgIcon(name,color=THEME.green,size=28){return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]||ICONS.leaf}</svg>`;}
const btn=(label,to,icon='next',tone='green')=>({type:'button',label,to,icon,tone});
const row=(icon,label,sub,to,tone='green',badge='')=>({type:'row',icon,label,sub,to,tone,badge});
const note=(icon,label,sub='',tone='green')=>({type:'note',icon,label,sub,tone});
const field=(label,value,icon='edit',to=null)=>({type:'field',label,value,icon,to});
const hero=(icon,label,value,sub='',tone='forest')=>({type:'hero',icon,label,value,sub,tone});
const steps=(items)=>({type:'steps',items});
const tiles=(items)=>({type:'tiles',items});
const screen=(id,group,title,subtitle,items,back='home',nav='home',action=null)=>({id,group,title,subtitle,items,back,nav,action});
const SCREENS=[
screen('welcome','01 Start','AgroThulir','A little care. A greener tomorrow.',[
 {type:'welcome'},hero('leaf','YOUR FIELD, IN YOUR HAND','Grow with care','Motors · Valves · Water'),btn('Get started','signin','arrow'),note('shield','Simple. Safe. Connected.')
],null,null),
screen('signin','01 Start','Welcome back','Let’s get your fields ready.',[
 hero('leaf','AGROTHULIR','Hello, farmer','Your fields are one tap away'),field('Phone number','+94 77 123 4567','lock'),field('PIN','• • • •','lock'),btn('Sign in','home','arrow'),note('shield','Your field access is protected')
],'welcome',null),
screen('home','01 Start','Good morning','North Field · Today',[
 hero('motor','READY TO WATER','Motor 01','2 valves connected · Online'),btn('Water now','manual','drop'),{type:'metrics',items:[['drop','62%','Soil moisture'],['sun','28°','Air temperature']]},
 tiles([['pin','My sites','sites'],['flow','Water paths','paths'],['calendar','Schedules','schedules'],['bell','Alerts','alerts']]),row('calendar','Tomorrow · 6:00 AM','North beds · 20 min','scheduleDetail'),row('alert','Valve B needs a check','Tap to see what happened','alertDetail','amber')
],null,'home'),
screen('sites','02 Sites & equipment','My sites','Choose where to work.',[
 row('leaf','North Field','2 controllers · All online','site','green','2'),row('drop','Greenhouse','1 controller · Offline','offline','amber','!'),btn('Add site','siteAdd','plus','outline')
],'home','sites'),
screen('siteAdd','02 Sites & equipment','Add a site','A field, greenhouse or another place.',[
field('Site name','East Field'),tiles([['leaf','Field','siteAdd'],['home','Greenhouse','siteAdd']]),field('Location','Jaffna','pin'),btn('Save site','siteAdded','check')
],'sites','sites'),
screen('siteAdded','02 Sites & equipment','East Field','Your new site is ready.',[
hero('check','SITE ADDED','East Field','Let’s connect the first controller'),btn('Add controller','deviceAdd','plus'),btn('View sites','sitesUpdated','pin','outline')
],'sitesUpdated','sites'),
screen('sitesUpdated','02 Sites & equipment','My sites','Choose where to work.',[
row('leaf','North Field','2 controllers · All online','site'),row('drop','Greenhouse','1 controller · Offline','offline','amber'),row('leaf','East Field','No controllers yet','siteAdded'),btn('Add site','siteAdd','plus','outline')
],'home','sites'),
screen('site','02 Sites & equipment','North Field','All systems look good.',[
hero('leaf','FIELD STATUS','Ready to water','Last update · 8 sec ago'),{type:'metrics',items:[['motor','2','Controllers'],['valve','4','Valves']]},row('cpu','Controllers','Motors, valves & sensors','devices'),row('flow','Water paths','1 saved path','paths'),row('calendar','Schedules','Next · Tomorrow, 6:00 AM','schedules')
],'sites','sites'),
screen('devices','02 Sites & equipment','Controllers','North Field',[
row('cpu','Pump controller','Motor 01 · Valve A · Valve B','controller','green','On'),row('cpu','Tank controller','Motor 02 · Tank sensor','offline','amber','Off'),btn('Add controller','deviceAdd','plus','outline')
],'site','sites'),
screen('deviceAdd','02 Sites & equipment','Add controller','Scan the code on your controller.',[
{type:'scan'},btn('Scan code','deviceFound','qr'),btn('Enter code','deviceCode','edit','outline'),note('wifi','Keep the controller powered on')
],'devices','sites'),
screen('deviceCode','02 Sites & equipment','Controller code','Find it below the QR code.',[
field('Controller code','AT-00428','qr'),btn('Find controller','deviceFound','search')
],'deviceAdd','sites'),
screen('deviceFound','02 Sites & equipment','Controller found','Check before adding.',[
hero('cpu','AT-00428','Pump controller','4 outputs · 2 sensor inputs'),field('Name','Pump controller'),field('Site','North Field','pin'),btn('Add to site','controller','check'),note('shield','This controller will belong to your site')
],'deviceAdd','sites'),
screen('controller','02 Sites & equipment','Pump controller','North Field · Online · 8 sec ago',[
hero('motor','MOTOR 01','Ready','Valve A closed · Valve B closed'),btn('Water now','manual','drop'),tiles([['motor','Components','components'],['flow','Water path','pathSaved']]),row('chart','Readings','Flow, power & water use','readings'),row('calendar','Schedules','Morning watering','schedules')
],'devices','sites'),
screen('components','02 Sites & equipment','Components','Pump controller · 3 connected',[
row('motor','Motor 01','Output 1 · Off','motorDetail'),row('valve','Valve A','Output 2 · Closed','valveDetail'),row('valve','Valve B','Output 3 · Closed','valveBDetail'),btn('Add component','componentType','plus','outline')
],'controller','sites'),
screen('componentType','02 Sites & equipment','Add component','What are you connecting?',[
tiles([['motor','Motor','motorSetup'],['valve','Valve','valveSetup'],['sensor','Sensor','sensorSetup'],['tank','Tank','tankSetup']]),note('link','Choose an unused controller port')
],'components','sites'),
screen('motorSetup','02 Sites & equipment','Motor setup','Pump controller',[
field('Name','Motor 02','motor'),field('Output','Output 4'),field('Power','1.5 kW'),field('Max run','30 min','clock'),note('shield','Requires an open valve'),btn('Save motor','motorAdded','check')
],'componentType','sites'),
screen('valveSetup','02 Sites & equipment','Valve setup','Pump controller',[
field('Name','Valve C','valve'),field('Output','Output 4'),field('Position feedback','Connected','check'),field('Open timeout','10 sec','clock'),btn('Save valve','valveAdded','check')
],'componentType','sites'),
screen('sensorSetup','02 Sites & equipment','Sensor setup','Pump controller',[
field('Name','Flow sensor','sensor'),field('Input','Input 1'),field('Unit','L/min','drop'),btn('Save sensor','sensorAdded','check')
],'componentType','sites'),
screen('tankSetup','02 Sites & equipment','Tank setup','Add a water source.',[
field('Name','Main tank','tank'),field('Capacity','2,000 L','drop'),note('tank','Physical source','No output port needed'),btn('Save tank','tankAdded','check')
],'componentType','sites'),
screen('motorAdded','02 Sites & equipment','Motor added','Motor 02 · Output 4',[
hero('motor','COMPONENT SAVED','Motor 02','1.5 kW · Max 30 min'),note('shield','Connect its water path before starting'),btn('Build water path','pathEmpty','flow'),btn('Back to controller','controller','back','outline')
],'components','sites'),
screen('valveAdded','02 Sites & equipment','Valve added','Valve C · Output 4',[
hero('valve','COMPONENT SAVED','Valve C','Closed · Feedback connected'),btn('Build water path','pathEmpty','flow'),btn('Back to controller','controller','back','outline')
],'components','sites'),
screen('sensorAdded','02 Sites & equipment','Sensor added','Flow sensor · Input 1',[
hero('sensor','SENSOR CONNECTED','0 L/min','Waiting for water flow'),btn('View readings','readings','chart'),btn('Back to controller','controller','back','outline')
],'components','sites'),
screen('tankAdded','02 Sites & equipment','Tank added','Main tank · 2,000 L',[
hero('tank','WATER SOURCE SAVED','Main tank','Ready to connect'),btn('Build water path','pathEmpty','flow')
],'components','sites'),
screen('motorDetail','02 Sites & equipment','Motor 01','Pump controller · Output 1',[
hero('motor','CONFIRMED STATE','Off','Last update · 8 sec ago'),{type:'metrics',items:[['power','0 kW','Power'],['clock','30 min','Run limit']]},btn('Water now','manual','drop'),row('shield','Protection','Valve-first start · Dry-run check','protection'),row('chart','Readings','Water use & power','readings')
],'components','sites'),
screen('valveDetail','02 Sites & equipment','Valve A','North beds · Output 2',[
hero('valve','CONFIRMED STATE','Closed','Motor 01 is off'),btn('Open valve','valveConfirm','valve'),row('shield','Protection','Cannot close under a running motor','protection')
],'components','sites'),
screen('valveBDetail','02 Sites & equipment','Valve B','South beds · Output 3',[
hero('valve','CONFIRMED STATE','Closed','Manual operation needs a feedback check'),note('alert','Position check needed','Resolve the valve alert first.','amber'),btn('View valve alert','alertDetail','alert','amber')
],'components','sites'),
screen('readings','02 Sites & equipment','Readings','Motor 01 · Today',[
{type:'metrics',items:[['drop','420 L','Water used'],['power','1.2 kWh','Energy']]},{type:'chart'},row('clock','Last watering','20 min · 6:00 AM','complete'),note('wifi','Last update · 8 sec ago')
],'controller','sites'),
screen('protection','03 Safe controls','Safe watering','These checks protect your equipment.',[
steps([['valve','Open valve','Confirm its position'],['motor','Start motor','Only after valve is open'],['stop','Stop motor','Wait for confirmation'],['valve','Close valve','Only after motor is off']]),note('shield','Protection stays on','Hardware limits are set during installation.'),btn('Back to controls','manual','back')
],'motorDetail','home'),
screen('manual','03 Safe controls','Water now','Motor 01 · North Field',[
hero('motor','READY','Motor 01','Online · No motor faults'),{type:'choices',label:'Choose a valve',items:[['valve','Valve A','North beds','manual',true],['valve','Valve B','Needs check','blocked',false]]},field('Water for','20 min','clock','duration'),note('shield','Valve opens first'),btn('Continue','startConfirm','arrow')
],'controller','home'),
screen('duration','03 Safe controls','Watering time','Motor 01 · North beds',[
hero('clock','STOP AUTOMATICALLY AFTER','20 min','Maximum · 30 min'),tiles([['clock','10 min','manual10'],['clock','20 min','manual']]),btn('Use 20 minutes','manual','check')
],'manual','home'),
screen('manual10','03 Safe controls','Water now','Motor 01 · North Field',[
hero('motor','READY','Motor 01','Valve A · North beds'),field('Water for','10 min','clock','duration'),note('shield','Valve opens first'),btn('Continue','startConfirm10','arrow')
],'manual','home'),
screen('startConfirm10','03 Safe controls','Start watering?','North beds · 10 minutes',[
steps([['valve','Open Valve A','Wait for confirmation'],['motor','Start Motor 01','Stop after 10 min']]),note('shield','Valve B stays closed'),btn('Start safely','opening10','play'),btn('Cancel','manual10','close','outline')
],'manual10','home'),
screen('opening10','03 Safe controls','Opening valve','Motor stays off until confirmed.',[
hero('valve','WAITING FOR FEEDBACK','Valve A','10-minute watering'),steps([['clock','Valve A opening','Waiting for position'],['lock','Motor 01 off','Waiting for valve']]),btn('View confirmed run','running10','check'),btn('Valve did not open','blocked','alert','outline')
],'startConfirm10',null),
screen('running10','03 Safe controls','Watering now','North beds · Confirmed live',[
hero('motor','MOTOR ON · VALVE A OPEN','09:42','of 10 min remaining'),{type:'metrics',items:[['drop','21 L/min','Water flow'],['power','1.4 kW','Power']]},btn('Stop watering','stopConfirm','stop','red'),note('shield','Motor stops before valve closes')
],null,'home'),
screen('startConfirm','03 Safe controls','Start watering?','North beds · 20 minutes',[
steps([['valve','Open Valve A','Wait for confirmation'],['motor','Start Motor 01','Stop after 20 min']]),note('shield','Valve B stays closed'),btn('Start safely','opening','play'),btn('Cancel','manual','close','outline')
],'manual','home'),
screen('opening','03 Safe controls','Opening valve','Motor stays off until confirmed.',[
hero('valve','WAITING FOR FEEDBACK','Valve A','Motor 01 · Off'),steps([['clock','Valve A opening','Waiting for position'],['lock','Motor 01 off','Waiting for valve']]),btn('Valve did not open','blocked','alert','outline')
],null,null),
screen('starting','03 Safe controls','Starting motor','Valve A is confirmed open.',[
hero('motor','WAITING FOR FEEDBACK','Motor 01','Valve A · Open'),steps([['check','Valve A open','Confirmed'],['clock','Motor starting','Waiting for feedback']]),btn('Stop request','stopConfirm','stop','outline')
],null,null),
screen('running','03 Safe controls','Watering now','North beds · Confirmed live',[
hero('motor','MOTOR ON · VALVE A OPEN','19:42','of 20 min remaining'),{type:'metrics',items:[['drop','21 L/min','Water flow'],['power','1.4 kW','Power']]},btn('Stop watering','stopConfirm','stop','red'),row('valve','Valve A · Open','Locked while motor is running','closeBlocked'),note('shield','Stops automatically when time is up')
],null,'home'),
screen('stopConfirm','03 Safe controls','Stop watering?','North beds',[
steps([['stop','Stop Motor 01','Wait for motor feedback'],['valve','Close Valve A','Only after motor is off']]),btn('Stop safely','stopping','stop','red'),btn('Keep watering','running','back','outline')
],'running',null),
screen('stopping','03 Safe controls','Stopping motor','Valve A stays open.',[
hero('motor','STOP REQUEST SENT','Waiting…','Motor-off feedback needed','amber'),note('valve','Valve A is held open'),btn('Stop not confirmed','stopUnknown','alert','outline')
],null,null),
screen('closing','03 Safe controls','Closing valve','Motor 01 is confirmed off.',[
hero('valve','MOTOR OFF','Closing Valve A','Waiting for valve feedback'),note('shield','Water path is shutting down safely')
],null,null),
screen('complete','03 Safe controls','Watering finished','North beds',[
hero('check','SAFE STOP CONFIRMED','All off','Motor off · Valve A closed'),{type:'metrics',items:[['clock','20 min','Run time'],['drop','420 L','Water used']]},btn('Back home','home','home'),btn('Water again','manual','drop','outline')
],null,'home'),
screen('blocked','03 Safe controls','Motor kept off','The valve has not confirmed open.',[
hero('shield','START BLOCKED','Motor is off','Valve position needs a check','amber'),note('valve','Check the valve on site','Keep clear of moving equipment.','amber'),btn('View alert','alertDetail','alert','amber'),btn('Check again','opening','wifi','outline')
],'manual','alerts'),
screen('stopUnknown','03 Safe controls','Stop not confirmed','The motor may still be running.',[
hero('alert','STATE UNKNOWN','Check on site','Valve A stays open','red'),note('alert','Use the local stop','Keep the valve open until motor-off is verified.','red'),btn('Retry stop','stopping','stop','red'),btn('View alert','stopAlert','bell','outline')
],null,'alerts'),
screen('closeBlocked','03 Safe controls','Valve stays open','Motor 01 is still running.',[
hero('lock','CLOSE BLOCKED','Stop motor first','This protects the water pipe','amber'),btn('Stop watering','stopConfirm','stop','red'),btn('Back to watering','running','back','outline')
],'running','home'),
screen('offline','03 Safe controls','Controller offline','Tank controller · Last seen 2h ago',[
hero('offline','NO LIVE FEEDBACK','State unknown','Remote controls are unavailable','amber'),note('wifi','Check power & signal','Use local controls if needed.','amber'),btn('Check connection','offlineRetry','wifi'),btn('Back to controllers','devices','back','outline')
],'devices','sites'),
screen('offlineRetry','03 Safe controls','Still offline','No reply from the tank controller.',[
hero('offline','CHECK COMPLETE','No connection','Last seen · 2h ago','amber'),btn('Try again','offline','wifi'),btn('Back to controllers','devices','back','outline')
],'offline','sites'),
screen('valveConfirm','03 Safe controls','Open Valve A?','Motor 01 will stay off.',[
hero('valve','VALVE ONLY','North beds','No motor activation'),btn('Open valve','valveOpening','valve'),btn('Cancel','valveDetail','close','outline')
],'valveDetail','sites'),
screen('valveOpening','03 Safe controls','Opening Valve A','Waiting for position feedback.',[
hero('valve','REQUEST SENT','Opening…','Motor 01 · Off'),btn('No confirmation','blocked','alert','outline')
],null,null),
screen('valveOpen','03 Safe controls','Valve A is open','Position confirmed · Motor is off',[
hero('valve','CONFIRMED STATE','Open','Motor 01 · Off'),btn('Close valve','valveCloseConfirm','valve'),btn('Water with this valve','manual','drop','outline')
],'components','sites'),
screen('valveCloseConfirm','03 Safe controls','Close Valve A?','Motor 01 is confirmed off.',[
note('shield','Safe to close'),btn('Close valve','valveClosing','valve'),btn('Keep open','valveOpen','back','outline')
],'valveOpen','sites'),
screen('valveClosing','03 Safe controls','Closing Valve A','Waiting for position feedback.',[
hero('valve','REQUEST SENT','Closing…','Motor 01 · Off')
],null,null),
screen('paths','04 Water path builder','Water paths','Connect equipment. Then set the order.',[
row('flow','North beds','Motor 01 → Valve A','pathSaved'),btn('New water path','pathEmpty','plus'),note('link','Arrows show water direction')
],'home','flows'),
screen('pathEmpty','04 Water path builder','New water path','1 · Add your equipment',[
{type:'topology',state:'empty'},btn('Add component','pathPickerMotor','plus')
],'paths','flows'),
screen('pathPickerMotor','04 Water path builder','Add to water path','Choose equipment already connected.',[
row('motor','Motor 01','Pump controller · Output 1','pathMotor'),row('valve','Valve A','Pump controller · Output 2','pathValveFirst'),row('valve','Valve B','Needs feedback check','pathPickBlocked','amber'),btn('Create new component','componentType','plus','outline')
],'pathEmpty','flows'),
screen('pathPickBlocked','04 Water path builder','Valve B needs a check','Resolve its alert before use.',[
hero('valve','UNAVAILABLE','Valve B','No confirmed position','amber'),btn('View alert','alertDetail','alert','amber'),btn('Choose another','pathPickerValve','back','outline')
],'pathPickerValve','flows'),
screen('pathValveFirst','04 Water path builder','Valve A added','Add a motor to supply water.',[
{type:'topology',state:'valveOnly'},btn('Add Motor 01','pathNodes','motor')
],'pathEmpty','flows'),
screen('pathMotor','04 Water path builder','Motor added','1 · Add a valve next',[
{type:'topology',state:'motor'},btn('Add valve','pathPickerValve','plus')
],'pathEmpty','flows'),
screen('pathPickerValve','04 Water path builder','Choose a valve','Where should the water go?',[
row('valve','Valve A','North beds · Output 2','pathNodes'),row('valve','Valve B','Needs feedback check','pathPickBlocked','amber')
],'pathMotor','flows'),
screen('pathNodes','04 Water path builder','Connect the path','2 · Tap the motor outlet',[
{type:'topology',state:'nodes'},note('link','Tap the green outlet dot'),btn('Select Motor 01 outlet','pathSource','link')
],'pathMotor','flows'),
screen('pathSource','04 Water path builder','Choose the inlet','3 · Tap the valve inlet',[
{type:'topology',state:'source'},note('arrow','Motor 01 → choose a valve'),btn('Connect to Valve A','pathConnected','link')
],'pathNodes','flows'),
screen('pathConnected','04 Water path builder','Path connected','Motor 01 → Valve A',[
{type:'topology',state:'connected'},tiles([['edit','Edit link','pathLink'],['plus','Add branch','pathBranchPick']]),btn('Set run order','sequence','flow')
],'pathNodes','flows'),
screen('pathLink','04 Water path builder','Edit connection','Water direction',[
steps([['motor','From · Motor 01','Outlet'],['arrow','Water flows to','One-way pipe'],['valve','To · Valve A','Inlet']]),btn('Save connection','pathConnected','check'),btn('Delete connection','pathDelete','trash','red')
],'pathConnected','flows'),
screen('pathDelete','04 Water path builder','Remove this link?','Motor 01 → Valve A',[
hero('link','CONNECTION ONLY','Remove link?','Both components will remain','amber'),btn('Remove link','pathNodes','trash','red'),btn('Keep connection','pathConnected','back','outline')
],'pathLink','flows'),
screen('pathBranchPick','04 Water path builder','Add a branch','Choose another outlet path.',[
row('valve','Valve B','Feedback check required','pathPickBlocked','amber'),row('valve','Valve C','Output 4 · Ready','pathBranch'),note('link','Branch from Motor 01 outlet')
],'pathConnected','flows'),
screen('pathBranch','04 Water path builder','Two water paths','Motor 01 → Valve A / Valve C',[
{type:'topology',state:'branch'},note('shield','Run order chooses active valves'),btn('Set run order','sequenceBranch','flow'),btn('Remove branch','pathConnected','trash','outline')
],'pathConnected','flows'),
screen('pathSaved','04 Water path builder','North beds','Saved water path',[
{type:'topology',state:'saved'},tiles([['edit','Edit path','pathConnected'],['flow','Run order','sequence']]),btn('Water now','manual','drop')
],'paths','flows'),
screen('sequence','05 Run order','Run order','Open valve first. Then start motor.',[
steps([['valve','1 · Open Valve A','Wait for open confirmation'],['clock','2 · Wait 3 seconds','Let pressure settle'],['motor','3 · Start Motor 01','Run for 20 min'],['shield','4 · Safe stop','Motor off → valve closed']]),tiles([['plus','Add step','stepPick'],['reorder','Reorder','reorder']]),btn('Check & save','validate','check')
],'pathConnected','flows'),
screen('sequenceBranch','05 Run order','Branch run order','Valve A and Valve C together',[
steps([['valve','1 · Open A + C','Confirm both valves open'],['motor','2 · Start Motor 01','Run for 20 min'],['shield','3 · Safe stop','Motor off → A + C closed']]),note('shield','Both paths must be confirmed'),btn('Save branch order','branchSaved','check')
],'pathBranch','flows'),
screen('branchSaved','05 Run order','Branch path saved','North & East beds',[
{type:'topology',state:'branch'},note('check','Both valves included in run order'),btn('View run order','sequenceBranch','flow'),btn('Back to water paths','pathsBranch','back','outline')
],'pathBranch','flows'),
screen('pathsBranch','04 Water path builder','Water paths','2 saved paths',[
row('flow','North beds','Motor 01 → Valve A','pathSaved'),row('flow','North & East beds','Motor 01 → Valve A + C','branchSaved'),btn('New water path','pathEmpty','plus')
],'home','flows'),
screen('stepPick','05 Run order','Add a step','Choose what happens next.',[
tiles([['clock','Wait','stepWait'],['motor','Motor action','stepMotor'],['valve','Valve action','stepValve'],['shield','Safe stop','shutdown']])
],'sequence','flows'),
screen('stepWait','05 Run order','Wait step','Pause before starting the motor.',[
hero('clock','WAIT FOR','5 seconds','After Valve A opens'),btn('Use 5 seconds','sequenceWait','check'),btn('Use 3 seconds','sequence','clock','outline')
],'stepPick','flows'),
screen('sequenceWait','05 Run order','Run order','Wait time updated.',[
steps([['valve','1 · Open Valve A','Confirm position'],['clock','2 · Wait 5 seconds','Updated'],['motor','3 · Start Motor 01','Run for 20 min'],['shield','4 · Safe stop','Motor off → valve closed']]),btn('Check & save','validateWait','check'),btn('Edit wait','stepWait','edit','outline')
],'sequence','flows'),
screen('stepMotor','05 Run order','Motor action','Motor 01',[
field('Action','Start','motor'),field('Run time','20 min','clock'),note('shield','Requires Valve A open'),btn('Use motor action','sequence','check')
],'stepPick','flows'),
screen('stepValve','05 Run order','Valve action','Valve A',[
field('Action','Open','valve'),field('Wait for feedback','Yes','check'),field('Timeout','10 sec','clock'),btn('Use valve action','sequence','check')
],'stepPick','flows'),
screen('shutdown','05 Run order','Safe stop','This order is protected.',[
steps([['stop','1 · Stop Motor 01','Confirm motor is off'],['valve','2 · Close Valve A','Confirm closed position']]),note('lock','Cannot reverse this order'),btn('Use safe stop','sequence','check')
],'stepPick','flows'),
screen('reorder','05 Run order','Reorder steps','Tap a step to move it.',[
row('reorder','Open Valve A','Move below motor','sequenceInvalid'),row('clock','Wait 3 seconds','Edit duration','stepWait'),row('motor','Start Motor 01','Move above valve','sequenceInvalid'),row('lock','Safe stop','Protected last step','shutdown'),btn('Keep this order','sequence','check')
],'sequence','flows'),
screen('sequenceInvalid','05 Run order','Check the order','Motor cannot start before the valve.',[
steps([['alert','1 · Start Motor 01','Blocked · Valve is closed'],['valve','2 · Open Valve A','Must move before motor'],['shield','3 · Safe stop','Protected']]),note('alert','Save is blocked','Move valve before motor.','red'),btn('Fix the order','sequence','reorder','amber')
],'reorder','flows'),
screen('validate','05 Run order','Ready to save','All safety checks passed.',[
steps([['check','Valve opens before motor','Confirmed feedback required'],['check','Run limit · 20 min','Within controller limit'],['check','Safe stop included','Motor off before valve closes']]),field('Path name','North beds','flow'),btn('Save water path','pathSaved','check'),btn('Schedule it','scheduleNew','calendar','outline')
],'sequence','flows'),
screen('validateWait','05 Run order','Ready to save','5-second wait · All checks passed',[
note('check','Valve → Wait 5 sec → Motor'),field('Path name','North beds · 5 sec','flow'),btn('Save water path','pathSavedWait','check')
],'sequenceWait','flows'),
screen('pathSavedWait','04 Water path builder','North beds · 5 sec','Saved · 5-second pressure wait',[
{type:'topology',state:'saved'},btn('View run order','sequenceWait','flow'),btn('Back to water paths','pathsWait','back','outline')
],'sequenceWait','flows'),
screen('pathsWait','04 Water path builder','Water paths','2 saved paths',[
row('flow','North beds','3-second wait','pathSaved'),row('flow','North beds · 5 sec','5-second wait','pathSavedWait'),btn('New water path','pathEmpty','plus')
],'home','flows'),
screen('schedules','06 Scheduling','Schedules','Water at the right time.',[
row('calendar','Morning watering','Tomorrow · 6:00 AM','scheduleDetail','green','On'),btn('New schedule','scheduleNew','plus'),row('clock','Past watering','See completed runs','history')
],'home','home'),
screen('scheduleNew','06 Scheduling','New schedule','1 · Choose a water path',[
row('flow','North beds','Motor 01 → Valve A','scheduleTiming'),note('shield','Uses the saved safe run order'),btn('Build another path','pathEmpty','plus','outline')
],'schedules','home'),
screen('scheduleTiming','06 Scheduling','Choose a time','2 · Morning watering',[
hero('sun','START AT','06:00 AM','Asia/Colombo · UTC+05:30'),{type:'days'},field('Water for','20 min','clock','scheduleDuration'),btn('Review schedule','scheduleReview','arrow'),btn('Choose 6:10 AM','scheduleTimingAlt','clock','outline')
],'scheduleNew','home'),
screen('scheduleDuration','06 Scheduling','Run duration','Morning watering',[
hero('clock','WATER FOR','20 min','Maximum · 30 min'),btn('Use 20 minutes','scheduleTiming','check'),note('shield','Run order includes a safe stop')
],'scheduleTiming','home'),
screen('scheduleReview','06 Scheduling','Ready to schedule?','3 · Check and save',[
steps([['flow','North beds','Motor 01 → Valve A'],['calendar','Every day · 6:00 AM','Asia/Colombo'],['clock','Water for 20 min','Stops automatically']]),note('shield','Skip if controller is offline'),btn('Save schedule','scheduleConflict','check')
],'scheduleTiming','home'),
screen('scheduleConflict','06 Scheduling','Time already in use','Motor 01 is booked until 6:20 AM.',[
hero('calendar','SCHEDULE NOT SAVED','Times overlap','Morning watering · 6:00–6:20','amber'),btn('Move to 6:30 AM','scheduleResolved','clock','amber'),btn('Choose another time','scheduleTimingAlt','edit','outline')
],'scheduleReview','home'),
screen('scheduleTimingAlt','06 Scheduling','Choose a time','Motor 01 has a morning booking.',[
hero('clock','SELECTED TIME','06:10 AM','Overlaps 6:00–6:20 watering'),btn('Check 6:10 AM','scheduleConflict','check'),btn('Use 6:30 AM','scheduleResolved','clock','outline')
],'scheduleTiming','home'),
screen('scheduleResolved','06 Scheduling','No overlap','New schedule · 6:30 AM',[
steps([['flow','North beds','Motor 01 → Valve A'],['calendar','Every day · 6:30 AM','Asia/Colombo'],['clock','Water for 20 min','Finishes at 6:50 AM']]),btn('Save schedule','scheduleSaved','check')
],'scheduleConflict','home'),
screen('scheduleSaved','06 Scheduling','Schedule saved','Next · Tomorrow, 6:30 AM',[
hero('check','ALL SET','06:30 AM','North beds · Every day · 20 min'),btn('View schedules','schedulesUpdated','calendar')
],null,'home'),
screen('schedulesUpdated','06 Scheduling','Schedules','2 active schedules',[
row('calendar','Morning watering','Every day · 6:00 AM','scheduleDetail','green','On'),row('calendar','North beds · 6:30 AM','Every day · 20 min','scheduleDetailNew','green','On'),btn('New schedule','scheduleNew','plus')
],'home','home'),
screen('scheduleDetail','06 Scheduling','Morning watering','Next · Tomorrow, 6:00 AM',[
hero('calendar','SCHEDULE ON','06:00 AM','Every day · North beds · 20 min'),row('flow','Safe run order','Valve → Motor → Safe stop','sequence'),btn('Pause schedule','schedulePaused','pause','outline'),btn('Edit time','scheduleTimingAlt','edit','outline')
],'schedules','home'),
screen('scheduleDetailNew','06 Scheduling','North beds · 6:30 AM','Next · Tomorrow, 6:30 AM',[
hero('calendar','SCHEDULE ON','06:30 AM','Every day · North beds · 20 min'),btn('Pause schedule','schedulePausedNew','pause','outline'),btn('Back to schedules','schedulesUpdated','back')
],'schedulesUpdated','home'),
screen('schedulePaused','06 Scheduling','Schedule paused','Morning watering',[
hero('pause','NO AUTOMATIC RUNS','Paused','6:00 AM · Daily','amber'),btn('Resume schedule','scheduleDetail','play'),btn('Delete schedule','scheduleDelete','trash','red')
],'schedulesPaused','home'),
screen('schedulesPaused','06 Scheduling','Schedules','Morning watering is paused.',[
row('pause','Morning watering','Every day · 6:00 AM','schedulePaused','amber','Off'),btn('New schedule','scheduleNew','plus')
],'home','home'),
screen('schedulePausedNew','06 Scheduling','Schedule paused','North beds · 6:30 AM',[
hero('pause','NO AUTOMATIC RUNS','Paused','6:30 AM · Daily','amber'),btn('Resume schedule','scheduleDetailNew','play'),btn('View schedules','schedulesNewPaused','calendar','outline')
],'schedulesNewPaused','home'),
screen('schedulesNewPaused','06 Scheduling','Schedules','1 active · 1 paused',[
row('calendar','Morning watering','Every day · 6:00 AM','scheduleDetail','green','On'),row('pause','North beds · 6:30 AM','Every day · 20 min','schedulePausedNew','amber','Off'),btn('New schedule','scheduleNew','plus')
],'home','home'),
screen('scheduleDelete','06 Scheduling','Delete schedule?','Morning watering · 6:00 AM',[
note('calendar','Future runs will be removed','Your water path stays saved.','amber'),btn('Delete schedule','schedulesEmpty','trash','red'),btn('Keep schedule','schedulePaused','back','outline')
],'schedulePaused','home'),
screen('schedulesEmpty','06 Scheduling','No schedules yet','Choose when your field gets watered.',[
hero('calendar','AUTOMATE YOUR WATERING','Pick a time','Safe start and stop included'),btn('New schedule','scheduleNew','plus')
],'home','home'),
screen('alerts','07 Alerts','Field alerts','1 needs your attention',[
row('alert','Valve B did not open','Motor kept off · 5 min ago','alertDetail','amber'),row('offline','Tank controller offline','Last seen 2h ago','offline','amber'),row('check','Watering finished','North beds · 6:20 AM','complete'),btn('Past alerts & runs','history','clock','outline')
],'home','alerts'),
screen('alertDetail','07 Alerts','Check Valve B','North Field · 5 minutes ago',[
hero('valve','OPEN NOT CONFIRMED','Motor kept off','Valve B needs a position check','amber'),steps([['power','Check valve power','At the controller'],['valve','Check the valve','Look for blockage'],['wifi','Check the sensor','Confirm position feedback']]),btn('Mark as seen','alertSeen','check','amber'),btn('Back to controls','manual','back','outline')
],'alerts','alerts'),
screen('alertSeen','07 Alerts','Alert marked as seen','Valve B still needs a check.',[
hero('check','ACKNOWLEDGED','You’ve seen it','Acknowledging does not clear the fault','amber'),btn('View alerts','alertsSeen','bell'),btn('Check valve','valveBDetail','valve','outline')
],'alertsSeen','alerts'),
screen('alertsSeen','07 Alerts','Field alerts','Valve B · Seen, still unresolved',[
row('alert','Valve B did not open','Seen by you · Needs a check','alertDetail','amber'),row('offline','Tank controller offline','Last seen 2h ago','offline','amber'),btn('Past alerts & runs','history','clock','outline')
],'home','alerts'),
screen('stopAlert','07 Alerts','Motor stop unconfirmed','Treat the motor as running.',[
hero('alert','URGENT · CHECK ON SITE','State unknown','Valve A is held open','red'),note('stop','Use the local stop','Verify the motor is off before closing the valve.','red'),btn('Retry safe stop','stopping','stop','red')
],'stopUnknown','alerts'),
screen('history','07 Alerts','Past watering','Today · North Field',[
row('check','North beds · Finished','6:00–6:20 AM · 420 L','complete'),row('alert','Valve B · Start blocked','5:40 AM · No water run','alertDetail','amber'),row('chart','Water use today','420 L · 1.2 kWh','readings')
],'alerts','alerts')
];
// Keep the 10-minute branch consistent through cancellation and completion.
SCREENS.find(s=>s.id==='running10').items.find(i=>i.type==='button').to='stopConfirm10';
SCREENS.push(screen('stopConfirm10','03 Safe controls','Stop watering?','North beds · 10-minute run',[
steps([['stop','Stop Motor 01','Wait for motor feedback'],['valve','Close Valve A','Only after motor is off']]),btn('Stop safely','stopping10','stop','red'),btn('Keep watering','running10','back','outline')
],'running10',null));
SCREENS.push(screen('stopping10','03 Safe controls','Stopping motor','Valve A stays open.',[
hero('motor','STOP REQUEST SENT','Waiting…','Motor-off feedback needed','amber'),note('valve','Valve A is held open')
],null,null));
SCREENS.push(screen('closing10','03 Safe controls','Closing valve','Motor 01 is confirmed off.',[
hero('valve','MOTOR OFF','Closing Valve A','Waiting for valve feedback')
],null,null));
SCREENS.push(screen('complete10','03 Safe controls','Watering stopped','North beds · Stopped early',[
hero('check','SAFE STOP CONFIRMED','All off','Motor off · Valve A closed'),note('clock','10-minute plan ended early'),btn('Back home','home','home'),btn('Water again','manual10','drop','outline')
],null,'home'));
// Running screens keep stop controls visible and do not jump to an idle dashboard.
for(const id of ['manual','manual10','running','running10','closeBlocked','stopUnknown','stopAlert'])SCREENS.find(s=>s.id===id).nav=null;
SCREENS.push(screen('completeStopped','03 Safe controls','Watering stopped','North beds · Stopped early',[
hero('check','SAFE STOP CONFIRMED','All off','Motor off · Valve A closed'),note('clock','20-minute plan ended early'),btn('Back home','home','home'),btn('Water again','manual','drop','outline')
],null,'home'));
const TIMED={opening:['starting',2.2],starting:['running',2.2],stopping:['closing',3],closing:['completeStopped',2],stopping10:['closing10',2.2],closing10:['complete10',2.2],valveOpening:['valveOpen',2.2],valveClosing:['valveDetail',2.2]};
const FLOWS=[['welcome','01 · Welcome to watering'],['devices','02 · Add controller & components'],['manual','03 · Safe motor + valve control'],['pathEmpty','04 · Build directional water path'],['sequence','05 · Build activation order'],['schedules','06 · Schedule & resolve overlap'],['alerts','07 · Alerts & recovery']];
if(typeof module!=='undefined')module.exports={THEME,ICONS,svgIcon,SCREENS,TIMED,FLOWS};
