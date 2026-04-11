# База знаний: SKKPU Dashboard

> Сформирована на основе анализа закрытых задач (Issues #3, #6, #7, #8, #9/10).  
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
| `src/scripts/navigation.js` | Переключение вкладок и уровней, вызовы рендер-функций |
| `src/scripts/charts-hr.js` | Графики вкладки «Кадры» на уровне МО |
| `src/scripts/charts-mo.js` | Остальные графики уровня МО |
| `src/scripts/district.js` | Уровень округа |
| `src/scripts/org.js` | Уровень организации (таблица и графики) |
| `src/store/state.js` | Единое хранилище данных (AppState) |
| `data/teachers.json` | Данные по педагогам (`employees[]`) |
| `data/districts.json` | Данные по округам и организациям (`orgs[]`) |
| `index.html` | Разметка всех страниц/вкладок |
| `docs/architecture.md` | Архитектурные принципы проекта |
| `AGENTS.md` | Соглашения для AI-агентов |

---

## История задач и принятые решения

### Issue #3 — Рефакторинг: модульный стейт и удаление патч-файлов

Технический долг: 11 файлов `patch-stage*.js` разбрасывали логику вне основных модулей, нарушая SRP. Данные передавались через глобальные `window._GEO`, `window._DISTRICTS`, `window._TEACHER_*`.

**Решение:** создан `src/store/state.js` — единая шина данных с API `AppState.get() / AppState.set()`. Все `window._*` удалены. Логика патчей перенесена в соответствующие модули.

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

### Issue #8 — Top-10 «Кадры» нестабилен при повторных переходах между МО

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

## Ключевые паттерны и соглашения

### Данные

- **Единственный источник данных** по педагогам — `AppState.get('employees')` из `teachers.json`
- **`orgId` нормализуется** через `padStart(4, '0')` с обеих сторон сравнения
- `staffingRate` в `teachers.json` — **одинаков для всех сотрудников одного `orgId`** (атрибут организации, не человека)
- `Math.random()` в рендер-функциях **запрещён** — только реальные данные

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

### UX / Цветовая индикация

| Показатель | 🔴 Красный | 🟡 Жёлтый | 🟢 Зелёный |
|---|---|---|---|
| ЗП педагога | < 50 000 ₽ | 50–75k ₽ | ≥ 75 000 ₽ |
| Укомплектованность (`staffingRate`) | < 0.85 | 0.85–0.95 | ≥ 0.95 |
| Средний возраст | < 35 лет | 35–50 лет | > 50 лет |
| Средний стаж (`experience`) | < 3 лет | 3–6 лет | ≥ 7 лет |

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
  "age",             // добавлено в Issue #10, диапазон 22–68
  "experience",      // добавлено в Issue #10, диапазон 0–40
  "staffingRate"     // добавлено в Issue #10, диапазон 0.65–1.0
}
```
