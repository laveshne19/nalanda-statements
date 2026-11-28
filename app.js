/* Nalanda Enterprises - collection & statements app (static PWA). Data file is AES-GCM encrypted; the passcode never leaves the phone. */
(function(){
'use strict';
var APP=document.getElementById('app'), S={d:null,tab:'home',pid:null,q:'',spf:'',minAge:0,from:'',to:'',type:'',sq:'',sort:'out',slug:''};
var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function inr(n){n=Math.round(n||0);var neg=n<0;n=Math.abs(n);var s=String(n),l=s.slice(-3),r=s.slice(0,-3);if(r)l=r.replace(/\B(?=(\d{2})+(?!\d))/g,',')+','+l;return(neg?'-':'')+'\u20B9'+l;}
function lk(n){n=n||0;if(Math.abs(n)>=1e7)return'\u20B9'+(n/1e7).toFixed(2)+' Cr';if(Math.abs(n)>=1e5)return'\u20B9'+(n/1e5).toFixed(2)+' L';return inr(n);}
function dstr(i){i=String(i);return i.slice(6,8)+'-'+MON[+i.slice(4,6)-1]+'-'+i.slice(2,4);}
function iso(d){return String(d).replace(/-/g,'');}
function dd(s){if(!s)return'';return s.slice(8,10)+'-'+MON[+s.slice(5,7)-1]+'-'+s.slice(2,4);}
function b64(s){var b=atob(s),a=new Uint8Array(b.length);for(var i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a;}
function ageCls(a){return a>60?3:a>45?2:a>30?1:0;}
function ageBadge(a){return a==null?'<span class="sub">-</span>':'<span class="badge a'+ageCls(a)+'">'+a+' days</span>';}
function slug(){var p=location.pathname.replace(/index\.html$/,'').replace(/\/+$/,'').split('/');return p[p.length-1]||'x';}

/* ------------------------------------------------------------- unlock */
async function decrypt(blob,pass){
  var enc=new TextEncoder(),km=await crypto.subtle.importKey('raw',enc.encode(pass),'PBKDF2',false,['deriveKey']);
  var key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(blob.salt),iterations:blob.iter,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt']);
  var pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(blob.iv)},key,b64(blob.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}
function loginView(msg){
  APP.innerHTML='<div class="login"><h2 style="margin:0 0 4px">Nalanda Enterprises</h2><div class="sub">Enter your access code</div><input id="pw" type="password" placeholder="Access code" autocomplete="current-password"><button class="btn" id="go" style="width:100%">Open</button><div class="err">'+esc(msg||'')+'</div></div>';
  document.getElementById('go').onclick=function(){boot(document.getElementById('pw').value.trim());};
  document.getElementById('pw').onkeydown=function(e){if(e.key==='Enter')boot(this.value.trim());};
}
async function boot(pass){
  S.slug=slug(); var k='ne_k_'+S.slug;
  var m=/[#&]k=([^&]+)/.exec(location.hash); if(m){pass=decodeURIComponent(m[1]);try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}}
  if(!pass)pass=localStorage.getItem(k);
  if(!pass){loginView();return;}
  APP.innerHTML='<div class="boot">Loading latest data...</div>';
  try{
    var r=await fetch('data.enc?t='+Date.now(),{cache:'no-store'}); if(!r.ok)throw new Error('net');
    var blob=await r.json(); S.d=await decrypt(blob,pass); localStorage.setItem(k,pass);
  }catch(e){
    var cached=localStorage.getItem('ne_d_'+S.slug);
    if(e&&e.name==='OperationError'){localStorage.removeItem(k);loginView('Wrong access code.');return;}
    loginView('Could not load data. Check internet and try again.');return;
  }
  var d=S.d; S.from='20250401'; S.to=String(d.meta.maxdate);
  if(d.meta.role==='admin')S.tab='team';
  var qs=new URLSearchParams(location.search);if(qs.get('t'))S.tab=qs.get('t');if(qs.get('p')!==null&&d.parties[+qs.get('p')])S.pid=+qs.get('p');
  render();
}
/* ------------------------------------------------------------- helpers over data */
function P(){return S.d.parties;}
function byId(id){return S.d.parties[id];}
function openBills(){var out=[];P().forEach(function(p){p.bills.forEach(function(b){out.push({p:p,no:b[0],dt:b[1],orig:b[2],open:b[3],age:b[4]});});if(p.older>0)out.push({p:p,no:'Opening / older balance',dt:'',orig:p.older,open:p.older,age:null,older:true});});return out;}
function spOK(p){return!S.spf||p.sp.indexOf(S.spf)>=0;}
function over(p,days){var s=0;(p.bills||[]).forEach(function(b){if(b[4]>days)s+=b[3];});return s+(p.older>0?p.older:0);}
/* ------------------------------------------------------------- shell */
function shell(inner){
  var d=S.d,adm=d.meta.role==='admin';
  var tabs=[['home','Home'],['parties','Parties'],['overdue','Overdue'],['sales','Sales'],['inactive','Dealers'],['cash','Cash & Cheques']];
  if(adm)tabs.unshift(['team','Team']);
  APP.innerHTML='<header class="noprint"><div class="top"><div><h1>Nalanda Enterprises</h1><small>'+esc(d.meta.name)+' &middot; updated '+esc(d.meta.updated)+'</small></div><button class="rf" id="rf">Refresh</button></div><nav>'+tabs.map(function(t){return'<button data-t="'+t[0]+'" class="'+(S.tab===t[0]&&!S.pid?'on':'')+'">'+t[1]+'</button>';}).join('')+'</nav></header><main>'+inner+'</main>';
  document.getElementById('rf').onclick=function(){location.reload();};
  Array.prototype.forEach.call(document.querySelectorAll('nav button'),function(b){b.onclick=function(){S.tab=b.getAttribute('data-t');S.pid=null;window.scrollTo(0,0);render();};});
  Array.prototype.forEach.call(document.querySelectorAll('[data-pid]'),function(r){r.onclick=function(e){if(e.target.closest('a,button'))return;S.pid=+r.getAttribute('data-pid');S.sq='';S.type='';S.from='20250401';S.to=String(S.d.meta.maxdate);window.scrollTo(0,0);render();};});
}
function render(){
  if(S.pid!=null){shell(statementView(byId(S.pid)));bindStatement();return;}
  var v={home:homeView,team:teamView,parties:partiesView,overdue:overdueView,sales:salesView,inactive:inactiveView,cash:cashView}[S.tab]||homeView;
  shell(v());bindCommon();
}
function bindCommon(){
  var q=document.getElementById('q');if(q){q.oninput=function(){S.q=q.value;var pos=q.selectionStart;render();var n=document.getElementById('q');n.focus();n.setSelectionRange(pos,pos);};}
  var s=document.getElementById('spf');if(s)s.onchange=function(){S.spf=s.value;render();};
  var m=document.getElementById('minAge');if(m)m.onchange=function(){S.minAge=+m.value;render();};
  var so=document.getElementById('sort');if(so)so.onchange=function(){S.sort=so.value;render();};
}
function spSelect(){if(S.d.meta.role!=='admin')return'';var sps=(S.d.sps||[]).map(function(x){return x.name;});return'<select id="spf"><option value="">All salespeople</option>'+sps.map(function(n){return'<option '+(S.spf===n?'selected':'')+'>'+esc(n)+'</option>';}).join('')+'</select>';}
/* ------------------------------------------------------------- HOME */
function homeView(){
  var d=S.d,k=d.kpi,parts=P().filter(spOK),h='';
  var bk={'0-10':0,'11-20':0,'21-30':0,'31-45':0,'46-60':0,'60+':0,older:0};
  parts.forEach(function(p){for(var x in p.bk)if(x in bk)bk[x]+=p.bk[x]||0;if(p.older>0)bk.older+=p.older;});
  var tot=0;for(var x in bk)tot+=bk[x];tot=tot||1;
  var cp=k.ctarget?Math.min(100,100*k.coll/k.ctarget):0,pace=100*(+d.meta.today.slice(8))/d.meta.dim;
  var sp2=k.starget?Math.min(100,100*k.sales/k.starget):0;
  h+='<div class="grid"><div class="card kpi"><div class="l">Total outstanding</div><div class="v">'+lk(k.out)+'</div><div class="l">'+k.parties+' parties</div></div>'+
     '<div class="card kpi red"><div class="l">Overdue over 30 days</div><div class="v">'+lk(k.o30)+'</div><div class="l">'+lk(k.o60)+' over 60 days</div></div>'+
     '<div class="card kpi grn"><div class="l">Collected this month</div><div class="v">'+lk(k.coll)+'</div><div class="l">last month '+lk(k.coll_prev)+'</div></div>'+
     '<div class="card kpi"><div class="l">Sales this month</div><div class="v">'+lk(k.sales)+'</div><div class="l">last month '+lk(k.sales_prev)+'</div><div class="l">Orders booked: <b>'+lk(k.so||0)+'</b> ('+(k.so_n||0)+' SOs) &middot; last month '+lk(k.so_prev||0)+'</div></div></div>';
  h+='<div class="card"><h3>Collection target - '+MON[+d.meta.month.slice(5)-1]+' '+d.meta.month.slice(0,4)+'</h3><div class="big">'+lk(k.coll)+' <span class="sub">of '+lk(k.ctarget)+' ('+cp.toFixed(0)+'%)</span></div><div class="bar"><i style="width:'+cp+'%"></i><b style="left:'+pace+'%" title="expected pace"></b></div><div class="sub">Red line = expected pace for today. Still to collect: '+lk(Math.max(0,k.ctarget-k.coll))+'</div></div>';
  h+='<div class="card"><h3>Sales target</h3><div class="big">'+lk(k.sales)+' <span class="sub">of '+lk(k.starget)+' ('+sp2.toFixed(0)+'%)</span></div><div class="bar"><i style="width:'+sp2+'%"></i><b style="left:'+pace+'%"></b></div><div class="sub" style="margin-top:6px">Orders booked this month (sale orders): <b>'+lk(k.so||0)+'</b> &middot; last month '+lk(k.so_prev||0)+'</div></div>';
  var cls=['c0','c1','c2','c3','c4','c5','c6'],lab=['0-10','11-20','21-30','31-45','46-60','60+','older'],nm=['0-10 days','11-20','21-30','31-45','46-60','60+','Older/opening'];
  h+='<div class="card"><h3>Age of outstanding</h3><div class="stack">'+lab.map(function(l,i){return'<span class="'+cls[i]+'" style="width:'+(100*bk[l]/tot)+'%"></span>';}).join('')+'</div><div class="leg">'+lab.map(function(l,i){return'<span><i class="'+cls[i]+'"></i>'+nm[i]+': '+lk(bk[l])+'</span>';}).join('')+'</div></div>';
  var top=parts.map(function(p){return{p:p,o:over(p,30)};}).filter(function(x){return x.o>0;}).sort(function(a,b){return b.o-a.o;}).slice(0,12);
  h+='<div class="card"><h3>Collect first - biggest old dues</h3><div class="wrap"><table><tr><th>Party</th><th class="r">Over 30 days</th><th>Oldest</th><th></th></tr>'+top.map(function(x){return'<tr class="click" data-pid="'+x.p.id+'"><td><div class="name">'+esc(x.p.n)+'</div><div class="sub">'+esc(x.p.city)+'</div></td><td class="r">'+inr(x.o)+'</td><td>'+ageBadge(x.p.age)+'</td><td>'+(x.p.ph?'<a class="btn sm" href="tel:'+esc(x.p.ph)+'">Call</a>':'')+'</td></tr>';}).join('')+'</table></div></div>';
  if(d.tips&&d.tips.length)h+='<div class="card tips"><h3>What to do today</h3>'+d.tips.map(function(t){return'<p>'+esc(t)+'</p>';}).join('')+'</div>';
  return h;
}
/* ------------------------------------------------------------- TEAM (admin) */
function teamView(){
  var h='<div class="card"><h3>Salespeople - collection &amp; sales this month</h3><div class="wrap"><table><tr><th>Salesperson</th><th class="r">Outstanding</th><th class="r">Over 30d</th><th class="r">Collected</th><th class="r">Target</th><th class="r">%</th><th class="r">Sales</th><th class="r">Inactive</th></tr>';
  (S.d.sps||[]).forEach(function(x){var pc=x.ctarget?100*x.coll/x.ctarget:0;h+='<tr class="click" onclick="window.__sp(\''+esc(x.name).replace(/'/g,"\\'")+'\')"><td class="name">'+esc(x.name)+'</td><td class="r">'+lk(x.out)+'</td><td class="r">'+lk(x.o30)+'</td><td class="r">'+lk(x.coll)+'</td><td class="r">'+lk(x.ctarget)+'</td><td class="r"><span class="badge '+(pc>=80?'a0':pc>=40?'a1':'a2')+'">'+pc.toFixed(0)+'%</span></td><td class="r">'+lk(x.sales)+'</td><td class="r">'+x.inactive+'</td></tr>';});
  h+='</table></div><div class="sub">Shared parties are counted under every salesperson they are mapped to.</div></div>';
  h+='<div class="card tips"><h3>Summary</h3>'+(S.d.tips||[]).map(function(t){return'<p>'+esc(t)+'</p>';}).join('')+'</div>';
  return h+homeView();
}
window.__sp=function(n){S.spf=n;S.tab='home';render();};
/* ------------------------------------------------------------- PARTIES */
function partiesView(){
  var q=S.q.toLowerCase(),list=P().filter(spOK).filter(function(p){return!q||p.n.toLowerCase().indexOf(q)>=0||(p.city||'').toLowerCase().indexOf(q)>=0;});
  var f={out:function(a,b){return b.bal-a.bal;},age:function(a,b){return(b.age||0)-(a.age||0);},name:function(a,b){return a.n.localeCompare(b.n);},sale:function(a,b){return(b.ms[b.ms.length-1])-(a.ms[a.ms.length-1]);}};
  list.sort(f[S.sort]||f.out);
  var tot=list.reduce(function(s,p){return s+Math.max(0,p.bal);},0);
  var h='<div class="card"><div class="row"><input class="s" id="q" placeholder="Search party / city" value="'+esc(S.q)+'">'+spSelect()+'<select id="sort"><option value="out" '+(S.sort==='out'?'selected':'')+'>Sort: outstanding</option><option value="age" '+(S.sort==='age'?'selected':'')+'>Sort: oldest due</option><option value="name" '+(S.sort==='name'?'selected':'')+'>Sort: name</option><option value="sale" '+(S.sort==='sale'?'selected':'')+'>Sort: sales this month</option></select></div><div class="sub">'+list.length+' parties &middot; total receivable '+inr(tot)+'</div></div>';
  h+='<div class="card"><div class="wrap"><table><tr><th>Party</th><th class="r">Outstanding</th><th>Oldest due</th><th class="r">Last bill</th></tr>'+list.slice(0,400).map(function(p){return'<tr class="click" data-pid="'+p.id+'"><td><div class="name">'+esc(p.n)+'</div><div class="sub">'+esc(p.city||'')+(S.d.meta.role==='admin'?' &middot; '+esc(p.sp.join(', ')):'')+'</div></td><td class="r"><b>'+inr(p.bal)+'</b></td><td>'+(p.bal>0.5?ageBadge(p.age):'<span class="pill">clear</span>')+'</td><td class="r sub">'+(p.ls?dd(p.ls):'-')+'</td></tr>';}).join('')+'</table></div></div>';
  return h;
}
/* ------------------------------------------------------------- OVERDUE invoices */
function overdueView(){
  var q=S.q.toLowerCase(),ob=openBills().filter(function(b){return spOK(b.p)&&(!q||b.p.n.toLowerCase().indexOf(q)>=0||String(b.no).toLowerCase().indexOf(q)>=0)&&((b.age||999)>=S.minAge);});
  ob.sort(function(a,b){return(b.age==null?9999:b.age)-(a.age==null?9999:a.age);});
  var tot=ob.reduce(function(s,b){return s+b.open;},0);
  var h='<div class="card"><div class="row"><input class="s" id="q" placeholder="Search party / invoice no" value="'+esc(S.q)+'">'+spSelect()+'<select id="minAge">'+[[0,'All pending'],[10,'Over 10 days'],[30,'Over 30 days'],[45,'Over 45 days'],[60,'Over 60 days'],[90,'Over 90 days']].map(function(o){return'<option value="'+o[0]+'" '+(S.minAge===o[0]?'selected':'')+'>'+o[1]+'</option>';}).join('')+'</select></div><div class="sub">'+ob.length+' pending invoices &middot; '+inr(tot)+' &middot; days = today minus invoice date (payments clear the oldest invoice first)</div></div>';
  h+='<div class="card"><div class="wrap"><table><tr><th>Party</th><th>Invoice</th><th>Date</th><th class="r">Pending</th><th>Days</th></tr>'+ob.slice(0,600).map(function(b){return'<tr class="click o'+(b.age==null?3:ageCls(b.age))+'" data-pid="'+b.p.id+'"><td><div class="name">'+esc(b.p.n)+'</div></td><td>'+esc(b.no)+'</td><td>'+(b.dt?dd(b.dt):'')+'</td><td class="r"><b>'+inr(b.open)+'</b></td><td>'+ageBadge(b.age)+'</td></tr>';}).join('')+'</table></div>'+(ob.length>600?'<div class="sub">Showing first 600 - use search or filters.</div>':'')+'</div>';
  return h;
}
/* ------------------------------------------------------------- SALES */
function salesView(){
  var d=S.d,parts=P().filter(spOK),M=d.meta.months,i,sales=M.map(function(_,i){return parts.reduce(function(s,p){return s+p.ms[i];},0);}),coll=M.map(function(_,i){return parts.reduce(function(s,p){return s+p.mc[i];},0);});
  var mx=Math.max.apply(null,sales.concat(coll).concat([1]));
  var h='<div class="card"><div class="row">'+spSelect()+'</div><h3>Last 12 months - sales (green) &amp; collections (orange)</h3><div class="sbars">'+M.map(function(m,i){return'<div><span style="height:'+(95*sales[i]/mx)+'px"></span><span class="c" style="height:'+(95*coll[i]/mx)+'px;margin-top:2px"></span>'+MON[+m.slice(5)-1]+'</div>';}).join('')+'</div><div class="wrap"><table><tr><th>Month</th><th class="r">Sales</th><th class="r">Collected</th></tr>'+M.slice().reverse().map(function(m,j){var i=M.length-1-j;return'<tr><td>'+MON[+m.slice(5)-1]+' '+m.slice(0,4)+'</td><td class="r">'+inr(sales[i])+'</td><td class="r">'+inr(coll[i])+'</td></tr>';}).join('')+'</table></div></div>';
  var top=parts.slice().sort(function(a,b){return b.ms[11]-a.ms[11];}).filter(function(p){return p.ms[11]>0;}).slice(0,15);
  h+='<div class="card"><h3>Top dealers this month</h3><div class="wrap"><table><tr><th>Dealer</th><th class="r">This month</th><th class="r">Last month</th><th class="r">6-mo avg</th></tr>'+top.map(function(p){return'<tr class="click" data-pid="'+p.id+'"><td class="name">'+esc(p.n)+'</td><td class="r">'+inr(p.ms[11])+'</td><td class="r">'+inr(p.ms[10])+'</td><td class="r">'+inr(p.avg6)+'</td></tr>';}).join('')+'</table></div></div>';
  return h;
}
/* ------------------------------------------------------------- DEALERS: inactive / falling */
function inactiveView(){
  var d=S.d,ina=d.inactive.filter(function(x){return spOK(byId(x.id));}),dec=d.decline.filter(function(x){return spOK(byId(x.id));});
  var h='<div class="card"><div class="row">'+spSelect()+'</div><h3>Inactive dealers - no order for 45+ days ('+ina.length+')</h3><div class="wrap"><table><tr><th>Dealer</th><th class="r">Days</th><th class="r">Avg / month</th><th class="r">Outstanding</th><th></th></tr>'+ina.map(function(x){return'<tr class="click" data-pid="'+x.id+'"><td><div class="name">'+esc(x.n)+'</div><div class="sub">last bill '+dd(x.ls)+' ('+inr(x.lsa)+')</div></td><td class="r"><span class="badge '+(x.days>90?'a2':'a1')+'">'+x.days+'</span></td><td class="r">'+inr(x.avg6)+'</td><td class="r">'+inr(x.bal)+'</td><td>'+(x.ph?'<a class="btn sm" href="tel:'+esc(x.ph)+'">Call</a>':'')+'</td></tr>';}).join('')+'</table></div></div>';
  h+='<div class="card"><h3>Buying less - last 3 months vs previous 3 months ('+dec.length+')</h3><div class="wrap"><table><tr><th>Dealer</th><th class="r">Last 3 mo</th><th class="r">Previous 3 mo</th><th class="r">Change</th></tr>'+dec.map(function(x){return'<tr class="click" data-pid="'+x.id+'"><td class="name">'+esc(x.n)+'</td><td class="r">'+inr(x.l3)+'</td><td class="r">'+inr(x.p3)+'</td><td class="r"><span class="badge a2">'+x.pct+'%</span></td></tr>';}).join('')+'</table></div></div>';
  return h;
}
/* ------------------------------------------------------------- CASH & CHEQUES */
function cashView(){
  var d=S.d,cash=d.cash||[],pdc=(d.pdc||[]).filter(function(c){return true;}),adm=d.meta.role==='admin';
  var tc=cash.reduce(function(s,x){return s+x.balance;},0);
  var h='<div class="card"><h3>Cash receivables (Local Vendor sheet) - '+inr(tc)+'</h3><div class="wrap"><table><tr><th>Party</th>'+(adm?'<th>Salesperson</th>':'')+'<th class="r">Billing</th><th class="r">Received</th><th class="r">Balance</th><th>Days</th></tr>'+cash.map(function(x){return'<tr class="o'+(x.days==null?0:ageCls(x.days))+'"><td class="name">'+esc(x.party)+'</td>'+(adm?'<td>'+esc(x.sp||'')+'</td>':'')+'<td class="r">'+inr(x.billing)+'</td><td class="r">'+inr(x.received)+'</td><td class="r"><b>'+inr(x.balance)+'</b></td><td>'+ageBadge(x.days)+'</td></tr>';}).join('')+'</table></div>'+(cash.length?'':'<div class="sub">No cash balances.</div>')+'</div>';
  var tp=pdc.reduce(function(s,x){return s+x.amt;},0);
  h+='<div class="card"><h3>Post-dated cheques already booked - '+inr(tp)+'</h3><div class="wrap"><table><tr><th>Party</th><th>Cheque date</th><th>Cheque no</th><th class="r">Amount</th></tr>'+pdc.map(function(c){return'<tr><td class="name">'+esc(c.party)+'</td><td>'+dd(c.date)+'</td><td>'+esc(c.no)+'</td><td class="r">'+inr(c.amt)+'</td></tr>';}).join('')+'</table></div>'+(pdc.length?'':'<div class="sub">No post-dated cheques.</div>')+'</div>';
  return h;
}
/* ------------------------------------------------------------- STATEMENT */
function statementRows(p){
  var from=+S.from,to=+S.to,sq=S.sq.toLowerCase(),rows=[],open=p.open,i;
  for(i=0;i<p.st.length;i++){var r=p.st[i];if(r[0]<from){open=r[5];continue;}if(r[0]>to)break;
    if(S.type&&r[1]!==S.type)continue;if(sq&&(String(r[2]).toLowerCase().indexOf(sq)<0&&String(r[6]||'').toLowerCase().indexOf(sq)<0))continue;rows.push(r);}
  return{open:open,rows:rows};
}
function statementView(p){
  var d=S.d,sr=statementRows(p),types={};p.st.forEach(function(r){types[r[1]]=1;});
  var dr=0,cr=0;sr.rows.forEach(function(r){dr+=r[3];cr+=r[4];});
  var ob=p.bills.slice().sort(function(a,b){return b[4]-a[4];});
  var h='<div class="noprint row"><button class="btn o" id="back">&larr; Back</button></div>';
  h+='<div class="printhead"><h2 style="margin:0">Nalanda Enterprises</h2><div>Statement of account</div></div>';
  h+='<div class="card"><div class="name" style="font-size:18px">'+esc(p.n)+'</div><div class="sub">'+esc(p.city||'')+(p.ph?' &middot; '+esc(p.ph):'')+(d.meta.role==='admin'?' &middot; '+esc(p.sp.join(', ')):'')+'</div>'+
     '<div class="grid" style="margin-top:8px"><div class="kpi"><div class="l">Outstanding</div><div class="v">'+inr(p.bal)+'</div></div><div class="kpi red"><div class="l">Oldest pending</div><div class="v">'+(p.bal>0.5&&p.age!=null?p.age+' days':(p.older>0?'older':'-'))+'</div></div><div class="kpi"><div class="l">Pending over 30 days</div><div class="v">'+inr(over(p,30))+'</div></div><div class="kpi"><div class="l">Last payment</div><div class="v" style="font-size:16px">'+(p.lr?dd(p.lr)+'<br><span class="sub">'+inr(p.lra)+'</span>':'-')+'</div></div></div>'+
     '<div class="row noprint">'+(p.ph?'<a class="btn sm" href="tel:'+esc(p.ph)+'">Call</a>':'')+'<button class="btn sm w" id="wa">WhatsApp reminder</button><button class="btn sm" id="shr">Share</button><button class="btn sm o" id="prn">Download / Print PDF</button></div></div>';
  if(p.bal>0.5){h+='<div class="card"><h3>Pending invoices (oldest first)</h3><div class="wrap"><table><tr><th>Invoice</th><th>Date</th><th class="r">Bill amount</th><th class="r">Pending</th><th>Days overdue</th></tr>'+
     ob.map(function(b){return'<tr class="o'+ageCls(b[4])+'"><td>'+esc(b[0])+'</td><td>'+dd(b[1])+'</td><td class="r">'+inr(b[2])+'</td><td class="r"><b>'+inr(b[3])+'</b></td><td>'+ageBadge(b[4])+'</td></tr>';}).join('')+
     (p.older>0?'<tr class="o3"><td colspan="3">Opening / older balance (bills before the history window)</td><td class="r"><b>'+inr(p.older)+'</b></td><td><span class="badge a3">older</span></td></tr>':'')+'</table></div></div>';}
  h+='<div class="card"><h3>Ledger statement</h3><div class="row noprint"><label class="sub">From <input type="date" id="df" value="'+isoDate(S.from)+'" min="2025-04-01"></label><label class="sub">To <input type="date" id="dt" value="'+isoDate(S.to)+'"></label><select id="ty"><option value="">All entries</option>'+Object.keys(types).map(function(t){return'<option '+(S.type===t?'selected':'')+'>'+esc(t)+'</option>';}).join('')+'</select><input class="s" id="sq" placeholder="Search invoice / narration" value="'+esc(S.sq)+'"></div>'+
     '<div class="sub">Period '+dstr(S.from)+' to '+dstr(S.to)+' &middot; '+sr.rows.length+' entries</div><div class="wrap"><table><tr><th>Date</th><th>Type</th><th>No</th><th class="r">Debit</th><th class="r">Credit</th><th class="r">Balance</th></tr>'+
     '<tr><td colspan="5"><b>Opening balance</b></td><td class="r"><b>'+inr(sr.open)+'</b></td></tr>'+
     sr.rows.map(function(r){var pdx=r[0]>iso(S.d.meta.today)?' <span class="pill">post-dated</span>':'';return'<tr><td>'+dstr(r[0])+'</td><td>'+esc(r[1])+pdx+(r[6]?'<div class="sub">'+esc(r[6])+'</div>':'')+'</td><td>'+esc(r[2])+'</td><td class="r">'+(r[3]?inr(r[3]):'')+'</td><td class="r">'+(r[4]?inr(r[4]):'')+'</td><td class="r">'+inr(r[5])+'</td></tr>';}).join('')+
     '<tr><td colspan="3"><b>Total</b></td><td class="r"><b>'+inr(dr)+'</b></td><td class="r"><b>'+inr(cr)+'</b></td><td class="r"><b>'+inr(sr.rows.length?sr.rows[sr.rows.length-1][5]:sr.open)+'</b></td></tr></table></div><div class="sub">Debit = sale / charge, Credit = payment / credit note. Positive balance = dealer owes us. Updated '+esc(d.meta.updated)+'.</div></div>';
  return h;
}
function isoDate(s){s=String(s);return s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8);}
function waText(p){
  var t='*Nalanda Enterprises* - Statement reminder\nParty: *'+p.n+'*\nOutstanding as on '+dstr(iso(S.d.meta.today))+': *'+inr(p.bal)+'*\n';
  var ob=p.bills.slice().sort(function(a,b){return b[4]-a[4];}).slice(0,12);
  if(ob.length){t+='\nPending invoices:\n';ob.forEach(function(b){t+='- '+b[0]+' ('+dd(b[1])+'): '+inr(b[3])+' - '+b[4]+' days\n';});}
  if(p.older>0)t+='- Older/opening balance: '+inr(p.older)+'\n';
  return t+'\nKindly arrange the payment. Thank you.';
}
function bindStatement(){
  var p=byId(S.pid);
  document.getElementById('back').onclick=function(){S.pid=null;render();};
  document.getElementById('df').onchange=function(){S.from=iso(this.value)||'20250401';render();};
  document.getElementById('dt').onchange=function(){S.to=iso(this.value)||String(S.d.meta.maxdate);render();};
  document.getElementById('ty').onchange=function(){S.type=this.value;render();};
  var sq=document.getElementById('sq');sq.oninput=function(){S.sq=sq.value;var pos=sq.selectionStart;render();var n=document.getElementById('sq');n.focus();n.setSelectionRange(pos,pos);};
  document.getElementById('wa').onclick=function(){var ph=(p.ph||'').replace(/\D/g,'');if(ph.length===10)ph='91'+ph;window.open('https://wa.me/'+ph+'?text='+encodeURIComponent(waText(p)),'_blank');};
  document.getElementById('shr').onclick=function(){var t=waText(p);if(navigator.share)navigator.share({title:'Statement - '+p.n,text:t}).catch(function(){});else{navigator.clipboard&&navigator.clipboard.writeText(t);alert('Statement text copied');}};
  document.getElementById('prn').onclick=function(){window.print();};
}
window.addEventListener('hashchange',function(){if(/k=/.test(location.hash))boot();});
boot();
})();
