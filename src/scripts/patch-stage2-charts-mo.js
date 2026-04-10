// ─── PATCH stage2/charts-mo ───────────────────────────────────────
(function patchMoSub() {
  var _orig = window.renderMoSub;
  window.renderMoSub = function () {
    _orig();
    var DISTRICTS = window._DISTRICTS;
    if (!DISTRICTS) return;

    function dName(k) { return (DISTRICTS[k] && DISTRICTS[k].shortName) || k; }
    function fmtM(v)  { return (v >= 1000 ? (v/1000).toFixed(1)+' млрд' : v.toFixed(0)+' млн') + ' ₽'; }

    // ch-tarif: Top-10 по сумме тарификации
    var tarRows = Object.keys(DISTRICTS).map(function (k) {
      var t = DISTRICTS[k].tarification || {};
      var pre = Math.round((t.preschool || 0) / 1e6);
      var gen = Math.round((t.general   || 0) / 1e6);
      return { name: dName(k), pre: pre, gen: gen, total: pre + gen };
    });
    tarRows.sort(function (a, b) { return b.total - a.total; });
    var tarTop = tarRows.slice(0, 10);

    var eTar = document.getElementById('ch-tarif');
    if (eTar) {
      if (!eTar._ec) eTar._ec = echarts.init(eTar);
      eTar._ec.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: ['Дошкольное', 'Общее'], bottom: 0 },
        grid: { top: 16, right: 16, bottom: 36, left: 140 },
        xAxis: { type: 'value', name: 'млн ₽' },
        yAxis: { type: 'category', data: tarTop.map(function(r){return r.name;}), inverse: true },
        series: [
          { name: 'Дошкольное', type: 'bar', stack: 'tar',
            data: tarTop.map(function(r){return r.pre;}),
            itemStyle: { color: '#8b5cf6' } },
          { name: 'Общее', type: 'bar', stack: 'tar',
            data: tarTop.map(function(r){return r.gen;}),
            itemStyle: { color: '#2563eb' },
            label: { show: true, position: 'right', fontSize: 10,
              formatter: function(p){ return (p.data + tarTop[p.dataIndex].pre)+' млн'; } } }
        ]
      }, true);
    }

    // ch-subPlanFact: Top-10 по плану + % исполнения
    var pfRows = Object.keys(DISTRICTS).map(function (k) {
      var s = DISTRICTS[k].subsidyPlanFact || {};
      var pl = s.plan || {}; var fc = s.fact || {};
      var plan = Math.round(((pl.preschoolPed||0)+(pl.preschoolOther||0)+(pl.generalPed||0)+(pl.generalOther||0))/1e6);
      var fact = Math.round(((fc.preschoolPed||0)+(fc.preschoolOther||0)+(fc.generalPed||0)+(fc.generalOther||0))/1e6);
      return { name: dName(k), plan: plan, fact: fact, pct: plan > 0 ? fact/plan*100 : 0 };
    });
    pfRows.sort(function(a,b){return b.plan - a.plan;});
    var pfTop = pfRows.slice(0, 10);

    var ePF = document.getElementById('ch-subPlanFact');
    if (ePF) {
      if (!ePF._ec) ePF._ec = echarts.init(ePF);
      ePF._ec.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: ['План', 'Факт'], bottom: 0 },
        grid: { top: 16, right: 16, bottom: 36, left: 140 },
        xAxis: { type: 'value', name: 'млн ₽' },
        yAxis: { type: 'category', data: pfTop.map(function(r){return r.name;}), inverse: true },
        series: [
          { name: 'План', type: 'bar', barGap: '5%',
            data: pfTop.map(function(r){return r.plan;}),
            itemStyle: { color: '#94a3b8' } },
          { name: 'Факт', type: 'bar',
            data: pfTop.map(function(r){return {
              value: r.fact,
              itemStyle: { color: r.pct<85?'#ef4444':r.pct<95?'#f59e0b':'#10b981' }
            };}),
            label: { show: true, position: 'right', fontSize: 10,
              formatter: function(p){ return pfTop[p.dataIndex].pct.toFixed(0)+'%'; } } }
        ]
      }, true);
    }
  };
})();