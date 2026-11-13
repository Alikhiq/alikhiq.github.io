// "Mission control" videos (ops.html): a client build shown as a live node graph.
// Every count is the client's real number, read from their live site (Nov 13 2026). No invented prices or timings.
const OPS = {
  // Blite: 316 pieces on the floor = the eight shop categories listed on blite.app (120+104+33+19+10+10+10+10)
  o1: { brand: 'blite', seed: 11, tag: 'Blite · Sterling Heights', head: '316 pieces.<br><em>One live store.</em>', graph: 'blite.app', cmd: 'publish blite.app --catalog floor',
    inputs: [
      { name: 'brief', rows: [['client', 'Blite'], ['city', 'Sterling Hts'], ['goal', 'catalog']] },
      { name: 'floor photos', rows: [['source', 'in store'], ['looks', '80'], ['occasions', '4']] },
      { name: 'sizes', rows: [['suits', '36 – 48'], ['shirts', '14.5 – 17.5'], ['fit', 'stylist']] },
      { name: 'visit', rows: [['mon – sat', '11 – 8'], ['sunday', '11 – 6'], ['parking', 'free']] }],
    modules: [
      { name: 'Shoes', n: 120, img: 'i14' }, { name: 'Fall Sessions', n: 104, img: 'i17', unit: 'pieces' },
      { name: 'Tailoring', n: 33, img: 'i11' }, { name: 'Shirts', n: 19, img: 'i12' },
      { name: 'Evening', n: 10, img: 'i25' }, { name: 'Ties + Acc.', n: 10, img: 'i13' },
      { name: 'Pants + Denim', n: 10, img: 'i15' }, { name: 'New Arrivals', n: 10, img: 'i01' }],
    totalUnit: 'catalog', totalLabel: 'pieces <b>live</b> on blite.app',
    reveal: { tag: 'blite.app', head: 'Every piece,<br><em>on your phone.</em>', scroll: 2400 },
    end: { over: 'The Fitting Room', name: 'Blite', line: '37742 Van Dyke Ave · Sterling Heights, MI', cta: 'Book a fitting', url: 'blite.app · (586) 983-9143' } },
};
