/**
 * district-tiles.js — SVG-карта ОМСУ по реальным геоконтурам.
 *
 * fix(#31): плитки округов рендерятся как <path> в <svg>
 * по координатам полигонов из data/geo.json.
 * Форма каждой плитки совпадает с границами округа;
 * все округа вместе образуют контур Московской области.
 *
 * fix(#33): refreshDistrictTiles теперь вызывает полный renderSvgMap
 *           (а не только repaintPaths), чтобы гарантировать обновление
 *           цвета, aria-label и title-элементов при смене метрики.
 *           Добавлена функция setMetric() — глобальный обработчик кнопок
 *           .mf-btn в index.html.
 *
 * Публичное API:
 *   initDistrictTiles(containerId)  — загрузить geo.json и отрисовать карту
 *   refreshDistrictTiles()          — перерисовать карту при смене метрики
 *   setMetric(metricKey, btnEl)     — переключить метрику и перерисовать
 */

(function () {
  'use strict';

  // ─── Конфиг метрик ───────────────────────────────────────────────────────────
  var METRIC_CONFIG = {
    zp: {
      label: 'Средняя ЗП',
      thresholds: [50000, 75000],
      format: function (v) { return v != null ? fmtK(v) : '—'; },
      zones: [
        { label: 'Свыше 75k',  color: '#10b981', test: function (v, t) { return v >= t[1]; } },
        { label: '50k – 75k',  color: '#f59e0b', test: function (v, t) { return v >= t[0] && v < t[1]; } },
        { label: 'Ниже 50k',   color: '#ef4444', test: function (v, t) { return v < t[0]; } },
        { label: 'Нет данных', color: '#9ca3af', test: function (v) { return v == null || isNaN(v); } }
      ]
    },
    staffingRate: {
      label: 'Комплектация',
      thresholds: [0.85, 0.95],
      format: function (v) { return v != null ? (v * 100).toFixed(1) + '%' : '—'; },
      zones: [
        { label: '≥ 95%',      color: '#10b981', test: function (v, t) { return v >= t[1]; } },
        { label: '85% – 95%',  color: '#f59e0b', test: function (v, t) { return v >= t[0] && v < t[1]; } },
        { label: '< 85%',      color: '#ef4444', test: function (v, t) { return v < t[0]; } },
        { label: 'Нет данных', color: '#9ca3af', test: function (v) { return v == null || isNaN(v); } }
      ]
    },
    age: {
      label: 'Средний возраст',
      thresholds: [35, 50],
      format: function (v) { return v != null ? v.toFixed(1) + ' лет' : '—'; },
      zones: [
        { label: '35 – 50 лет', color: '#10b981', test: function (v, t) { return v >= t[0] && v < t[1]; } },
        { label: '< 35 лет',    color: '#f59e0b', test: function (v, t) { return v < t[0]; } },
        { label: '> 50 лет',    color: '#ef4444', test: function (v, t) { return v >= t[1]; } },
        { label: 'Нет данных',  color: '#9ca3af', test: function (v) { return v == null || isNaN(v); } }
      ]
    },
    experience: {
      label: 'Средний стаж',
      thresholds: [3, 7],
      format: function (v) { return v != null ? v.toFixed(1) + ' лет' : '—'; },
      zones: [
        { label: '≥ 7 лет',    color: '#10b981', test: function (v, t) { return v >= t[1]; } },
        { label: '3 – 7 лет',  color: '#f59e0b', test: function (v, t) { return v >= t[0] && v < t[1]; } },
        { label: '< 3 лет',    color: '#ef4444', test: function (v, t) { return v < t[0]; } },
        { label: 'Нет данных', color: '#9ca3af', test: function (v) { return v == null || isNaN(v); } }
      ]
    },
    staffing: {
      label: 'Укомплект-ть',
      thresholds: [0.85, 0.95],
      format: function (v) { return v != null ? (v * 100).toFixed(1) + '%' : '—'; },
      zones: [
        { label: '≥ 95%',      color: '#10b981', test: function (v, t) { return v >= t[1]; } },
        { label: '85% – 95%',  color: '#f59e0b', test: function (v, t) { return v >= t[0] && v < t[1]; } },
        { label: '< 85%',      color: '#ef4444', test: function (v, t) { return v < t[0]; } },
        { label: 'Нет данных', color: '#9ca3af', test: function (v) { return v == null || isNaN(v); } }
      ]
    },
    turnover: {
      label: 'Текучесть',
      thresholds: [0.05, 0.07],
      format: function (v) { return v != null ? (v * 100).toFixed(1) + '%' : '—'; },
      zones: [
        { label: '< 5%',       color: '#10b981', test: function (v, t) { return v < t[0]; } },
        { label: '5% – 7%',    color: '#f59e0b', test: function (v, t) { return v >= t[0] && v < t[1]; } },
        { label: '≥ 7%',       color: '#ef4444', test: function (v, t) { return v >= t[1]; } },
        { label: 'Нет данных', color: '#9ca3af', test: function (v) { return v == null || isNaN(v); } }
      ]
    }
  };

  // ─── Цвет по метрике ─────────────────────────────────────────────────────────
  function getTileColor(val, metricKey) {
    var cfg = METRIC_CONFIG[metricKey] || METRIC_CONFIG.zp;
    for (var i = 0; i < cfg.zones.length; i++) {
      if (cfg.zones[i].test(val, cfg.thresholds)) return cfg.zones[i].color;
    }
    return '#9ca3af';
  }

  // ─── Вычислить bounding box по всем полигонам FeatureCollection ──────────────
  function calcBBox(features) {
    var minLon = Infinity, maxLon = -Infinity;
    var minLat = Infinity, maxLat = -Infinity;
    features.forEach(function (f) {
      var geom = f.geometry;
      if (!geom) return;
      var allRings = geom.type === 'Polygon'
        ? geom.coordinates
        : geom.coordinates.reduce(function (a, b) { return a.concat(b); }, []);
      allRings.forEach(function (ring) {
        ring.forEach(function (pt) {
          if (pt[0] < minLon) minLon = pt[0];
          if (pt[0] > maxLon) maxLon = pt[0];
          if (pt[1] < minLat) minLat = pt[1];
          if (pt[1] > maxLat) maxLat = pt[1];
        });
      });
    });
    return { minLon: minLon, maxLon: maxLon, minLat: minLat, maxLat: maxLat };
  }

  // ─── Спроецировать [lon, lat] → [svgX, svgY] ─────────────────────────────────
  // Применяем лёгкую Mercator-коррекцию по широте, чтобы форма не казалась
  // сплющенной (Московская область ~55–57°N, cos(56°) ≈ 0.559).
  function makeProjector(bbox, W, H, padding) {
    var p = padding || 16;
    var innerW = W - p * 2;
    var innerH = H - p * 2;

    var lonSpan = bbox.maxLon - bbox.minLon;
    var latSpan = bbox.maxLat - bbox.minLat;
    var latMid = (bbox.minLat + bbox.maxLat) / 2;
    var cosLat  = Math.cos(latMid * Math.PI / 180);
    var geoAspect = (lonSpan * cosLat) / latSpan;
    var svgAspect = innerW / innerH;

    var scaleX, scaleY, offsetX, offsetY;
    if (geoAspect > svgAspect) {
      scaleX = innerW / lonSpan;
      scaleY = scaleX / cosLat;
      var usedH = latSpan * scaleY;
      offsetX = p;
      offsetY = p + (innerH - usedH) / 2;
    } else {
      scaleY = innerH / latSpan;
      scaleX = scaleY * cosLat;
      var usedW = lonSpan * scaleX;
      offsetX = p + (innerW - usedW) / 2;
      offsetY = p;
    }

    return function (lon, lat) {
      var x = offsetX + (lon - bbox.minLon) * scaleX;
      var y = offsetY + (bbox.maxLat - lat) * scaleY;
      return [x, y];
    };
  }

  // ─── Построить SVG path «d» из кольца координат ──────────────────────────────
  function ringToPath(ring, proj) {
    return ring.map(function (pt, i) {
      var xy = proj(pt[0], pt[1]);
      return (i === 0 ? 'M' : 'L') + xy[0].toFixed(2) + ',' + xy[1].toFixed(2);
    }).join(' ') + ' Z';
  }

  // ─── Построить «d» для Feature (Polygon или MultiPolygon) ────────────────────
  function featureToPathD(feature, proj) {
    var geom = feature.geometry;
    if (!geom) return '';
    var parts = [];
    if (geom.type === 'Polygon') {
      geom.coordinates.forEach(function (ring) {
        parts.push(ringToPath(ring, proj));
      });
    } else if (geom.type === 'MultiPolygon') {
      geom.coordinates.forEach(function (poly) {
        poly.forEach(function (ring) {
          parts.push(ringToPath(ring, proj));
        });
      });
    }
    return parts.join(' ');
  }

  // ─── Найти имя района из geo-feature ─────────────────────────────────────────
  function getFeatureName(feature) {
    var p = feature.properties || {};
    return p.district || p.name_clean || p.name || '';
  }

  // ─── Тултип ───────────────────────────────────────────────────────────────────
  var _tooltip = null;

  function ensureTooltip() {
    if (_tooltip) return _tooltip;
    _tooltip = document.createElement('div');
    _tooltip.className = 'dt-tooltip';
    _tooltip.style.cssText = [
      'position:fixed',
      'pointer-events:none',
      'background:rgba(15,15,15,0.88)',
      'color:#fff',
      'padding:6px 10px',
      'border-radius:5px',
      'font-size:12px',
      'line-height:1.45',
      'white-space:nowrap',
      'z-index:9999',
      'display:none',
      'box-shadow:0 2px 8px rgba(0,0,0,0.35)'
    ].join(';');
    document.body.appendChild(_tooltip);
    return _tooltip;
  }

  function showTooltip(e, html) {
    if (!_tooltip) return;
    _tooltip.innerHTML = html;
    _tooltip.style.display = 'block';
    posTooltip(e);
  }

  function posTooltip(e) {
    if (!_tooltip || _tooltip.style.display === 'none') return;
    var x = e.clientX + 14;
    var y = e.clientY - 10;
    var w = _tooltip.offsetWidth || 160;
    var h = _tooltip.offsetHeight || 40;
    if (x + w > window.innerWidth - 8) x = e.clientX - w - 8;
    if (y + h > window.innerHeight - 8) y = e.clientY - h - 6;
    _tooltip.style.left = x + 'px';
    _tooltip.style.top  = y + 'px';
  }

  function hideTooltip() {
    if (_tooltip) _tooltip.style.display = 'none';
  }

  // ─── SVG-размеры ─────────────────────────────────────────────────────────────
  var SVG_W = 900;
  var SVG_H = 660;

  // ─── Легенда ──────────────────────────────────────────────────────────────────
  function renderLegend(container, metricKey) {
    var legendEl = container.querySelector('.dt-legend');
    if (!legendEl) return;
    var cfg = METRIC_CONFIG[metricKey] || METRIC_CONFIG.zp;
    legendEl.innerHTML = cfg.zones.map(function (z) {
      return '<span class="dt-legend-item">' +
        '<span class="dt-legend-swatch" style="background:' + z.color + '"></span>' +
        '<span class="dt-legend-label">' + z.label + '</span>' +
        '</span>';
    }).join('');
  }

  // ─── Основной рендер SVG-карты ───────────────────────────────────────────────
  function renderSvgMap(container, geoJson) {
    var metric    = AppState.get('mapMetric') || 'zp';
    var cfg       = METRIC_CONFIG[metric] || METRIC_CONFIG.zp;
    var districts = AppState.get('districts') || {};
    var selected  = AppState.get('selectedDistrict') || null;

    var features  = geoJson.features || [];
    var bbox      = calcBBox(features);
    var proj      = makeProjector(bbox, SVG_W, SVG_H, 20);

    var svgParts = [
      '<svg class="dt-svg" viewBox="0 0 ' + SVG_W + ' ' + SVG_H + '"',
      ' xmlns="http://www.w3.org/2000/svg"',
      ' aria-label="Карта Московской области по городским округам">'
    ];

    features.forEach(function (feature) {
      var name = getFeatureName(feature);
      var distData = districts[name] || {};
      var val      = distData[metric];
      var color    = getTileColor(val, metric);
      var formatted = cfg.format(val);
      var d        = featureToPathD(feature, proj);
      if (!d) return;

      var isSelected = selected === name;
      var strokeColor = isSelected ? '#fff' : 'rgba(255,255,255,0.6)';
      var strokeW     = isSelected ? '2' : '0.7';
      var safeQuot    = name.replace(/"/g, '&quot;');

      svgParts.push(
        '<path class="dt-map-path"' +
        ' data-district="' + safeQuot + '"' +
        ' d="' + d + '"' +
        ' fill="' + color + '"' +
        ' stroke="' + strokeColor + '"' +
        ' stroke-width="' + strokeW + '"' +
        ' stroke-linejoin="round"' +
        ' fill-rule="evenodd"' +
        ' tabindex="0"' +
        ' role="button"' +
        ' aria-label="' + safeQuot + ', ' + cfg.label + ': ' + formatted + '">' +
        '<title>' + safeQuot + ': ' + formatted + '</title>' +
        '</path>'
      );
    });

    svgParts.push('</svg>');

    var svgWrap = container.querySelector('.dt-svg-wrap');
    if (!svgWrap) return;
    svgWrap.innerHTML = svgParts.join('');

    var svgEl = svgWrap.querySelector('.dt-svg');
    ensureTooltip();

    svgWrap.querySelectorAll('.dt-map-path').forEach(function (path) {
      path.addEventListener('mouseenter', function (e) {
        var distName = path.dataset.district;
        var dData    = (AppState.get('districts') || {})[distName] || {};
        var mKey     = AppState.get('mapMetric') || 'zp';
        var mCfg     = METRIC_CONFIG[mKey] || METRIC_CONFIG.zp;
        var v        = dData[mKey];
        showTooltip(e,
          '<b>' + distName + '</b><br>' +
          mCfg.label + ': <b>' + mCfg.format(v) + '</b>'
        );
        path.setAttribute('stroke', '#fff');
        path.setAttribute('stroke-width', '1.5');
      });
      path.addEventListener('mousemove', posTooltip);
      path.addEventListener('mouseleave', function () {
        hideTooltip();
        var mKey  = AppState.get('mapMetric') || 'zp';
        var sel   = AppState.get('selectedDistrict');
        var distName = path.dataset.district;
        path.setAttribute('stroke', sel === distName ? '#fff' : 'rgba(255,255,255,0.6)');
        path.setAttribute('stroke-width', sel === distName ? '2' : '0.7');
      });

      function handleSelect() {
        var distName = path.dataset.district;
        svgWrap.querySelectorAll('.dt-map-path').forEach(function (p) {
          p.setAttribute('stroke', 'rgba(255,255,255,0.6)');
          p.setAttribute('stroke-width', '0.7');
        });
        path.setAttribute('stroke', '#fff');
        path.setAttribute('stroke-width', '2');
        AppState.set('selectedDistrict', distName);
        if (typeof openDistrict === 'function') openDistrict(distName);
      }
      path.addEventListener('click', handleSelect);
      path.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(); }
      });
    });
  }

  // ─── Публичная инициализация ──────────────────────────────────────────────────
  window.initDistrictTiles = function (containerId) {
    var container = document.getElementById(containerId);
    if (!container) {
      console.warn('[district-tiles] контейнер #' + containerId + ' не найден');
      return;
    }

    container.innerHTML =
      '<div class="dt-wrap">' +
        '<div class="dt-svg-wrap"><div class="dt-loading">Загрузка карты…</div></div>' +
        '<div class="dt-legend"></div>' +
      '</div>';

    var metric = AppState.get('mapMetric') || 'zp';
    renderLegend(container, metric);

    fetch('./data/geo.json')
      .then(function (r) {
        if (!r.ok) throw new Error('geo.json: HTTP ' + r.status);
        return r.json();
      })
      .then(function (geoJson) {
        AppState.set('geoJson', geoJson);
        var svgWrap = container.querySelector('.dt-svg-wrap');
        if (svgWrap) svgWrap.innerHTML = '';
        // fix(#33): гарантируем, что districts уже заполнен (DataService.loadAll
        // завершается до вызова initDistrictTiles в app.js), поэтому
        // renderSvgMap корректно раскрасит все пути с первого рендера.
        renderSvgMap(container, geoJson);
      })
      .catch(function (err) {
        console.error('[district-tiles] ошибка загрузки geo.json:', err);
        var svgWrap = container.querySelector('.dt-svg-wrap');
        if (svgWrap) {
          svgWrap.innerHTML = '<p class="dt-error">Не удалось загрузить геоданные карты</p>';
        }
      });
  };

  // ─── Публичное обновление при смене метрики ───────────────────────────────────
  // fix(#33): вызываем полный renderSvgMap (а не только repaintPaths),
  // чтобы aria-label, title и fill были гарантированно актуальны.
  window.refreshDistrictTiles = function () {
    var container = document.getElementById('district-tiles');
    if (!container) return;
    var metric = AppState.get('mapMetric') || 'zp';
    renderLegend(container, metric);
    var geoJson = AppState.get('geoJson');
    if (geoJson) {
      renderSvgMap(container, geoJson);
    }
  };

  // ─── setMetric — глобальный обработчик кнопок .mf-btn ────────────────────────
  // fix(#33): функция отсутствовала — кнопки onclick="setMetric(...)" не работали.
  window.setMetric = function (metricKey, btn) {
    AppState.set('mapMetric', metricKey);
    var btns = document.querySelectorAll('.map-metrics .mf-btn');
    btns.forEach(function (b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    window.refreshDistrictTiles();
  };

  // ─── Совместимость: _mapRender → refreshDistrictTiles ────────────────────────
  window._mapRender = window.refreshDistrictTiles;

}());
