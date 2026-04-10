// ─── PATCH stage3/map ─────────────────────────────────────────────
(function patchMap() {
  function normalizeFeatureNames() {
    var GEO=window._GEO; var DISTRICTS=window._DISTRICTS;
    if (!GEO||!DISTRICTS) return;
    var dKeys=Object.keys(DISTRICTS);
    GEO.features.forEach(function(f){
      var p=f.properties||{};
      if (p.name_clean&&!/^Округ\s+\d+$/i.test(p.name_clean)) return;
      var candidate=p.name_clean||p.name||'';
      if (/^Округ\s+\d+$/i.test(candidate)) {
        var num=parseInt(candidate.replace(/\D+/g,''),10)-1;
        if (dKeys[num]) p.name_clean=dKeys[num];
      } else {
        var lower=candidate.toLowerCase();
        var match=dKeys.find(function(k){ return k.toLowerCase()===lower||k.toLowerCase().indexOf(lower)!==-1||lower.indexOf(k.toLowerCase())!==-1; });
        p.name_clean=match||candidate;
      }
    });
  }
  function patchPopupContent() {
    if (typeof window.buildPopupHtml==='function') {
      var _o=window.buildPopupHtml;
      window.buildPopupHtml=function(feat){ var p=feat.properties||{}; p.name_clean=p.name_clean||p.name; return _o(feat); };
      return;
    }
    document.addEventListener('click',function(e){
      var popup=document.querySelector('.district-popup,.map-popup,[class*="popup"]');
      if (!popup) return;
      var titleEl=popup.querySelector('h3,.popup-title,[class*="title"]');
      if (!titleEl) return;
      var raw=titleEl.textContent||'';
      if (!/^Округ\s+\d+$/i.test(raw)) return;
      var GEO=window._GEO; if (!GEO) return;
      var feat=GEO.features.find(function(f){ return (f.properties.name||'')===raw||(f.properties.name_clean||'')===raw; });
      if (feat&&feat.properties.name_clean) titleEl.textContent=feat.properties.name_clean;
    },true);
  }
  function applyMapPatch(){ normalizeFeatureNames(); patchPopupContent(); }
  window.addEventListener('app:ready',applyMapPatch);
  setTimeout(function(){ if (window._GEO&&window._DISTRICTS) applyMapPatch(); },1500);
})();