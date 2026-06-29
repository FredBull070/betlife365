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
    var staked=0,profit=0,w=0,l=0,oddsum=0,decided=0,peak=0,dd=0,series=[],dates=[];
    list.filter(function(r){return r.result==='W'||r.result==='L';})
      .sort(function(a,b){var da=ep(a.date),db=ep(b.date);return da-db||(a.id||0)-(b.id||0);})
      .forEach(function(r){
        var s=num(r.stake),o=num(r.odds); staked+=s; oddsum+=o; decided++;
        if(r.result==='W'){profit+=s*(o-1);w++;} else {profit-=s;l++;}
        peak=Math.max(peak,profit); dd=Math.min(dd,profit-peak); series.push(profit); dates.push(ep(r.date));
      });
    var n=w+l;
    return {profit:profit, roi:staked?100*profit/staked:0, strike:n?100*w/n:0, avg:decided?oddsum/decided:0, bets:n, dd:dd, series:series, dates:dates};
  }
  var MND=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function fmtD(e){ var d=new Date(e); return d.getDate()+' '+MND[d.getMonth()]; }
  function u(x){return (x>=0?'+':'')+(Math.round(x*10)/10).toFixed(1)+'u';}
  function pct(x){return (x>=0?'+':'')+(Math.round(x*10)/10).toFixed(1)+'%';}

  function chart(svg, series){
    if(!svg) return;
    var W=560,H=240,pad=8;
    var paths=svg.querySelectorAll('path'), circ=svg.querySelector('circle');
    if(series.length<2){ if(paths[0])paths[0].setAttribute('d',''); if(paths[1])paths[1].setAttribute('d',''); if(circ)circ.setAttribute('r','0'); return; }
    var mn=Math.min.apply(null,series), mx=Math.max.apply(null,series), rng=(mx-mn)||1;
    function X(i){return pad+(W-2*pad)*i/(series.length-1);}
    function Y(v){return pad+(H-2*pad)*(1-(v-mn)/rng);}
    var d=series.map(function(v,i){return (i?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1);}).join(' ');
    var area=d+' L'+X(series.length-1).toFixed(1)+' '+(H-pad)+' L'+X(0).toFixed(1)+' '+(H-pad)+' Z';
    if(paths[0])paths[0].setAttribute('d',area);
    if(paths[1])paths[1].setAttribute('d',d);
    if(circ){ circ.setAttribute('cx',X(series.length-1).toFixed(1)); circ.setAttribute('cy',Y(series[series.length-1]).toFixed(1)); circ.setAttribute('r','4'); }
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
      '#bl-total{font-size:12.5px;color:#9aa0ab;margin-top:6px}#bl-total b{color:#e9eaee}'
    ].join('');
    document.head.appendChild(s);
  }
  function ctrlsHTML(){
    function btns(arr,key){ return arr.map(function(o){ return '<button data-'+key+'="'+o[0]+'">'+o[1]+'</button>'; }).join(''); }
    return '<div class="row">'+btns(TYPES,'type')+'</div><div class="row">'+btns(PERIODS,'period')+'</div>';
  }
  function ensureControls(sec){
    var panel=sec.querySelector('.panel'); if(!panel) return;
    var c=document.getElementById('bl-ctrls');
    if(!c){ c=document.createElement('div'); c.id='bl-ctrls'; c.innerHTML=ctrlsHTML();
      panel.parentNode.insertBefore(c, panel);
      c.addEventListener('click',function(e){ var b=e.target.closest('button'); if(!b)return;
        if(b.getAttribute('data-type')){ state.type=b.getAttribute('data-type'); }
        else if(b.getAttribute('data-period')){ state.period=b.getAttribute('data-period'); }
        render();
      });
    }
    // total badge under the big label
    var lbl=sec.querySelector('.biglbl');
    if(lbl && !document.getElementById('bl-total')){ var t=document.createElement('div'); t.id='bl-total'; lbl.parentNode.insertBefore(t, lbl.nextSibling); }
  }
  function updateActive(){
    var c=document.getElementById('bl-ctrls'); if(!c)return;
    [].forEach.call(c.querySelectorAll('button'),function(b){
      var on=(b.getAttribute('data-type')===state.type)||(b.getAttribute('data-period')===state.period);
      b.classList.toggle('on',on);
    });
  }
  function render(){
    var sec=document.getElementById('track'); if(!sec)return;
    injectStyle(); ensureControls(sec);
    var s=stats(slice(state.type,state.period));
    var tot=stats(slice('all','all'));
    var big=sec.querySelector('.big'); if(big){ big.textContent=u(s.profit); big.setAttribute('data-count',(Math.round(s.profit*10)/10).toFixed(1)); big.classList.remove('up','down'); big.classList.add(s.profit>=0?'up':'down'); }
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
    chart(sec.querySelector('svg'), s.series);
    var cap=sec.querySelector('.cap'); if(cap) cap.textContent='Cumulative units · every position logged, nothing removed.';
    var axis=sec.querySelector('.axis');
    if(axis){ var sp=axis.querySelectorAll('span'), ds=s.dates||[];
      for(var i=0;i<sp.length;i++){ if(ds.length>=2 && sp.length>1){ var idx=Math.round(i*(ds.length-1)/(sp.length-1)); sp[i].textContent=fmtD(ds[idx]); } else { sp[i].textContent=''; } }
    }
    var tb=document.getElementById('bl-total'); if(tb) tb.innerHTML='Featured slice. <b>All-time total: '+u(tot.profit)+'</b> · '+pct(tot.roi)+' over '+tot.bets+' settled bets.';
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
