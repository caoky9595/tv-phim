// TV D-pad Navigation Manager
const Nav = (() => {
  let enabled = true;

  function getFocusables(container = document) {
    return Array.from(container.querySelectorAll(
      '[tabindex="0"], button:not([disabled]), .card, .nav-item, .ep-btn, .tab-pill, .filter-chip, .filter-select, .page-btn, .continue-card, .tag'
    )).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 &&
             getComputedStyle(el).visibility !== 'hidden' &&
             getComputedStyle(el).display !== 'none';
    });
  }

  function getRect(el) {
    return el.getBoundingClientRect();
  }

  function distance(a, b) {
    const ac = { x: a.left + a.width / 2, y: a.top + a.height / 2 };
    const bc = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    return Math.hypot(ac.x - bc.x, ac.y - bc.y);
  }

  function isInDirection(from, to, dir) {
    const fc = { x: from.left + from.width / 2, y: from.top + from.height / 2 };
    const tc = { x: to.left + to.width / 2, y: to.top + to.height / 2 };
    const dx = tc.x - fc.x;
    const dy = tc.y - fc.y;
    switch (dir) {
      case 'right': return dx > 20 && Math.abs(dy) < Math.abs(dx) * 2;
      case 'left':  return dx < -20 && Math.abs(dy) < Math.abs(dx) * 2;
      case 'down':  return dy > 20 && Math.abs(dx) < Math.abs(dy) * 2;
      case 'up':    return dy < -20 && Math.abs(dx) < Math.abs(dy) * 2;
    }
    return false;
  }

  function moveFocus(dir) {
    const focusables = getFocusables();
    const current = document.activeElement;
    if (!focusables.length) return;

    if (!focusables.includes(current)) {
      focusables[0].focus();
      return;
    }

    const from = getRect(current);
    let best = null;
    let bestDist = Infinity;

    for (const el of focusables) {
      if (el === current) continue;
      const to = getRect(el);
      if (isInDirection(from, to, dir)) {
        const d = distance(from, to);
        if (d < bestDist) { bestDist = d; best = el; }
      }
    }

    if (best) {
      best.focus();
      best.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
  }

  function init() {
    document.addEventListener('keydown', e => {
      if (!enabled) return;

      // Don't intercept when typing in input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) && !['Escape'].includes(e.key)) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight': e.preventDefault(); moveFocus('right'); break;
        case 'ArrowLeft':  e.preventDefault(); moveFocus('left');  break;
        case 'ArrowDown':  e.preventDefault(); moveFocus('down');  break;
        case 'ArrowUp':    e.preventDefault(); moveFocus('up');    break;
        case 'Enter':
          if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.click();
          }
          break;
        case 'Escape':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('tv:back'));
          break;
      }
    });
  }

  return {
    init,
    enable()  { enabled = true; },
    disable() { enabled = false; },
    focusFirst(container) {
      const first = getFocusables(container || document)[0];
      if (first) { first.focus(); first.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    }
  };
})();
