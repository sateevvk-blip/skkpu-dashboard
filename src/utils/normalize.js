/**
 * normalize.js — нормализация названий округов и предоставление вспомогательной
 * функции getDistrictName.
 *
 * Ранее вся эта логика находилась в patch-stage1-names.js.
 * Теперь вызывается из app.js через normalizeDistrictNames().
 */

// Справочник сокращённых названий
const SHORT_NAMES = {
  'Балашиха':             'Балашиха',
  'Богородский':          'Богородский',
  'Бронницы':             'Бронницы',
  'Волоколамск':          'Волоколамск',
  'Воскресенск':          'Воскресенск',
  'Дмитров':               'Дмитров',
  'Домодедово':           'Домодедово',
  'Дубна':                'Дубна',
  'Егорьевск':            'Егорьевск',
  'Жуковский':           'Жуковский',
  'Зарайск':               'Зарайск',
  'Звёздный городок':     'Звёздный',
  'Истра':                 'Истра',
  'Кашира':               'Кашира',
  'Клин':                  'Клин',
  'Коломна':               'Коломна',
  'Королёв':              'Королёв',
  'Красногорск':         'Красногорск',
  'Краснознаменск':       'Краснозн-к',
  'Лобня':                 'Лобня',
  'Лотошино':             'Лотошино',
  'Луховицы':            'Луховицы',
  'Лыткарино':           'Лыткарино',
  'Люберцы':             'Люберцы',
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
  'Раменское':           'Раменское',
  'Реутов':                'Реутов',
  'Рошаль':               'Рошаль',
  'Руза':                  'Руза',
  'Сергиев Посад':        'Серг. Посад',
  'Серебряные Пруды':     'Сереб. Пруды',
  'Серпухов':             'Серпухов',
  'Солнечногорск':       'Солнечногорск',
  'Ступино':               'Ступино',
  'Талдом':                'Талдом',
  'Фрязево':              'Фрязево',
  'Фрязино':              'Фрязино',
  'Химки':                 'Химки',
  'Черноголовка':        'Черноголовка',
  'Чехов':                 'Чехов',
  'Шатура':                'Шатура',
  'Шаховская':           'Шаховская',
  'Щёлково':              'Щёлково'
};

/**
 * Возвращает сокращённое название округа.
 * @param {string} fullName
 * @returns {string}
 */
function getShortName(fullName) {
  if (!fullName) return '';
  if (SHORT_NAMES[fullName]) return SHORT_NAMES[fullName];
  const m = fullName.match(/городской округ\s+(.+)/i);
  if (m) return m[1].trim();
  if (fullName.length > 14) return fullName.slice(0, 12) + '…';
  return fullName;
}

/**
 * Нормализует названия округов в DISTRICTS и GEO из AppState.
 * Добавляет shortName ко всем записям.
 * Регистрирует глобальный хелпер window.getDistrictName для обратной
 * совместимости с кодом, который пока ещё использует эту функцию.
 */
function normalizeDistrictNames() {
  const districts = AppState.get('districts');
  const geo       = AppState.get('geo');
  if (!districts || !geo) return;

  const dKeys = Object.keys(districts);

  // Добавить shortName ко всем округам
  dKeys.forEach(function (k) {
    if (!districts[k].shortName) {
      districts[k].shortName = getShortName(k);
    }
  });

  // Нормализация GeoJSON features
  geo.features.forEach(function (f) {
    const p   = f.properties || {};
    const raw = p.name_clean || p.name || '';

    if (dKeys.indexOf(raw) !== -1) {
      p.shortName = districts[raw].shortName;
      return;
    }

    const numMatch = raw.match(/^Округ\s+(\d+)$/i);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10) - 1;
      if (dKeys[num]) {
        p.name_clean = dKeys[num];
        p.shortName  = districts[dKeys[num]].shortName;
        return;
      }
    }

    const lower = raw.toLowerCase();
    const found = dKeys.find(function (k) {
      return k.toLowerCase() === lower ||
             k.toLowerCase().indexOf(lower) !== -1 ||
             lower.indexOf(k.toLowerCase()) !== -1;
    });
    if (found) {
      p.name_clean = found;
      p.shortName  = districts[found].shortName;
    } else {
      p.shortName = getShortName(raw);
    }
  });

  // Хелпер для остальных модулей, пока они не перешли на AppState
  window.getDistrictName = function (rawOrKey, opts) {
    opts = opts || {};
    if (!rawOrKey) return '';
    if (dKeys.indexOf(rawOrKey) !== -1) {
      return opts.short ? districts[rawOrKey].shortName : rawOrKey;
    }
    const m = String(rawOrKey).match(/^Округ\s+(\d+)$/i);
    if (m) {
      const k = dKeys[parseInt(m[1], 10) - 1];
      if (k) return opts.short ? districts[k].shortName : k;
    }
    return rawOrKey;
  };

  console.info('[normalize] Нормализация: ' + dKeys.length + ' округов');

  window.dispatchEvent(new CustomEvent('app:ready'));
}
