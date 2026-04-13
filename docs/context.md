# База знаний: SKKPU Dashboard

> Сформирована на основе анализа закрытых задач (Issues #3, #6, #7, #8, #9/10, #11, #12, #13, #14, #15, #22, #25, #26) и релиза **v202**.  
> Цель — быстрое погружение в контекст проекта при старте новых задач.

---

## Контекст проекта

**skkpu-dashboard** — дашборд ГИС СККПУ (система контроля ключевых показателей в образовании МО). Реализован как чистый front-end (HTML + vanilla JS), без фреймворков. Данные берутся из JSON-файлов (`data/`). Визуализация — библиотека **Apache ECharts**.

### Уровни навигации (drill-down)

```
МО → Округ → Организация
```

Каждый уровень — отдельная «страница»: `#page-mo`, `#page-go`, `#page-org`. Переключение — через `navigation.js`.

---

## Ключевые файлы и зоны ответственности

| Файл | Зона ответственности |
|---|---|
| `src/scripts/navigation.js` | Переключение вкладок и уровней, вызовы рендер-функций при смене таба и МО |
| `src/scripts/charts-hr.js` | Графики вкладки «Кадры» на уровне МО (`ch-hrTurnover`, `ch-hrVacancy`, `ch-hrAge`, `ch-hrExp`) |
| `src/scripts/charts-mo.js` | Остальные графики уровня МО + таблица-рейтинг округов по ЗП (с сортировкой) |
| `src/scripts/charts-buildings.js` | Графики вкладки «Здания» (`ch-bldKinder`, `ch-bldKinderCap`) |
| `src/scripts/district.js` | Уровень округа — список орг из `organizations.json` (фильтр по `districtId`) |
| `src/scripts/org.js` | Уровень организации (таблица сотрудников + графики); фильтр по `orgId` + `districtId` |
| `src/store/state.js` | Единое хранилище данных AppState (`get`/`set`) |
| `src/scripts/map.js` | Карта Leaflet: `filterMap()`, `setMetric()`, попап подтверждения перехода в округ |
| `src/services/data-service.js` | `Promise.all` загрузки geo/districts/teachers/organizations → AppState |
| `data/teachers.json` | Данные по педагогам (`employees[]`) |
| `data/districts.json` | Данные по округам: `orgs[]`, `hrMetrics`, `kindergartenGroups`, `kindergartenCapacity` |
| `data/organizations.json` | Enriched-данные организаций; хранится в `AppState('organizations')` |
| `index.html` | Разметка всех страниц/вкладок |
| `docs/architecture.md` | Архитектурные принципы проекта |
| `AGENTS.md` | Соглашения для AI-агентов |

---

## История задач и принятые решения

### Issue #3 — Рефакторинг: модульный стейт и удаление патч-файлов (PR #4, #5)

Технический долг: 11 файлов `patch-stage*.js` разбрасывали логику вне основных модулей, нарушая SRP. Данные передавались через глобальные `window._GEO`, `window._DISTRICTS`, `window._TEACHER_*`.

**Решение:** создан `src/store/state.js` — единая шина данных с API `AppState.get() / AppState.set()`. Все `window._*` удалены. Логика патчей перенесена в соответствующие модули. Исправлен порядок инициализации AppState.

---

### Issue #6 — Уровень организации: блок ЗП, таблица и графики не отображались

Три одновременных бага в `org.js`:
- JS обращался к несуществующим DOM-ID (`org-bname`, `org-district`, `org-bstat`, `org-kpis`)
- Блок `#org-kpis` отсутствовал в HTML
- Таблица `#tb-teachers` генерировала 6 `<td>` на 13 колонок `<thead>`

**Решение:** добавлен `<div id="org-kpis">` в `index.html`, исправлены ID (`org-name`, `org-meta`, `org-status`), таблица расширена до 13 колонок. Убран фильтр `loadType === 'основная'` — показываются все виды нагрузки.

---

### Issue #7 — «Кадры»: пустые графики и пустая таблица сотрудников

Два класса ошибок:
- `renderMoHr()` читала данные из `AppState.get('geo')` вместо `AppState.get('employees')`, использовала `Math.random()`
- В `_renderTeachersTable` использовалось поле `e.grade` (не существует), нужно `e.className`
- `orgId` сравнивались без нормализации ведущих нулей

**Решение (коммиты [3f92594](https://github.com/sateevvk-blip/skkpu-dashboard/commit/3f925941016449c1450bd477764b8e69755da712) и [7766611](https://github.com/sateevvk-blip/skkpu-dashboard/commit/77666113739e53f8079741c92eb237df63983b44)):** источник данных переключён на `employees`, `Math.random()` полностью удалён, `e.grade` → `e.className`, нормализация `orgId` через `padStart(4, '0')`.

---

### Issue #8 — Top-10 «Кадры» нестабилен при повторных переходах между МО (PR #9)

ECharts-инстанция `ch-hrFired` не сбрасывалась при смене МО — данные накладывались на старые («призраки»). Возможна race condition: `renderMoHr()` вызывалась до обновления `AppState` для нового МО.

**Принятый паттерн — dispose + reinit (обязателен для всех ECharts-графиков):**

```js
if (el._ec) { el._ec.dispose(); el._ec = null; }
el._ec = echarts.init(el);
el._ec.setOption(option);
```

---

### Issue #9/10 — Вкладка «Кадры»: все 4 графика пустые

`renderMoHr()` не вызывалась при переключении на таб «Кадры» (отсутствовал вызов в `navigation.js`). Три рендер-функции (`renderMoHrStaffing`, `renderMoHrAge`, `renderMoHrTenure`) не существовали. В `teachers.json` отсутствовали поля `age`, `experience`, `staffingRate`.

**Решение:** в `teachers.json` добавлены поля с детерминированными значениями; написаны три рендер-функции; в `navigation.js` при переключении на `[data-tab="hr"]` добавлены вызовы всех четырёх функций — также при смене МО (re-render).

---

### Issue #11 — Организации одного округа показывались в другом (PR #16/#17)

Организации не имели строгой привязки к округам. `district.js` строил список орг из `d.orgs` в `districts.json`, а `org.js` фильтровал сотрудников только по `orgId` без учёта `districtId` — сотрудник с одинаковым `orgId` из другого округа попадал в таблицу.

**Решение (PR [#16](https://github.com/sateevvk-blip/skkpu-dashboard/pull/16) / [#17](https://github.com/sateevvk-blip/skkpu-dashboard/pull/17)):**
- `data-service.js`: добавлена загрузка `data/organizations.json` в `Promise.all`; результат (`orgsData.items`) сохраняется в `AppState('organizations')`
- `district.js`: список организаций строится фильтрацией `AppState.get('organizations')` по `districtId === dname`; метаданные из `d.orgs` объединяются через `Object.assign` (enriched + финансовые KPI); fallback на `d.orgs` сохранён
- `org.js`: в фильтр сотрудников добавлена проверка `districtId`:
  ```js
  var districtMatch = !e.districtId || !currentDistrict || e.districtId === currentDistrict;
  return orgMatch && districtMatch;
  ```
  Записи без поля `districtId` не блокируются (обратная совместимость).

---

### Issue #12 — Пустые графики вкладок «Кадры» и «Здания» (PR #18)

#### charts-hr.js (3 графика)

Функции ссылались на несуществующие DOM-ID (`ch-hrFired`, `ch-hrTenure`) — `getElementById` возвращал `null`, `echarts.init(null)` завершался без рендера; функция `renderMoHrVacancy()` отсутствовала.

| Функция | Было | Стало |
|---|---|---|
| `renderMoHr()` | `ch-hrFired` | `ch-hrTurnover` |
| `renderMoHrTenure()` | `ch-hrTenure` | `ch-hrExp` |
| *(отсутствовала)* | — | `renderMoHrVacancy()` → `ch-hrVacancy` |

`renderMoHrTenure()` теперь использует приоритетный источник `hrMetrics.avgExperience` из `districts.json` (более полные данные) с fallback на `employees[]`.

`renderMoHrVacancy()`: Top-12 округов по убыванию `hrMetrics.vacancyCloseDays`; цветовая индикация — ≤45 дн. зелёный / ≤60 жёлтый / >60 красный. Вызывается из `navigation.js` в блоке `if (id === 'hr')`.

#### charts-buildings.js (2 графика)

`renderMoBld()` не рендерила контейнеры `ch-bldKinder` и `ch-bldKinderCap`.

**Решение (PR [#18](https://github.com/sateevvk-blip/skkpu-dashboard/pull/18)):** добавлена `renderMoBldKinder()` — два графика из `districts[k].kindergartenGroups` и `kindergartenCapacity`; вызов добавлен в конец `renderMoBld()`.

---

### Issue #13 — Смещение шапки таблицы «Сотрудники организации» (PR #19)

`table-layout: fixed` и `min-width` применялись к `<tbody>`, а не к `<table>`. Браузер игнорирует `table-layout` на `<tbody>` — шапка и тело таблицы пересчитывали ширины независимо.

**Решение (PR [#19](https://github.com/sateevvk-blip/skkpu-dashboard/pull/19)):**
- `index.html`: `id="tb-teachers"` перенесён на `<table>`; добавлен `class="tbl-teachers"` для CSS-таргетинга; `<tbody>` оставлен без `id` — `org.js` находит его через `.querySelector('tbody')`
- `main.css`: селектор `#tb-teachers` → `.tbl-teachers`; `table-layout: fixed` теперь применяется к `<table>` — шапка и тело получают одинаковые ширины колонок

---

### Issue #14 — Фильтры карты не обновляли цвета и попап (PR #20)

`map.js` не реагировал на смену метрики: цвета полигонов и данные в попапе оставались от предыдущего состояния.

**Решение (PR [#20](https://github.com/sateevvk-blip/skkpu-dashboard/pull/20)):** реализованы функции `filterMap()` и `setMetric()` — фильтры читают текущую метрику из `AppState` и перекрашивают полигоны; попап обновляется через Leaflet-события.

---

### Issue #15 — Переход в округ по клику на карте без подтверждения (PR #21)

Клик по полигону сразу менял уровень навигации, без предупреждения пользователя.

**Решение (PR [#21](https://github.com/sateevvk-blip/skkpu-dashboard/pull/21)):** добавлен попап с подтверждением «Перейти в округ?» перед навигацией. Кнопка «Перейти» — через `L.DomEvent` (без всплытия). Исправлена `SyntaxError` в `district.js`.

---

### Issue #22 — Кнопка «Перейти в округ»: L.DomEvent + SyntaxError (PR #23)

Кнопка «Перейти в округ» не срабатывала из-за неверного способа навешивания обработчика и синтаксической ошибки в `district.js`.

**Решение (PR [#23](https://github.com/sateevvk-blip/skkpu-dashboard/pull/23)):** обработчик переписан через `L.DomEvent.on(btn, 'click', handler)` вместо `onclick`-атрибута; `SyntaxError` в `district.js` устранена.

---

### Issue #25 — ch-hrTurnover показывал случайные данные увольнений (PR #29)

График текучести кадров (`ch-hrTurnover`) использовал `Math.random()` вместо реальных данных.

**Решение (PR [#29](https://github.com/sateevvk-blip/skkpu-dashboard/pull/29)):** источник переключён на реальные данные из `employees[]` / `hrMetrics` — агрегация увольнений по округам.

---

### Issue #26 — Фильтры карты не применялись (PR #27)

Функции `filterMap` и `setMetric` не были реализованы, фильтры на карте не работали совсем.

**Решение (PR [#27](https://github.com/sateevvk-blip/skkpu-dashboard/pull/27)):** обе функции реализованы полностью; фильтры на карте работают независимо от попапа подтверждения.

---

### feat: Сортировка в таблице «Рейтинг округов по средней ЗП» (PR #28)

Таблица рейтинга округов в `charts-mo.js` не поддерживала сортировку по колонкам.

**Решение (PR [#28](https://github.com/sateevvk-blip/skkpu-dashboard/pull/28)):** добавлена интерактивная сортировка по любому столбцу (клик по заголовку, повторный клик — реверс). Иконка ▲/▼ отражает направление.

---

### fix: Реальные названия 56 округов МО (PR #2)

`geo.json` и `districts.json` содержали placeholder-названия. Все 56 округов заменены реальными наименованиями МО; графики адаптированы под длинные подписи (горизонтальная ориентация осей, `overflow: truncate`).

---

## Ключевые паттерны и соглашения

### Данные

- **Единственный источник данных** по педагогам — `AppState.get('employees')` из `teachers.json`
- **Единственный источник данных** по организациям — `AppState.get('organizations')` из `organizations.json`
- **`orgId` нормализуется** через `padStart(4, '0')` с обеих сторон сравнения
- Сотрудники без поля `districtId` не блокируются (обратная совместимость)
- `staffingRate` в `teachers.json` — **одинаков для всех сотрудников одного `orgId`** (атрибут организации, не человека)
- `Math.random()` в рендер-функциях **запрещён** — только реальные данные
- Метрики HR (`avgExperience`, `vacancyCloseDays`) читаются из `districts[k].hrMetrics` как приоритетный источник; fallback на `employees[]`
- Данные детских садов: `districts[k].kindergartenGroups` и `kindergartenCapacity`

### ECharts

- **Обязательный dispose** перед каждым `echarts.init()` при смене контекста МО — без исключений
- **Обязательный guard** в каждой рендер-функции: `if (!employees || !employees.length) return;`
- Паттерн инициализации:

```js
const el = document.getElementById('ch-xxx');
if (!el) return;
if (el._ec) { el._ec.dispose(); el._ec = null; }
el._ec = echarts.init(el);
el._ec.setOption(option);
```

- `getElementById` должен совпадать с реальным DOM-ID контейнера — несоответствие приводит к тихому выходу без рендера
- При длинных названиях округов (56 МО) использовать горизонтальную ось с `overflow: 'truncate'` или повёрнутые подписи

### Карта (map.js)

- `filterMap()` — перекрашивает полигоны по текущей метрике из AppState
- `setMetric()` — обновляет активную метрику, затем вызывает `filterMap()`
- Переход в округ — только через попап подтверждения; кнопка через `L.DomEvent.on`

### Таблицы

- `table-layout: fixed` применяется **только к элементу `<table>`**, не к `<tbody>` — иначе браузер игнорирует свойство
- CSS-таргетинг таблицы через `class`, а не `id`, если `id` нужен JS для querySelector
- Сортировка по колонкам: клик по `<th>` → повторный клик реверсирует; иконка ▲/▼ в заголовке

### UX / Цветовая индикация

| Показатель | 🔴 Красный | 🟡 Жёлтый | 🟢 Зелёный |
|---|---|---|---|
| ЗП педагога | < 50 000 ₽ | 50–75k ₽ | ≥ 75 000 ₽ |
| Укомплектованность (`staffingRate`) | < 0.85 | 0.85–0.95 | ≥ 0.95 |
| Средний возраст | < 35 лет | 35–50 лет | > 50 лет |
| Средний стаж (`experience`) | < 3 лет | 3–6 лет | ≥ 7 лет |
| Вакансии (`vacancyCloseDays`) | > 60 дней | ≤ 60 дней | ≤ 45 дней |

### Структура employee (teachers.json)

```json
{
  "name", "districtId", "orgName", "orgId",
  "educationType",   // "общее" | "дошкольное" | "дополнительное"
  "staffCategory",   // "педагогические работники" | "руководитель" | ...
  "position",
  "positionType",    // "основная" | "совмещение"
  "loadType",        // "основная" | "внеурочная" | "общая"
  "loadRate",        // 0.25 | 0.5 | 0.75 | 1.0 | 1.25
  "subject",
  "className",       // НЕ grade — поле называется className
  "classCapacity",
  "weeklyHours",
  "salary",
  "age",             // диапазон 22–68
  "experience",      // диапазон 0–40
  "staffingRate"     // диапазон 0.65–1.0 (атрибут орг, одинаков для всего orgId)
}
```

### Структура districts[k].hrMetrics (districts.json)

```json
{
  "avgExperience":      // средний стаж педагогов округа (число)
  "vacancyCloseDays":   // среднее время закрытия вакансии в днях (число)
}
```
