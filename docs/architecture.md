# Архитектура проекта СККПУ Dashboard

## Обзор

Дашборд СККПУ — веб-приложение для анализа заработных плат педагогов Московской области.
Трёхуровневая навигация: **МО → Городской округ → Организация**.

## Структура директорий

```
project/
  data/                        # Локальные данные (mock / статика)
    geo.json                   # GeoJSON — границы округов МО (56 реальных округов)
    districts.json             # Справочник округов и организаций (hrMetrics, kindergartenGroups/Capacity)
    organizations.json         # Enriched-данные организаций (загружается DataService → AppState)
    teachers.json              # Список педагогов с полями age, experience, staffingRate
  src/
    styles/
      main.css                 # Основные стили и токены (.tbl-teachers через class, не id)
      mobile.css               # Адаптивные стили (≤430px) и мобильная навигация
    scripts/
      app.js                   # Точка входа — загрузка данных и инициализация
      toast.js                 # Компонент уведомлений
      navigation.js            # Навигация, хлебные крошки, переключение вкладок; вызовы рендер-функций при смене таба/МО
      map.js                   # Leaflet-карта с фильтрами, метриками (filterMap, setMetric) и попапом подтверждения перехода
      district.js              # Рендеринг уровня ГО — список орг из organizations.json (фильтр по districtId)
      org.js                   # Рендеринг уровня организации (таблица + графики, фильтр по districtId)
      charts-mo.js             # ECharts-графики уровня МО (ЗП, субвенция, рейтинг округов с сортировкой)
      charts-hr.js             # ECharts-графики вкладки «Кадры» (turnover, vacancy, age, exp)
      charts-buildings.js      # ECharts-графики вкладки «Здания» (kindergartenGroups, kindergartenCapacity)
    store/
      state.js                 # Единое хранилище AppState (get/set); заменяет window._* глобалы
    services/
      data-service.js          # Сервис доступа к данным (fetch JSON + загрузка organizations.json)
    utils/
      format.js                # Утилиты форматирования (числа, валюта, статусы)
  docs/
    architecture.md            # Этот файл
  AGENTS.md                    # Соглашения для AI-агентов
  index.html                   # Точка входа — семантическая HTML-разметка всех страниц/вкладок
```

## Принципы

1. **Разделение ответственности** — HTML (структура), CSS (стили), JS (поведение) и данные (JSON) хранятся в отдельных файлах.
2. **Данные загружаются из файлов, а не захардкожены** — `DataService` загружает JSON через `fetch`. В продакшене этот слой заменяется обращением к API.
3. **Простые решения** — нет сборщика, фреймворка или модульной системы. Vanilla JS + CSS, Leaflet и ECharts из CDN.
4. **Мобильная адаптация** — через отдельный CSS-файл с медиазапросами.
5. **Единая шина данных** — `AppState.get() / AppState.set()` (`src/store/state.js`). Прямые `window._*` глобалы упразднены.
6. **Dispose ECharts перед re-init** — обязательно при смене МО или повторном рендере, чтобы избежать наложения «призрачных» данных.

## Зависимости

| Библиотека | Версия | Назначение          |
|------------|--------|---------------------|
| Leaflet    | 1.9.4  | Интерактивная карта |
| ECharts    | 5.4.3  | Графики и диаграммы |

## Поток данных

```
data/*.json  →  DataService (fetch, Promise.all)  →  AppState
  geo.json            → AppState.set('geo', ...)
  districts.json      → AppState.set('districts', ...)
  teachers.json       → AppState.set('employees', ...)
  organizations.json  → AppState.set('organizations', ...)
                                    ↓
              Скрипты рендеринга (map, district, org, charts-mo, charts-hr, charts-buildings)
                                    ↓
                                   DOM
```

## Связь округ → организация → сотрудник

```
districts.json[k].name (districtId)
        ↓
organizations.json (фильтр по districtId) → AppState('organizations')
        ↓
district.js: список орг + enriched-данные (Object.assign с d.orgs)
        ↓
org.js: сотрудники из AppState('employees'), фильтр orgId + districtId
```

`orgId` всегда нормализуется через `padStart(4, '0')` с обеих сторон сравнения.
