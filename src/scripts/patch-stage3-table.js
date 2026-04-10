// ─── PATCH stage3/charts-mo tb-districts ────────────────────────
(function patchDistrictTable() {
  var _orig=window.renderMoSal;
  window.renderMoSal=function(){
    _orig();
    var DISTRICTS=window._DISTRICTS||{}; var dKeys=Object.keys(DISTRICTS);
    function resolve(raw){
      if (dKeys.indexOf(raw)!==-1) return raw;
      var m=String(raw).match(/^Округ\s+(\d+)$/i);
      if (m){ var idx=parseInt(m[1],10)-1; return dKeys[idx]||raw; }
      return raw;
    }
    var tb=document.getElementById('tb-districts'); if (!tb) return;
    tb.querySelectorAll('tr').forEach(function(tr){
      var td=tr.querySelector('td:first-child b'); if (!td) return;
      var raw=td.textContent;
      if (/^Округ\s+\d+$/i.test(raw)) {
        var fixed=resolve(raw); td.textContent=fixed;
        var onclick=tr.getAttribute('onclick')||'';
        if (onclick.indexOf(raw)!==-1) tr.setAttribute('onclick',onclick.replace(raw,fixed));
      }
    });
  };
})();