import { $, $$, onScroll } from "./state.js";

// Small page furniture: the scroll line and the tint explainer.
export function initFx() {
  const bar = $("#progress");
  if (bar) onScroll(() => { const h = document.documentElement.scrollHeight - innerHeight; bar.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`; });
  $$(".vlt").forEach((el) => {
    const set = (v) => {
      el.style.setProperty("--v", v / 100);
      $(".vlt-num b", el).textContent = v + "%";
      $$(".vlt-tabs button", el).forEach((b) => { const on = +b.dataset.v === v; b.setAttribute("aria-pressed", on); b.classList.toggle("live", on); });
      $(".vlt-note", el).textContent = v >= 50 ? "Light enough for the front side windows in Ohio, and anywhere behind them." : "For the rear side windows and the back glass. Too dark for the front side windows in Ohio.";
    };
    el.addEventListener("click", (e) => { const b = e.target.closest(".vlt-tabs button"); if (b) set(+b.dataset.v); });
    set(20);
  });
}
