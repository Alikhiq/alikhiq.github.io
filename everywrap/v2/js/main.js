import { CONFIG } from "./config.js";
import { ROOT, DATA } from "./state.js";
import { initHero } from "./hero.js";
import { initFleet } from "./fleet.js";
import { initScenes } from "./scenes.js";
import { initWork } from "./work.js";
import { initSite } from "./site.js";
import { initFx } from "./fx.js";

async function boot() {
  const pre = window.__EW_DATA;
  try {
    DATA.manifest = pre ? pre.manifest : await (await fetch(ROOT + CONFIG.assets + "manifest.json")).json();
    DATA.work = pre ? pre.work : await (await fetch(ROOT + "data/work.json")).json();
    DATA.pricing = pre ? pre.pricing : await (await fetch(ROOT + CONFIG.assets + "pricing.json")).json();
  } catch (e) { console.error("EveryWrap data failed to load", e); }
  initSite(); initHero(); initFleet(); initScenes(); initWork(); initFx();
}
boot();
