/**
 * Organisation level — rendering and drill-down.
 */

function openOrg(o) {
  state.org = o;
  renderOrg(o);
}

function renderOrg(o) {
  var EMPLOYEES = window._EMPLOYEES || [];

  showPage('org');
  document.getElementById('org-title').textContent = o.name;
  document.getElementById('org-sub').textContent = state.district + ' · уровень организации · причины отклонений';
  document.getElementById('org-name').textContent = o.name;
  document.getElementById('org-meta').innerHTML =
    '<span>📍 ' + state.district + '</span>' +
    '<span>👨‍🏫 ' + o.teachers + ' педагогов</span>' +
    '<span>🧑‍🎓 ' + o.students.toLocaleString('ru-RU') + ' уч.</span>' +
    '<span>🏫 ' + o.classes + ' классов</span>' +
    '<span>🏗 ' + (o.buildings || '—') + ' зданий</span>' +
    '<span>📊 Загрузка: ' + (o.buildingLoad || '—') + '%</span>';

  var st = document.getElementById('org-status');
  st.textContent = stxt(o.r);
  st.className = 'org-status ' + o.r;

  var ext = o.r === 'r' ? 34 : o.r === 'y' ? 26 : 13;
  var subv = o.r === 'r' ? 82 : o.r === 'y' ? 89 : 95;

  document.getElementById('org-problems').innerHTML = [
    { l: 'Средняя ЗП', v: fmtK(o.zp), d: 'Отклонение: ' + fmtDiff(o.zp), c: o.r === 'r' ? 'r' : o.r === 'y' ? 'y' : 'g' },
    { l: 'Педагогов ниже цели', v: String(o.below), d: 'Ниже 74 500 ₽', c: o.below > 8 ? 'r' : o.below > 0 ? 'y' : 'g' },
    { l: 'АХР / педагоги', v: o.ahr + '%', d: o.ahr > 35 ? 'Выше норматива' : 'В норме', c: o.ahr > 40 ? 'r' : o.ahr > 35 ? 'y' : 'g' },
    { l: 'Укомплектованность', v: (o.staffingRate || '—') + '%', d: (o.staffingRate || 90) >= 95 ? 'В норме' : 'Ниже нормы', c: colorStaffing(o.staffingRate || 90) === 'r' ? 'r' : colorStaffing(o.staffingRate || 90) === 'y' ? 'y' : 'g' },
    { l: 'Текучесть кадров', v: (o.turnover || '—') + '%', d: (o.turnover || 8) <= 7 ? 'Норма' : 'Повышенная', c: colorTurnover(o.turnover || 8) === 'r' ? 'r' : colorTurnover(o.turnover || 8) === 'y' ? 'y' : 'g' },
    { l: 'Субвенция', v: subv + '%', d: subv < 85 ? 'Риск неосвоения' : 'Исполнение в норме', c: subv < 85 ? 'r' : subv < 92 ? 'y' : 'g' }
  ].map(function (p) {
    return '<div class="pc ' + p.c + '"><h4>' + p.l + '</h4><div class="pval">' + p.v + '</div><div class="pdesc">' + p.d + '</div></div>';
  }).join('');

  var ins = o.r === 'r' ? [
    { c: 'r', t: 'Низкая комплектация снижает ФОТ', p: 'Наполняемость ' + o.cap + '%. Расчётный ФОТ формируется по числу учащихся — дефицит носит системный характер.' },
    { c: 'r', t: 'АХР поглощает педагогический фонд', p: o.ahr + '% ФОТ уходит на АХР. Высвобождение 1 ставки — ~120 тыс. ₽/год.' },
    { c: 'y', t: 'Внеурочка как добор', p: ext + '% нагрузки — внеурочная деятельность. Нестабильная модель компенсации низкой ставки.' },
    { c: 'r', t: 'Проблемы с кадрами', p: 'Укомплектованность ' + (o.staffingRate || '—') + '%, текучесть ' + (o.turnover || '—') + '%. Высокий срок закрытия вакансий.' }
  ] : o.r === 'y' ? [
    { c: 'y', t: 'Часть педагогов ниже цели', p: o.below + ' педагогов получают ЗП ниже 74 500 ₽. Причина — неполная ставка или низкая нагрузка.' },
    { c: 'b', t: 'Рекомендация', p: 'Перераспределить часы внутри организации и проверить возможность увеличения аудиторной нагрузки.' }
  ] : [
    { c: 'g', t: 'Устойчивая модель', p: 'Школа достигает целевого уровня ЗП, АХР в норме, комплектация высокая.' },
    { c: 'g', t: 'Кадровая стабильность', p: 'Укомплектованность ' + (o.staffingRate || '—') + '%, текучесть ' + (o.turnover || '—') + '%.' }
  ];
  document.getElementById('org-insights').innerHTML = ins.map(function (x) {
    return '<div class="insight ' + x.c + '"><h4>' + x.t + '</h4><p>' + x.p + '</p></div>';
  }).join('');

  // Employee table with new fields
  document.getElementById('tb-teachers').innerHTML = EMPLOYEES.map(function (emp) {
    if (!emp.name || emp.name === 'Детализация') return '';
    var salaryVal = typeof emp.salary === 'number' ? emp.salary : null;
    var risk = salaryVal && salaryVal < TARGET;
    var eduShort = emp.educationType === 'дошкольное' ? 'Дошк.' : emp.educationType === 'общее' ? 'Общее' : emp.educationType === 'дополнительное' ? 'Доп.' : emp.educationType || '—';
    var catShort = emp.staffCategory === 'педагогические работники' ? 'Педагог' :
      emp.staffCategory === 'руководитель' ? 'Рук-ль' :
      emp.staffCategory === 'заместитель руководителя' ? 'Зам.' :
      emp.staffCategory === 'прочие работники' ? 'Прочие' : emp.staffCategory || '—';
    var posTypeShort = emp.positionType === 'основная' ? 'Осн.' : emp.positionType === 'совмещение' ? 'Совм.' : emp.positionType || '—';
    var loadTypeShort = emp.loadType === 'основная' ? 'Осн.' : emp.loadType === 'внеурочная' ? 'Внеур.' : emp.loadType === 'общая' ? 'Общая' : emp.loadType || '—';

    return '<tr class="' + (risk ? 'risk' : '') + '">' +
      '<td><b>' + emp.name + '</b></td>' +
      '<td>' + eduShort + '</td>' +
      '<td>' + catShort + '</td>' +
      '<td>' + (emp.position || '—') + '</td>' +
      '<td>' + posTypeShort + '</td>' +
      '<td>' + loadTypeShort + '</td>' +
      '<td>' + (emp.loadRate != null ? emp.loadRate.toFixed(2) : '—') + '</td>' +
      '<td>' + (emp.subject || '—') + '</td>' +
      '<td>' + (emp.className || '—') + '</td>' +
      '<td>' + (emp.classCapacity != null ? emp.classCapacity : '—') + '</td>' +
      '<td>' + (emp.weeklyHours || '—') + '</td>' +
      '<td style="font-weight:700;color:' + (salaryVal ? (salaryVal >= TARGET ? '#059669' : '#dc2626') : 'inherit') + '">' + (salaryVal ? fmt(salaryVal) : '—') + '</td>' +
      '<td>' + (salaryVal ? pill(risk ? 'r' : 'g') : '—') + '</td></tr>';
  }).filter(function (row) { return row !== ''; }).join('');

  var toastMap = {
    r: ['⚠️', 'Организация в красной зоне', 'Выявлены системные отклонения по нескольким показателям.', 'r'],
    y: ['📋', 'Требуется внимание', 'Часть педагогов не достигает целевой ЗП.', 'y'],
    g: ['✅', 'Организация в норме', 'Показатели стабильны.', 'g']
  };
  var t = toastMap[o.r];
  toast(t[0], t[1], t[2], t[3]);

  setTimeout(function () {
    // Salary distribution chart
    var e1 = document.getElementById('ch-orgSal');
    if (!e1._ec) e1._ec = echarts.init(e1);
    var dist = o.r === 'r' ? [8, 11, 9, 5, 3, 1, 0] : o.r === 'y' ? [1, 3, 6, 9, 9, 4, 2] : [0, 0, 1, 4, 9, 11, 9];
    e1._ec.setOption({
      grid: { top: 24, right: 16, bottom: 36, left: 48 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: ['<55т', '55–60т', '60–65т', '65–70т', '70–75т', '75–80т', '>80т'], axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value', name: 'Педагогов' },
      series: [{
        type: 'bar', data: dist,
        itemStyle: { color: function (p) { return p.dataIndex < 2 ? '#ef4444' : p.dataIndex < 4 ? '#f59e0b' : '#10b981'; } },
        label: { show: true, position: 'top', fontSize: 10 }
      }]
    });

    // Load structure donut
    var e2 = document.getElementById('ch-orgLoad');
    if (!e2._ec) e2._ec = echarts.init(e2);
    e2._ec.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, textStyle: { fontSize: 11 } },
      series: [{
        type: 'pie', radius: ['38%', '65%'], center: ['50%', '44%'],
        label: { formatter: '{b}\n{d}%', fontSize: 11 },
        data: [
          { value: 100 - ext - 12, name: 'Основная нагрузка', itemStyle: { color: '#2563eb' } },
          { value: 12, name: 'Совмещение', itemStyle: { color: '#93c5fd' } },
          { value: ext, name: 'Внеурочка', itemStyle: { color: ext > 30 ? '#ef4444' : ext > 25 ? '#f59e0b' : '#10b981' } }
        ]
      }]
    });

    // Education type donut (new)
    var eduCounts = { preschool: 0, general: 0, additional: 0 };
    EMPLOYEES.forEach(function (emp) {
      if (emp.educationType === 'дошкольное') eduCounts.preschool++;
      else if (emp.educationType === 'общее') eduCounts.general++;
      else if (emp.educationType === 'дополнительное') eduCounts.additional++;
    });

    var e3 = document.getElementById('ch-orgEduType');
    if (!e3._ec) e3._ec = echarts.init(e3);
    e3._ec.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, textStyle: { fontSize: 11 } },
      series: [{
        type: 'pie', radius: ['38%', '65%'], center: ['50%', '44%'],
        label: { formatter: '{b}\n{d}%', fontSize: 11 },
        data: [
          { value: eduCounts.preschool || 2, name: 'Дошкольное', itemStyle: { color: '#8b5cf6' } },
          { value: eduCounts.general || 8, name: 'Общее', itemStyle: { color: '#2563eb' } },
          { value: eduCounts.additional || 1, name: 'Доп. образование', itemStyle: { color: '#06b6d4' } }
        ]
      }]
    });

    // Staff category donut (new)
    var catCounts = { ped: 0, director: 0, deputy: 0, other: 0 };
    EMPLOYEES.forEach(function (emp) {
      if (emp.staffCategory === 'педагогические работники') catCounts.ped++;
      else if (emp.staffCategory === 'руководитель') catCounts.director++;
      else if (emp.staffCategory === 'заместитель руководителя') catCounts.deputy++;
      else if (emp.staffCategory === 'прочие работники') catCounts.other++;
    });

    var e4 = document.getElementById('ch-orgStaffCat');
    if (!e4._ec) e4._ec = echarts.init(e4);
    e4._ec.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, textStyle: { fontSize: 11 } },
      series: [{
        type: 'pie', radius: ['38%', '65%'], center: ['50%', '44%'],
        label: { formatter: '{b}\n{d}%', fontSize: 11 },
        data: [
          { value: catCounts.ped || 8, name: 'Педагоги', itemStyle: { color: '#2563eb' } },
          { value: catCounts.director || 1, name: 'Руководитель', itemStyle: { color: '#ef4444' } },
          { value: catCounts.deputy || 1, name: 'Замы', itemStyle: { color: '#f59e0b' } },
          { value: catCounts.other || 1, name: 'Прочие', itemStyle: { color: '#6b7280' } }
        ]
      }]
    });
  }, 80);
}
