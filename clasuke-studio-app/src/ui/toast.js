let el, timer;
export function toast(msg, ms = 2800) {
  el = el || document.getElementById('toast');
  if (!el) return;
  el.textContent = msg; el.classList.add('show');
  clearTimeout(timer); timer = setTimeout(() => el.classList.remove('show'), ms);
}
