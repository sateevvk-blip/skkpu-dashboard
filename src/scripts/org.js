/**
 * Organisation level — rendering and drill-down.
 */

function openOrg(o) {
  state.org = o;
  renderOrg(o);
}

function renderOrg(o) {
  var TEACHER_NAMES = window._TEACHER_NAMES;
  var TEACHER_ROLES = window._TEACHER_ROLES;

  showPage('org');
  document.getElementById('org-title').textContent = o.name;
  document.getElementById('org-sub').textContent = state.district + ' · уровень организации · причины отклонений';
  document.getElementById('org-name').textContent = o.name;
  document.getElementById('org-meta').innerHTML =
    '<span>📍 ' + state.district + '</span>' +
    '<span>👨‍🏫 ' + o.teachers + ' педагогов</span>' +
    '<span>🧑‍🎓 ' + o.students.toLocaleString('ru-RU') + ' уч.</span>' +
    '<span>🏫 ' + o.classes + ' классов</span>';

  var st = document.getElementById('org-status');
  st.textContent = stxt(o.r);
  st.className = 'org-status ' + o.r;

  var ext = o.r === 'r' ? 34 : o.r === 'y' ? 26 : 13;
  var subv = o.r === 'r' ? 82 : o.r === 'y' ? 89 : 95;

  document.getElementById('org-problems').innerHTML = [
    { l: 'Средняя ЗП', v: fmtK(o.zp), d: 'Отклонение: ' + fmtDiff(o.zp), c: o.r === 'r' ? 'r' : o.r === 'y' ? 'y' : 'g' },
    { l: 'Педагогов ниже цели', v: String(o.below), d: 'Ниже 74 500 ₽', c: o.below > 8 ? 'r' : o.below > 0 ? 'y' : 'g' },
    { l: 'АХР / педагоги', v: o.ahr + '%', d: o.ahr > 35 ? 'Выше норматива' : 'В норме', c: o.ahr > 40 ? 'r' : o.ahr > 35 ? 'y' : 'g' },
    { l: 'Комплектация', v: o.cap + '%', d: o.cap < 70 ? 'Низкая наполняемость' : 'В норме', c: o.cap < 70 ? 'r' : o.cap < 80 ? 'y' : 'g' },
    { l: 'Внеурочка', v: ext + '%', d: ext > 30 ? 'Признак компенсации' : 'В норме', c: ext > 30 ? 'r' : ext > 25 ? 'y' : 'g' },
    { l: 'Субвенция', v: subv + '%', d: subv < 85 ? 'Риск неосвоения' : 'Исполнение в норме', c: subv < 85 ? 'r' : subv < 92 ? 'y' : 'g' }
  ].map(function (p) {
    return '<div class="pc ' + p.c + '"><h4>' + p.l + '</h4><div class="pval">' + p.v + '</div><div class="pdesc">' + p.d + '</div></div>';
  }).join('');

  var ins = o.r === 'r' ? [
    { c: 'r', t: 'Низкая комплектация снижает ФОТ', p: 'Наполняемость ' + o.cap + '%. Расчётный ФОТ формируется по числу учащихся — дефицит носит системный характер.' },
    { c: 'r', t: 'АХР поглощает педагогический фонд', p: o.ahr + '% ФОТ уходит на АХР. Высвобождение 1 ставки — ~120 тыс. ₽/год.' },
    { c: 'y', t: 'Внеурочка как добор', p: ext + '% нагрузки — внеурочная деятельность. Нестабильная модель компенсации низкой ставки.' }
  ] : o.r === 'y' ? [
    { c: 'y', t: 'Часть педагогов ниже цели', p: o.below + ' педагогов получают ЗП ниже 74 500 ₽. Причина — неполная ставка или низкая нагрузка.' },
    { c: 'b', t: 'Рекомендация', p: 'Перераспределить часы внутри организации и проверить возможность увеличения аудиторной нагрузки.' }
  ] : [
    { c: 'g', t: 'Устойчивая модель', p: 'Школа достигает целевого уровня ЗП, АХР в норме, комплектация высокая.' }
  ];
  document.getElementById('org-insights').innerHTML = ins.map(function (x) {
    return '<div class="insight ' + x.c + '"><h4>' + x.t + '</h4><p>' + x.p + '</p></div>';
  }).join('');

  document.getElementById('tb-teachers').innerHTML = TEACHER_NAMES.map(function (n, i) {
    var total = Math.round(o.zp + (i - 3.5) * 2400);
    var base = Math.round(total * .68);
    var stim = Math.round(total * .18);
    var ex = total - base - stim;
    var risk = total < TARGET;
    var extH = i < 3 ? 4 + i : 1 + (i % 3);
    return '<tr class="' + (risk ? 'risk' : '') + '">' +
      '<td><b>' + n + '</b></td><td>' + TEACHER_ROLES[i] + '</td>' +
      '<td>' + (i < 2 ? '0.75' : '1.00') + '</td><td>' + (18 + (i % 5)) + '</td>' +
      '<td style="color:' + (extH > 4 ? '#dc2626' : extH > 2 ? '#d97706' : 'inherit') + '">' + extH + '</td>' +
      '<td>' + fmt(base) + '</td><td>' + fmt(stim) + '</td>' +
      '<td style="font-weight:700;color:' + (total >= TARGET ? '#059669' : '#dc2626') + '">' + fmt(total) + '</td>' +
      '<td>' + pill(risk ? 'r' : 'g') + '</td></tr>';
  }).join('');

  var toastMap = {
    r: ['⚠️', 'Организация в красной зоне', 'Выявлены системные отклонения по нескольким показателям.', 'r'],
    y: ['📋', 'Требуется внимание', 'Часть педагогов не достигает целевой ЗП.', 'y'],
    g: ['✅', 'Организация в норме', 'Показатели стабильны.', 'g']
  };
  var t = toastMap[o.r];
  toast(t[0], t[1], t[2], t[3]);

  setTimeout(function () {
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
  }, 80);
}
