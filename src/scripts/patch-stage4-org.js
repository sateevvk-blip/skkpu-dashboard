// ─── PATCH stage4/org ─────────────────────────────────────────────
(function patchOrg() {
  function applyPatch() {
    if (typeof window.renderOrg!=='function'){setTimeout(applyPatch,200);return;}
    var _orig=window.renderOrg;
    window.renderOrg=function(orgId,districtRawName){
      var DISTRICTS=window._DISTRICTS||{}; var dKeys=Object.keys(DISTRICTS);
      var resolved=districtRawName;
      if (districtRawName&&dKeys.indexOf(districtRawName)===-1) {
        if (typeof window._getDistrictName==='function') {
          resolved=window._getDistrictName(districtRawName)||districtRawName;
        } else {
          var m=String(districtRawName).match(/^Округ\s+(\d+)$/i);
          if (m){var idx=parseInt(m[1],10)-1;resolved=dKeys[idx]||districtRawName;}
        }
      }
      _orig(orgId,resolved);
      requestAnimationFrame(function(){
        var bc2=document.getElementById('bc-district')||document.querySelector('[data-bc="2"]');
        if (bc2){var raw=bc2.textContent.trim();if(/^Округ\s+\d+$/i.test(raw))bc2.textContent=resolved||raw;}
        document.querySelectorAll('[data-org-district],.org-district-label').forEach(function(el){
          if (/^Округ\s+\d+$/i.test(el.textContent)) el.textContent=resolved||el.textContent;
        });
      });
    };
    console.info('[stage4] renderOrg patched');
  }
  applyPatch();
})();