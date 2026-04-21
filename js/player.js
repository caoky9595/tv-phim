// Video Player Module
const Player = (() => {
  let hls = null;
  let videoEl, progressBar, progressFill, progressThumb, playerControls,
      seekFlash, epJumpOverlay, autonextOverlay, autonextCount, playerTitle,
      playerTime, playerEpPanel;

  let state = {
    slug: null,
    movieData: null,
    serverIdx: 0,
    epIdx: 0,
    episodes: [],    // flat list of { name, link, serverIdx, epIdx }
    hideTimer: null,
    autonextTimer: null,
    epJumpBuffer: '',
    epJumpTimer: null,
    holding: false,
    holdTimer: null,
    holdInterval: null,
  };

  function init() {
    videoEl        = document.getElementById('video-el');
    progressBar    = document.getElementById('progress-bar');
    progressFill   = document.getElementById('progress-fill');
    progressThumb  = document.getElementById('progress-thumb');
    playerControls = document.getElementById('player-controls');
    seekFlash      = document.getElementById('seek-flash');
    epJumpOverlay  = document.getElementById('ep-jump-overlay');
    autonextOverlay = document.getElementById('autonext-overlay');
    autonextCount  = document.getElementById('autonext-count');
    playerTitle    = document.getElementById('player-title');
    playerTime     = document.getElementById('player-time');
    playerEpPanel  = document.getElementById('player-ep-panel');

    bindEvents();
  }

  function bindEvents() {
    // Show/hide controls on mouse move
    document.getElementById('video-container').addEventListener('mousemove', showControls);
    document.getElementById('video-container').addEventListener('click', togglePlay);

    // Progress bar click
    progressBar.addEventListener('click', e => {
      const rect = progressBar.getBoundingClientRect();
      const pct  = (e.clientX - rect.left) / rect.width;
      videoEl.currentTime = pct * (videoEl.duration || 0);
    });

    // Video events
    videoEl.addEventListener('timeupdate', onTimeUpdate);
    videoEl.addEventListener('ended', onEnded);
    videoEl.addEventListener('play', () => document.getElementById('btn-play').textContent = '⏸');
    videoEl.addEventListener('pause', () => document.getElementById('btn-play').textContent = '▶');

    // Player buttons
    document.getElementById('btn-play').addEventListener('click', togglePlay);
    document.getElementById('btn-prev').addEventListener('click', () => playRelative(-1));
    document.getElementById('btn-next').addEventListener('click', () => playRelative(1));
    document.getElementById('btn-ep-panel').addEventListener('click', toggleEpPanel);
    document.getElementById('btn-back').addEventListener('click', closePlayer);
    document.getElementById('volume-slider').addEventListener('input', e => {
      videoEl.volume = e.target.value / 100;
    });

    // Auto-next cancel
    document.getElementById('autonext-cancel').addEventListener('click', cancelAutonext);

    // Keyboard in player
    document.addEventListener('keydown', onPlayerKey);
    document.addEventListener('keyup', onPlayerKeyUp);

    // Back event
    window.addEventListener('tv:back', () => {
      if (document.getElementById('player-screen').classList.contains('active')) {
        if (playerEpPanel.classList.contains('open')) {
          playerEpPanel.classList.remove('open');
        } else {
          closePlayer();
        }
      }
    });
  }

  function showControls() {
    playerControls.classList.add('visible');
    clearTimeout(state.hideTimer);
    state.hideTimer = setTimeout(() => playerControls.classList.remove('visible'), 3000);
  }

  function togglePlay() {
    if (videoEl.paused) videoEl.play();
    else videoEl.pause();
    showControls();
  }

  function onTimeUpdate() {
    const cur = videoEl.currentTime;
    const dur = videoEl.duration || 0;
    const pct = dur ? (cur / dur) * 100 : 0;
    progressFill.style.width = pct + '%';
    progressThumb.style.left = pct + '%';
    playerTime.textContent = `${fmt(cur)} / ${fmt(dur)}`;

    // Save progress every 5 seconds
    if (Math.floor(cur) % 5 === 0 && state.slug && state.movieData) {
      const ep = state.episodes[state.epIdx];
      Store.saveProgress(state.slug, {
        name:        state.movieData.movie?.name,
        thumb:       state.movieData.movie?.thumb_url,
        episode:     ep?.name,
        serverIdx:   state.serverIdx,
        epIdx:       state.epIdx,
        currentTime: cur,
        duration:    dur || 0,
      });
    }
  }

  function onEnded() {
    Store.markWatched(state.slug, epKey(state.epIdx));
    startAutonext();
  }

  function epKey(idx) {
    const ep = state.episodes[idx];
    return ep ? `${ep.serverIdx}_${ep.name}` : `ep_${idx}`;
  }

  function startAutonext() {
    const nextIdx = state.epIdx + 1;
    if (nextIdx >= state.episodes.length) return;  // no next ep

    autonextOverlay.classList.add('show');
    let seconds = 10;
    autonextCount.textContent = seconds;

    state.autonextTimer = setInterval(() => {
      seconds--;
      autonextCount.textContent = seconds;
      if (seconds <= 0) {
        cancelAutonext();
        playEpisode(nextIdx);
      }
    }, 1000);
  }

  function cancelAutonext() {
    clearInterval(state.autonextTimer);
    autonextOverlay.classList.remove('show');
  }

  function seek(sec) {
    videoEl.currentTime = Math.max(0, Math.min((videoEl.duration || 0), videoEl.currentTime + sec));
    showSeekFlash(sec > 0 ? `+${Math.abs(sec)}s ⏩` : `-${Math.abs(sec)}s ⏪`);
    showControls();
  }

  function showSeekFlash(msg) {
    seekFlash.textContent = msg;
    seekFlash.classList.add('show');
    clearTimeout(seekFlash._t);
    seekFlash._t = setTimeout(() => seekFlash.classList.remove('show'), 800);
  }

  function onPlayerKey(e) {
    const playerScreen = document.getElementById('player-screen');
    if (!playerScreen.classList.contains('active')) return;

    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (e.shiftKey) seek(300);
        else if (state.holding) { /* handled in hold */ }
        else seek(10);
        startHoldDetect(e.key, e.shiftKey);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (e.shiftKey) seek(-300);
        else seek(-10);
        startHoldDetect(e.key, e.shiftKey);
        break;
      case 'f':
        e.preventDefault();
        document.fullscreenElement ? document.exitFullscreen() : videoEl.requestFullscreen?.();
        break;
      case 'm':
        e.preventDefault();
        videoEl.muted = !videoEl.muted;
        break;
      // Number keys 1-9: episode jump
      default:
        if (e.key >= '1' && e.key <= '9') {
          e.preventDefault();
          handleEpJumpKey(e.key);
        }
        break;
    }
  }

  function onPlayerKeyUp(e) {
    if (['ArrowRight', 'ArrowLeft'].includes(e.key)) {
      clearTimeout(state.holdTimer);
      clearInterval(state.holdInterval);
      state.holding = false;
    }
  }

  function startHoldDetect(key, shift) {
    clearTimeout(state.holdTimer);
    clearInterval(state.holdInterval);
    state.holding = false;
    const dir = key === 'ArrowRight' ? 1 : -1;
    state.holdTimer = setTimeout(() => {
      state.holding = true;
      state.holdInterval = setInterval(() => seek(dir * 30), 400);
    }, 600);
  }

  function handleEpJumpKey(digit) {
    clearTimeout(state.epJumpTimer);
    state.epJumpBuffer += digit;
    const targetEp = parseInt(state.epJumpBuffer, 10);
    epJumpOverlay.textContent = `Tập ${state.epJumpBuffer}`;
    epJumpOverlay.classList.add('show');

    state.epJumpTimer = setTimeout(() => {
      epJumpOverlay.classList.remove('show');
      // Find episode with that number
      const idx = state.episodes.findIndex(ep => parseInt(ep.name) === targetEp || ep.name === state.epJumpBuffer);
      if (idx !== -1) playEpisode(idx);
      else App.toast(`Không tìm thấy tập ${state.epJumpBuffer}`);
      state.epJumpBuffer = '';
    }, 1500);
  }

  function toggleEpPanel() {
    playerEpPanel.classList.toggle('open');
  }

  // Build flat episode list from movie servers
  function buildEpisodeList(servers) {
    const list = [];
    (servers || []).forEach((server, si) => {
      (server.server_data || []).forEach((ep, ei) => {
        list.push({ name: ep.name, slug: ep.slug, link: ep.link_m3u8 || ep.link_embed, serverIdx: si, serverName: server.server_name, epIdx: ei, flatIdx: list.length });
      });
    });
    return list;
  }

  function renderEpPanel() {
    const html = state.episodes.map((ep, i) => {
      const watched = Store.isWatched(state.slug, `${ep.serverIdx}_${ep.name}`);
      const isCur   = i === state.epIdx;
      return `<button class="ep-btn ${isCur ? 'current' : ''} ${watched ? 'watched' : ''}" 
                tabindex="0" data-ep="${i}">
                ${ep.name}
              </button>`;
    }).join('');
    playerEpPanel.innerHTML = `<h3>📋 Danh sách tập</h3><div class="ep-grid">${html}</div>`;
    playerEpPanel.querySelectorAll('.ep-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        playEpisode(parseInt(btn.dataset.ep));
        playerEpPanel.classList.remove('open');
      });
    });
  }

  function playEpisode(flatIdx) {
    cancelAutonext();
    if (flatIdx < 0 || flatIdx >= state.episodes.length) return;
    state.epIdx = flatIdx;
    const ep = state.episodes[flatIdx];
    const src = ep.link;

    // Update title
    const movie = state.movieData?.movie;
    playerTitle.textContent = `${movie?.name} — Tập ${ep.name} (${ep.serverName})`;

    // Restore continue time
    const progress = Store.getProgress(state.slug);
    const startTime = (progress?.epIdx === flatIdx && progress?.serverIdx === ep.serverIdx)
      ? (progress.currentTime || 0) : 0;

    if (typeof Hls !== 'undefined' && Hls.isSupported() && src && src.includes('.m3u8')) {
      if (hls) hls.destroy();
      hls = new Hls({ startLevel: -1 });
      hls.loadSource(src);
      hls.attachMedia(videoEl);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (startTime > 10) videoEl.currentTime = startTime;
        videoEl.play().catch(() => {});
      });
    } else if (src) {
      videoEl.src = src;
      videoEl.oncanplay = () => {
        if (startTime > 10) videoEl.currentTime = startTime;
        videoEl.play().catch(() => {});
        videoEl.oncanplay = null;
      };
    }

    renderEpPanel();
  }

  function playRelative(delta) {
    playEpisode(state.epIdx + delta);
  }

  function fmt(sec) {
    if (!isFinite(sec)) return '0:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return h > 0
      ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
      : `${m}:${String(s).padStart(2,'0')}`;
  }

  function open(slug, movieData, startEpIdx = 0, startServerIdx = 0) {
    state.slug      = slug;
    state.movieData = movieData;
    state.serverIdx = startServerIdx;
    state.episodes  = buildEpisodeList(movieData.episodes);

    // Find correct flat index
    const targetFlat = state.episodes.findIndex(
      ep => ep.serverIdx === startServerIdx && ep.epIdx === startEpIdx
    );

    document.getElementById('player-screen').classList.add('active');
    document.querySelector('.screen.active')?.classList.add('behind');
    Nav.disable();
    showControls();

    playEpisode(targetFlat >= 0 ? targetFlat : 0);
  }

  function closePlayer() {
    document.getElementById('player-screen').classList.remove('active');
    document.querySelector('.screen.behind')?.classList.remove('behind');
    if (hls) { hls.destroy(); hls = null; }
    videoEl.src = '';
    cancelAutonext();
    clearTimeout(state.hideTimer);
    Nav.enable();
  }

  return { init, open, closePlayer };
})();
