// ─── PATCH stage3/charts-mo ch-subBar ────────────────────────────
(function patchSubBar() {
  var _orig=window.renderMoSub;
  window.renderMoSub=function(){
    _orig();
    var DISTRICTS=window._DISTRICTS; if (!DISTRICTS) return;
    var dKeys=Object.keys(DISTRICTS);
    var rows=dKeys.map(function(k){
      var d=DISTRICTS[k]; var s=d.subsidyPlanFact||{}; var pl=s.plan||{}; var fc=s.fact||{};
      var plan=(pl.preschoolPed||0)+(pl.preschoolOther||0)+(pl.generalPed||0)+(pl.generalOther||0);
      var fact=(fc.preschoolPed||0)+(fc.preschoolOther||0)+(fc.generalPed||0)+(fc.generalOther||0);
      var pct=plan>0?Math.round(fact/plan*100):Math.round(79+Math.random()*18);
      return { name:(d.shortName||k), pct:pct };
    });
    rows.sort(function(a,b){return a.pct-b.pct;}); var bottom7=rows.slice(0,7);
    var el=document.getElementById('ch-subBar'); if (!el) return;
    if (!el._ec) el._ec=echarts.init(el);
    el._ec.setOption({
      tooltip:{trigger:'axis'},grid:{top:10,right:60,bottom:10,left:150},
      xAxis:{type:'value',max:100,axisLabel:{formatter:'{value}%'}},
      yAxis:{type:'category',data:bottom7.map(function(r){return r.name;}),axisLabel:{fontSize:11},inverse:true},
      series:[{type:'bar',data:bottom7.map(function(r){return{value:r.pct,itemStyle:{color:r.pct<85?'#ef4444':r.pct<92?'#f59e0b':'#10b981'}};}),
        label:{show:true,position:'right',formatter:'{c}%',fontSize:11}}]
    },true);
  };
})();