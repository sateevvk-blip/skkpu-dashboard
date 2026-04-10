// ─── PATCH stage2/charts-buildings ───────────────────────────────
(function patchMoBld() {
  var _orig = window.renderMoBld;
  window.renderMoBld = function () {
    _orig();
    var GEO = window._GEO; var DISTRICTS = window._DISTRICTS;
    if (!GEO || !DISTRICTS) return;
    var feats = GEO.features;
    var dKeys = Object.keys(DISTRICTS);
    function dName(k){ return (DISTRICTS[k]&&DISTRICTS[k].shortName)||k; }
    function dLabel(f){ return f.properties.name_clean || f.properties.name; }
    function bldD(p){ return { buildingLoad: p.buildingLoad||(40+Math.random()*55), buildings: p.buildings||Math.round(5+Math.random()*40) }; }

    // ch-bldCount: Top-10 по зданиям
    var bldRows = feats.map(function(f){ return { name:dLabel(f), count:Math.round(bldD(f.properties).buildings) }; });
    bldRows.sort(function(a,b){return b.count-a.count;}); var top10=bldRows.slice(0,10);
    var eBldC = document.getElementById('ch-bldCount');
    if (eBldC) {
      if (!eBldC._ec) eBldC._ec = echarts.init(eBldC);
      eBldC._ec.setOption({ tooltip:{trigger:'axis'}, grid:{top:8,right:60,bottom:8,left:150},
        xAxis:{type:'value',name:'корпусов'}, yAxis:{type:'category',data:top10.map(function(r){return r.name;}),axisLabel:{fontSize:10}},
        series:[{type:'bar',data:top10.map(function(r){return r.count;}),itemStyle:{color:'#2563eb'},label:{show:true,position:'right',fontSize:10}}]
      }, true);
    }

    // ch-bldLoad: Top-12 с наименьшей загрузкой
    var loadRows = feats.map(function(f){ return { name:dLabel(f), load:Math.round(bldD(f.properties).buildingLoad) }; });
    loadRows.sort(function(a,b){return a.load-b.load;}); var top12=loadRows.slice(0,12);
    var eBldL = document.getElementById('ch-bldLoad');
    if (eBldL) {
      if (!eBldL._ec) eBldL._ec = echarts.init(eBldL);
      eBldL._ec.setOption({ tooltip:{}, grid:{top:8,right:52,bottom:8,left:150},
        xAxis:{type:'value',max:100,axisLabel:{formatter:'{value}%'}},
        yAxis:{type:'category',data:top12.map(function(r){return r.name;}),axisLabel:{fontSize:10},inverse:true},
        series:[{type:'bar',data:top12.map(function(r){return{value:r.load,itemStyle:{color:r.load<50?'#ef4444':r.load<80?'#f59e0b':'#10b981'}};}),
          label:{show:true,position:'right',formatter:'{c}%',fontSize:10}}]
      }, true);
    }

    // ch-bldClasses: avg MO + dropdown округа
    var grades=['1','2','3','4','5','6','7','8','9','10','11'];
    var moAvg=grades.map(function(g){
      var sum=0,cnt=0;
      dKeys.forEach(function(k){ var cs=DISTRICTS[k].classSizes; if(cs&&cs[g]){sum+=cs[g];cnt++;} });
      return cnt?Math.round(sum/cnt*10)/10:25;
    });
    var eCS = document.getElementById('ch-bldClasses') || document.getElementById('ch-classSize');
    if (!eCS) return;
    if (!document.getElementById('sel-classSize')) {
      var sel=document.createElement('select');
      sel.id='sel-classSize'; sel.style.cssText='font-size:12px;padding:2px 6px;margin-bottom:6px;border:1px solid #d1d5db;border-radius:4px;';
      var o0=document.createElement('option'); o0.value='__mo__'; o0.textContent='Средняя по МО'; sel.appendChild(o0);
      dKeys.forEach(function(k){ var o=document.createElement('option'); o.value=k; o.textContent=dName(k); sel.appendChild(o); });
      eCS.parentElement.insertBefore(sel, eCS);
      sel.addEventListener('change', function(){ drawCS(sel.value); });
    }
    if (!eCS._ec) eCS._ec = echarts.init(eCS);
    function drawCS(key){
      var isAll=key==='__mo__';
      var vals=isAll?moAvg:grades.map(function(g){ var cs=DISTRICTS[key]&&DISTRICTS[key].classSizes; return cs&&cs[g]?cs[g]:moAvg[grades.indexOf(g)]; });
      eCS._ec.setOption({ tooltip:{trigger:'axis'},grid:{top:24,right:16,bottom:32,left:42},
        xAxis:{type:'category',data:grades.map(function(g){return g+' кл.';}),axisLabel:{fontSize:11}},
        yAxis:{type:'value',name:'Уч.',min:0,max:35},
        series:[{type:'bar',data:vals.map(function(v){return{value:v,itemStyle:{color:v<=19?'#ef4444':v<=24?'#f59e0b':'#10b981'}};}),
          label:{show:true,position:'top',fontSize:10},
          markLine:{silent:true,data:[{yAxis:20,lineStyle:{type:'dashed',color:'#f59e0b'},label:{formatter:'20'}},{yAxis:25,lineStyle:{type:'dashed',color:'#10b981'},label:{formatter:'25'}}]}}]
      }, true);
    }
    drawCS('__mo__');
  };
})();