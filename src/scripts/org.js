/**
 * org.js — уровень организации.
 *
 * FIXES (issue #6 / PR #5):
 *
 * Баг 1: renderOrg() обращалась к несуществующим DOM-ID:
 *   org-bname   → org-name
 *   org-district → org-meta  (добавляем туда «Округ · Тип»)
 *   org-bstat    → org-status
 *
 * Баг 2: _renderTeachersTable генерировала 6 <td>, а <thead> ждёт 13.
 *   Расширено до 13 колонок, убран фильтр loadType === 'основная'
 *   (показываем всех сотрудников), colspan в пустом состоянии = 13.
 *
 * Баг 3 (превентивный): null-guard на #org-kpis перед записью innerHTML.
 *
 * FIXES (issue #7):
 *
 * Баг 4: e.grade → e.className в _renderTeachersTable (поле не существовало).
 *
 * Баг 5: Нормализация orgId — приводим оба идентификатора
 *   к строке с ведущими нулями через padStart(4, '0'),
 *   чтобы «401» из districts.json совпадал с «0401» из teachers.json.
 *
 * FIXES (issue #11):
 *
 * Баг 6: Добавлен вывод ID организации в верхней секции (#org-id-badge).
 * Баг 7: Добавлена колонка «ID» сотрудника в таблицу #tb-teachers.
 *        Colspan в пустом состоянии обновлён до 14.
 * Баг 8: Фильтрация сотрудников — добавлена проверка districtId,
 *   чтобы сотрудник с совпадающим orgId из другого округа не попал в таблицу.
 */

function openOrg(org) {
  renderOrg(org, state.district);
}

function renderOrg(org, districtRawName) {
  const resolved = (typeof window.getDistrictName === 'function' && districtRawName)
    ? (window.getDistrictName(districtRawName) || districtRawName)
    : (districtRawName || '');

  state.org = org;
  showPage('org');

  // Хлебные крошки
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

  // ── Заголовок ──────────────────────────────────────────────────────────────────────────────
  // FIX Баг 1: используем реальные ID из index.html
  var elName = document.getElementById('org-name');
  if (elName) elName.textContent = org.name || '—';

  var elMeta = document.getElementById('org-meta');
  if (elMeta) {
    var parts = [];
    if (resolved) parts.push(resolved);
    if (org.type)  parts.push(org.type);
    elMeta.textContent = parts.join(' · ');
  }

  // FIX issue #11 Баг 6: показываем ID организации в верхней секции
  var elIdBadge = document.getElementById('org-id-badge');
  if (elIdBadge) {
    var orgIdDisplay = String(org.id || org.orgId || '').padStart(4, '0');
    elIdBadge.textContent = orgIdDisplay ? 'ID: ' + orgIdDisplay : '';
  }

  var elStatus = document.getElementById('org-status');
  if (elStatus) {
    elStatus.textContent = stxt(org.r);
    elStatus.className = 'org-status ' + (org.r || '');
  }

  // ── KPI-блоки ───────────────────────────────────────────────────────────────────────────────
  // FIX Баг 3: null-guard перед записью
  var elKpis = document.getElementById('org-kpis');
  if (elKpis) {
    elKpis.innerHTML = [
      { l: 'Средняя ЗП педагога',  v: fmtK(org.zp),      d: fmtDiff(org.zp) + ' к цели',          c: org.r === 'r' ? 'red' : org.r === 'y' ? 'yellow' : 'green' },
      { l: 'Педагогов ниже цели',  v: org.below,          d: 'Из ' + (org.teachers || '—'),         c: (org.below || 0) > 5 ? 'red' : (org.below || 0) > 0 ? 'yellow' : 'green' },
      { l: 'АХР / педагоги',       v: (org.ahr || '—') + '%', d: (org.ahr || 0) > 35 ? 'Выше нормы' : 'В норме', c: (org.ahr || 0) > 40 ? 'red' : (org.ahr || 0) > 35 ? 'yellow' : 'green' },
      { l: 'Комплектация',         v: (org.cap || '—') + '%', d: (org.cap || 0) < 70 ? 'Ниже нормы' : 'В норме', c: (org.cap || 0) < 70 ? 'red' : (org.cap || 0) < 80 ? 'yellow' : 'green' }
    ].map(function (k) {
      return '<div class="kpi ' + k.c + '"><div class="kl">' + k.l + '</div><div class="kv">' + k.v + '</div><div class="kd">' + k.d + '</div></div>';
    }).join('');
  }

  // ── Таблица сотрудников #tb-teachers ──────────────────────────────────────────────
  // FIX Баг 5: нормализуем orgId — приводим к строке с ведущими нулями.
  // FIX Баг 8 (#11): добавляем проверку districtId для изоляции сотрудников
  //   по округу — исключаем ситуацию, когда совпадающий orgId из другого
  //   округа даёт «чужих» сотрудников.
  var orgIdNorm = String(org.id || org.orgId || '').padStart(4, '0');
  var currentDistrict = resolved; // нормализованное название округа
  var employees = (AppState.get('employees') || []).filter(function (e) {
    var orgMatch      = String(e.orgId || '').padStart(4, '0') === orgIdNorm;
    // districtId может отсутствовать у старых записей — пропускаем их без блокировки
    var districtMatch = !e.districtId || !currentDistrict || e.districtId === currentDistrict;
    return orgMatch && districtMatch;
  });
  _renderTeachersTable(employees);

  // ── 4 графика организации ─────────────────────────────────────────────────────────────────
  _renderOrgCharts(employees);

  // ── Тост ────────────────────────────────────────────────────────────────────────────────────
  var toastMap = {
    r: ['⚠️', 'Критичная организация',        'Зафиксированы отклонения. Рекомендуется детальный анализ.', 'r'],
    y: ['📋', 'Организация под наблюдением',  'Часть показателей требует внимания.',                      'y'],
    g: ['✅', 'Стабильная организация',        'Показатели в норме.',                                                       'g']
  };
  var t = toastMap[org.r] || toastMap['g'];
  toast(t[0], t[1], t[2], t[3]);
}

