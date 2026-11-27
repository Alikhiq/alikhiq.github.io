// Wall videos (wall.html): the real work in fast cuts, a pull-back to all 48 videos playing, then the offer.
// CLIPS index = work/v6/cut/<index>_NNNN.jpg, cut from the finished videos in /videos.
// Offer wording is Ali's own (Nov 13 2026): sprint starting at $399/month, most picked $799/month with
// in-store videography, one free collab with @614lux or @roundcity.co. Nothing else is claimed about scope.
const CLIPS = [['Susu Ink & Glow', 'ads'], ['Halal New York Gyro', 'collab'], ['Susu Ink & Glow', 'website'], ['Round City', '3D'], ['Blite', 'collab'], ['Susu Ink & Glow', '3D'],
  ['Blite', 'collab'], ['Halal New York Gyro', 'catering'], ['Blite', 'store'], ['Halal New York Gyro', 'website'], ['Susu Ink & Glow', 'brand'], ['Blite', 'lookbook'], ['Susu Ink & Glow', 'ads'], ['Halal New York Gyro', 'collab']];
const WALL = {
  w: { tag: '@614lux · Nov 8 – 13', hook: 'I made<br><em>48 videos</em><br>in 6 days.', cuts: [0, 1, 2, 3, 4, 5], mid: ['48', 'videos · 6 days'], band: 'Every one <em>built in code.</em>' },
  s1: { tag: '@roundcity.co · Content sprint', hook: 'Videos<br>like these.<br><em>Every month.</em>', hookSize: 160, cuts: [1, 6, 0, 8, 13], mid: ['$399', 'a month · sprint', 62],
    cards: [{ over: 'Content sprint', pre: 'Starting at', price: '$399', per: '/mo', note: 'Videos for your business,<br>every month' }], cardsTop: 430,
    line: 'Content sprint · starting at $399/month', cta: 'Start a sprint' },
  s2: { tag: '@roundcity.co · Most picked', hook: 'We film it<br><em>in your</em><br><em>store.</em>', cuts: [8, 7, 11, 9, 12], mid: ['$799', 'a month · most picked', 62],
    cards: [{ over: 'Most picked', pick: true, price: '$799', per: '/mo', note: 'With in-store<br>videography' }], cardsTop: 470,
    line: 'Most picked · $799/month with in-store videography', cta: 'Book your shoot' },
  s3: { tag: '@614lux × @roundcity.co', hook: 'Get one<br>collab<br><em>free.</em>', hookSize: 200, cuts: [13, 11, 0, 7, 4], mid: ['FREE', 'one collab', 54],
    cards: [{ over: 'One free collab', pick: true, text: true, price: '@614lux<br>or @roundcity.co', note: 'Posted with your business' }], cardsTop: 470,
    line: 'One free collab with @614lux or @roundcity.co', cta: 'Claim your collab' },
  s4: { tag: '@roundcity.co · Packages', hook: 'Two ways<br>to <em>post</em><br><em>like this.</em>', hookSize: 168, cuts: [6, 1, 12, 8, 3], mid: ['$399', 'a month · and up', 62],
    cards: [{ over: 'Content sprint', pre: 'Starting at', price: '$399', per: '/mo' }, { over: 'Most picked', pick: true, price: '$799', per: '/mo', note: 'With in-store videography' }],
    foot: '+ one free collab with<br>@614lux or @roundcity.co', cardsTop: 250,
    line: 'From $399/month · most picked $799/month', cta: 'Talk with Ali' },
  // single videos (Ali's prices, Nov 13 2026): one video $299, one launch video $599, one cinematic 1-minute video $899
  s5: { tag: '@roundcity.co · One video', hook: 'Need just<br><em>one video?</em>', hookSize: 170, cuts: [13, 0, 6, 9, 3], mid: ['$299', 'one video', 62],
    cards: [{ over: 'One video', price: '$299', note: 'One finished video<br>for your business' }], cardsTop: 470, line: 'One video · $299', cta: 'Order one video' },
  s6: { tag: '@roundcity.co · Launch video', hook: 'Opening<br>soon?<br><em>Launch loud.</em>', hookSize: 164, cuts: [7, 11, 2, 1, 8], mid: ['$599', 'launch video', 62],
    cards: [{ over: 'Launch video', pick: true, price: '$599', note: 'One video for<br>your launch' }], cardsTop: 470, line: 'One launch video · $599', cta: 'Book your launch' },
  s7: { tag: '@roundcity.co · Cinematic', hook: 'One minute.<br><em>Cinematic.</em>', hookSize: 180, cuts: [5, 6, 12, 13, 4], mid: ['$899', 'cinematic · 1 min', 62],
    cards: [{ over: 'Cinematic film', pick: true, price: '$899', note: 'One cinematic<br>1-minute video' }], cardsTop: 470, line: 'One cinematic 1-minute video · $899', cta: 'Book your film' },
  s8: { tag: '@roundcity.co · Video menu', hook: 'Pick<br>your<br><em>video.</em>', hookSize: 210, cuts: [1, 11, 0, 8, 5], mid: ['$299', 'and up', 62],
    cards: [{ over: 'One video', price: '$299' }, { over: 'Launch video', price: '$599' }, { over: 'Cinematic · 1 minute', pick: true, price: '$899' }],
    foot: 'Monthly from $399 · most picked $799', cardsTop: 250, line: 'One video $299 · launch $599 · cinematic $899', cta: 'Talk with Ali' },
};
