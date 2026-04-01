/**
 * Data service — single point of access for dashboard data.
 *
 * In production this module should fetch from a backend API.
 * Currently it loads local mock JSON files so the frontend
 * never treats business values as hardcoded constants.
 */
const DataService = (function () {
  let _geo = null;
  let _districts = null;
  let _teachers = null;

  async function loadJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load ' + url);
    return res.json();
  }

  async function getGeo() {
    if (!_geo) _geo = await loadJSON('data/geo.json');
    return _geo;
  }

  async function getDistricts() {
    if (!_districts) _districts = await loadJSON('data/districts.json');
    return _districts;
  }

  async function getTeachers() {
    if (!_teachers) _teachers = await loadJSON('data/teachers.json');
    return _teachers;
  }

  return { getGeo, getDistricts, getTeachers };
})();