// ─── Таблица #tb-teachers ────────────────────────────────────────────────────────────────────────────────────
// FIX Баг 2: 13 <td> в соответствии с <thead> в index.html;
//   убран фильтр loadType — показываем всех сотрудников организации.
//
// FIX issue #11 Баг 7: добавлена первая колонка «ID» сотрудника → итого 14 колонок.
// Колонки: ID | ФИО | Вид обр. | Категория | Должность | Тип | Нагрузка
//          | Ставка | Предмет | Класс | Напол. | Часы/нед | ЗП | Статус
function _renderTeachersTable(employees) {
  var tb = document.getElementById('tb-teachers');
  if (!tb) return;

  var tbody = tb.querySelector('tbody');
  if (!tbody) {
    tbody = document.createElement('tbody');
    tb.appendChild(tbody);
  }

  if (!employees.length) {
    tbody.innerHTML = '<tr><td colspan="14" style="text-align:center;color:var(--color-text-muted,#888)">Нет данных о сотрудниках</td></tr>';
    return;
  }

  tbody.innerHTML = employees.map(function (e) {
    var sal    = e.salary   ? fmtK(e.salary)                          : '—';
    var load   = e.loadRate ? (parseFloat(e.loadRate).toFixed(2) + ' ст.') : '—';
    var hrs    = e.weeklyHours != null ? (e.weeklyHours + ' ч/нед')  : '—';
    var cap    = e.classCapacity != null ? e.classCapacity            : '—';
    var status = !e.salary ? '—'
               : e.salary < 50000 ? '🔴'
               : e.salary < 75000 ? '🟡' : '🟢';

    var rowClass = (e.salary && e.salary < 74500) ? ' class="row-warn"' : '';

    // ID сотрудника: используем e.id, e.employeeId или e.tabNo
    var empId = e.id || e.employeeId || e.tabNo || '—';

    return [
      '<tr' + rowClass + '>',
      '<td style="font-family:monospace;color:var(--color-text-muted,#888)">' + empId + '</td>',  // ID
      '<td>' + (e.name          || '—') + '</td>',   // ФИО
      '<td>' + (e.educationType || '—') + '</td>',   // Вид обр.
      '<td>' + (e.staffCategory || '—') + '</td>',   // Категория
      '<td>' + (e.position      || '—') + '</td>',   // Должность
      '<td>' + (e.positionType  || '—') + '</td>',   // Тип
      '<td>' + (e.loadType      || '—') + '</td>',   // Нагрузка
      '<td>' + load                     + '</td>',   // Ставка
      '<td>' + (e.subject       || '—') + '</td>',   // Предмет
      '<td>' + (e.className     || '—') + '</td>',   // FIX Баг 4: e.grade → e.className
      '<td>' + cap                      + '</td>',   // Напол.
      '<td>' + hrs                      + '</td>',   // Часы/нед
      '<td>' + sal                      + '</td>',   // ЗП
      '<td>' + status                   + '</td>',   // Статус
      '</tr>'
    ].join('');
  }).join('');
}

