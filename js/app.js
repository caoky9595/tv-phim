// Main App Controller
const App = (() => {
  let currentScreen = 'home';
  let screenHistory = [];

  // Toast notification
  function toast(msg, duration = 2500) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), duration);
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────
  function cardHTML(movie) {
    const img = API.img(movie.poster_url || movie.thumb_url);
    const quality = movie.quality || '';
    const lang = movie.lang || '';
    const ep = movie.episode_current || '';
    return `
      <div class="card" tabindex="0" data-slug="${movie.slug}">
        ${img ? `<img class="card-poster" src="${img}" alt="${movie.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ''}
        <div class="card-poster-placeholder" ${img ? 'style="display:none"' : ''}>🎬</div>
        ${quality ? `<div class="card-badge gold">${quality}</div>` : ''}
        <div class="card-overlay">
          <div class="card-title">${movie.name}</div>
          <div class="card-meta">${movie.year || ''} ${lang ? '• ' + lang : ''} ${ep ? '• ' + ep : ''}</div>
        </div>
      </div>`;
  }

  function skeletonRow(n = 8) {
    return Array(n).fill(0).map(() =>
      `<div class="card skeleton" style="height:300px"></div>`
    ).join('');
  }

  function paginationHTML(pagination) {
    const { currentPage = 1, totalPages = 1 } = pagination;
    const pages = [];
    for (let p = Math.max(1, currentPage - 2); p <= Math.min(totalPages, currentPage + 2); p++) pages.push(p);
    return `<div class="pagination">
      <button class="page-btn" ${currentPage <= 1 ? 'disabled' : ''} tabindex="0" data-page="${currentPage - 1}">← Trước</button>
      ${pages.map(p => `<button class="page-btn ${p === currentPage ? 'active' : ''}" tabindex="0" data-page="${p}">${p}</button>`).join('')}
      <button class="page-btn" ${currentPage >= totalPages ? 'disabled' : ''} tabindex="0" data-page="${currentPage + 1}">Sau →</button>
      <span class="page-info">Trang ${currentPage}/${totalPages}</span>
    </div>`;
  }

  function bindCards(container) {
    container.querySelectorAll('.card').forEach(card => {
      card.addEventListener('click', () => navigateTo('detail', card.dataset.slug));
    });
  }

  // ── HOME SCREEN ──────────────────────────────────────────────────────────
  async function renderHome() {
    const main = document.getElementById('home-main');
    main.innerHTML = '';

    // Continue watching row
    const cw = Store.getContinueWatching().filter(p => p.name && (p.duration - p.currentTime) > 30);
    if (cw.length) {
      const row = document.createElement('div');
      row.className = 'section';
      row.innerHTML = `
        <div class="section-header"><div class="section-title">▶ Xem tiếp</div></div>
        <div class="card-row">
          ${cw.map(p => {
            const pct = p.duration ? Math.round((p.currentTime / p.duration) * 100) : 0;
            return `<div class="continue-card" tabindex="0" data-slug="${p.slug}">
              <img class="continue-poster" src="${API.img(p.thumb)}" alt="${p.name}" onerror="this.src=''">
              <div class="continue-info">
                <div class="continue-title">${p.name}</div>
                <div class="continue-ep">Tập ${p.episode || '?'} • còn ${Math.round((p.duration - p.currentTime) / 60)} phút</div>
                <div class="continue-progress"><div class="continue-progress-fill" style="width:${pct}%"></div></div>
              </div>
            </div>`;
          }).join('')}
        </div>`;
      main.appendChild(row);
      row.querySelectorAll('.continue-card').forEach(card => {
        card.addEventListener('click', async () => {
          const progress = Store.getProgress(card.dataset.slug);
          const data = await API.movieDetail(card.dataset.slug);
          if (data) Player.open(card.dataset.slug, data, progress?.epIdx || 0, progress?.serverIdx || 0);
        });
      });
    }

    // Hero + sections
    try {
      const items = await API.home();
      renderHero(items.slice(0, 5));

      const newSec = document.createElement('div');
      newSec.className = 'section';
      newSec.innerHTML = `
        <div class="section-header">
          <div class="section-title">🔥 Mới cập nhật</div>
          <span class="see-all" tabindex="0">Xem tất cả</span>
        </div>
        <div class="card-row">${items.map(m => cardHTML(m)).join('')}</div>`;
      main.appendChild(newSec);
      bindCards(newSec);
      newSec.querySelector('.see-all').addEventListener('click', () => navigateTo('browse'));
    } catch (e) {
      console.error('Home load error:', e);
      toast('Lỗi tải trang chủ. Kiểm tra kết nối mạng.');
    }

    // Phim bộ
    try {
      const { items } = await API.list('phim-bo', 1);
      const sec = document.createElement('div');
      sec.className = 'section';
      sec.innerHTML = `
        <div class="section-header">
          <div class="section-title">📺 Phim Bộ</div>
          <span class="see-all" tabindex="0">Xem tất cả</span>
        </div>
        <div class="card-row">${items.slice(0, 12).map(m => cardHTML(m)).join('')}</div>`;
      main.appendChild(sec);
      bindCards(sec);
      sec.querySelector('.see-all').addEventListener('click', () => navigateTo('browse', { tab: 'phim-bo' }));
    } catch {}

    // Phim lẻ
    try {
      const { items } = await API.list('phim-le', 1);
      const sec = document.createElement('div');
      sec.className = 'section';
      sec.innerHTML = `
        <div class="section-header">
          <div class="section-title">🎬 Phim Lẻ</div>
          <span class="see-all" tabindex="0">Xem tất cả</span>
        </div>
        <div class="card-row">${items.slice(0, 12).map(m => cardHTML(m)).join('')}</div>`;
      main.appendChild(sec);
      bindCards(sec);
      sec.querySelector('.see-all').addEventListener('click', () => navigateTo('browse', { tab: 'phim-le' }));
    } catch {}

    // Hoạt hình
    try {
      const { items } = await API.list('hoat-hinh', 1);
      const sec = document.createElement('div');
      sec.className = 'section';
      sec.innerHTML = `
        <div class="section-header">
          <div class="section-title">✨ Hoạt Hình</div>
          <span class="see-all" tabindex="0">Xem tất cả</span>
        </div>
        <div class="card-row">${items.slice(0, 12).map(m => cardHTML(m)).join('')}</div>`;
      main.appendChild(sec);
      bindCards(sec);
      sec.querySelector('.see-all').addEventListener('click', () => navigateTo('browse', { tab: 'hoat-hinh' }));
    } catch {}
  }

  // ── HERO BANNER ──────────────────────────────────────────────────────────
  let heroInterval = null;
  let heroIdx = 0;
  let heroItems = [];

  function renderHero(items) {
    heroItems = items;
    heroIdx = 0;
    clearInterval(heroInterval);

    const hero = document.getElementById('hero');
    const dots = document.getElementById('hero-dots');
    dots.innerHTML = items.map((_, i) => `<div class="hero-dot${i===0?' active':''}" data-i="${i}"></div>`).join('');
    dots.querySelectorAll('.hero-dot').forEach(d => {
      d.addEventListener('click', () => setHero(parseInt(d.dataset.i)));
    });

    // Remove old listeners by cloning
    const btn = document.getElementById('btn-hero-play');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', () => navigateTo('detail', heroItems[heroIdx]?.slug));

    setHero(0);
    heroInterval = setInterval(() => setHero((heroIdx + 1) % items.length), 8000);
  }

  function setHero(idx) {
    heroIdx = idx;
    const m = heroItems[idx];
    if (!m) return;
    document.getElementById('hero-bg').style.backgroundImage = `url('${API.img(m.thumb_url)}')`;
    document.getElementById('hero-title').textContent = m.name;
    document.getElementById('hero-meta').textContent =
      [m.year, m.lang, m.time, m.episode_current].filter(Boolean).join(' • ');
    document.getElementById('hero-desc').textContent = '';
    document.getElementById('hero-badges').innerHTML =
      `${m.quality ? `<span class="badge badge-quality">${m.quality}</span>` : ''}
       ${m.lang ? `<span class="badge badge-lang">${m.lang}</span>` : ''}
       ${m.type === 'series' ? `<span class="badge badge-type">Series</span>` :
         m.type === 'single' ? `<span class="badge badge-type">Phim lẻ</span>` : ''}`;
    document.querySelectorAll('.hero-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
  }

  // ── BROWSE SCREEN ────────────────────────────────────────────────────────
  let browseState = { tab: 'phim-bo', page: 1, filter: {} };
  let categories = [], countries = [], years_list = [];

  function renderBrowse(params = {}) {
    if (params && params.tab) browseState.tab = params.tab;
    browseState.page = (params && params.page) || 1;

    const container = document.getElementById('browse-main');
    const tabs = ['phim-bo', 'phim-le', 'hoat-hinh', 'phim-moi-cap-nhat'];
    const tabLabels = {
      'phim-bo': 'Phim Bộ',
      'phim-le': 'Phim Lẻ',
      'hoat-hinh': 'Hoạt Hình',
      'phim-moi-cap-nhat': 'Mới nhất'
    };

    // Render shell immediately — no awaiting
    container.innerHTML = `
      <div class="tabs">
        ${tabs.map(t => `<button class="tab-pill ${browseState.tab === t ? 'active' : ''}" tabindex="0" data-tab="${t}">${tabLabels[t]}</button>`).join('')}
      </div>
      <div class="filter-bar">
        <select class="filter-select" id="f-country" tabindex="0">
          <option value="">Tất cả quốc gia</option>
        </select>
        <select class="filter-select" id="f-cat" tabindex="0">
          <option value="">Tất cả thể loại</option>
        </select>
        <select class="filter-select" id="f-year" tabindex="0">
          <option value="">Tất cả năm</option>
        </select>
        <select class="filter-select" id="f-sort" tabindex="0">
          <option value="modified.time">Mới nhất</option>
          <option value="_id">Mới thêm</option>
          <option value="year">Năm</option>
        </select>
        <button class="filter-chip active" id="f-apply" tabindex="0">🔍 Lọc</button>
      </div>
      <div id="browse-grid" class="card-grid">${skeletonRow(24)}</div>
      <div id="browse-pagination"></div>`;

    // Tab switching
    container.querySelectorAll('.tab-pill').forEach(t => {
      t.addEventListener('click', () => {
        browseState.tab = t.dataset.tab;
        browseState.filter = {};
        browseState.page = 1;
        renderBrowse();
      });
    });

    // Apply filter
    document.getElementById('f-apply').addEventListener('click', () => {
      browseState.filter.country  = document.getElementById('f-country').value;
      browseState.filter.category = document.getElementById('f-cat').value;
      browseState.filter.year     = document.getElementById('f-year').value;
      browseState.filter.sort     = document.getElementById('f-sort').value;
      browseState.page = 1;
      loadBrowsePage();
    });

    // Load movies NOW (synchronous render, no waiting)
    loadBrowsePage();

    // Load filter dropdowns in background (non-blocking)
    loadFilterOptions();
  }

  function loadFilterOptions() {
    // Years
    if (!years_list.length) {
      const cur = new Date().getFullYear();
      for (let y = cur; y >= 1990; y--) years_list.push(y);
    }
    const fYear = document.getElementById('f-year');
    if (fYear && years_list.length) {
      fYear.innerHTML = `<option value="">Tất cả năm</option>${years_list.map(y => `<option value="${y}">${y}</option>`).join('')}`;
    }

    // Categories async
    if (!categories.length) {
      API.categories().then(cats => {
        categories = cats;
        const fCat = document.getElementById('f-cat');
        if (fCat) fCat.innerHTML = `<option value="">Tất cả thể loại</option>${cats.map(c => `<option value="${c.slug}">${c.name}</option>`).join('')}`;
      }).catch(() => {});
    }

    // Countries async
    if (!countries.length) {
      API.countries().then(ctrs => {
        countries = ctrs;
        const fCountry = document.getElementById('f-country');
        if (fCountry) fCountry.innerHTML = `<option value="">Tất cả quốc gia</option>${ctrs.map(c => `<option value="${c.slug}">${c.name}</option>`).join('')}`;
      }).catch(() => {});
    }
  }

  async function loadBrowsePage() {
    const grid = document.getElementById('browse-grid');
    const pag  = document.getElementById('browse-pagination');
    if (!grid) return;
    grid.innerHTML = skeletonRow(24);

    try {
      const hasFilter = Object.values(browseState.filter).some(v => v && v !== 'modified.time');
      let result;
      if (hasFilter) {
        result = await API.filterAdvanced({
          type:     browseState.tab,
          country:  browseState.filter.country || '',
          category: browseState.filter.category || '',
          year:     browseState.filter.year || '',
          sort:     browseState.filter.sort || 'modified.time',
          page:     browseState.page
        });
      } else {
        result = await API.list(browseState.tab, browseState.page);
      }

      if (!result.items.length) {
        grid.innerHTML = `<p style="color:var(--text2);padding:40px">Không có phim nào.</p>`;
        return;
      }

      grid.innerHTML = result.items.map(m => cardHTML(m)).join('');
      bindCards(grid);

      if (pag) {
        pag.innerHTML = paginationHTML(result.pagination);
        pag.querySelectorAll('.page-btn').forEach(btn => {
          if (!btn.disabled) {
            btn.addEventListener('click', () => {
              browseState.page = parseInt(btn.dataset.page);
              loadBrowsePage();
              document.getElementById('screen-browse').scrollTo({ top: 0, behavior: 'smooth' });
            });
          }
        });
      }
    } catch (e) {
      console.error('Browse error:', e);
      if (grid) grid.innerHTML = `<p style="color:var(--text2);padding:40px">Lỗi tải phim: ${e.message}</p>`;
    }
  }

  // ── SEARCH SCREEN ────────────────────────────────────────────────────────
  let searchTimeout = null;

  function renderSearch() {
    document.getElementById('search-input').focus();
  }

  function initSearch() {
    const input = document.getElementById('search-input');
    const grid  = document.getElementById('search-results');
    const mic   = document.getElementById('mic-btn');

    input.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      const q = input.value.trim();
      if (!q) { grid.innerHTML = ''; return; }
      grid.innerHTML = skeletonRow(8);
      searchTimeout = setTimeout(async () => {
        try {
          const { items } = await API.search(q);
          grid.innerHTML = items.length
            ? items.map(m => cardHTML(m)).join('')
            : `<p style="color:var(--text2);padding:20px">Không tìm thấy kết quả cho "<strong>${q}</strong>"</p>`;
          bindCards(grid);
        } catch {
          grid.innerHTML = '<p style="color:var(--text2)">Lỗi tìm kiếm</p>';
        }
      }, 500);
    });

    // Voice search
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SR();
      recognition.lang = 'vi-VN';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      mic.addEventListener('click', () => {
        document.getElementById('voice-overlay').classList.add('active');
        document.getElementById('voice-result').textContent = '';
        document.getElementById('voice-status').textContent = 'Đang nghe...';
        mic.classList.add('listening');
        try { recognition.start(); } catch {}
      });

      recognition.onresult = e => {
        const transcript = e.results[0][0].transcript;
        document.getElementById('voice-result').textContent = transcript;
        if (e.results[0].isFinal) {
          input.value = transcript;
          input.dispatchEvent(new Event('input'));
          setTimeout(closeVoice, 500);
        }
      };

      recognition.onerror = () => {
        document.getElementById('voice-status').textContent = 'Lỗi nhận giọng nói';
        setTimeout(closeVoice, 1500);
      };

      recognition.onend = closeVoice;

      document.getElementById('voice-overlay').addEventListener('click', () => {
        try { recognition.stop(); } catch {}
        closeVoice();
      });
    } else {
      mic.style.display = 'none';
    }
  }

  function closeVoice() {
    document.getElementById('voice-overlay').classList.remove('active');
    document.getElementById('mic-btn').classList.remove('listening');
  }

  // ── MOVIE DETAIL ─────────────────────────────────────────────────────────
  async function renderDetail(slug) {
    showScreen('detail');
    const container = document.getElementById('detail-content');
    const backdrop  = document.getElementById('detail-backdrop');
    container.innerHTML = `<div style="padding:60px;text-align:center;color:var(--text2)">Đang tải phim...</div>`;
    backdrop.style.backgroundImage = '';

    try {
      const data = await API.movieDetail(slug);
      if (!data?.movie) throw new Error(`Không tìm thấy phim "${slug}"`);

      const m = data.movie;
      const episodes = data.episodes || [];
      const progress = Store.getProgress(slug);

      backdrop.style.backgroundImage = `url('${API.img(m.thumb_url)}')`;

      const cats    = (m.category || []).map(c => c.name).join(', ');
      const nations = (m.country  || []).map(c => c.name).join(', ');

      // Build episode HTML
      let epHTML = '';
      if (episodes.length) {
        episodes.forEach((server, si) => {
          const eps = server.server_data || [];
          if (!eps.length) return;
          epHTML += `<div class="ep-servers">
            <div class="server-name">🖥 ${server.server_name}</div>
            <div class="ep-grid">
              ${eps.map((ep, ei) => {
                const key     = `${si}_${ep.name}`;
                const watched = Store.isWatched(slug, key);
                const isCur   = progress?.serverIdx === si && progress?.epIdx === ei;
                return `<button class="ep-btn ${isCur ? 'current' : ''} ${watched ? 'watched' : ''}"
                  tabindex="0" data-si="${si}" data-ei="${ei}">${ep.name}</button>`;
              }).join('')}
            </div>
          </div>`;
        });
      }

      const continueBtn = progress && (progress.duration - progress.currentTime) > 10
        ? `<button class="btn btn-secondary" id="detail-continue" tabindex="0">
             ↩ Xem tiếp Tập ${progress.episode}
           </button>`
        : '';

      container.innerHTML = `
        <div id="detail-poster">
          <img src="${API.img(m.poster_url || m.thumb_url)}" alt="${m.name}" onerror="this.src=''">
        </div>
        <div id="detail-info">
          <h1 id="detail-title">${m.name}</h1>
          <div id="detail-origin">${m.origin_name || ''}</div>
          <div id="detail-badges">
            ${m.quality ? `<span class="detail-badge badge-quality">${m.quality}</span>` : ''}
            ${m.lang    ? `<span class="detail-badge badge-lang">${m.lang}</span>` : ''}
            ${m.year    ? `<span class="detail-badge">${m.year}</span>` : ''}
            ${m.time    ? `<span class="detail-badge">⏱ ${m.time}</span>` : ''}
            ${m.episode_current ? `<span class="detail-badge">📺 ${m.episode_current}</span>` : ''}
          </div>
          <p id="detail-desc">${m.content || 'Chưa có mô tả.'}</p>
          <div id="detail-tags">
            ${cats    ? `<span class="tag">🎭 ${cats}</span>` : ''}
            ${nations ? `<span class="tag">🌍 ${nations}</span>` : ''}
            ${m.director?.length ? `<span class="tag">🎬 ${m.director.slice(0,2).join(', ')}</span>` : ''}
          </div>
          <div id="detail-btns">
            <button class="btn btn-primary" id="detail-play" tabindex="0">▶ Xem Ngay</button>
            ${continueBtn}
          </div>
          <div id="detail-episodes">
            ${epHTML || '<p style="color:var(--text2)">Chưa có tập phát sóng.</p>'}
          </div>
        </div>`;

      document.getElementById('detail-play')?.addEventListener('click', () => {
        Player.open(slug, data, 0, 0);
      });

      document.getElementById('detail-continue')?.addEventListener('click', () => {
        Player.open(slug, data, progress.epIdx || 0, progress.serverIdx || 0);
      });

      container.querySelectorAll('.ep-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          Player.open(slug, data, parseInt(btn.dataset.ei), parseInt(btn.dataset.si));
        });
      });

      Nav.focusFirst(container);
    } catch (e) {
      console.error('Detail error:', e);
      container.innerHTML = `<p style="color:var(--text2);padding:60px">Lỗi: ${e.message}</p>`;
    }
  }

  // ── SCREEN ROUTING ───────────────────────────────────────────────────────
  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${name}`)?.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.screen === name));
    currentScreen = name;
  }

  function navigateTo(screen, param = null) {
    screenHistory.push({ screen: currentScreen });
    showScreen(screen);
    if (screen === 'home')   renderHome();
    if (screen === 'browse') renderBrowse(typeof param === 'object' && param !== null ? param : {});
    if (screen === 'search') renderSearch();
    if (screen === 'detail' && typeof param === 'string') renderDetail(param);
    document.getElementById(`screen-${screen}`)?.scrollTo({ top: 0 });
  }

  // ── INIT ─────────────────────────────────────────────────────────────────
  function init() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => navigateTo(item.dataset.screen));
    });

    window.addEventListener('tv:back', () => {
      if (screenHistory.length) {
        const prev = screenHistory.pop();
        showScreen(prev.screen);
      }
    });

    Nav.init();
    Player.init();
    initSearch();

    navigateTo('home');
  }

  return { init, navigateTo, toast };
})();

document.addEventListener('DOMContentLoaded', App.init);
