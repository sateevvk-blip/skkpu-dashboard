/**
 * app.js — точка входа приложения.
 *
 * Загружает данные через DataService и инициализирует UI.
 * Данные доступны через AppState.get(), а не через window._*.
 */
window.addEventListener('load', async function () {
  try {
    await DataService.loadAll();

    // Нормализация названий округов (ранее patch-stage1-names.js)
    normalizeDistrictNames();

    initMap(AppState.get('geo'));
    updateNav();
  } catch (err) {
    console.error('Failed to load dashboard data:', err);
    toast('⚠️', 'Ошибка загрузки', 'Не удалось загрузить данные дашборда.', 'r');
  }
});

window.addEventListener('resize', function () {
  if (typeof map !== 'undefined' && map) map.invalidateSize();
});
