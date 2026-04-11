/**
 * navigation.js — навигация, хлебные крошки, переключение табов.
 *
 * Логика из patch-stage3-nav.js поглощена здесь.
 * Разрешение «Округ N» → реальное название через window.getDistrictName
 * (регистрируется в utils/normalize.js).
 *
 * FIX (Issue #10):
 * - При переключении на таб «Кадры» вызываются все 4 рендер-функции:
 *   renderMoHr(), renderMoHrStaffing(), renderMoHrAge(), renderMoHrTenure().
 *
 * FIX (Issue #12):
 * - Добавлен вызов renderMoHrVacancy() в блок tab 'hr'.
 */
var state = { page: 'mo', district: null, org: null, metric: 'zp', filter: '' };

// Вспомогательная функция нормализации названия округа.
// Использует window.getDistrictName, зарегистрированный в normalize.js.
function resolveDistrictName(raw) {
  if (typeof window.getDistrictName === 'function') {
    return window.getDistrictName(raw) || raw;
  }
  // Резервный вариант, если normalize.js ещё не выполнился
  const districts = AppState.get('districts') || {};
  const dKeys = Object.keys(districts);
  if (dKeys.indexOf(raw) !== -1) return raw;
  const m = String(raw).match(/^Округ\s+(\d+)$/i);
  if (m) { const idx = parseInt(m[1], 10) - 1; return dKeys[idx] || raw; }
  const lower = String(raw).toLowerCase();
  const found = dKeys.find(function (k) {
    return k.toLowerCase() === lower || k.toLowerCase().indexOf(lower) !== -1;
  });
  return found || raw;
}

function showPage(id) {
  document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
  document.getElementById('page-' + id).classList.add('active');
  state.page = id;
  updateNav();
  document.getElementById('hdrTabs').style.display = id === 'mo' ? 'flex' : 'none';
  const mn = document.getElementById('mobNav');
  if (mn) mn.style.display = id === 'mo' ? '' : 'none';
  if (id === 'map') setTimeout(function () { if (map) map.invalidateSize(); }, 80);
}

function updateNav() {
  const hasDist = !!state.district;
  const hasOrg  = !!state.org;

  ['nc0', 'nc1', 'nc2'].forEach(function (id) { document.getElementById(id).classList.remove('active'); });
  document.getElementById('nc0').classList.toggle('active', state.page === 'mo');

  document.getElementById('na1').style.display = hasDist ? '' : 'none';
  document.getElementById('nc1').style.display = hasDist ? '' : 'none';
  if (hasDist) {
    document.getElementById('nc1txt').textContent = state.district;
    document.getElementById('nc1').classList.toggle('active', state.page === 'go');
  }

  document.getElementById('na2').style.display = hasOrg ? '' : 'none';
  document.getElementById('nc2').style.display = hasOrg ? '' : 'none';
  if (hasOrg) {
    const short = state.org.name.replace('МБОУ «', '').replace('»', '').substring(0, 20);
    document.getElementById('nc2txt').textContent = short;
    document.getElementById('nc2').classList.toggle('active', state.page === 'org');
  }

  // Наблюдатель за хлебной крошкой — из patch-stage3-nav.js
  _watchBreadcrumb();
}

function _watchBreadcrumb() {
  const bcEl = document.getElementById('bc-district') ||
               document.querySelector('[data-bc="district"],.breadcrumb-item:nth-child(2)');
  if (!bcEl || bcEl._bcObserving) return;
  bcEl._bcObserving = true;
  new MutationObserver(function () {
    const txt = bcEl.textContent.trim();
    if (/^Округ\s+\d+$/i.test(txt)) {
      const fixed = resolveDistrictName(txt);
      if (fixed !== txt) bcEl.textContent = fixed;
    }
  }).observe(bcEl, { childList: true, characterData: true, subtree: true });
}

function openDistrict(rawName) {
  // Нормализация названия перед переходом — из patch-stage3-nav.js
  const resolved = resolveDistrictName(rawName);
  const districts = AppState.get('districts') || {};
  const dKeys = Object.keys(districts);
  if (!districts[resolved]) {
    // Округ не найден по имени: оставляем как есть, renderDistrict обработает
  }
  renderDistrict(resolved);
}

function goMo() {
  showPage('mo');
  setTimeout(function () { if (map) map.invalidateSize(); }, 80);
}

function goDistrict() {
  if (state.district) openDistrict(state.district);
}

function moTabMob(id) {
  moTab(id);
  document.querySelectorAll('.mob-tab').forEach(function (t) { t.classList.remove('active'); });
  const el = document.getElementById('mnt-' + id);
  if (el) el.classList.add('active');
}

function moTab(id) {
  document.querySelectorAll('.hdr-tab').forEach(function (t) { t.classList.remove('active'); });
  document.getElementById('ht-' + id).classList.add('active');
  document.querySelectorAll('[id^="moPane-"]').forEach(function (p) { p.classList.remove('active'); });
  document.getElementById('moPane-' + id).classList.add('active');

  if (id === 'map') { setTimeout(function () { if (map) map.invalidateSize(); }, 80); return; }
  if (id === 'sal') renderMoSal();
  if (id === 'sub') renderMoSub();
  if (id === 'hr')  {
    // FIX Issue #10: вызываем все 4 HR-графика при переключении на таб «Кадры»
    // FIX Issue #12: добавлен вызов renderMoHrVacancy()
    renderMoHr();
    renderMoHrStaffing();
    renderMoHrAge();
    renderMoHrTenure();
    renderMoHrVacancy();
  }
  if (id === 'bld') renderMoBld();
  // renderMoProb вызывается сразу — ранее это делал patch-stage4-prob.js
  if (id === 'prb') renderMoProb();
}
