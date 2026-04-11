/**
 * sort-districts.js — кликабельные заголовки таблицы «Рейтинг округов по средней ЗП».
 *
 * Ожидает:
 *   <thead id="tb-districts-head"> с <th data-col="..."> — Округ, zp, diff, ahr, cap, status
 *   <tbody id="tb-districts"> — строки, уже заполненные district.js / charts-mo.js
 *
 * Каждый <th data-col> получает:
 *   cursor: pointer, aria-sort, иконку (↑↓)
 * При клике строки tbody сортируются на месте.
 *
 * Числовые значения берутся из data-атрибутов строки (data-zp, data-diff, data-ahr, data-cap, data-status).
 * Если data-атрибуты отсутствуют — fallback на textContent ячейки.
 */

(function () {
  'use strict';

  /* ---- CSS для заголовков ---- */
  var STYLE = [
    '#tb-districts-head th[data-col] {',
    '  cursor: pointer;',
    '  user-select: none;',
    '  white-space: nowrap;',
    '  padding-right: 18px;',
    '  position: relative;',
    '}',
    '#tb-districts-head th[data-col]:hover {',
    '  background: var(--color-surface-offset, #f3f0ec);',
    '}',
    '#tb-districts-head th[data-col]::after {',
    '  content: " ⇅";',
    '  font-size: 0.7em;',
    '  opacity: 0.4;',
    '  position: absolute;',
    '  right: 4px;',
    '}',
    '#tb-districts-head th[data-col][aria-sort="ascending"]::after  { content: " ↑"; opacity: 1; }',
    '#tb-districts-head th[data-col][aria-sort="descending"]::after { content: " ↓"; opacity: 1; }'
  ].join('\n');

  var styleEl = document.createElement('style');
  styleEl.textContent = STYLE;
  document.head.appendChild(styleEl);

  /* ---- Состояние сортировки ---- */
  var sortState = { col: null, dir: 1 }; // dir: 1 = asc, -1 = desc

  /* ---- Вспомогательные функции ---- */

  /** Возвращает числовое значение для числовых колонок, строку — для текстовых. */
  function getCellValue(tr, colIndex, colName) {
    // Приоритет — data-атрибут на <tr>
    if (tr.dataset[colName] !== undefined) {
      var v = tr.dataset[colName];
      var n = parseFloat(v);
      return isNaN(n) ? v : n;
    }
    // Fallback — textContent ячейки
    var cell = tr.cells[colIndex];
    if (!cell) return '';
    var txt = cell.textContent.trim();
    // Убираем единицы (т.₽, %, пробелы)
    var cleaned = txt.replace(/[^\d.\-]/g, '');
    var num = parseFloat(cleaned);
    return isNaN(num) ? txt : num;
  }

  /** Статус: r < y < g для правильного порядка. */
  var STATUS_ORDER = { r: 0, y: 1, g: 2 };

  function compareRows(a, b, colIndex, colName, dir) {
    var va = getCellValue(a, colIndex, colName);
    var vb = getCellValue(b, colIndex, colName);

    if (colName === 'status') {
      va = STATUS_ORDER[va] !== undefined ? STATUS_ORDER[va] : 99;
      vb = STATUS_ORDER[vb] !== undefined ? STATUS_ORDER[vb] : 99;
    }

    if (typeof va === 'number' && typeof vb === 'number') {
      return (va - vb) * dir;
    }
    return String(va).localeCompare(String(vb), 'ru') * dir;
  }

  /* ---- Применить сортировку ---- */
  function applySort(colName, colIndex) {
    var tbody = document.getElementById('tb-districts');
    if (!tbody) return;

    // Переключаем направление при повторном клике
    if (sortState.col === colName) {
      sortState.dir *= -1;
    } else {
      sortState.col = colName;
      sortState.dir = 1;
    }

    var rows = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
    rows.sort(function (a, b) {
      return compareRows(a, b, colIndex, colName, sortState.dir);
    });
    rows.forEach(function (r) { tbody.appendChild(r); });

    // Обновляем aria-sort на всех th
    var head = document.getElementById('tb-districts-head');
    if (!head) return;
    head.querySelectorAll('th[data-col]').forEach(function (th) {
      if (th.dataset.col === colName) {
        th.setAttribute('aria-sort', sortState.dir === 1 ? 'ascending' : 'descending');
      } else {
        th.removeAttribute('aria-sort');
      }
    });
  }

  /* ---- Инициализация: навешиваем обработчики ---- */
  function initSort() {
    var head = document.getElementById('tb-districts-head');
    if (!head) return;
    var ths = head.querySelectorAll('th[data-col]');
    ths.forEach(function (th, idx) {
      th.setAttribute('tabindex', '0');
      th.setAttribute('role', 'columnheader');
      th.setAttribute('title', 'Нажмите для сортировки');

      function doSort() { applySort(th.dataset.col, idx); }
      th.addEventListener('click', doSort);
      th.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doSort(); }
      });
    });
  }

  /* ---- Запуск: после DOMContentLoaded ---- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSort);
  } else {
    initSort();
  }

  /* ---- Публичный API: переинициализация после перерендера таблицы ---- */
  window.initDistrictSort = initSort;

}());
