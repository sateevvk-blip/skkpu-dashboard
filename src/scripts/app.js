/**
 * app.js — точка входа приложения.
 *
 * Загружает данные через DataService и инициализирует UI.
 * Данные доступны через AppState.get(), а не через window._*.
 *
 * feat(#31): initMap заменён на initDistrictTiles.
 *            обработчик resize убран (Leaflet удалён).
 */
window.addEventListener('load', async function () {
  try {
    await DataService.loadAll();

    // Нормализация названий округов (ранее patch-stage1-names.js)
    normalizeDistrictNames();

    // feat(#31): инициализируем плитки вместо Leaflet-карты
    initDistrictTiles('district-tiles');
    updateNav();
  } catch (err) {
    console.error('Failed to load dashboard data:', err);
    toast('⚠️', 'Ошибка загрузки', 'Не удалось загрузить данные дашборда.', 'r');
  }
});
