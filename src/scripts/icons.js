/**
 * icons.js — утилита для встраивания SVG-иконок из спрайта.
 *
 * Использование:
 *   appIcon('salary')          → строка <svg ...><use .../></svg>
 *   appIcon('chart-bar', 20)   → размер 20px
 *
 * Спрайт подключается один раз в <body> через insertSprite().
 * Иконки рендерятся через <use href="#icon-NAME">, наследуют currentColor.
 */

(function () {
  'use strict';

  /** Вставляет спрайт в начало <body> (один раз). */
  function insertSprite() {
    if (document.getElementById('app-svg-sprite')) return;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'src/assets/icons/sprite.svg', true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        var div = document.createElement('div');
        div.id = 'app-svg-sprite';
        div.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
        div.innerHTML = xhr.responseText;
        document.body.insertBefore(div, document.body.firstChild);
      }
    };
    xhr.send();
  }

  /**
   * Возвращает HTML-строку с inline SVG-иконкой.
   * @param {string} name  — имя иконки (без префикса «icon-»)
   * @param {number} [size=18] — размер в пикселях
   * @returns {string}
   */
  function appIcon(name, size) {
    size = size || 18;
    return '<svg class="app-icon app-icon--' + name + '"' +
           ' width="' + size + '" height="' + size + '"' +
           ' viewBox="0 0 24 24"' +
           ' fill="none" aria-hidden="true"' +
           ' focusable="false">' +
           '<use href="#icon-' + name + '"/>' +
           '</svg>';
  }

  // Экспорт в глобальный контекст
  window.appIcon = appIcon;
  window.insertSprite = insertSprite;

  // Автовставка спрайта при загрузке DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', insertSprite);
  } else {
    insertSprite();
  }
}());
