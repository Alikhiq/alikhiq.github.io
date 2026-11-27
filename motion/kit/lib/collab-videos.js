// Collab videos for Round City clients (collab.html). Posted as Instagram collabs: client account + @roundcity.co.
// Photos are the clients' own published site images (collab/<brand>/, captured with work/grab.js).
// Every fact (trailer addresses, phone numbers, counts, hours) is read from the live sites, Nov 13 2026.
const BRANDS = {
  hny: { end: { over: 'Halal New York', name: 'Gyro', line: 'Five trailers around Columbus, Ohio', cta: 'Find your trailer', url: 'halalnygyro.com' } },
  blite: { end: { over: 'The Fitting Room', name: 'Blite', line: '37742 Van Dyke Ave · Sterling Heights, MI', cta: 'Book a fitting', url: 'blite.app · (586) 983-9143' } },
};
const COLLAB = {
  // ---- Halal New York Gyro ----
  h1: { brand: 'hny', title: 'Try it. You will love it.', scenes: [
    { type: 'plate', bg: 'i01', img: 'i05', first: true, tag: 'Columbus, Ohio', lines: ['Try it.', '<em>You will</em>', '<em>love it.</em>'], ftop: 960, fscale: 1.12, dur: 2.2 },
    { type: 'plate', bg: 'i01', img: 'i02', tag: 'Over seasoned rice', lines: ['Chicken.', 'Lamb.', '<em>Or mix.</em>'], ftop: 960, fscale: 1.1, r0: 2, r1: -2, dur: 2.0 },
    { type: 'plate', bg: 'i01', img: 'i07', lit: true, tag: 'Gyros', lines: ['Wrapped', '<em>to order.</em>'], ftop: 760, fscale: 1.05, dur: 1.8 },
    { type: 'plate', bg: 'i01', img: 'i06', lit: true, lines: ['White sauce.', '<em>Hot sauce.</em>'], size: 176, sub: 'Ask for extra. Most people do.', ftop: 800, fscale: 1.05, r0: 3, r1: -2, dur: 2.2 },
    { type: 'count', img: 'i09', dim: true, n: '5', lines: ['Trailers', '<em>around Columbus.</em>'], size: 130, whip: true, dur: 2.6 }] },
  h2: { brand: 'hny', title: 'Which trailer is closest?', scenes: [
    { type: 'plate', bg: 'i01', img: 'i02', first: true, tag: 'Halal New York Gyro', lines: ['Which one', 'is <em>closest</em>', 'to you?'], size: 190, ftop: 1000, fscale: 1.1, dur: 2.2 },
    { type: 'list', img: 'i09', tag: 'Five trailers · Columbus', lines: ['Pick <em>your window.</em>'], size: 130, numbered: true, top: 560, rows: [
      ['Sullivant', '3464 Sullivant Ave'], ['Cleveland', '3196 Cleveland Ave'], ['Cleveland North', '5565 Cleveland Ave'], ['S. Hamilton', '1466 S Hamilton Rd'], ['Morse', '1780 Morse Rd']], whip: true },
    { type: 'phone', bg: 'i01', tag: 'halalnygyro.com', lines: ['Hours, directions,', '<em>pickup.</em>'], size: 110, scroll: 2500, dur: 3.2, whip: true }],
    end: { line: 'See today’s hours and order pickup' } },
  h3: { brand: 'hny', title: 'Feed the whole room (catering)', scenes: [
    { type: 'plate', bg: 'i01', img: 'i08', first: true, tag: 'Catering', lines: ['Feed the', '<em>whole</em>', '<em>room.</em>'], ftop: 1010, fscale: 1.14, dur: 2.3 },
    { type: 'list', img: 'i08', lines: ['Full pans <em>for</em>'], size: 150, top: 520, rows: [['Jumu’ah'], ['Ramadan iftars'], ['Warehouse crews'], ['Office lunches'], ['Family events']], stagger: 0.32, whip: true },
    { type: 'plate', bg: 'i01', img: 'i02', lines: ['Tell us the date', 'and the <em>headcount.</em>'], size: 120, sub: 'We call you back with a price.', ftop: 900, fscale: 1.1, dur: 2.6, whip: true }],
    end: { line: 'Catering: (614) 316-8829 · (614) 974-6958', cta: 'Request a quote' } },

  // ---- Blite, Sterling Heights ----
  b1: { brand: 'blite', title: '80 looks. 4 occasions.', scenes: [
    { type: 'photo', img: 'i20', first: true, tag: 'Blite · Sterling Heights', lines: ['80 looks.', '<em>4 occasions.</em>'], fy: 0.3, dur: 2.1 },
    { type: 'photo', img: 'i17', tag: '01 · 20 looks', lines: ['Casual'], size: 210, fy: 0.3, dur: 1.25 },
    { type: 'photo', img: 'i21', tag: '02 · 20 looks', lines: ['Formal'], size: 210, fy: 0.3, dur: 1.25 },
    { type: 'photo', img: 'i24', tag: '03 · 20 looks', lines: ['Wedding'], size: 210, fy: 0.25, dur: 1.25 },
    { type: 'photo', img: 'i25', tag: '04 · 20 looks', lines: ['Tuxedo'], size: 210, fy: 0.3, dur: 1.25 },
    { type: 'photo', img: 'i19', lines: ['Built around', 'pieces <em>in the store.</em>'], size: 120, fx0: 0.25, fx1: 0.6, dur: 2.4, whip: true }] },
  b2: { brand: 'blite', title: 'What are you dressing for?', scenes: [
    { type: 'photo', img: 'i23', first: true, tag: 'The Fitting Room', lines: ['What are you', '<em>dressing for?</em>'], size: 136, fy: 0.3, dur: 2.2 },
    { type: 'photo', img: 'i24', lines: ['The wedding.'], size: 150, fy: 0.25, dur: 1.3 },
    { type: 'photo', img: 'i27', lines: ['The black tie night.'], size: 110, fx0: 0.55, fx1: 0.8, dur: 1.3 },
    { type: 'photo', img: 'i20', lines: ['The big meeting.'], size: 124, fy: 0.3, dur: 1.3 },
    { type: 'photo', img: 'i16', lines: ['The weekend.'], size: 150, fx0: 0.5, fx1: 0.62, dur: 1.3 },
    { type: 'photo', img: 'i11', pos: 'mid', lines: ['Tell a stylist', 'the occasion.', '<em>We pull the look.</em>'], size: 112, sub: 'A stylist confirms pieces and sizes in store.', fx0: 0.2, fx1: 0.7, dur: 3.0, whip: true }] },
  b3: { brand: 'blite', title: '316 pieces on the floor', scenes: [
    { type: 'count', img: 'i28', first: true, n: '316', nsize: 420, top: 520, lines: ['pieces', '<em>on the floor.</em>'], size: 120, fx0: 0.4, fx1: 0.6, dur: 2.3 },
    { type: 'photo', img: 'i14', tag: 'Shoes', lines: ['120 styles'], size: 170, fx0: 0.1, fx1: 0.6, dur: 1.4 },
    { type: 'photo', img: 'i11', tag: 'Tailoring', lines: ['33 styles'], size: 170, fx0: 0.2, fx1: 0.7, dur: 1.4 },
    { type: 'photo', img: 'i12', tag: 'Shirts', lines: ['19 styles'], size: 170, fx0: 0.7, fx1: 0.25, dur: 1.4 },
    { type: 'photo', img: 'i13', tag: 'Ties + accessories', lines: ['10 styles'], size: 170, fx0: 0.2, fx1: 0.7, dur: 1.4 },
    { type: 'list', img: 'i15', tag: 'Visit', lines: ['Sterling Place <em>Plaza</em>'], size: 104, top: 600, rows: [['Mon – Sat', '11 am – 8 pm'], ['Sunday', '11 am – 6 pm'], ['Parking', 'Free, in front']], whip: true }],
    end: { cta: 'Visit the store' } },
};
