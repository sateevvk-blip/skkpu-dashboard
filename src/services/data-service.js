/**
 * data-service.js — единая точка доступа к данным дашборда.
 *
 * Загружает JSON-файлы и сохраняет результаты в AppState.
 * В продакшне замените обращения к fetch-запросам на вызовы API.
 *
 * FIXES (issue #11):
 *   — Добавлена загрузка data/organizations.json → AppState('organizations')
 *
 * FIXES (issue #30):
 *   — Bug #2: trim() для districtId у каждого сотрудника перед записью в AppState
 *   — Bug #3: teacherNames и teacherRoles генерируются динамически из employees,
 *             т.к. новый teachers.json содержит только ключ `employees`
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
    const [geo, districts, teachers, orgsData] = await Promise.all([
      loadJSON('data/geo.json'),
      loadJSON('data/districts.json'),
      loadJSON('data/teachers.json'),
      loadJSON('data/organizations.json')  // FIX #11
    ]);

    AppState.set('geo',           geo);
    AppState.set('districts',     districts);
    // FIX #11: organizations доступны через AppState.get('organizations')
    AppState.set('organizations', orgsData.items || []);

    // FIX #30 Bug #2: trim districtId, чтобы устранить ведущие пробелы и \n
    const emps = (teachers.employees || []).map(e => ({
      ...e,
      districtId: typeof e.districtId === 'string' ? e.districtId.trim() : e.districtId
    }));

    AppState.set('employees', emps);

    // FIX #30 Bug #3: teachers.names и teachers.roles отсутствуют в новом формате —
    // генерируем уникальные значения динамически из массива employees
    AppState.set('teacherNames', [...new Set(emps.map(e => e.name).filter(Boolean))]);
    AppState.set('teacherRoles', [...new Set(emps.map(e => e.position).filter(Boolean))]);
  }

  return { loadAll };
})();
