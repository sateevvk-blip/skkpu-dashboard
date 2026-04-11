/**
 * data-service.js — единая точка доступа к данным дашборда.
 *
 * Загружает JSON-файлы и сохраняет результаты в AppState.
 * В продакшне замените обращения к fetch-запросам на вызовы API.
 */
const DataService = (function () {
  'use strict';

  async function loadJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load ' + url);
    return res.json();
  }

  /**
   * Загрузить все данные и записать в AppState.
   * @returns {Promise<void>}
   */
  async function loadAll() {
    const [geo, districts, teachers] = await Promise.all([
      loadJSON('data/geo.json'),
      loadJSON('data/districts.json'),
      loadJSON('data/teachers.json')
    ]);

    AppState.set('geo',          geo);
    AppState.set('districts',    districts);
    AppState.set('teacherNames', teachers.names);
    AppState.set('teacherRoles', teachers.roles);
    AppState.set('employees',    teachers.employees || []);
  }

  return { loadAll };
})();
