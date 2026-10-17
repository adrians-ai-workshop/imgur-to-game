/* DOM overlays (attract / pause / messages) + HUD + touch controls. */
(function () {
  const G = window.GGG;
  const layer = document.getElementById('ui-layer');

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  // ---------- HUD lives inside the game view (project rule 1) ----------
  const hud = el('div', 'hud');
  hud.innerHTML = '<div class="hud-item" id="h-bloom"></div>' +
    '<div class="hud-item" id="h-level"></div>' +
    '<div class="hud-item" id="h-lives"></div>';
  layer.appendChild(hud);
  const hBloom = hud.querySelector('#h-bloom');
  const hLevel = hud.querySelector('#h-level');
  const hLives = hud.querySelector('#h-lives');

  // ---------- transient toast ----------
  const toastEl = el('div', 'toast');
  layer.appendChild(toastEl);
  let toastTimer = 0;
  function toast(text, ms) {
    toastEl.innerHTML = text;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms || 1800);
  }

  let overlay = null;
  function close() { if (overlay && overlay.parentNode) { clear(overlay); layer.removeChild(overlay); } overlay = null; }
  function make(cls, builder) { close(); overlay = el('div', cls); builder(overlay); layer.appendChild(overlay); return overlay; }
  function button(label, fn, cls) {
    const b = el('button', cls || 'next-btn', label);
    b.addEventListener('click', () => { if (window.Sfx) window.Sfx.menu(); fn(); });
    return b;
  }

  const CONTROLS_HTML =
    '<div class="controls">&#9664; &#9654; or A / D to walk &middot; SPACE / W / &#9650; to leap' +
    '<br>Hold jump for a higher arc &middot; jump again mid-air for one flutter' +
    '<br>P or ESC pauses &middot; M mutes</div>';

  const UI = {
    setHud(o) {
      hBloom.innerHTML = '&#127804; ' + o.blossom + ' / ' + o.total;
      hLevel.innerHTML = 'Meadow ' + (o.levelIdx + 1) + ' &middot; ' + o.levelName;
      hLives.innerHTML = o.lives > 0 ? '&#129374;'.repeat(o.lives) : '&#128566;';
    },
    setHudVisible(v) { hud.style.display = v ? '' : 'none'; },
    toast,

    attract(onStart) {
      make('attract-screen', (o) => {
        o.appendChild(el('h1', null, 'The Grass Is<br>Greener'));
        o.appendChild(el('div', 'subtitle', '&ldquo;the grass is greener wherever I am&rdquo;'));
        const b = button('BEGIN THE WALK', onStart);
        b.className = 'start-btn';
        o.appendChild(b);
        o.appendChild(el('div', 'controls',
          CONTROLS_HTML + '<br><span class="hint">Gather the blossoms, dodge the brambles and bees, find the leafy gate.</span>'));
      });
    },

    levelClear(info, onNext) {
      make('message-screen', (o) => {
        o.appendChild(el('h2', null, info.last ? 'Wherever I Am' : 'A Greener Meadow'));
        const pct = info.total ? Math.round((info.collected / info.total) * 100) : 100;
        o.appendChild(el('p', null,
          'Blossoms: <b>' + info.collected + ' / ' + info.total + '</b> (' + pct + '%)<br>' +
          'Time: <b>' + info.time.toFixed(1) + 's</b>' + (info.perfect ? '<br><b>Perfect pasture!</b>' : '')));
        o.appendChild(button(info.last ? 'TAKE A LOOK BACK' : 'NEXT MEADOW &rarr;', onNext));
      });
    },

    gameOver(info, onRetry) {
      make('message-screen', (o) => {
        o.appendChild(el('h2', null, 'The Fawn Rests'));
        o.appendChild(el('p', null, 'Somewhere greener, surely.<br>Blossoms gathered: <b>' + info.collected + '</b>'));
        o.appendChild(button('WALK AGAIN', onRetry));
      });
    },

    allDone(info, onRestart) {
      make('message-screen', (o) => {
        o.appendChild(el('h2', null, 'Wherever I Am'));
        const pct = info.total ? Math.round((info.collected / info.total) * 100) : 100;
        o.appendChild(el('p', null,
          'Six meadows crossed.<br>Blossoms: <b>' + info.collected + ' / ' + info.total + '</b> (' + pct + '%)<br>' +
          'Total time: <b>' + info.time.toFixed(1) + 's</b>'));
        o.appendChild(button('WANDER AGAIN', onRestart));
      });
    },

    pause(resume, quitToTitle) {
      make('pause-screen', (o) => {
        o.appendChild(el('h2', null, 'Paused'));
        o.appendChild(button('RESUME', resume, 'resume-btn'));
        o.appendChild(button('QUIT TO TITLE', quitToTitle, 'resume-btn'));
        o.appendChild(el('div', 'controls', 'P / ESC resumes &middot; M mutes'));
      });
    },

    close() { close(); },

    /* on-screen pads for touch devices */
    buildTouchControls() {
      const wrap = el('div', 'touch-controls');
      const pad = (label, key) => {
        const b = el('div', 'tc tc-' + key, label);
        const set = (v) => (e) => { e.preventDefault(); G.touch[key] = v; };
        b.addEventListener('touchstart', set(true), { passive: false });
        b.addEventListener('touchend', set(false));
        b.addEventListener('touchcancel', set(false));
        return b;
      };
      wrap.appendChild(pad('&#9664;', 'left'));
      wrap.appendChild(pad('&#9654;', 'right'));
      wrap.appendChild(pad('&#128099;', 'jump'));
      layer.appendChild(wrap);
    },
  };

  G.buildTouchControls = () => UI.buildTouchControls();
  window.UI = UI;
})();