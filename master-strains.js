/*
 * BAKED LIVE MENU — MASTER STRAINS
 * Upload this file into the same folder as app.js and load it AFTER app.js:
 * <script src="master-strains.js"></script>
 *
 * Features:
 * - Stores a reusable master strain catalogue.
 * - Remembers new strains in localStorage on the browser/device.
 * - Provides search + add helpers for admin dropdowns.
 * - Existing names are not duplicated.
 */

(function () {
  'use strict';

  const BUILT_IN_STRAINS = [
  {
    "name": "Alien Cookies",
    "type": "H"
  },
  {
    "name": "Amaretto Sours",
    "type": ""
  },
  {
    "name": "Amnesia Haze",
    "type": "S"
  },
  {
    "name": "Atomic Bomb",
    "type": ""
  },
  {
    "name": "Atomic Dreams",
    "type": ""
  },
  {
    "name": "Atomic Jelly",
    "type": "H"
  },
  {
    "name": "Bad Decisions",
    "type": ""
  },
  {
    "name": "Baked Alaska",
    "type": ""
  },
  {
    "name": "Baker's Delight",
    "type": ""
  },
  {
    "name": "Barney Zkittles",
    "type": "I"
  },
  {
    "name": "Black Cherry Punch",
    "type": "I"
  },
  {
    "name": "Black Dawg",
    "type": ""
  },
  {
    "name": "Blackberry Moonrocks",
    "type": ""
  },
  {
    "name": "Blockberry",
    "type": "H"
  },
  {
    "name": "Blockhead Berry",
    "type": ""
  },
  {
    "name": "Blue Cheese",
    "type": "I"
  },
  {
    "name": "Blue Dreams",
    "type": "S"
  },
  {
    "name": "Blue Java",
    "type": ""
  },
  {
    "name": "Blue Zushi",
    "type": ""
  },
  {
    "name": "Blueberry Cheesecake",
    "type": ""
  },
  {
    "name": "Blueberry Gelato",
    "type": ""
  },
  {
    "name": "Blueberry Hashplant",
    "type": "H"
  },
  {
    "name": "Blueberry Muffin",
    "type": "S"
  },
  {
    "name": "Blueberry Sugar",
    "type": "I"
  },
  {
    "name": "Brazilian Baker",
    "type": ""
  },
  {
    "name": "Bubba Kush",
    "type": "S"
  },
  {
    "name": "Candy Pavé",
    "type": ""
  },
  {
    "name": "Cheesy Balls",
    "type": "I"
  },
  {
    "name": "Cherry Driver",
    "type": "H"
  },
  {
    "name": "Cherry Whip",
    "type": "I"
  },
  {
    "name": "Cicada Stratus",
    "type": ""
  },
  {
    "name": "CitraDelic Sunset",
    "type": ""
  },
  {
    "name": "Confi Cheese",
    "type": ""
  },
  {
    "name": "Cookie Dough",
    "type": "I"
  },
  {
    "name": "Cookies & Cream",
    "type": "H"
  },
  {
    "name": "Cream Soda",
    "type": "I"
  },
  {
    "name": "Crystal Lobster",
    "type": ""
  },
  {
    "name": "Curious Cheese",
    "type": ""
  },
  {
    "name": "Dairy Queen",
    "type": ""
  },
  {
    "name": "Dark Star",
    "type": "I"
  },
  {
    "name": "Devil's Peak",
    "type": ""
  },
  {
    "name": "Dirty Bath",
    "type": ""
  },
  {
    "name": "Dosi Dos",
    "type": ""
  },
  {
    "name": "Double Stuffed Sorbet",
    "type": ""
  },
  {
    "name": "El Chapo",
    "type": ""
  },
  {
    "name": "Exo Cheese",
    "type": "I"
  },
  {
    "name": "Exodus Cheese",
    "type": "I"
  },
  {
    "name": "Exodus Kush",
    "type": ""
  },
  {
    "name": "Eye Candy",
    "type": "S"
  },
  {
    "name": "Fantasea",
    "type": ""
  },
  {
    "name": "Fruit King",
    "type": ""
  },
  {
    "name": "Fruit Stripez",
    "type": ""
  },
  {
    "name": "Fudge",
    "type": ""
  },
  {
    "name": "Gas Face",
    "type": "H"
  },
  {
    "name": "Gas Face Monkey",
    "type": ""
  },
  {
    "name": "Golden Tiger",
    "type": "S"
  },
  {
    "name": "Grape Bubblegum",
    "type": ""
  },
  {
    "name": "Grape Daddy",
    "type": ""
  },
  {
    "name": "Grape Marmalade",
    "type": ""
  },
  {
    "name": "Helplessly Hoping",
    "type": "H"
  },
  {
    "name": "Huckleberry",
    "type": "S"
  },
  {
    "name": "Ice Cream Cake",
    "type": ""
  },
  {
    "name": "Jack Blue Dreams",
    "type": ""
  },
  {
    "name": "Jedi Apples",
    "type": "H"
  },
  {
    "name": "Jetters Diesel",
    "type": "H"
  },
  {
    "name": "Jungle Cake",
    "type": ""
  },
  {
    "name": "Jungle Pie",
    "type": ""
  },
  {
    "name": "Killer Tiger",
    "type": "S"
  },
  {
    "name": "Lemon Haze",
    "type": "S"
  },
  {
    "name": "Lemon Pop Tart",
    "type": ""
  },
  {
    "name": "Lemon Strawz",
    "type": ""
  },
  {
    "name": "Lemon Thai",
    "type": "S"
  },
  {
    "name": "Love Potion",
    "type": ""
  },
  {
    "name": "Mac Diesel",
    "type": "S"
  },
  {
    "name": "Malibu Marker",
    "type": ""
  },
  {
    "name": "Melonade",
    "type": ""
  },
  {
    "name": "Orange Jilly Bean",
    "type": "S"
  },
  {
    "name": "Oreo Cookies",
    "type": ""
  },
  {
    "name": "Persian Baker",
    "type": ""
  },
  {
    "name": "Pineapple Express",
    "type": "S"
  },
  {
    "name": "Pink Grapefruit",
    "type": "S"
  },
  {
    "name": "Platinum Kush Breath",
    "type": ""
  },
  {
    "name": "Platinum Punch",
    "type": "S"
  },
  {
    "name": "Platinum Wreck",
    "type": ""
  },
  {
    "name": "Polar Pop",
    "type": ""
  },
  {
    "name": "Rainbow Belt",
    "type": ""
  },
  {
    "name": "Ripped Off Runtz",
    "type": ""
  },
  {
    "name": "Rubies",
    "type": ""
  },
  {
    "name": "Ruby Rose",
    "type": "H"
  },
  {
    "name": "Scented Marker",
    "type": ""
  },
  {
    "name": "Scratch and Sniff",
    "type": ""
  },
  {
    "name": "Sherbacio",
    "type": "H"
  },
  {
    "name": "Soda Float",
    "type": "I"
  },
  {
    "name": "Sorbet Dreams",
    "type": ""
  },
  {
    "name": "Sour Apples",
    "type": "S"
  },
  {
    "name": "Sour Rings",
    "type": ""
  },
  {
    "name": "Space Cake",
    "type": ""
  },
  {
    "name": "Space Panda",
    "type": ""
  },
  {
    "name": "Space Queen",
    "type": "S"
  },
  {
    "name": "Strawberry Cough",
    "type": ""
  },
  {
    "name": "Strawberry OG",
    "type": "H"
  },
  {
    "name": "Sundae Driver",
    "type": "H"
  },
  {
    "name": "Sundae Driver OG",
    "type": "H"
  },
  {
    "name": "Sunset Sherbet",
    "type": "I"
  },
  {
    "name": "Sunset Sherbet #2",
    "type": "I"
  },
  {
    "name": "Super Lemon Haze",
    "type": "S"
  },
  {
    "name": "Superberry",
    "type": "S"
  },
  {
    "name": "Tahoe Snow",
    "type": ""
  },
  {
    "name": "Temptation",
    "type": ""
  },
  {
    "name": "Thai Tiger",
    "type": "S"
  },
  {
    "name": "The New",
    "type": "I"
  },
  {
    "name": "Toxic Tongue",
    "type": ""
  },
  {
    "name": "Tropical Punch",
    "type": "S"
  },
  {
    "name": "Tsunami",
    "type": "H"
  },
  {
    "name": "Tutti Fruity",
    "type": "S"
  },
  {
    "name": "UK Cheese",
    "type": "H"
  },
  {
    "name": "Unicorn Dream",
    "type": "I"
  },
  {
    "name": "Very Berry Haze",
    "type": ""
  },
  {
    "name": "Watermelon Martini",
    "type": ""
  },
  {
    "name": "White Russian",
    "type": ""
  },
  {
    "name": "Zesty Diesel",
    "type": ""
  },
  {
    "name": "Zkittles",
    "type": "I"
  },
  {
    "name": "Zurfer",
    "type": ""
  }
];
  const STORAGE_KEY = 'baked_master_strains_v1';

  function cleanName(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  function normaliseType(value) {
    const t = String(value || '').trim().toUpperCase();
    return ['S', 'I', 'H'].includes(t) ? t : '';
  }

  function loadCustom() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(data) ? data : [];
    } catch (_) {
      return [];
    }
  }

  function saveCustom(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (_) {}
  }

  function mergeLists() {
    const map = new Map();
    [...BUILT_IN_STRAINS, ...loadCustom()].forEach(item => {
      const name = cleanName(item && item.name);
      if (!name) return;
      const key = name.toLowerCase();
      const type = normaliseType(item && item.type);
      if (!map.has(key)) map.set(key, { name, type });
      else if (!map.get(key).type && type) map.get(key).type = type;
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  function getAll() {
    return mergeLists();
  }

  function find(query) {
    const q = cleanName(query).toLowerCase();
    if (!q) return getAll();
    return getAll().filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.type.toLowerCase() === q
    );
  }

  function add(name, type) {
    name = cleanName(name);
    type = normaliseType(type);
    if (!name) return null;

    const all = getAll();
    const existing = all.find(s => s.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!existing.type && type) {
        const custom = loadCustom();
        const idx = custom.findIndex(s => cleanName(s.name).toLowerCase() === name.toLowerCase());
        if (idx >= 0) custom[idx].type = type;
        else custom.push({ name, type });
        saveCustom(custom);
      }
      return existing;
    }

    const custom = loadCustom();
    custom.push({ name, type });
    saveCustom(custom);
    window.dispatchEvent(new CustomEvent('baked:master-strains-updated'));
    return { name, type };
  }

  function removeCustom(name) {
    const key = cleanName(name).toLowerCase();
    const custom = loadCustom().filter(s => cleanName(s.name).toLowerCase() !== key);
    saveCustom(custom);
    window.dispatchEvent(new CustomEvent('baked:master-strains-updated'));
  }

  function label(strain) {
    return strain.type ? `${strain.name} (${strain.type})` : strain.name;
  }

  function optionsHtml(selectedValue) {
    const selected = cleanName(selectedValue).toLowerCase();
    return getAll().map(s => {
      const isSelected = s.name.toLowerCase() === selected ? ' selected' : '';
      return `<option value="${escapeHtml(s.name)}"${isSelected}>${escapeHtml(label(s))}</option>`;
    }).join('');
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    })[c]);
  }

  window.BAKED_MASTER_STRAINS = {
    getAll,
    find,
    add,
    removeCustom,
    label,
    optionsHtml,
    builtIn: BUILT_IN_STRAINS.slice()
  };

  // Make the catalogue available to existing code that looks for masterStrains.
  if (!window.masterStrains) {
    window.masterStrains = getAll();
  }

  window.addEventListener('baked:master-strains-updated', () => {
    window.masterStrains = getAll();
  });

  console.info(`[Baked] Master Strains loaded: ${getAll().length} strains`);
})();
