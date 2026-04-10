// ─── PATCH stage3/navigation ──────────────────────────────────────
(function patchNav() {
  function resolveDistrictName(raw) {
    var DISTRICTS=window._DISTRICTS||{}; var dKeys=Object.keys(DISTRICTS);
    if (dKeys.indexOf(raw)!==-1) return raw;
    var m=String(raw).match(/^Округ\s+(\d+)$/i);
    if (m) { var idx=parseInt(m[1],10)-1; return dKeys[idx]||raw; }
    var lower=String(raw).toLowerCase();
    var found=dKeys.find(function(k){ return k.toLowerCase()===lower||k.toLowerCase().indexOf(lower)!==-1; });
    return found||raw;
  }
  if (typeof window.openDistrict==='function') {
    var _o=window.openDistrict;
    window.openDistrict=function(rawName){ return _o(resolveDistrictName(rawName)); };
  }
  ['setBreadcrumb','setLevel2','updateBreadcrumb'].forEach(function(fn){
    if (typeof window[fn]==='function') {
      var _o=window[fn];
      window[fn]=function(val){ return _o(typeof val==='string'?resolveDistrictName(val):val); };
    }
  });
  function watchBreadcrumb() {
    var bcEl=document.getElementById('bc-district')||document.querySelector('[data-bc="district"],.breadcrumb-item:nth-child(2)');
    if (!bcEl) return;
    new MutationObserver(function(){
      var txt=bcEl.textContent.trim();
      if (/^Округ\s+\d+$/i.test(txt)) { var fixed=resolveDistrictName(txt); if (fixed!==txt) bcEl.textContent=fixed; }
    }).observe(bcEl,{childList:true,characterData:true,subtree:true});
  }
  window.addEventListener('app:ready',watchBreadcrumb);
  setTimeout(watchBreadcrumb,1500);
})();