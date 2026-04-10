// ─── PATCH stage4/district ────────────────────────────────────────
(function patchDistrict() {
  function applyPatch() {
    if (typeof window.renderDistrict!=='function'){setTimeout(applyPatch,200);return;}
    var _orig=window.renderDistrict;
    window.renderDistrict=function(rawName){
      var DISTRICTS=window._DISTRICTS||{}; var dKeys=Object.keys(DISTRICTS);
      var resolved=rawName;
      if (dKeys.indexOf(rawName)===-1) {
        if (typeof window._getDistrictName==='function') {
          resolved=window._getDistrictName(rawName)||rawName;
        } else {
          var m=String(rawName).match(/^Округ\s+(\d+)$/i);
          if (m){ var idx=parseInt(m[1],10)-1; resolved=dKeys[idx]||rawName; }
        }
      }
      _orig(resolved);
      var distData=DISTRICTS[resolved]||{};
      var titleEl=document.querySelector('#view-district h2,.district-title,[data-district-name]');
      if (titleEl&&/^Округ\s+\d+$/i.test(titleEl.textContent)) titleEl.textContent=resolved;
      var kpiName=document.querySelector('[data-kpi="district-name"],.kpi-district-name');
      if (kpiName) kpiName.textContent=distData.shortName||resolved;
      var bc2=document.getElementById('bc-district')||document.querySelector('[data-bc="2"]');
      if (bc2){var bcText=bc2.textContent.trim();if(/^Округ\s+\d+$/i.test(bcText)||bcText===rawName)bc2.textContent=resolved;}
      requestAnimationFrame(function(){
        var distView=document.getElementById('view-district')||document.querySelector('[data-view="district"]');
        if (!distView) return;
        distView.querySelectorAll('canvas').forEach(function(el){
          var ec=el._ec||el.__ec; if (!ec||typeof ec.getOption!=='function') return;
          var opt=ec.getOption(); var changed=false;
          ['xAxis','yAxis'].forEach(function(axis){
            var axArr=opt[axis]; if (!axArr) return;
            axArr.forEach(function(ax){
              if (!ax.data) return;
              ax.data=ax.data.map(function(label){
                if (typeof label!=='string'||!/^Округ\s+\d+$/i.test(label)) return label;
                var fixed=typeof window._getDistrictName==='function'?window._getDistrictName(label):label;
                if (fixed!==label){changed=true;return fixed;} return label;
              });
            });
          });
          if (changed) ec.setOption(opt,false);
        });
      });
    };
    console.info('[stage4] renderDistrict patched');
  }
  applyPatch();
})();