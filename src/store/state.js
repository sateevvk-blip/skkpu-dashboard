/**
 * state.js — единая точка хранения загруженных данных дашборда.
 *
 * Все скрипты читают данные через AppState, а не через window._*.
 * DataService пишет данные через AppState.set().
 * window._* более не используются.
 */
const AppState = (function () {
  'use strict';

  const _data = {
    geo:          null,
    districts:    null,
    teacherNames: null,
    teacherRoles: null,
    employees:    [],
    mapMetric:    'zp'   // текущий показатель карты (fix #14)
  };

  /**
   * Записать данные в стор.
   * @param {string} key   — один из: 'geo', 'districts', 'teacherNames', 'teacherRoles', 'employees', 'mapMetric'
   * @param {*}      value — загруженные данные
   */
  function set(key, value) {
    if (!(key in _data)) {
      console.warn('[AppState] Попытка записать неизвестный ключ:', key);
      return;
    }
    _data[key] = value;
  }

  /**
   * Прочитать данные из стора.
   * @param {string} key
   * @returns {*}
   */
  function get(key) {
    return _data[key];
  }

  /**
   * Проверить, все ли обязательные данные загружены.
   * @returns {boolean}
   */
  function isReady() {
    return _data.geo !== null && _data.districts !== null;
  }

  return { set, get, isReady };
})();
