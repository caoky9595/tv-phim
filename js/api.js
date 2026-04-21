// OPhim API wrapper
const API = (() => {
  const BASE = 'https://ophim1.com';
  const CDN  = 'https://img.ophim.live/uploads/movies/';

  // 18+ category slugs/keywords to filter out
  const BLOCKED_CATEGORIES = ['phim-18', '18+', 'nguoi-lon', 'xxx', 'erotic', 'adult'];
  const BLOCKED_SLUGS_RX   = /18\+|nguoi.?lon|xxx|erotic|adult/i;

  function filter18(items = []) {
    return items.filter(m => {
      if (!m) return false;
      // Check slug
      if (m.slug && BLOCKED_SLUGS_RX.test(m.slug)) return false;
      // Check name
      if (m.name && BLOCKED_SLUGS_RX.test(m.name)) return false;
      // Check categories
      if (m.category && m.category.some(c =>
        BLOCKED_CATEGORIES.includes(c.slug) || BLOCKED_SLUGS_RX.test(c.slug || c.name || '')))
        return false;
      return true;
    });
  }

  async function get(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  return {
    img(filename) {
      if (!filename) return '';
      if (filename.startsWith('http')) return filename;
      return CDN + filename;
    },

    async home() {
      const data = await get(`${BASE}/v1/api/home`);
      return filter18(data?.data?.items || []);
    },

    async list(type = 'phim-bo', page = 1) {
      const data = await get(`${BASE}/v1/api/danh-sach/${type}?page=${page}`);
      const d = data?.data || {};
      return {
        items: filter18(d.items || []),
        pagination: d.params?.pagination || {}
      };
    },

    async search(keyword, page = 1) {
      const data = await get(`${BASE}/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`);
      const d = data?.data || {};
      return {
        items: filter18(d.items || []),
        pagination: d.params?.pagination || {}
      };
    },

    async movieDetail(slug) {
      const data = await get(`${BASE}/v1/api/phim/${slug}`);
      const d = data?.data || data || null;
      if (!d) return null;
      const movie = d.item || d.movie || null;
      if (!movie) return null;
      // Episodes are stored INSIDE item.episodes (not at data level)
      const episodes = movie.episodes || d.episodes || [];
      // Remove episodes from movie object to keep it clean
      const cleanMovie = { ...movie };
      delete cleanMovie.episodes;
      return { movie: cleanMovie, episodes };
    },

    async category(slug, page = 1) {
      const data = await get(`${BASE}/v1/api/the-loai/${slug}?page=${page}`);
      const d = data?.data || {};
      return {
        items: filter18(d.items || []),
        pagination: d.params?.pagination || {}
      };
    },

    async country(slug, page = 1) {
      const data = await get(`${BASE}/v1/api/quoc-gia/${slug}?page=${page}`);
      const d = data?.data || {};
      return {
        items: filter18(d.items || []),
        pagination: d.params?.pagination || {}
      };
    },

    async categories() {
      const data = await get(`${BASE}/v1/api/the-loai`);
      const items = data?.data?.items || [];
      return items.filter(c => !BLOCKED_CATEGORIES.includes(c.slug) && !BLOCKED_SLUGS_RX.test(c.slug));
    },

    async countries() {
      const data = await get(`${BASE}/v1/api/quoc-gia`);
      return data?.data?.items || [];
    },

    async years() {
      const data = await get(`${BASE}/v1/api/nam`);
      return data?.data?.items || [];
    },

    async filterAdvanced({ category = '', country = '', year = '', sort = 'modified.time', type = 'phim-bo', page = 1 } = {}) {
      // Build URL using correct filter params
      let url = `${BASE}/v1/api/danh-sach/${type}?page=${page}&sort_field=${sort}&sort_type=desc`;
      if (category) url += `&category=${encodeURIComponent(category)}`;
      if (country)  url += `&country=${encodeURIComponent(country)}`;
      if (year)     url += `&year=${encodeURIComponent(year)}`;
      const data = await get(url);
      const d = data?.data || {};
      return {
        items: filter18(d.items || []),
        pagination: d.params?.pagination || {}
      };
    }
  };
})();