// ─── 4 графика организации ──────────────────────────────────────────────────────────────────────────────────
function _renderOrgCharts(employees) {
  if (typeof echarts === 'undefined') return;

  function initChart(id, option) {
    var el = document.getElementById(id);
    if (!el) return;
    if (!el._ec) el._ec = echarts.init(el);
    el._ec.setOption(option, true);
  }

  // 1. ch-orgSal — ЗП педагогов (топ-15 по убыванию ЗП)
  var salRows = employees
    .filter(function (e) { return e.salary > 0; })
    .sort(function (a, b) { return b.salary - a.salary; })
    .slice(0, 15);

  initChart('ch-orgSal', {
    tooltip: { trigger: 'axis' },
    grid: { top: 10, right: 60, bottom: 10, left: 180, containLabel: false },
    xAxis: { type: 'value', name: '₽', axisLabel: { formatter: function (v) { return (v / 1000).toFixed(0) + 'к'; } } },
    yAxis: {
      type: 'category',
      data: salRows.map(function (e) {
        var parts = (e.name || '').split(' ');
        return parts[0] + ' ' + ((parts[1] || '').slice(0, 1) + '.');
      }),
      axisLabel: { fontSize: 11 },
      inverse: true
    },
    series: [{
      type: 'bar',
      data: salRows.map(function (e) {
        return {
          value: e.salary,
          itemStyle: { color: e.salary < 50000 ? '#ef4444' : e.salary < 75000 ? '#f59e0b' : '#10b981' }
        };
      }),
      label: { show: true, position: 'right', fontSize: 10, formatter: function (p) { return (p.value / 1000).toFixed(0) + 'к'; } }
    }]
  });

  // 2. ch-orgLoad — распределение ставок
  var stdSlots = ['0.25', '0.50', '0.75', '1.00', '1.25'];
  var loadBuckets = {};
  stdSlots.forEach(function (s) { loadBuckets[s] = 0; });

  employees.forEach(function (e) {
    var k = parseFloat(e.loadRate || 0);
    var nearest = stdSlots.reduce(function (prev, cur) {
      return Math.abs(parseFloat(cur) - k) < Math.abs(parseFloat(prev) - k) ? cur : prev;
    });
    loadBuckets[nearest] = (loadBuckets[nearest] || 0) + 1;
  });

  initChart('ch-orgLoad', {
    tooltip: { trigger: 'axis' },
    grid: { top: 16, right: 16, bottom: 32, left: 56 },
    xAxis: { type: 'category', data: stdSlots.map(function (s) { return s + ' ст.'; }), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', name: 'чел.' },
    series: [{
      type: 'bar',
      data: stdSlots.map(function (s) { return { value: loadBuckets[s], itemStyle: { color: '#2563eb' } }; }),
      label: { show: true, position: 'top', fontSize: 10 }
    }]
  });

  // 3. ch-orgEduType — вид образования (pie/donut)
  var eduCount = {};
  employees.forEach(function (e) {
    var k = e.educationType || 'прочее';
    eduCount[k] = (eduCount[k] || 0) + 1;
  });
  var eduPalette = { 'общее': '#2563eb', 'дошкольное': '#10b981', 'дополнительное': '#f59e0b', 'прочее': '#94a3b8' };

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

  // 4. ch-orgStaffCat — категории персонала (pie/donut)
  var catCount = {};
  employees.forEach(function (e) {
    var k = e.staffCategory || 'прочие';
    catCount[k] = (catCount[k] || 0) + 1;
  });
  var catPalette = {
    'педагогические работники':  '#2563eb',
    'руководитель':              '#10b981',
    'заместитель руководителя':  '#f59e0b',
    'прочие работники':          '#94a3b8'
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
