// Round City v2 videos (rcy.html). Footage or a real live site in every scene, big type, hook in frame 0.
// Prices and scope lines come from roundcity.co (packages + services pages). Site captures: work/shots.js.
const LUX = { by: 'Ali Al-Khafaji · Founder', url: 'roundcity.co', fine: '@614lux · Columbus, Ohio' };
const SITES = ['halalny', 'everywrap', 'aya', 'motintking', 'rc-home', 'susu', 'rc-work', 'rc-web', 'rc-food'].map((n) => `/v4/${n}.jpg`);
const RCY = {
  y01: { title: 'Food truck: Brand + Website $1,499', scenes: [
    { type: 'open', dir: 'rc-truck', first: true, label: 'Food carts + trucks', lines: ['Great food.', '<em>Easy to find.</em>'], dur: 2.3 },
    { type: 'price', dir: 'rc-truck', label: 'For 1 food cart or truck', name: 'Brand + Website', price: '$1,499', fee: 'one time · full project', items: [
      'Refreshed logo, colors and fonts', 'Custom one-page website', 'Menu, hours, location, contact', 'Files, account access, walkthrough'],
      note: 'About <b>7–10 business days</b> after we get your materials.' },
    { type: 'phone', img: '/v4/halalny.jpg', label: 'Live client website', title: 'Built for <em>hungry phones.</em>', scroll: 2300, dur: 3.2 }] },
  y03: { title: 'Launch website $3,500', scenes: [
    { type: 'open', dir: 'rc-phone', first: true, label: 'Websites', lines: ['A website', '<em>worth</em>', '<em>visiting.</em>'], top: 500, dur: 2.3 },
    { type: 'phone', img: '/v4/everywrap.jpg', label: 'Live client website', title: 'Designed <em>phone first.</em>', scroll: 2400, dur: 3.0 },
    { type: 'price', dir: 'rc-phone', label: 'Websites', name: 'Launch website', price: '$3,500', items: [
      'Up to 5 core pages', 'Custom desktop + mobile design', 'Copy refinement + page structure', 'Contact form + search essentials', 'Launch checks + handover'],
      note: 'Domain, hosting and paid tools are separate.', noteTop: 1500 }] },
  y17: { ...LUX, title: '59 live sites', scenes: [
    { type: 'wall', imgs: SITES, first: true, big: '59', title: 'live websites.<br><em>All built by me.</em>', dur: 3.0 },
    { type: 'phone', img: '/v4/halalny.jpg', label: 'Halal New York Gyro', title: '<em>Live.</em>', size: 130, scroll: 1500, dur: 1.9 },
    { type: 'phone', img: '/v4/everywrap.jpg', label: 'EveryWrap', title: '<em>Live.</em>', size: 130, scroll: 1500, dur: 1.9, flip: true },
    { type: 'phone', img: '/v4/susu.jpg', label: 'Susu Ink & Glow', title: '<em>Live.</em>', size: 130, scroll: 260, dur: 1.9 },
    { type: 'phone', img: '/v4/motintking.jpg', label: 'MoTintKing', title: '<em>Live.</em>', size: 130, scroll: 1500, dur: 1.9, flip: true },
    { type: 'phone', img: '/v4/rc-home.jpg', label: 'Round City', title: 'and <em>my own.</em>', size: 120, scroll: 1700, dur: 2.4 }] },
};
