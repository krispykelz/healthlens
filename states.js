/* HealthLens — interactive state explorer. Needs state-data.js loaded first and <div id="states-root"></div> in the page. */
(function(){
const D=window.HL_STATE_DATA, root=document.getElementById('states-root'); if(!D||!root)return;
const names=Object.keys(D.states).sort(), fmt=n=>n==null?'—':Math.round(n).toLocaleString('en-US');
const YRS=D.years,LAST=YRS[YRS.length-1],get=(n,y,k)=>{const m=D.states[n].y[y][k];return m&&m[0]!=null?m:null};
const NAT={},RANK={},NR={};YRS.forEach(y=>{NAT[y]={};RANK[y]={};NR[y]={};['inc','mort'].forEach(k=>{const ok=names.filter(n=>get(n,y,k)),w=ok.reduce((a,n)=>a+get(n,y,k)[4],0);
 NAT[y][k]=+(ok.reduce((a,n)=>a+get(n,y,k)[0]*get(n,y,k)[4],0)/w).toFixed(1);NR[y][k]=ok.length;RANK[y][k]={};ok.sort((a,b)=>get(b,y,k)[0]-get(a,y,k)[0]).forEach((n,i)=>RANK[y][k][n]=i+1)})});
let cur=names.includes('Texas')?'Texas':names[0], rankMode='inc', yr=LAST;
root.innerHTML=`<section class="section state-explorer" id="states"><div class="shell">
<div class="section-head"><div><div class="kicker">03 / EXPLORE BY STATE</div><h2>Choose a state. See its numbers.</h2></div>
<p class="section-desc">Age-adjusted cancer rates and case counts for all 50 states, ${YRS[0]}–${LAST}, from the CDC U.S. Cancer Statistics dataset. Pick a year to see how the picture has changed.</p></div>
<div class="hl-layout"><div class="panel"><h3>U.S. state selector</h3><p class="sub">Tap a state to update the numbers. This is a selector grid, not a geographic map.</p><div class="field" style="margin-top:0"><label for="hlYear">DATA YEAR</label><select id="hlYear">${[...YRS].reverse().map(y=>`<option value="${y}">${y}${y===LAST?' · latest':''}</option>`).join('')}</select></div><div class="state-grid" id="stateGrid" aria-label="Choose a U.S. state"></div></div>
<div class="state-detail" id="sd" aria-live="polite"></div></div>
<div class="panel rank-panel"><div class="rank-head"><div><h3>How does every state compare?</h3><p class="sub" style="margin:0">Age-adjusted rate per 100,000 people, <span id="rankYear"></span>. Rank 1 = highest rate. Select a row to jump to that state.</p></div>
<div class="toggle-row" id="rankToggle"><button class="toggle active" data-r="inc" aria-pressed="true">New cases</button><button class="toggle" data-r="mort" aria-pressed="false">Deaths</button></div></div>
<div class="rank-list" id="rankList"></div>
<p class="resource-note" style="margin-bottom:0">Higher or lower does not mean one state is “better.” Incidence can reflect screening and case-finding as well as risk; mortality reflects both how often cancer occurs and how often it is fatal. Source: <a href="https://www.cdc.gov/united-states-cancer-statistics/" target="_blank" rel="noopener">CDC U.S. Cancer Statistics</a>, all races, both sexes. The 50-state average is population-weighted and may differ slightly from official national rates.</p></div>
</div></section>`;
const grid=document.getElementById('stateGrid'),sd=document.getElementById('sd'),list=document.getElementById('rankList');
names.forEach(n=>{const b=document.createElement('button');b.type='button';b.className='state-tile';b.dataset.s=n;b.textContent=D.states[n].ab;b.title=n;b.setAttribute('aria-label',n);b.addEventListener('click',()=>pick(n));grid.appendChild(b);});
function trend(s){const W=460,H=170,pl=34,pr=8,pt=10,pb=22,Y=YRS,all=[...s.trend.inc,...s.trend.mort].filter(v=>v!=null),max=Math.ceil(Math.max(...all)/100)*100;
 const x=i=>pl+i*(W-pl-pr)/(Y.length-1),y=v=>pt+(1-v/max)*(H-pt-pb);
 const path=a=>{let d='',pen=false;a.forEach((v,i)=>{if(v==null){pen=false;return}d+=(pen?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1);pen=true});return d};
 let g='';for(let t=0;t<=max;t+=100)g+=`<path class="tl-grid" d="M${pl} ${y(t)}H${W-pr}"/><text class="tl-t" x="${pl-6}" y="${y(t)+3}" text-anchor="end">${t}</text>`;
 [0,6,11,16,Y.length-1].forEach(i=>g+=`<text class="tl-t" x="${x(i)}" y="${H-5}" text-anchor="${i===Y.length-1?'end':'middle'}">${Y[i]}</text>`);
 const yi=Y.indexOf(yr),dot=(a,c)=>a[yi]==null?'':`<circle cx="${x(yi)}" cy="${y(a[yi])}" r="4.5" fill="${c}" stroke="#fff" stroke-width="2"/>`;
 return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Line chart of age-adjusted cancer incidence and mortality rates, ${Y[0]} to ${LAST}; ${yr} highlighted">${g}<path class="tl-grid" style="stroke-dasharray:3 3" d="M${x(yi)} ${pt}V${H-pb}"/><path class="tl-inc" d="${path(s.trend.inc)}"/><path class="tl-mort" d="${path(s.trend.mort)}"/>${dot(s.trend.inc,'#2F7D68')}${dot(s.trend.mort,'#E98970')}</svg>`;}
function delta(v,nat,cls){if(v==null)return'';const d=v-nat;return`<div class="delta ${cls}">${d>=0?'▲':'▼'} ${Math.abs(d).toFixed(1)} ${d>=0?'above':'below'} 50-state avg (${nat})</div>`;}
function metric(label,k,cls){const m=get(cur,yr,k);if(!m)return`<div class="hl-metric"><small>${label}</small><strong>—</strong><div class="unit">Not available</div></div>`;
 return`<div class="hl-metric"><small>${label}</small><strong>${m[0].toFixed(1)}</strong><div class="unit">per 100,000 · age-adjusted</div>${delta(m[0],NAT[yr][k],cls)}<div class="counts">95% CI ${m[1]}–${m[2]}<br>${fmt(m[3])} ${k==='inc'?'new cases':'deaths'} in ${yr}</div></div>`;}
function renderDetail(){const s=D.states[cur],sites=D.sites.map((l,i)=>[l,...s.y[yr].s[i]]).filter(r=>r[1]!=null).sort((a,b)=>b[1]-a[1]).slice(0,6),top=sites[0]?sites[0][1]:1,rk=k=>RANK[yr][k][cur]?`${RANK[yr][k][cur]} of ${NR[yr][k]}`:'n/a';
 sd.innerHTML=`<div class="sd-top"><div><div class="kicker">SELECTED STATE · ${yr}</div><h3>${cur}</h3></div><div class="chips"><span class="chip">New cases rank ${rk('inc')}</span><span class="chip">Deaths rank ${rk('mort')}</span></div></div>
 <div class="hl-metrics">${metric('NEW CASES · ALL CANCERS','inc','')}${metric('DEATHS · ALL CANCERS','mort','mort')}</div>
 <div class="sd-block trend"><h4>Trend since ${YRS[0]}</h4>${trend(s)}<div class="tl-key"><span><i style="background:#2F7D68"></i>New cases</span><span><i style="background:#E98970"></i>Deaths</span><span>Rate per 100,000</span></div><p class="cap">Death rates have fallen steadily in most states. The dashed line marks ${yr}. The 2020 dip in new cases reflects pandemic-era disruptions to screening and diagnosis, not a real drop in cancer.</p></div>
 <div class="sd-block"><h4>Most commonly diagnosed cancers in ${cur}, ${yr}</h4><div class="sd-bars">${sites.map(r=>`<div class="bar-row" title="${r[0]}: ${fmt(r[1])} new cases, ${fmt(r[2])} deaths"><div class="bar-name">${r[0]}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(r[1]/top*100,2)}%"></div></div><div class="bar-value">${fmt(r[1])}</div></div>`).join('')}</div><p class="cap">New cases diagnosed in ${yr} (counts, not rates). Breast = female, prostate = male; other sites cover both sexes. Counts partly reflect state population size.</p></div>
 <div class="state-data-note" style="margin-top:20px"><strong>Read with care</strong><br>These are population-level statistics, not personal risk. Rates are age-adjusted so states with older populations aren’t unfairly compared.</div>
 <a class="btn" href="https://www.cdc.gov/united-states-cancer-statistics/dataviz/index.html" target="_blank" rel="noopener">Explore more ${cur} data at CDC ↗</a>`;}
function renderRank(){const k=rankMode,V=n=>get(n,yr,k)[0],rows=names.filter(n=>get(n,yr,k)).sort((a,b)=>V(b)-V(a)),max=V(rows[0]);document.getElementById('rankYear').textContent=yr;
 list.className='rank-list'+(k==='mort'?' mort':'');
 list.innerHTML=rows.map((n,i)=>`<button type="button" class="rk-row${n===cur?' active':''}" data-s="${n}"><span class="rk-n">${i+1}</span><span class="rk-name">${n}</span><span class="bar-track"><span class="bar-fill" style="display:block;width:${V(n)/max*100}%"></span></span><span class="rk-v">${V(n).toFixed(1)}</span></button>`).join('');
 const a=list.querySelector('.active');if(a)list.scrollTop=Math.max(0,a.offsetTop-list.offsetTop-90);}
function pick(n){cur=n;grid.querySelectorAll('.state-tile').forEach(b=>{const on=b.dataset.s===n;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});renderDetail();renderRank();}
list.addEventListener('click',e=>{const b=e.target.closest('.rk-row');if(b)pick(b.dataset.s)});
document.getElementById('rankToggle').addEventListener('click',e=>{const b=e.target.closest('button[data-r]');if(!b)return;rankMode=b.dataset.r;document.querySelectorAll('#rankToggle button').forEach(x=>{const on=x===b;x.classList.toggle('active',on);x.setAttribute('aria-pressed',String(on))});renderRank();});
document.getElementById('hlYear').addEventListener('change',e=>{yr=+e.target.value;renderDetail();renderRank();});
pick(cur);
})();
