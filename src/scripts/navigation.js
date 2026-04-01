/**
 * Page navigation and breadcrumb state.
 */
var state = { page: 'mo', district: null, org: null, metric: 'zp', filter: '' };

function showPage(id) {
  document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
  document.getElementById('page-' + id).classList.add('active');
  state.page = id;
  updateNav();
  document.getElementById('hdrTabs').style.display = id === 'mo' ? 'flex' : 'none';
  var mn = document.getElementById('mobNav');
  if (mn) mn.style.display = id === 'mo' ? '' : 'none';
  if (id === 'map') setTimeout(function () { if (map) map.invalidateSize(); }, 80);
}

function updateNav() {
  var hasDist = !!state.district;
  var hasOrg = !!state.org;

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
    var short = state.org.name.replace('МБОУ «', '').replace('»', '').substring(0, 20);
    document.getElementById('nc2txt').textContent = short;
    document.getElementById('nc2').classList.toggle('active', state.page === 'org');
  }
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
  var el = document.getElementById('mnt-' + id);
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
  if (id === 'prb') renderMoProb();
}
