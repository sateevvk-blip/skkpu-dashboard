/**
 * district-tiles.js — интерактивные плитки ОМСУ.
 *
 * Замена Leaflet-карты на сетку плиток (одна плитка = один ОМСУ).
 * Интеграция с AppState: клик по плитке устанавливает AppState.set('selectedDistrict', name)
 * и вызывает openDistrict(name) для drill-down навигации.
 *
 * feat(#31): реализация на основе referens-дашборда ЦУР (цветовая заливка по доле
 *            метрики + легенда диапазонов + тултип при наведении).
 *
 * Публичное API:
 *   initDistrictTiles(containerId)  — инициализация в указанном DOM-контейнере
 *   refreshDistrictTiles()          — перерисовка при смене метрики (вызывается из setMetric)
 */

(function () {
  'use strict';

  // ─── Конфиг метрик (синхронизирован с map.js METRIC_CONFIG) ─────────────────
  var METRIC_CONFIG = {
    zp: {
      label: 'Средняя ЗП',
      thresholds: [50000, 75000],
      format: function (v) { return v != null ? fmtK(v) : '—'; },
      zones: [
        { label: 'Свыше 75k', color: '#10b981', test: function (v, t) { return v >= t[1]; } },
        { label: '50k – 75k', color: '#f59e0b', test: function (v, t) { return v >= t[0] && v < t[1]; } },
        { label: 'Ниже 50k',  color: '#ef4444', test: function (v, t) { return v < t[0]; } },
        { label: 'Нет данных', color: '#6b7280', test: function (v) { return v == null || isNaN(v); } }
      ]
    },
    staffingRate: {
      label: 'Комплектация',
      thresholds: [0.85, 0.95],
      format: function (v) { return v != null ? (v * 100).toFixed(1) + '%' : '—'; },
      zones: [
        { label: '≥ 95%',    color: '#10b981', test: function (v, t) { return v >= t[1]; } },
        { label: '85% – 95%', color: '#f59e0b', test: function (v, t) { return v >= t[0] && v < t[1]; } },
        { label: '< 85%',    color: '#ef4444', test: function (v, t) { return v < t[0]; } },
        { label: 'Нет данных', color: '#6b7280', test: function (v) { return v == null || isNaN(v); } }
      ]
    },
    age: {
      label: 'Средний возраст',
      thresholds: [35, 50],
      format: function (v) { return v != null ? v.toFixed(1) + ' лет' : '—'; },
      zones: [
        { label: '35 – 50 лет', color: '#10b981', test: function (v, t) { return v >= t[0] && v < t[1]; } },
        { label: '< 35 лет',   color: '#f59e0b', test: function (v, t) { return v < t[0]; } },
        { label: '> 50 лет',   color: '#ef4444', test: function (v, t) { return v >= t[1]; } },
        { label: 'Нет данных', color: '#6b7280', test: function (v) { return v == null || isNaN(v); } }
      ]
    },
    experience: {
      label: 'Средний стаж',
      thresholds: [3, 7],
      format: function (v) { return v != null ? v.toFixed(1) + ' лет' : '—'; },
      zones: [
        { label: '≥ 7 лет',  color: '#10b981', test: function (v, t) { return v >= t[1]; } },
        { label: '3 – 7 лет', color: '#f59e0b', test: function (v, t) { return v >= t[0] && v < t[1]; } },
        { label: '< 3 лет',  color: '#ef4444', test: function (v, t) { return v < t[0]; } },
        { label: 'Нет данных', color: '#6b7280', test: function (v) { return v == null || isNaN(v); } }
      ]
    },
    staffing: {
      label: 'Укомплект-ть',
      thresholds: [0.85, 0.95],
      format: function (v) { return v != null ? (v * 100).toFixed(1) + '%' : '—'; },
      zones: [
        { label: '≥ 95%',    color: '#10b981', test: function (v, t) { return v >= t[1]; } },
        { label: '85% – 95%', color: '#f59e0b', test: function (v, t) { return v >= t[0] && v < t[1]; } },
        { label: '< 85%',    color: '#ef4444', test: function (v, t) { return v < t[0]; } },
        { label: 'Нет данных', color: '#6b7280', test: function (v) { return v == null || isNaN(v); } }
      ]
    },
    turnover: {
      label: 'Текучесть',
      thresholds: [0.05, 0.07],
      format: function (v) { return v != null ? (v * 100).toFixed(1) + '%' : '—'; },
      zones: [
        { label: '< 5%',   color: '#10b981', test: function (v, t) { return v < t[0]; } },
        { label: '5% – 7%', color: '#f59e0b', test: function (v, t) { return v >= t[0] && v < t[1]; } },
        { label: '≥ 7%',   color: '#ef4444', test: function (v, t) { return v >= t[1]; } },
        { label: 'Нет данных', color: '#6b7280', test: function (v) { return v == null || isNaN(v); } }
      ]
    }
  };

  // ─── Получить цвет плитки по значению метрики ────────────────────────────────
  function getTileColor(val, metricKey) {
    var cfg = METRIC_CONFIG[metricKey] || METRIC_CONFIG.zp;
    var thresholds = cfg.thresholds;
    // Проверяем зоны по порядку: первая совпавшая выигрывает
    for (var i = 0; i < cfg.zones.length; i++) {
      if (cfg.zones[i].test(val, thresholds)) return cfg.zones[i].color;
    }
    return '#6b7280'; // fallback: нет данных
  }

  // ─── Рендер легенды ──────────────────────────────────────────────────────────
  function renderLegend(container, metricKey) {
    var cfg = METRIC_CONFIG[metricKey] || METRIC_CONFIG.zp;
    var legendEl = container.querySelector('.dt-legend');
    if (!legendEl) return;
    legendEl.innerHTML = cfg.zones.map(function (z) {
      return '<span class="dt-legend-item">' +
        '<span class="dt-legend-swatch" style="background:' + z.color + '"></span>' +
        '<span class="dt-legend-label">' + z.label + '</span>' +
        '</span>';
    }).join('');
  }

  // ─── Рендер всей сетки плиток ────────────────────────────────────────────────
  function renderTiles(container) {
    var grid = container.querySelector('.dt-grid');
    if (!grid) return;

    var districts = AppState.get('districts') || {};
    var metric = AppState.get('mapMetric') || 'zp';
    var cfg = METRIC_CONFIG[metric] || METRIC_CONFIG.zp;
    var selectedDistrict = AppState.get('selectedDistrict') || null;

    var names = Object.keys(districts);
    if (!names.length) {
      grid.innerHTML = '<p class="dt-empty">Нет данных по округам</p>';
      return;
    }

    grid.innerHTML = names.map(function (name) {
      var distData = districts[name] || {};
      var val = distData[metric];
      var color = getTileColor(val, metric);
      var formatted = cfg.format(val);
      var isSelected = selectedDistrict === name;

      // Короткое название: убрать типовой суффикс «г.о.» / «м.р.» из конца
      var shortName = name
        .replace(/\s*(г\.\s*о\.?|городской\s*округ|муниципальный\s*район)\s*$/i, '')
        .trim();

      return '<button ' +
        'class="dt-tile' + (isSelected ? ' dt-tile--selected' : '') + '" ' +
        'style="--tile-color:' + color + '" ' +
        'data-district="' + name.replace(/"/g, '&quot;') + '" ' +
        'title="' + name.replace(/"/g, '&quot;') + ': ' + formatted + '" ' +
        'aria-label="' + name.replace(/"/g, '&quot;') + ', ' + cfg.label + ': ' + formatted + '">' +
        '<span class="dt-tile__name">' + shortName + '</span>' +
        '<span class="dt-tile__value">' + formatted + '</span>' +
        '</button>';
    }).join('');

    // Навешиваем обработчики кликов
    var tiles = grid.querySelectorAll('.dt-tile');
    tiles.forEach(function (tile) {
      tile.addEventListener('click', function () {
        var districtName = tile.dataset.district;
        // Снять выделение с предыдущей плитки
        grid.querySelectorAll('.dt-tile--selected').forEach(function (t) {
          t.classList.remove('dt-tile--selected');
        });
        tile.classList.add('dt-tile--selected');
        AppState.set('selectedDistrict', districtName);
        // Drill-down навигация (как в старом map.js)
        if (typeof openDistrict === 'function') {
          openDistrict(districtName);
        }
      });
    });
  }

  // ─── Публичная инициализация ─────────────────────────────────────────────────
  window.initDistrictTiles = function (containerId) {
    var container = document.getElementById(containerId);
    if (!container) {
      console.warn('[district-tiles] контейнер #' + containerId + ' не найден');
      return;
    }

    // Собираем разметку компонента
    container.innerHTML =
      '<div class="dt-wrap">' +
        '<div class="dt-grid"></div>' +
        '<div class="dt-legend"></div>' +
      '</div>';

    var metric = AppState.get('mapMetric') || 'zp';
    renderLegend(container, metric);
    renderTiles(container);
  };

  // ─── Публичное обновление (вызывается из setMetric) ─────────────────────────
  window.refreshDistrictTiles = function () {
    var container = document.getElementById('district-tiles');
    if (!container) return;
    var metric = AppState.get('mapMetric') || 'zp';
    renderLegend(container, metric);
    renderTiles(container);
  };

}());
