/**
 * org.js — уровень организации.
 *
 * Логика из patch-stage4-org.js поглощена здесь.
 * Данные читаются из AppState.
 */

function openOrg(org) {
  renderOrg(org, state.district);
}

function renderOrg(org, districtRawName) {
  // Нормализация названия округа — из patch-stage4-org.js
  const resolved = (typeof window.getDistrictName === 'function' && districtRawName)
    ? (window.getDistrictName(districtRawName) || districtRawName)
    : (districtRawName || '');

  state.org = org;
  showPage('org');

  // Обновление хлебных крошек
  requestAnimationFrame(function () {
    const bc2 = document.getElementById('bc-district') || document.querySelector('[data-bc="2"]');
    if (bc2) {
      const raw = bc2.textContent.trim();
      if (/^Округ\s+\d+$/i.test(raw)) bc2.textContent = resolved || raw;
    }
    document.querySelectorAll('[data-org-district],.org-district-label').forEach(function (el) {
      if (/^Округ\s+\d+$/i.test(el.textContent)) el.textContent = resolved || el.textContent;
    });
  });

  const DISTRICTS = AppState.get('districts') || {};
  const district  = DISTRICTS[resolved] || {};

  document.getElementById('org-title').textContent = org.name;
  document.getElementById('org-bname').textContent = org.name;
  document.getElementById('org-district').textContent = resolved;

  const bs2 = document.getElementById('org-bstat');
  if (bs2) { bs2.textContent = stxt(org.r); bs2.className = 'go-stat ' + org.r; }

  document.getElementById('org-kpis').innerHTML = [
    { l: 'Средняя ЗП педагога', v: fmtK(org.zp), d: fmtDiff(org.zp) + ' к цели', c: org.r === 'r' ? 'red' : org.r === 'y' ? 'yellow' : 'green' },
    { l: 'Педагогов ниже цели', v: org.below, d: 'Из ' + (org.total || '—'), c: org.below > 5 ? 'red' : org.below > 0 ? 'yellow' : 'green' },
    { l: 'АХР / педагоги', v: org.ahr + '%', d: org.ahr > 35 ? 'Выше нормы' : 'В норме', c: org.ahr > 40 ? 'red' : org.ahr > 35 ? 'yellow' : 'green' },
    { l: 'Комплектация', v: org.cap + '%', d: org.cap < 70 ? 'Ниже нормы' : 'В норме', c: org.cap < 70 ? 'red' : org.cap < 80 ? 'yellow' : 'green' }
  ].map(function (k) {
    return '<div class="kpi ' + k.c + '"><div class="kl">' + k.l + '</div><div class="kv">' + k.v + '</div><div class="kd">' + k.d + '</div></div>';
  }).join('');

  const toastMap = {
    r: ['⚠️', 'Критичная организация', 'Зафиксированы отклонения. Рекомендуется детальный анализ.', 'r'],
    y: ['📋', 'Организация под наблюдением', 'Часть показателей требует внимания.', 'y'],
    g: ['✅', 'Стабильная организация', 'Показатели в норме.', 'g']
  };
  const t = toastMap[org.r];
  toast(t[0], t[1], t[2], t[3]);
}
