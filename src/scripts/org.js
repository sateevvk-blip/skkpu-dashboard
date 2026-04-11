/**
 * org.js — уровень организации.
 *
 * Логика из patch-stage4-org.js поглощена здесь.
 * Данные читаются из AppState.
 *
 * FIX (Проблема 2):
 *   • renderOrg теперь заполняет таблицу #tb-teachers данными из
 *     AppState.get('employees'), фильтруя по orgId текущей организации.
 *   • После KPI-блоков вызываются 4 графика ECharts:
 *     ch-orgSal, ch-orgLoad, ch-orgEduType, ch-orgStaffCat.
 *
 * Структура employees (data/teachers.json → AppState.set('employees', ...)):
 *   { name, districtId, orgId, orgName, educationType, staffCategory,
 *     position, positionType, loadType, loadRate, weeklyHours, salary, ... }
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

  // ── KPI-блоки ────────────────────────────────────────────────────────────
  document.getElementById('org-kpis').innerHTML = [
    { l: 'Средняя ЗП педагога', v: fmtK(org.zp), d: fmtDiff(org.zp) + ' к цели', c: org.r === 'r' ? 'red' : org.r === 'y' ? 'yellow' : 'green' },
    { l: 'Педагогов ниже цели', v: org.below, d: 'Из ' + (org.total || '—'), c: org.below > 5 ? 'red' : org.below > 0 ? 'yellow' : 'green' },
    { l: 'АХР / педагоги', v: org.ahr + '%', d: org.ahr > 35 ? 'Выше нормы' : 'В норме', c: org.ahr > 40 ? 'red' : org.ahr > 35 ? 'yellow' : 'green' },
    { l: 'Комплектация', v: org.cap + '%', d: org.cap < 70 ? 'Ниже нормы' : 'В норме', c: org.cap < 70 ? 'red' : org.cap < 80 ? 'yellow' : 'green' }
  ].map(function (k) {
    return '<div class="kpi ' + k.c + '"><div class="kl">' + k.l + '</div><div class="kv">' + k.v + '</div><div class="kd">' + k.d + '</div></div>';
  }).join('');

  // ── Таблица сотрудников #tb-teachers ─────────────────────────────────────
  const employees = (AppState.get('employees') || []).filter(function (e) {
    return String(e.orgId) === String(org.id || org.orgId || '');
  });
  _renderTeachersTable(employees);

  // ── 4 графика организации ─────────────────────────────────────────────────
  _renderOrgCharts(employees);

  // ── Тост ─────────────────────────────────────────────────────────────────
  const toastMap = {
    r: ['⚠️', 'Критичная организация', 'Зафиксированы отклонения. Рекомендуется детальный анализ.', 'r'],
    y: ['📋', 'Организация под наблюдением', 'Часть показателей требует внимания.', 'y'],
    g: ['✅', 'Стабильная организация', 'Показатели в норме.', 'g']
  };
  const t = toastMap[org.r];
  toast(t[0], t[1], t[2], t[3]);
}

// ─── Таблица #tb-teachers ─────────────────────────────────────────────────────
function _renderTeachersTable(employees) {
  const tb = document.getElementById('tb-teachers');
  if (!tb) return;

  // Находим или создаём <tbody>
  let tbody = tb.querySelector('tbody');
  if (!tbody) {
    tbody = document.createElement('tbody');
    tb.appendChild(tbody);
  }

  if (!employees.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--color-text-muted,#888)">Нет данных о сотрудниках</td></tr>';
    return;
  }

  // Группируем строки по имени, берём только основную нагрузку для ЗП
  const primary = employees.filter(function (e) { return e.loadType === 'основная' && e.salary !== null && e.salary !== undefined; });

  tbody.innerHTML = primary.map(function (e) {
    const sal = e.salary ? fmtK(e.salary) : '—';
    const load = e.loadRate ? (e.loadRate.toFixed(2) + ' ст.') : '—';
    const hrs  = e.weeklyHours != null ? (e.weeklyHours + ' ч/нед') : '—';
    return [
      '<tr>',
      '<td>' + (e.name || '—') + '</td>',
      '<td>' + (e.position || e.staffCategory || '—') + '</td>',
      '<td>' + (e.educationType || '—') + '</td>',
      '<td>' + load + '</td>',
      '<td>' + hrs  + '</td>',
      '<td>' + sal  + '</td>',
      '</tr>'
    ].join('');
  }).join('');
}

// ─── 4 графика организации ─────────────────────────────────────────────────────
function _renderOrgCharts(employees) {
  if (typeof echarts === 'undefined') return;

  // Вспомогательная функция инициализации / обновления ECharts
  function initChart(id, option) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!el._ec) el._ec = echarts.init(el);
    el._ec.setOption(option, true);
  }

  // 1. ch-orgSal — ЗП педагогов (основная нагрузка, с зарплатой)
  const salRows = employees
    .filter(function (e) { return e.loadType === 'основная' && e.salary > 0; })
    .sort(function (a, b) { return b.salary - a.salary; })
    .slice(0, 15);

  initChart('ch-orgSal', {
    tooltip: { trigger: 'axis' },
    grid: { top: 10, right: 60, bottom: 10, left: 180, containLabel: false },
    xAxis: { type: 'value', name: '₽', axisLabel: { formatter: function (v) { return (v / 1000).toFixed(0) + 'к'; } } },
    yAxis: { type: 'category', data: salRows.map(function (e) { return e.name.split(' ')[0] + ' ' + (e.name.split(' ')[1] || '').slice(0, 1) + '.'; }), axisLabel: { fontSize: 11 }, inverse: true },
    series: [{
      type: 'bar',
      data: salRows.map(function (e) {
        return { value: e.salary, itemStyle: { color: e.salary < 50000 ? '#ef4444' : e.salary < 75000 ? '#f59e0b' : '#10b981' } };
      }),
      label: { show: true, position: 'right', fontSize: 10, formatter: function (p) { return (p.value / 1000).toFixed(0) + 'к'; } }
    }]
  });

  // 2. ch-orgLoad — распределение ставок
  const loadBuckets = { '0.25': 0, '0.5': 0, '0.75': 0, '1.0': 0, '1.25': 0 };
  employees.forEach(function (e) {
    const k = parseFloat(e.loadRate || 0).toFixed(2);
    // округляем к ближайшему стандартному значению
    const std = ['0.25', '0.50', '0.75', '1.00', '1.25'];
    const nearest = std.reduce(function (prev, cur) {
      return Math.abs(parseFloat(cur) - parseFloat(k)) < Math.abs(parseFloat(prev) - parseFloat(k)) ? cur : prev;
    });
    const label = parseFloat(nearest).toFixed(2);
    if (label in loadBuckets) loadBuckets[label] = (loadBuckets[label] || 0) + 1;
    else loadBuckets[label] = (loadBuckets[label] || 0) + 1;
  });
  const loadLabels = Object.keys(loadBuckets).map(function (k) { return k + ' ст.'; });
  const loadVals   = Object.values(loadBuckets);

  initChart('ch-orgLoad', {
    tooltip: { trigger: 'axis' },
    grid: { top: 16, right: 16, bottom: 32, left: 56 },
    xAxis: { type: 'category', data: loadLabels, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', name: 'чел.' },
    series: [{
      type: 'bar',
      data: loadVals.map(function (v) { return { value: v, itemStyle: { color: '#2563eb' } }; }),
      label: { show: true, position: 'top', fontSize: 10 }
    }]
  });

  // 3. ch-orgEduType — вид образования (pie)
  const eduCount = {};
  employees.forEach(function (e) {
    const k = e.educationType || 'прочее';
    eduCount[k] = (eduCount[k] || 0) + 1;
  });
  const eduPalette = { 'общее': '#2563eb', 'дошкольное': '#10b981', 'дополнительное': '#f59e0b', 'прочее': '#94a3b8' };

  initChart('ch-orgEduType', {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    series: [{
      type: 'pie',
      radius: ['35%', '65%'],
      data: Object.keys(eduCount).map(function (k) {
        return { name: k, value: eduCount[k], itemStyle: { color: eduPalette[k] || '#94a3b8' } };
      }),
      label: { fontSize: 11 }
    }]
  });

  // 4. ch-orgStaffCat — категории персонала (pie)
  const catCount = {};
  employees.forEach(function (e) {
    const k = e.staffCategory || 'прочие';
    catCount[k] = (catCount[k] || 0) + 1;
  });
  const catPalette = {
    'педагогические работники': '#2563eb',
    'руководитель':            '#10b981',
    'заместитель руководителя':'#f59e0b',
    'прочие работники':        '#94a3b8'
  };

  initChart('ch-orgStaffCat', {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    series: [{
      type: 'pie',
      radius: ['35%', '65%'],
      data: Object.keys(catCount).map(function (k) {
        return { name: k, value: catCount[k], itemStyle: { color: catPalette[k] || '#94a3b8' } };
      }),
      label: { fontSize: 11 }
    }]
  });
}
