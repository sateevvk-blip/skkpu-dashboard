/**
 * Toast notification component.
 */
var _tid = 0;

function toast(ico, title, msg, cls, dur) {
  cls = cls || 'b';
  dur = dur || 4500;
  var c = document.getElementById('toast');
  var id = 't' + (++_tid);
  var el = document.createElement('div');
  el.className = 'toast-item ' + (cls || 'b');
  el.id = id;
  el.innerHTML =
    '<span class="toast-ico">' + ico + '</span>' +
    '<div class="toast-body"><b>' + title + '</b><p>' + msg + '</p></div>' +
    '<span class="toast-close" onclick="removeToast(\'' + id + '\')">✕</span>';
  c.appendChild(el);
  setTimeout(function () { removeToast(id); }, dur);
}

function removeToast(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.classList.add('removing');
  setTimeout(function () { el.remove(); }, 250);
}
