// i18n.js – minimal localization handler

const I18N = {
  lang: null,
  dict: {},

  async init(defaultLang = 'fi') {
    // 1) Determine language
    const stored = localStorage.getItem('lang');
    const browser = navigator.language?.slice(0, 2);

    this.lang = stored || browser || defaultLang;

    // fallback only to supported languages
    if (!['fi', 'en'].includes(this.lang)) {
      this.lang = defaultLang;
    }

    // 2) Load dictionary
    await this.load(this.lang);

    // 3) Apply translations
    this.apply();
    // notify other code that translations are loaded
    try { document.dispatchEvent(new CustomEvent('i18n:loaded')); } catch (e) {}
  },

  async load(lang) {
    try {
      const res = await fetch(`locales/${lang}.json`);
      this.dict = await res.json();
    } catch (err) {
      console.error('i18n load failed:', err);
      this.dict = {};
    }
  },

  t(key) {
    return this.dict[key] ?? key;
  },

  apply(root = document) {
    const nodes = root.querySelectorAll('[data-i18n]');
    nodes.forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = this.t(key);

      // allow future extension (input placeholders etc.)
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = text;
      } else {
        el.textContent = text;
      }
    });
  },

  async setLang(lang) {
    if (lang === this.lang) return;
    if (!['fi', 'en'].includes(lang)) return;

    this.lang = lang;
    localStorage.setItem('lang', lang);

    await this.load(lang);
    this.apply();
  }
};

// Auto-init on page load
document.addEventListener('DOMContentLoaded', () => {
  I18N.init('fi');
});
