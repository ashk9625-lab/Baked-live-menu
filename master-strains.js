/*
 * BAKED LIVE MENU — MASTER STRAINS + RANGE
 * Stores strain name, S/I/H type and Baked range(s).
 * Ranges: Outdoor, Yellow, Orange, Green, Silver, Gold, Platinum.
 * A strain may belong to more than one range.
 */

(function () {
  'use strict';

  const BAKED_RANGES = ['Outdoor','Yellow','Orange','Green','Silver','Gold','Platinum'];
  const BUILT_IN_STRAINS = [
  {
    "name": "Alien Cookies",
    "type": "H",
    "ranges": [
      "Orange"
    ]
  },
  {
    "name": "Amaretto Sours",
    "type": "",
    "ranges": []
  },
  {
    "name": "Amnesia Haze",
    "type": "S",
    "ranges": [
      "Orange"
    ]
  },
  {
    "name": "Atomic Bomb",
    "type": "",
    "ranges": []
  },
  {
    "name": "Atomic Dreams",
    "type": "",
    "ranges": []
  },
  {
    "name": "Atomic Jelly",
    "type": "H",
    "ranges": [
      "Outdoor",
      "Gold"
    ]
  },
  {
    "name": "Bad Decisions",
    "type": "",
    "ranges": []
  },
  {
    "name": "Baked Alaska",
    "type": "",
    "ranges": [
      "Green"
    ]
  },
  {
    "name": "Baker's Delight",
    "type": "",
    "ranges": [
      "Platinum"
    ]
  },
  {
    "name": "Barney Zkittles",
    "type": "I",
    "ranges": [
      "Platinum"
    ]
  },
  {
    "name": "Black Cherry Punch",
    "type": "I",
    "ranges": [
      "Gold"
    ]
  },
  {
    "name": "Black Dawg",
    "type": "",
    "ranges": []
  },
  {
    "name": "Blackberry Moonrocks",
    "type": "",
    "ranges": []
  },
  {
    "name": "Blockberry",
    "type": "H",
    "ranges": [
      "Green"
    ]
  },
  {
    "name": "Blockhead Berry",
    "type": "",
    "ranges": []
  },
  {
    "name": "Blue Cheese",
    "type": "I",
    "ranges": [
      "Green"
    ]
  },
  {
    "name": "Blue Dreams",
    "type": "S",
    "ranges": [
      "Outdoor",
      "Platinum"
    ]
  },
  {
    "name": "Blue Java",
    "type": "",
    "ranges": []
  },
  {
    "name": "Blue Zushi",
    "type": "",
    "ranges": []
  },
  {
    "name": "Blueberry Cheesecake",
    "type": "",
    "ranges": []
  },
  {
    "name": "Blueberry Gelato",
    "type": "",
    "ranges": []
  },
  {
    "name": "Blueberry Hashplant",
    "type": "H",
    "ranges": [
      "Gold"
    ]
  },
  {
    "name": "Blueberry Muffin",
    "type": "S",
    "ranges": [
      "Gold"
    ]
  },
  {
    "name": "Blueberry Sugar",
    "type": "I",
    "ranges": [
      "Green"
    ]
  },
  {
    "name": "Brazilian Baker",
    "type": "",
    "ranges": []
  },
  {
    "name": "Bubba Kush",
    "type": "S",
    "ranges": [
      "Orange"
    ]
  },
  {
    "name": "Candy Pavé",
    "type": "",
    "ranges": [
      "Silver"
    ]
  },
  {
    "name": "Cheesy Balls",
    "type": "I",
    "ranges": [
      "Outdoor"
    ]
  },
  {
    "name": "Cherry Driver",
    "type": "H",
    "ranges": [
      "Silver"
    ]
  },
  {
    "name": "Cherry Whip",
    "type": "I",
    "ranges": [
      "Green"
    ]
  },
  {
    "name": "Cicada Stratus",
    "type": "",
    "ranges": []
  },
  {
    "name": "CitraDelic Sunset",
    "type": "",
    "ranges": []
  },
  {
    "name": "Confi Cheese",
    "type": "",
    "ranges": []
  },
  {
    "name": "Cookie Dough",
    "type": "I",
    "ranges": [
      "Platinum"
    ]
  },
  {
    "name": "Cookies & Cream",
    "type": "H",
    "ranges": []
  },
  {
    "name": "Cream Soda",
    "type": "I",
    "ranges": [
      "Outdoor"
    ]
  },
  {
    "name": "Crystal Lobster",
    "type": "",
    "ranges": []
  },
  {
    "name": "Curious Cheese",
    "type": "",
    "ranges": []
  },
  {
    "name": "Dairy Queen",
    "type": "",
    "ranges": []
  },
  {
    "name": "Dark Star",
    "type": "I",
    "ranges": [
      "Platinum"
    ]
  },
  {
    "name": "Devil's Peak",
    "type": "",
    "ranges": []
  },
  {
    "name": "Dirty Bath",
    "type": "",
    "ranges": []
  },
  {
    "name": "Dosi Dos",
    "type": "",
    "ranges": []
  },
  {
    "name": "Double Stuffed Sorbet",
    "type": "",
    "ranges": []
  },
  {
    "name": "El Chapo",
    "type": "",
    "ranges": []
  },
  {
    "name": "Exo Cheese",
    "type": "I",
    "ranges": [
      "Orange"
    ]
  },
  {
    "name": "Exodus Cheese",
    "type": "I",
    "ranges": [
      "Green"
    ]
  },
  {
    "name": "Exodus Kush",
    "type": "",
    "ranges": []
  },
  {
    "name": "Eye Candy",
    "type": "S",
    "ranges": [
      "Gold"
    ]
  },
  {
    "name": "Fantasea",
    "type": "",
    "ranges": []
  },
  {
    "name": "Fruit King",
    "type": "",
    "ranges": []
  },
  {
    "name": "Fruit Stripez",
    "type": "",
    "ranges": []
  },
  {
    "name": "Fudge",
    "type": "",
    "ranges": []
  },
  {
    "name": "Gas Face",
    "type": "H",
    "ranges": [
      "Silver"
    ]
  },
  {
    "name": "Gas Face Monkey",
    "type": "",
    "ranges": []
  },
  {
    "name": "Golden Tiger",
    "type": "S",
    "ranges": [
      "Yellow"
    ]
  },
  {
    "name": "Grape Bubblegum",
    "type": "",
    "ranges": []
  },
  {
    "name": "Grape Daddy",
    "type": "",
    "ranges": []
  },
  {
    "name": "Grape Marmalade",
    "type": "",
    "ranges": []
  },
  {
    "name": "Helplessly Hoping",
    "type": "H",
    "ranges": [
      "Platinum"
    ]
  },
  {
    "name": "Huckleberry",
    "type": "S",
    "ranges": [
      "Yellow"
    ]
  },
  {
    "name": "Ice Cream Cake",
    "type": "",
    "ranges": []
  },
  {
    "name": "Jack Blue Dreams",
    "type": "",
    "ranges": []
  },
  {
    "name": "Jedi Apples",
    "type": "H",
    "ranges": [
      "Silver"
    ]
  },
  {
    "name": "Jetters Diesel",
    "type": "H",
    "ranges": [
      "Gold"
    ]
  },
  {
    "name": "Jungle Cake",
    "type": "",
    "ranges": []
  },
  {
    "name": "Jungle Pie",
    "type": "",
    "ranges": []
  },
  {
    "name": "Killer Tiger",
    "type": "S",
    "ranges": [
      "Outdoor"
    ]
  },
  {
    "name": "Lemon Haze",
    "type": "S",
    "ranges": [
      "Yellow"
    ]
  },
  {
    "name": "Lemon Pop Tart",
    "type": "",
    "ranges": []
  },
  {
    "name": "Lemon Strawz",
    "type": "",
    "ranges": []
  },
  {
    "name": "Lemon Thai",
    "type": "S",
    "ranges": [
      "Green"
    ]
  },
  {
    "name": "Love Potion",
    "type": "",
    "ranges": []
  },
  {
    "name": "Mac Diesel",
    "type": "S",
    "ranges": [
      "Orange"
    ]
  },
  {
    "name": "Malibu Marker",
    "type": "",
    "ranges": []
  },
  {
    "name": "Melonade",
    "type": "",
    "ranges": []
  },
  {
    "name": "Orange Jilly Bean",
    "type": "S",
    "ranges": [
      "Gold"
    ]
  },
  {
    "name": "Oreo Cookies",
    "type": "",
    "ranges": []
  },
  {
    "name": "Persian Baker",
    "type": "",
    "ranges": []
  },
  {
    "name": "Pineapple Express",
    "type": "S",
    "ranges": [
      "Platinum"
    ]
  },
  {
    "name": "Pink Grapefruit",
    "type": "S",
    "ranges": [
      "Yellow"
    ]
  },
  {
    "name": "Platinum Kush Breath",
    "type": "",
    "ranges": []
  },
  {
    "name": "Platinum Punch",
    "type": "S",
    "ranges": [
      "Green"
    ]
  },
  {
    "name": "Platinum Wreck",
    "type": "",
    "ranges": []
  },
  {
    "name": "Polar Pop",
    "type": "",
    "ranges": []
  },
  {
    "name": "Rainbow Belt",
    "type": "",
    "ranges": []
  },
  {
    "name": "Ripped Off Runtz",
    "type": "",
    "ranges": []
  },
  {
    "name": "Rubies",
    "type": "",
    "ranges": []
  },
  {
    "name": "Ruby Rose",
    "type": "H",
    "ranges": []
  },
  {
    "name": "Scented Marker",
    "type": "",
    "ranges": []
  },
  {
    "name": "Scratch and Sniff",
    "type": "",
    "ranges": []
  },
  {
    "name": "Sherbacio",
    "type": "H",
    "ranges": [
      "Gold"
    ]
  },
  {
    "name": "Soda Float",
    "type": "I",
    "ranges": [
      "Yellow"
    ]
  },
  {
    "name": "Sorbet Dreams",
    "type": "",
    "ranges": []
  },
  {
    "name": "Sour Apples",
    "type": "S",
    "ranges": [
      "Yellow"
    ]
  },
  {
    "name": "Sour Rings",
    "type": "",
    "ranges": []
  },
  {
    "name": "Space Cake",
    "type": "",
    "ranges": []
  },
  {
    "name": "Space Panda",
    "type": "",
    "ranges": []
  },
  {
    "name": "Space Queen",
    "type": "S",
    "ranges": []
  },
  {
    "name": "Strawberry Cough",
    "type": "",
    "ranges": []
  },
  {
    "name": "Strawberry OG",
    "type": "H",
    "ranges": []
  },
  {
    "name": "Sundae Driver",
    "type": "H",
    "ranges": [
      "Orange"
    ]
  },
  {
    "name": "Sundae Driver OG",
    "type": "H",
    "ranges": []
  },
  {
    "name": "Sunset Sherbet",
    "type": "I",
    "ranges": [
      "Green"
    ]
  },
  {
    "name": "Sunset Sherbet #2",
    "type": "I",
    "ranges": [
      "Green"
    ]
  },
  {
    "name": "Super Lemon Haze",
    "type": "S",
    "ranges": []
  },
  {
    "name": "Superberry",
    "type": "S",
    "ranges": [
      "Silver"
    ]
  },
  {
    "name": "Tahoe Snow",
    "type": "",
    "ranges": []
  },
  {
    "name": "Temptation",
    "type": "",
    "ranges": []
  },
  {
    "name": "Thai Tiger",
    "type": "S",
    "ranges": [
      "Outdoor"
    ]
  },
  {
    "name": "The New",
    "type": "I",
    "ranges": [
      "Green"
    ]
  },
  {
    "name": "Toxic Tongue",
    "type": "",
    "ranges": []
  },
  {
    "name": "Tropical Punch",
    "type": "S",
    "ranges": [
      "Orange"
    ]
  },
  {
    "name": "Tsunami",
    "type": "H",
    "ranges": [
      "Silver"
    ]
  },
  {
    "name": "Tutti Fruity",
    "type": "S",
    "ranges": [
      "Gold"
    ]
  },
  {
    "name": "UK Cheese",
    "type": "H",
    "ranges": [
      "Yellow"
    ]
  },
  {
    "name": "Unicorn Dream",
    "type": "I",
    "ranges": [
      "Silver"
    ]
  },
  {
    "name": "Very Berry Haze",
    "type": "",
    "ranges": []
  },
  {
    "name": "Watermelon Martini",
    "type": "",
    "ranges": []
  },
  {
    "name": "White Russian",
    "type": "",
    "ranges": []
  },
  {
    "name": "Zesty Diesel",
    "type": "",
    "ranges": []
  },
  {
    "name": "Zkittles",
    "type": "I",
    "ranges": []
  },
  {
    "name": "Zurfer",
    "type": "",
    "ranges": []
  }
];
  const STORAGE_KEY = 'baked_master_strains_v2';
  const LEGACY_STORAGE_KEY = 'baked_master_strains_v1';

  function cleanName(value) {
    return String(value || '').trim().replace(/\\s+/g, ' ');
  }

  function normaliseType(value) {
    const t = String(value || '').trim().toUpperCase();
    return ['S', 'I', 'H'].includes(t) ? t : '';
  }

  function normaliseRanges(value) {
    const raw = Array.isArray(value) ? value : String(value || '').split(',');
    const found = [];
    raw.forEach(v => {
      const match = BAKED_RANGES.find(r => r.toLowerCase() === String(v || '').trim().toLowerCase());
      if (match && !found.includes(match)) found.push(match);
    });
    return found;
  }

  function loadCustom() {
    try {
      let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!Array.isArray(data)) {
        // Automatically carry forward strains saved with the older Master Strains file.
        data = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || '[]');
        if (!Array.isArray(data)) data = [];
        data = data.map(s => ({ name:s.name, type:s.type, ranges:normaliseRanges(s.ranges || s.range) }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
      return data;
    } catch (_) {
      return [];
    }
  }

  function saveCustom(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (_) {}
  }

  function mergeLists() {
    const map = new Map();
    [...BUILT_IN_STRAINS, ...loadCustom()].forEach(item => {
      const name = cleanName(item && item.name);
      if (!name) return;
      const key = name.toLowerCase();
      const type = normaliseType(item && item.type);
      const ranges = normaliseRanges(item && (item.ranges || item.range));
      if (!map.has(key)) {
        map.set(key, { name, type, ranges:[...ranges] });
      } else {
        const current = map.get(key);
        if (!current.type && type) current.type = type;
        ranges.forEach(r => { if (!current.ranges.includes(r)) current.ranges.push(r); });
      }
    });
    return [...map.values()].sort((a,b) => a.name.localeCompare(b.name));
  }

  function getAll() { return mergeLists(); }

  function find(query) {
    const q = cleanName(query).toLowerCase();
    if (!q) return getAll();
    return getAll().filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.type.toLowerCase() === q ||
      s.ranges.some(r => r.toLowerCase().includes(q))
    );
  }

  function upsertCustom(name, type, ranges) {
    const custom = loadCustom();
    const key = cleanName(name).toLowerCase();
    const idx = custom.findIndex(s => cleanName(s.name).toLowerCase() === key);
    const entry = { name: cleanName(name), type: normaliseType(type), ranges: normaliseRanges(ranges) };
    if (idx >= 0) {
      const old = custom[idx] || {};
      entry.type = entry.type || normaliseType(old.type);
      entry.ranges = [...new Set([...normaliseRanges(old.ranges || old.range), ...entry.ranges])];
      custom[idx] = entry;
    } else custom.push(entry);
    saveCustom(custom);
    window.dispatchEvent(new CustomEvent('baked:master-strains-updated'));
    return entry;
  }

  // Backwards compatible: add(name, type) still works. New usage: add(name, type, rangeOrRanges).
  function add(name, type, rangeOrRanges) {
    name = cleanName(name);
    if (!name) return null;
    return upsertCustom(name, type, rangeOrRanges);
  }

  function setRanges(name, rangeOrRanges) {
    const current = getAll().find(s => s.name.toLowerCase() === cleanName(name).toLowerCase());
    if (!current) return null;
    const custom = loadCustom();
    const key = current.name.toLowerCase();
    const idx = custom.findIndex(s => cleanName(s.name).toLowerCase() === key);
    const entry = { name:current.name, type:current.type, ranges:normaliseRanges(rangeOrRanges) };
    if (idx >= 0) custom[idx] = entry; else custom.push(entry);
    saveCustom(custom);
    window.dispatchEvent(new CustomEvent('baked:master-strains-updated'));
    return entry;
  }

  function removeCustom(name) {
    const key = cleanName(name).toLowerCase();
    saveCustom(loadCustom().filter(s => cleanName(s.name).toLowerCase() !== key));
    window.dispatchEvent(new CustomEvent('baked:master-strains-updated'));
  }

  function label(strain) {
    const type = strain.type ? ` (${strain.type})` : '';
    const range = strain.ranges && strain.ranges.length ? ` — ${strain.ranges.join(', ')}` : ' — Range not set';
    return `${strain.name}${type}${range}`;
  }

  function optionsHtml(selectedValue, rangeFilter='') {
    const selected = cleanName(selectedValue).toLowerCase();
    const rf = String(rangeFilter || '').trim().toLowerCase();
    return getAll().filter(s => !rf || s.ranges.some(r => r.toLowerCase() === rf)).map(s => {
      const isSelected = s.name.toLowerCase() === selected ? ' selected' : '';
      return `<option value="${escapeHtml(s.name)}"${isSelected}>${escapeHtml(label(s))}</option>`;
    }).join('');
  }

  function rangeOptionsHtml(selectedValue='') {
    const selected = String(selectedValue || '').trim().toLowerCase();
    return ['<option value="">Select range</option>', ...BAKED_RANGES.map(r =>
      `<option value="${r}"${r.toLowerCase()===selected?' selected':''}>${r}</option>`
    )].join('');
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    })[c]);
  }

  window.BAKED_MASTER_STRAINS = {
    getAll, find, add, setRanges, removeCustom, label, optionsHtml, rangeOptionsHtml,
    ranges: BAKED_RANGES.slice(), builtIn: BUILT_IN_STRAINS.slice()
  };

  window.masterStrains = getAll();
  window.addEventListener('baked:master-strains-updated', () => { window.masterStrains = getAll(); });
  console.info(`[Baked] Master Strains loaded: ${getAll().length} strains with range support`);
})();
