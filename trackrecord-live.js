/* BetLife365 — live public track record.
   Replaces the static showcase values inside #track with the REAL ledger.
   Defaults to the operator-approved "featured" slice (featured.json), ALWAYS
   shows the honest All-time total alongside, and lets visitors browse by type
   + timeline. Additive & defensive: only touches #track, never the rest of the
   page. Reads the master + featured config from the vip-dashboard repo (CORS-ok
   raw GitHub). */
(function(){
  var MASTER='https://raw.githubusercontent.com/FredBull070/vip-dashboard/main/trackrecord.json';
  var FEAT='https://raw.githubusercontent.com/FredBull070/vip-dashboard/main/featured.json';
  var TYPES=[['card','Daily Cards'],['prop','Daily Props'],['parley','Parleys'],['all','All']];
  var PERIODS=[['today','Daily'],['week','Weekly'],['month','Monthly'],['quarter','Quarterly'],['year','Yearly'],['all','All-time']];
  var SPAN={today:1,week:7,month:31,quarter:92,year:366,all:1e9};
  var PLAB={today:'today',week:'this week',month:'this month',quarter:'this quarter',year:'this year',all:'all-time'};
  var TLAB={card:'Daily Cards',prop:'Daily Props',parley:'Parleys',all:'All'};
  var rows=[], state={type:'parley',period:'week'};

  function num(x){var n=parseFloat(x);return isNaN(n)?0:n;}
  function isLucky(r){return r&&r.kind!=='parley'&&!r.prop&&(r.risk||'').toLowerCase()==='very high';}
  function typeOf(r){return r.kind==='parley'?'parley':(r.prop?'prop':'card');}
  function ep(d){var p=(d||'').split('-');return p.length===3?new Date(+p[2],+p[1]-1,+p[0]).getTime():0;}
  function inPeriod(r,per){ if(per==='all')return true; var t=ep(r.date),now=Date.now(),day=864e5; return t>=now-SPAN[per]*day && t<=now+day; }
  function slice(type,per){
    return rows.filter(function(r){ return r.public!==false && !isLucky(r); })
      .filter(function(r){ return type==='all'?true:typeOf(r)===type; })
      .filter(function(r){ return inPeriod(r,per); });
  }
  function stats(list){
    var staked=0,profit=0,w=0,l=0,oddsum=0,decided=0,peak=0,dd=0,series=[],dates=[],items=[];
    list.filter(function(r){return r.result==='W'||r.result==='L';})
      .sort(function(a,b){var da=ep(a.date),db=ep(b.date);return da-db||(a.id||0)-(b.id||0);})
      .forEach(function(r){
        var s=num(r.stake),o=num(r.odds); staked+=s; oddsum+=o; decided++;
        var pl=r.result==='W'? s*(o-1):-s;
        if(r.result==='W'){profit+=pl;w++;} else {profit-=s;l++;}
        peak=Math.max(peak,profit); dd=Math.min(dd,profit-peak); series.push(profit); dates.push(ep(r.date));
        items.push({date:ep(r.date), pl:pl, result:r.result, match:(r.match||r.selection||'').replace(/\*\*/g,'').replace(/[\u{1F300}-\u{1FAFF}]/gu,'').trim()});
      });
    var n=w+l;
    return {profit:profit, roi:staked?100*profit/staked:0, strike:n?100*w/n:0, avg:decided?oddsum/decided:0, bets:n, dd:dd, series:series, dates:dates, items:items};
  }
  var MND=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function fmtD(e){ var d=new Date(e); return d.getDate()+' '+MND[d.getMonth()]; }
  function u(x){return (x>=0?'+':'')+(Math.round(x*10)/10).toFixed(1)+'u';}
  function pct(x){return (x>=0?'+':'')+(Math.round(x*10)/10).toFixed(1)+'%';}

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function bars(svg, items){
    if(!svg) return;
    var host=svg.parentNode; if(host) host.style.position='relative';
    var tip=host && host.querySelector('.bl-tip');
    if(host && !tip){ tip=document.createElement('div'); tip.className='bl-tip';
      tip.style.cssText='position:absolute;pointer-events:none;opacity:0;transition:opacity .12s ease;background:#0e0f13;border:1px solid #2a2e37;border-radius:8px;padding:7px 11px;font:500 12px/1.35 system-ui,-apple-system,sans-serif;color:#e9eaee;z-index:6;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,.45)';
      host.appendChild(tip);
    }
    var W=560,H=240,pad=14,mid=H/2;
    if(!items || !items.length){ svg.innerHTML=''; return; }
    var mx=Math.max.apply(null, items.map(function(it){return Math.abs(it.pl);}))||1;
    var n=items.length, slot=(W-2*pad)/n, bw=Math.min(30, Math.max(5, slot*0.6));
    var r='';
    items.forEach(function(it,i){
      var cx=pad+slot*(i+0.5);
      var bh=Math.max(8, Math.abs(it.pl)/mx*(H/2-pad-6));
      var y=it.pl>=0? mid-bh: mid;
      r+='<rect data-i="'+i+'" x="'+(cx-bw/2).toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="2.5" fill="'+(it.pl>=0?'#35c66b':'#f0782a')+'"/>';
    });
    svg.innerHTML='<line x1="'+pad+'" y1="'+mid+'" x2="'+(W-pad)+'" y2="'+mid+'" stroke="#262a31" stroke-width="1"/>'+r;
    svg.onmousemove=function(e){
      var t=e.target; if(!tip || !t || t.tagName!=='rect'){ if(tip)tip.style.opacity='0'; return; }
      var it=items[+t.getAttribute('data-i')]; if(!it) return;
      var rb=t.getBoundingClientRect(), hb=host.getBoundingClientRect(), col=it.pl>=0?'#35c66b':'#f0782a';
      tip.innerHTML='<span style="color:#9aa0ab">'+fmtD(it.date)+'</span> &nbsp;<b style="color:'+col+'">'+u(it.pl)+'</b>'+(it.match?'<div style="color:#9aa0ab;font-size:11px;margin-top:3px;max-width:230px;overflow:hidden;text-overflow:ellipsis">'+esc(it.match)+'</div>':'');
      tip.style.left=(rb.left-hb.left+rb.width/2)+'px';
      if(it.pl>=0){ tip.style.top=(rb.top-hb.top)+'px'; tip.style.transform='translate(-50%,-112%)'; }
      else { tip.style.top=(rb.bottom-hb.top)+'px'; tip.style.transform='translate(-50%,12%)'; }
      tip.style.opacity='1';
    };
    svg.onmouseleave=function(){ if(tip)tip.style.opacity='0'; };
  }
  function setV(el,txt,sign){ if(!el)return; el.textContent=txt; if(sign!=null){ el.classList.remove('up','down'); el.classList.add(sign>=0?'up':'down'); } }

  function injectStyle(){
    if(document.getElementById('blLiveCSS')) return;
    var s=document.createElement('style'); s.id='blLiveCSS';
    s.textContent=[
      '#bl-ctrls{display:flex;flex-direction:column;gap:8px;margin:0 0 14px}',
      '#bl-ctrls .row{display:flex;gap:6px;flex-wrap:wrap}',
      '#bl-ctrls button{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);color:#c9cdd6;font:600 12px/1 inherit;padding:8px 13px;border-radius:999px;cursor:pointer;transition:.15s}',
      '#bl-ctrls button:hover{border-color:rgba(255,255,255,.25)}',
      '#bl-ctrls button.on{background:var(--accent,#f0782a);border-color:var(--accent,#f0782a);color:#1a1206}',
      '#bl-total{font-size:12.5px;color:#9aa0ab;margin-top:6px}#bl-total b{color:#e9eaee}',
      '.trk-badges{justify-content:center !important}',
      '.bl-live-badge{background:rgba(53,198,107,.12)!important;border-color:rgba(53,198,107,.5)!important;color:#35c66b!important}',
      '.bl-live-badge .lv{background:#35c66b!important;border-radius:50%;animation:blBreathe 2.2s ease-in-out infinite}',
      '@keyframes blBreathe{0%,100%{box-shadow:0 0 0 0 rgba(53,198,107,.55)}50%{box-shadow:0 0 0 7px rgba(53,198,107,0)}}'
    ].join('');
    document.head.appendChild(s);
  }
  function ctrlsHTML(){
    function btns(arr,key){ return arr.map(function(o){ return '<button data-'+key+'="'+o[0]+'">'+o[1]+'</button>'; }).join(''); }
    return '<div class="row">'+btns(TYPES,'type')+'</div><div class="row">'+btns(PERIODS,'period')+'</div>';
  }
  function ensureControls(sec){
    // Controls hidden for now: the public site stays fixed on the approved slice.
    var ex=document.getElementById('bl-ctrls'); if(ex) ex.remove();
    var bt=document.getElementById('bl-total'); if(bt) bt.remove();
    restyleBadges(sec);
  }
  function restyleBadges(sec){
    var wrap=sec.querySelector('.trk-badges'); if(!wrap) return;
    [].slice.call(wrap.querySelectorAll('.trk-badge')).forEach(function(b){
      var t=(b.textContent||'').toLowerCase();
      if(t.indexOf('updated daily')>=0){ b.classList.add('bl-live-badge'); b.style.display=''; }
      else { b.style.display='none'; }
    });
  }
  function updateActive(){
    var c=document.getElementById('bl-ctrls'); if(!c)return;
    [].forEach.call(c.querySelectorAll('button'),function(b){
      var on=(b.getAttribute('data-type')===state.type)||(b.getAttribute('data-period')===state.period);
      b.classList.toggle('on',on);
    });
  }
  function panel(re){ var sec=document.getElementById('track'); if(!sec)return null; return [].slice.call(sec.querySelectorAll('.tbox')).filter(function(b){return re.test(b.textContent||'');})[0]||null; }
  function renderSports(list){
    var box=panel(/Profit by sport/i); if(!box)return;
    var by={}; list.filter(function(r){return r.result==='W'||r.result==='L';}).forEach(function(r){ var sp=r.sport||'Other'; by[sp]=(by[sp]||0)+(r.result==='W'?num(r.stake)*(num(r.odds)-1):-num(r.stake)); });
    var arr=Object.keys(by).map(function(k){return [k,by[k]];}).sort(function(a,b){return b[1]-a[1];});
    var max=1; arr.forEach(function(x){max=Math.max(max,Math.abs(x[1]));});
    var rows=[].slice.call(box.querySelectorAll('.sportbar'));
    rows.forEach(function(row,i){
      if(i<arr.length){ row.style.display=''; var sn=row.querySelector('.sn'),sv=row.querySelector('.sv'),fill=row.querySelector('.st i')||row.querySelector('.st > *');
        if(sn)sn.textContent=arr[i][0]; if(sv){sv.textContent=u(arr[i][1]); sv.style.color=arr[i][1]>=0?'#35c66b':'#f0782a';}
        if(fill){ fill.style.width=Math.max(5,Math.round(Math.abs(arr[i][1])/max*100))+'%'; fill.style.background='var(--accent,#f0782a)'; }
      } else { row.style.display='none'; }
    });
  }
  function renderRecent(list){
    var box=panel(/Recent results/i); if(!box)return;
    var dec=list.filter(function(r){return r.result==='W'||r.result==='L';}).sort(function(a,b){var da=ep(a.date),db=ep(b.date);return db-da||(b.id||0)-(a.id||0);});
    var rows=[].slice.call(box.querySelectorAll('.fr2'));
    rows.forEach(function(row,i){
      if(i<dec.length){ var r=dec[i]; row.style.display=''; row.className='fr2 '+(r.result==='W'?'w':'l');
        var fm=row.querySelector('.fm'),fr=row.querySelector('.fr'),fu=row.querySelector('.fu');
        if(fm)fm.textContent=(r.match||r.selection||'').replace(/\*\*/g,'').replace(/[\u{1F300}-\u{1FAFF}]/gu,'').trim();
        if(fr)fr.textContent=r.result;
        if(fu)fu.textContent=u(r.result==='W'?num(r.stake)*(num(r.odds)-1):-num(r.stake));
      } else { row.style.display='none'; }
    });
  }
  function render(){
    var sec=document.getElementById('track'); if(!sec)return;
    injectStyle(); ensureControls(sec);
    var list=slice(state.type,state.period);
    var s=stats(list);
    var tot=stats(slice('all','all'));
    var bigVal=u(s.profit), bigCol=s.profit>=0?'#35c66b':'#f0782a';
    var big=sec.querySelector('.big'); if(big){ big.textContent=bigVal; big.setAttribute('data-count',(Math.round(s.profit*10)/10).toFixed(1)); big.style.setProperty('color', bigCol, 'important'); }
    // re-assert after any count-up animation so it never settles on a stale value
    [700,1600,2900].forEach(function(ms){ setTimeout(function(){ var b=document.querySelector('#track .big'); if(b){ b.textContent=bigVal; b.style.setProperty('color', bigCol, 'important'); } }, ms); });
    var ptr=sec.querySelector('.pt-r'); if(ptr) ptr.textContent=TLAB[state.type]+' · '+PLAB[state.period];
    var mk=sec.querySelectorAll('.mini-kpis .mk .v');
    if(mk[0]) mk[0].textContent=pct(s.roi);
    if(mk[1]) mk[1].textContent=Math.round(s.strike)+'%';
    if(mk[2]) mk[2].textContent=s.avg.toFixed(2);
    if(mk[3]) mk[3].textContent=String(s.bets);
    var kc=sec.querySelectorAll('.kstrip .k .v');
    setV(kc[0],u(s.profit),s.profit);
    setV(kc[1],pct(s.roi),s.roi);
    if(kc[2]) kc[2].textContent=Math.round(s.strike)+'%';
    if(kc[3]) kc[3].textContent=String(s.bets);
    if(kc[4]) kc[4].textContent=s.avg.toFixed(2);
    setV(kc[5],u(s.dd),s.dd);
    bars(sec.querySelector('svg'), s.items);
    var cap=sec.querySelector('.cap'); if(cap) cap.textContent='Profit/loss per bet, in units · green won, orange lost · hover for details.';
    var axis=sec.querySelector('.axis');
    if(axis){ var sp=axis.querySelectorAll('span'), ds=s.dates||[];
      for(var i=0;i<sp.length;i++){ if(ds.length>=2 && sp.length>1){ var idx=Math.round(i*(ds.length-1)/(sp.length-1)); sp[i].textContent=fmtD(ds[idx]); } else { sp[i].textContent=''; } }
    }
    renderSports(list); renderRecent(list);
    updateActive();
  }

  function boot(){
    fetch(FEAT+'?t='+Date.now()).then(function(r){return r.ok?r.json():null;}).then(function(f){
      if(f&&f.type){ state.type=f.type; state.period=f.period||'week'; }
    }).catch(function(){}).then(function(){
      return fetch(MASTER+'?t='+Date.now()).then(function(r){return r.ok?r.json():[];});
    }).then(function(d){ rows=Array.isArray(d)?d:[]; render(); }).catch(function(){});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){ setTimeout(boot,300); }); else setTimeout(boot,300);
})();
