/**
 * Application bootstrap — loads data via DataService and initialises the UI.
 */
window.addEventListener('load', async function () {
  try {
    var results = await Promise.all([
      DataService.getGeo(),
      DataService.getDistricts(),
      DataService.getTeachers()
    ]);

    window._GEO = results[0];
    window._DISTRICTS = results[1];
    window._TEACHER_NAMES = results[2].names;
    window._TEACHER_ROLES = results[2].roles;

    initMap(window._GEO);
    updateNav();
  } catch (err) {
    console.error('Failed to load dashboard data:', err);
    toast('⚠️', 'Ошибка загрузки', 'Не удалось загрузить данные дашборда.', 'r');
  }
});

window.addEventListener('resize', function () {
  if (map) map.invalidateSize();
});
