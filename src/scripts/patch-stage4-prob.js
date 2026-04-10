// ─── PATCH stage4/prob ────────────────────────────────────────────
(function patchProb() {
  var rendered=false;
  function rerenderProb(){
    if (rendered) return;
    if (typeof window.renderMoProb!=='function') return;
    var tabProb=document.querySelector('[data-tab="problems"],#tab-prob,#panel-prob,#moPane-prb');
    if (!tabProb||tabProb.style.display==='none'||tabProb.hidden) return;
    rendered=true; window.renderMoProb();
    console.info('[stage4] renderMoProb re-rendered');
  }
  window.addEventListener('app:ready',function(){setTimeout(rerenderProb,100);});
  function patchTabSwitch(){
    document.querySelectorAll('[data-tab],.tab-btn,[role="tab"],#ht-prb').forEach(function(tab){
      tab.addEventListener('click',function(){
        var target=tab.getAttribute('data-tab')||tab.getAttribute('aria-controls')||tab.id||'';
        if (/prb|prob/i.test(target)){rendered=false;setTimeout(rerenderProb,50);}
      });
    });
  }
  window.addEventListener('app:ready',function(){setTimeout(patchTabSwitch,500);});
  setTimeout(patchTabSwitch,2000);
})();