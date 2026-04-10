/**
 * patch-stage1-names.js — STAGE 1 FOUNDATION
 * Должен подключаться ПЕРВЫМ среди всех патчей.
 * Нормализует названия округов во всех слоях данных.
 */
(function stageOneNames() {
  'use strict';

  // ── Список известных сокращений для длинных названий ─────────
  var SHORT = {
    'Балашиха':             'Балашиха',
    'Богородский':          'Богородский',
    'Бронницы':             'Бронницы',
    'Волоколамск':          'Волоколамск',
    'Воскресенск':          'Воскресенск',
    'Дмитров':              'Дмитров',
    'Домодедово':           'Домодедово',
    'Дубна':                'Дубна',
    'Егорьевск':            'Егорьевск',
    'Жуковский':            'Жуковский',
    'Зарайск':              'Зарайск',
    'Звёздный городок':     'Звёздный',
    'Истра':                'Истра',
    'Кашира':               'Кашира',
    'Клин':                 'Клин',
    'Коломна':              'Коломна',
    'Королёв':              'Королёв',
    'Красногорск':          'Красногорск',
    'Краснознаменск':       'Краснозн-к',
    'Лобня':                'Лобня',
    'Лотошино':             'Лотошино',
    'Луховицы':             'Луховицы',
    'Лыткарино':            'Лыткарино',
    'Люберцы':              'Люберцы',
    'Можайск':              'Можайск',
    'Мытищи':               'Мытищи',
    'Наро-Фоминск':         'Наро-Фоминск',
    'Ногинск':              'Ногинск',
    'Одинцово':             'Одинцово',
    'Озёры':                'Озёры',
    'Орехово-Зуево':        'Орехово-З.',
    'Павловский Посад':     'Павл. Посад',
    'Подольск':             'Подольск',
    'Протвино':             'Протвино',
    'Пушкино':              'Пушкино',
    'Пущино':               'Пущино',
    'Раменское':            'Раменское',
    'Реутов':               'Реутов',
    'Рошаль':               'Рошаль',
    'Руза':                 'Руза',
    'Сергиев Посад':        'Серг. Посад',
    'Серебряные Пруды':     'Сереб. Пруды',
    'Серпухов':             'Серпухов',
    'Солнечногорск':        'Солнечногорск',
    'Ступино':              'Ступино',
    'Талдом':               'Талдом',
    'Фрязево':              'Фрязево',
    'Фрязино':              'Фрязино',
    'Химки':                'Химки',
    'Черноголовка':         'Черноголовка',
    'Чехов':                'Чехов',
    'Шатура':               'Шатура',
    'Шаховская':            'Шаховская',
    'Щёлково':              'Щёлково'
  };

  function getShortName(fullName) {
    if (!fullName) return '';
    if (SHORT[fullName]) return SHORT[fullName];
    var m = fullName.match(/городской округ\s+(.+)/i);
    if (m) return m[1].trim();
    if (fullName.length > 14) return fullName.slice(0, 12) + '…';
    return fullName;
  }

  function normalizeAll() {
    var GEO       = window._GEO;
    var DISTRICTS = window._DISTRICTS;
    if (!GEO || !DISTRICTS) return false;

    var dKeys = Object.keys(DISTRICTS);

    dKeys.forEach(function (k) {
      if (!DISTRICTS[k].shortName) {
        DISTRICTS[k].shortName = getShortName(k);
      }
    });

    GEO.features.forEach(function (f) {
      var p = f.properties || {};
      var raw = p.name_clean || p.name || '';

      if (dKeys.indexOf(raw) !== -1) {
        p.shortName = DISTRICTS[raw].shortName;
        return;
      }

      var numMatch = raw.match(/^Округ\s+(\d+)$/i);
      if (numMatch) {
        var num = parseInt(numMatch[1], 10) - 1;
        if (dKeys[num]) {
          p.name_clean = dKeys[num];
          p.shortName  = DISTRICTS[dKeys[num]].shortName;
          return;
        }
      }

      var lower = raw.toLowerCase();
      var found = dKeys.find(function (k) {
        return k.toLowerCase() === lower ||
               k.toLowerCase().indexOf(lower) !== -1 ||
               lower.indexOf(k.toLowerCase()) !== -1;
      });
      if (found) {
        p.name_clean = found;
        p.shortName  = DISTRICTS[found].shortName;
      } else {
        p.shortName = getShortName(raw);
      }
    });

    window._getDistrictName = function (rawOrKey, opts) {
      opts = opts || {};
      if (!rawOrKey) return '';
      if (dKeys.indexOf(rawOrKey) !== -1) {
        return opts.short ? DISTRICTS[rawOrKey].shortName : rawOrKey;
      }
      var m = String(rawOrKey).match(/^Округ\s+(\d+)$/i);
      if (m) {
        var k = dKeys[parseInt(m[1], 10) - 1];
        if (k) return opts.short ? DISTRICTS[k].shortName : k;
      }
      return rawOrKey;
    };

    window.dispatchEvent(new CustomEvent('app:ready'));
    console.info('[stage1] Нормализация: ' + dKeys.length + ' округов');
    return true;
  }

  var _GEO = null, _DIST = null;
  function checkReady() { if (_GEO && _DIST) normalizeAll(); }

  Object.defineProperty(window, '_GEO', {
    get: function () { return _GEO; },
    set: function (v) { _GEO = v; checkReady(); },
    configurable: true
  });
  Object.defineProperty(window, '_DISTRICTS', {
    get: function () { return _DIST; },
    set: function (v) { _DIST = v; checkReady(); },
    configurable: true
  });

  if (window._GEO && window._DISTRICTS) normalizeAll();
})();