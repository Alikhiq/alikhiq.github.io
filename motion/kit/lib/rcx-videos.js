// Round City: 20 vertical videos. Every price, scope line and claim comes from roundcity.co
// (packages, services/*, studio pages, read Nov 12 2026), motion/BUILD-STORY.md, or Ali's own story doc.
// rcNN = @roundcity.co, luxNN = @614lux (personal). Rendered silent: songs are added in Instagram.
const LUX = { by: 'Ali Al-Khafaji · Founder', url: 'roundcity.co', fine: '@614lux · Columbus, Ohio' };
const RCX = {
  rc01: { title: 'Food truck: Brand + Website $1,499', scenes: [
    { type: 'hook', label: 'Food carts + trucks', lines: ['Great food.', '<em>Easy to find.</em>'] },
    { type: 'price', label: 'For 1 food cart or truck', name: 'Brand + Website', price: '$1,499', fee: 'one time · full project', items: [
      'A refreshed logo, brand colors and fonts', 'A custom one-page website: up to 5 sections, 20 menu items', 'Menu, hours, location and contact in one place',
      'One request form, or a menu linked to your ordering', 'Website files, account access and a walkthrough'],
      note: 'About <b>7–10 business days</b> after we get your materials.<br>Optional support <b>$49/month</b>.' }] },
  rc02: { title: 'Food truck tiers (3D)', scenes: [
    { type: 'hook', label: 'Food carts + trucks', lines: ['One cart', '<em>or a growing fleet?</em>'], dur: 2.6 },
    { type: 'bg3dTiers', dir: 'rc3d-tiers', frames: 300, label: 'Choose one package', at: [1.6, 4.3, 7.0], rows: [
      ['Brand + Website', '1 food cart or truck', '$1,499'], ['Website + Truck Management', 'Up to 3 trucks, one brand', '$4,499'], ['Website + Trucks + Kitchen', 'Up to 5 trucks, 1 kitchen', '$8,499']],
      note: 'Larger packages include the smaller one’s features. Bigger operation? Custom quote.' }] },
  rc03: { title: 'Launch website $3,500', scenes: [
    { type: 'hook', label: 'Websites', lines: ['A website', '<em>worth visiting.</em>'] },
    { type: 'price', label: 'Websites', name: 'Launch website', price: '$3,500', items: [
      'Up to 5 core pages', 'Custom desktop and mobile design', 'Copy refinement and page structure', 'Contact form and search essentials', 'Launch checks and website handover'],
      note: 'Domain, hosting and paid tools are separate.' }] },
  rc04: { title: 'Three website packages', scenes: [
    { type: 'tiers', label: 'Websites', title: 'Three packages.<br><em>One clear starting point.</em>', top: 520, rows: [
      ['Launch website', 'Up to 5 core pages', '$3,500'], ['Signature website', 'Up to 12 pages + one booking or lead integration', '$7,500'], ['Commerce website', '20 supplied products + a tested hosted checkout', '$12,500']],
      note: 'Fixed project fees in USD for the scope shown.', noteTop: 1560 }] },
  rc05: { title: 'Launch website: 5 pages (3D)', scenes: [
    { type: 'bg3d', dir: 'rc3d-pages', frames: 240, label: 'Launch website · $3,500', title: 'Up to 5 core pages.<br><em>Phone and desktop.</em>', textAt: 4.2, top: 1260 },
    { type: 'hook', lines: ['Fixed price.', '<em>Written scope.</em>'], dur: 2.6 }] },
  rc06: { title: 'Content sprint $1,750', scenes: [
    { type: 'hook', label: 'Content + hooks', lines: ['Make the first', '<em>seconds count.</em>'] },
    { type: 'price', label: 'Content & ads', name: 'Content sprint', price: '$1,750', items: [
      'One content angle and plan', 'Six hooks or short-form scripts', 'Four edited vertical videos', 'Six graphics for one focused campaign'],
      note: 'Made from footage you supply.<br>Filming and ad management are quoted separately.' }] },
  rc07: { title: 'Campaign sprint $2,500', scenes: [
    { type: 'hook', label: 'Content & ads', lines: ['Give the offer', '<em>something to say.</em>'] },
    { type: 'price', label: 'Content & ads', name: 'Campaign sprint', price: '$2,500', items: [
      'One offer and audience brief', 'Three campaign angles', 'Six copy variations', 'Three static ad designs'],
      note: 'Ad setup and ongoing management have their own written scope.' }] },
  rc08: { title: 'Brand & graphic system $4,500', scenes: [
    { type: 'hook', label: 'Brand + identity', lines: ['A logo works harder', '<em>as part of a system.</em>'] },
    { type: 'price', label: 'Brand & film', name: 'Brand & graphic system', price: '$4,500', items: [
      'Positioning and creative direction', 'One logo direction or refinement', 'Color and typography system', 'Five agreed brand applications', 'Brand guide and final files'],
      note: 'Just a logo? That gets its own written scope and custom quote.' }] },
  rc09: { title: 'Business film $3,500', scenes: [
    { type: 'hook', label: 'Video', lines: ['Show the craft', '<em>on film.</em>'] },
    { type: 'price', label: 'Brand & film', name: 'Business film', price: '$3,500', items: [
      'Creative treatment and shot plan', 'One local half-day shoot', 'One 45–60 second film', 'Two vertical social cutdowns'] }] },
  rc10: { title: 'Custom software: how it starts', scenes: [
    { type: 'hook', label: 'Custom software + systems', lines: ['Software that fits', '<em>the way you work.</em>'] },
    { type: 'steps', label: 'How custom work starts', title: 'Scoped before<br><em>it’s built.</em>', top: 720, rows: [
      ['Understand', 'Observe the current workflow and define the problem.'], ['Scope, build + test', 'A written scope and price, then build and test the data rules.'], ['Deploy + handover', 'Put it into daily use and document the handoff.']] },
    { type: 'tiers', label: 'Built around your business', top: 380, rows: [
      ['Restaurant operations', 'Ordering, kitchen workflows, dashboards', 'Quote'], ['AI phones', 'Intake, call routing, human handoff', 'Quote'], ['Shop systems', 'Tint and wrap quote tools, shop workflows', 'Quote']],
      note: 'Deliverables, setup and recurring costs are defined in writing before work begins.', noteTop: 1300 }] },
  rc11: { title: 'Know what you pay', scenes: [
    { type: 'hook', label: 'Round City pricing', lines: ['Know what you get.', '<em>Know what you pay.</em>'] },
    { type: 'tiers', title: 'Fixed prices,<br><em>published.</em>', top: 470, stagger: 0.45, rows: [
      ['Food truck brand + site', '', '$1,499'], ['Content sprint', '', '$1,750'], ['Launch website', '', '$3,500'], ['Business film', '', '$3,500'], ['Brand system', '', '$4,500'], ['Custom software', '', 'Quote']],
      note: 'Each price covers the listed scope. Support and outside-provider charges are separate.', noteTop: 1770 }] },
  rc12: { title: 'Round City mark (3D)', scenes: [
    { type: 'bg3d', dir: 'rc3d-mark', frames: 210, label: 'Round City', title: 'Software + automation,<br><em>built around your business.</em>', textAt: 3.6, top: 1300, size: 76 },
    { type: 'hook', lines: ['We learn the workflow.', '<em>Then we build it.</em>'], dur: 2.8 }] },
  rc13: { title: 'Wedding experience $2,500', scenes: [
    { type: 'hook', label: 'Weddings', lines: ['Bring the celebration', '<em>together.</em>'] },
    { type: 'price', label: 'Weddings', name: 'Wedding experience', price: '$2,500', items: [
      'One invitation design direction', 'One wedding website', 'Basic RSVP form and response list', 'A motion invitation'] }] },
  rc14: { title: 'Selected work', scenes: [
    { type: 'hook', label: 'Selected work', lines: ['Different businesses.', '<em>Distinct work.</em>'], dur: 2.6 },
    { type: 'shot', img: '/v3/work/blite-m.jpg', label: 'Blite Fashion', title: 'Live website <em>and catalog</em>', pan: 120 },
    { type: 'shot', img: '/v3/work/motintking-m.jpg', label: 'MoTintKing', title: 'Identity <em>and website</em>', pan: 120 },
    { type: 'shot', img: '/v3/work/susu-ink-and-glow-m.jpg', label: 'Susu Ink & Glow', title: 'Live website <em>and booking</em>', pan: 120 },
    { type: 'shot', img: '/v3/work/valentina-luxe-m.jpg', label: 'Valentina Luxe', title: 'Bilingual <em>website</em>', pan: 120 }] },

  lux15: { ...LUX, title: 'From Baghdad to Columbus', scenes: [
    { type: 'hook', label: 'Baghdad · 2003', lines: ['I was seven.', '<em>The sky was red.</em>'], dur: 3.2 },
    { type: 'hook', lines: ['That same year', 'I took apart', '<em>my first computer.</em>'], gap: 130, top: 640, dur: 3.2 },
    { type: 'hook', label: 'Bab al-Sharqi', lines: ['Every shop on that street', 'needed to be seen.', '<em>I made them seen.</em>'], size: 72, gap: 110, top: 700, dur: 3.6 },
    { type: 'hook', label: 'Columbus · today', lines: ['Now I build the websites', 'and systems that help', '<em>local businesses get found.</em>'], size: 70, gap: 110, top: 700, dur: 3.6 },
    { type: 'hook', lines: ['Sometimes the sky is red again.', '<em>Now it’s just the sunset.</em>'], size: 66, gap: 120, dur: 3.4 }] },
  lux16: { ...LUX, title: 'Forward Deployed Engineer', scenes: [
    { type: 'hook', label: 'What I do', lines: ['Forward Deployed', '<em>Engineer.</em>'] },
    { type: 'hook', lines: ['I learn how your business', 'actually runs,', '<em>then build around it.</em>'], size: 74, gap: 115, top: 700, dur: 3.2 },
    { type: 'steps', label: 'How I work', title: 'Close to the workflow,<br><em>start to handover.</em>', top: 760, rows: [
      ['Understand', 'Talk with the people doing the work, map the friction.'], ['Scope, build + test', 'Confirm scope and price, test against real scenarios.'], ['Deploy + handover', 'Put it into daily use, document the handoff.']] }] },
  lux17: { ...LUX, title: '59 live sites', scenes: [
    { type: 'hook', lines: ['59 live websites.', '<em>All built by me.</em>'], dur: 2.8 },
    { type: 'shot', img: '/v3/work/lead-buckeye-tint-m.jpg', label: 'Buckeye Tint', title: '<em>Live</em>', dur: 1.6, pan: 60 },
    { type: 'shot', img: '/v3/work/lead-sallys-halal-grill-m.jpg', label: 'Sally’s Halal Grill', title: '<em>Live</em>', dur: 1.6, pan: 60 },
    { type: 'shot', img: '/v3/work/lead-prographix-m.jpg', label: 'ProGraphix', title: '<em>Live</em>', dur: 1.6, pan: 60 },
    { type: 'shot', img: '/v3/work/lead-dannys-barber-m.jpg', label: 'Danny’s Barber', title: '<em>Live</em>', dur: 1.6, pan: 60 },
    { type: 'shot', img: '/v3/work/lead-glow-haven-m.jpg', label: 'Glow Haven', title: '<em>Live</em>', dur: 1.6, pan: 60 },
    { type: 'shot', img: '/v3/work/roundcity-co-m.jpg', label: 'Round City', title: 'and <em>my own.</em>', dur: 2.2, pan: 60 }] },
  lux18: { ...LUX, title: 'Built a client site from my phone', scenes: [
    { type: 'hook', lines: ['I built a client’s website', '<em>from my phone.</em>'], size: 80, gap: 130 },
    { type: 'steps', label: 'Susu Ink & Glow', title: 'Claude Code built it.<br><em>I directed it.</em>', top: 760, rows: [
      ['I described it', 'What the site should do, in chat.'], ['I sent screenshots', 'Every problem, straight from my phone.'], ['I approved each change', 'Tested at phone and desktop sizes first.']] },
    { type: 'shot', img: '/v3/work/susu-ink-and-glow-m.jpg', label: '9 merged pull requests', title: 'Live at <em>susuinkandglow.com</em>', pan: 120 }] },
  lux19: { ...LUX, title: 'Floppy disks to AI', scenes: [
    { type: 'hook', label: '2003', lines: ['Floppy disks.', '<em>No CDs.</em>'], dur: 2.2 },
    { type: 'hook', lines: ['3D Studio.', 'AutoCAD.', '<em>Photoshop.</em>'], gap: 130, top: 640, dur: 2.2 },
    { type: 'hook', label: 'Bab al-Sharqi', lines: ['Banners and', '<em>storefront signs.</em>'], dur: 2.2 },
    { type: 'hook', lines: ['Shopify.', '<em>WordPress.</em>'], dur: 2.0 },
    { type: 'hook', lines: ['Automation.', '<em>Then AI.</em>'], dur: 2.0 },
    { type: 'hook', lines: ['Every new tool,', '<em>I was there early.</em>'], dur: 2.8 }] },
  lux20: { ...LUX, title: 'Why my prices are public', scenes: [
    { type: 'hook', lines: ['Why are my prices', '<em>public?</em>'] },
    { type: 'hook', lines: ['So you know what you get', '<em>before we ever talk.</em>'], size: 76, gap: 130, dur: 3.0 },
    { type: 'tiers', label: 'roundcity.co/packages', top: 420, stagger: 0.45, rows: [
      ['Food truck brand + site', '', '$1,499'], ['Content sprint', '', '$1,750'], ['Launch website', '', '$3,500'], ['Brand system', '', '$4,500'], ['Signature website', '', '$7,500']],
      note: 'Fixed project fees. Written scope. No surprises.', noteTop: 1500 }] },
};
