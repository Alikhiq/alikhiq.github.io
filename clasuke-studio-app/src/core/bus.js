// Tiny event bus so modules do not import each other in circles.
const map = new Map();
export function on(evt, fn) { (map.get(evt) || map.set(evt, []).get(evt)).push(fn); }
export function emit(evt, a, b) { const l = map.get(evt); if (l) for (let i = 0; i < l.length; i++) l[i](a, b); }
