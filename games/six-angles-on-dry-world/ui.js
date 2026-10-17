/* ============================================================
   SIX ANGLES ON DRY WORLD -- ui.js
   in-view HUD plus the attract / duel-card / results panels.
   ============================================================ */
(function () {
  "use strict";
  const DRY = window.DRY;
  const U = {}; DRY.UI = U;

  const el = function (id) { return document.getElementById(id); };
  const nodes = {};
  const chambers = [];

  U.init = function () {
    nodes.duels = el("duels");
    nodes.pips = el("pips");
    nodes.score = el("score");
    nodes.best = el("best-score");
    nodes.combo = el("combo-tag");
    nodes.cyl = el("cylinder");
    nodes.dice = el("dice");
    nodes.gunname = el("gunname");
    nodes.hide = el("hide-fill");
    nodes.focus = el("focus-focus") || el("focus-fill");
    nodes.overlay = el("overlay");
    for (let i = 0; i < 6; i += 1) {
      const c = document.createElement("span");
      c.className = "chamfer";
      if (nodes.cyl) nodes.cyl.appendChild(c);
      chambers.push(c);
    }
    U.buildPips(12);
    return U;
  };

  U.buildPips = function (count) {
    U.pipNodes = [];
    if (!nodes.pips) return U;
    nodes.pips.innerHTML = "";
    for (let i = 0; i < count; i += 1) {
      const pip = document.createElement("span");
      pip.className = "pip";
      nodes.pips.appendChild(pip);
      U.pipNodes.push(pip);
    }
    return U;
  };

  function pad(n) { return String(Math.max(1, Math.round(n))).padStart(2, "0"); }

  /* ---------- live HUD --------------------------------------------- */
  U.hud = function (g) {
    const p = g.player;
    if (!p || !nodes.duels) return;
    nodes.duels.textContent = pad(g.duel);
    nodes.score.textContent = String(g.score);
    nodes.best.textContent = String(Math.max(g.best, g.score));

    for (let i = 0; i < chambers.length; i += 1) {
      const loaded = i < p.cylinder;
      chambers[i].className = loaded ? "chamfer" : "chamber chambered";
    }
    nodes.dice.textContent = p.reload > 0 ? "CYLINDER SPINNING"
      : (p.cylinder === 1 ? "BANK SHOT LOADED" : "BANK ON THE 6TH");
    nodes.gunname.textContent = p.reload > 0 ? "RELOADING"
      : (p.cylinder === 1 ? "PEACE MAKER / LAST CHAMBER" : "PEACE MAKER");

    nodes.hide.style.transform = "scaleX(" + DRY.clamp(p.hide / p.maxHide, 0, 1).toFixed(3) + ")";
    if (nodes.focus) nodes.focus.style.transform = "scaleX(" + DRY.clamp(g.focus || 0, 0, 1).toFixed(3) + ")";

    if (U.pipNodes) {
      for (let i = 0; i < U.pipNodes.length; i += 1) {
        const cls = i < g.duel - 1 ? "pip done" : (i === g.duel - 1 ? "pip now" : "pip");
        if (U.pipNodes[i].className !== cls) U.pipNodes[i].className = cls;
      }
    }
    const text = g.combo > 1 ? "  x" + g.combo + " CHAIN" : "";
    if (nodes.combo.textContent !== text) {
      nodes.combo.textContent = text;
      if (text) { nodes.combo.style.animation = "none"; void nodes.combo.offsetWidth; nodes.combo.style.animation = "popIn 0.2s steps(3,end) both"; }
    }
  };

  /* ---------- panels ------------------------------------------------- */
  U.clearPanel = function () { if (nodes.overlay) nodes.overlay.innerHTML = ""; };

  function panel(html, opts) {
    const o = opts || {};
    nodes.overlay.innerHTML = '<div class="panel pop-in"' + (o.anchor ? ' data-anchor="' + o.anchor + '"' : "") +
      (o.slide ? ' data-slide="' + o.slide + '"' : "") + ">" + html + "</div>";
    document.body.dataset.state = o.state || "card";
    return nodes.overlay.firstChild;
  }

  U.attract = function () {
    return panel(
      '<p class="kicker">A manga duel on a dead moon</p>' +
      "<h1>Six Angles<em>on Dry World</em></h1>" +
      '<div class="rule"></div>' +
      '<p class="lede">One gunman, one kid with a hand-lettered placard, twelve duels lined up along the horizon. ' +
      "The cylinder holds six &mdash; <b>the sixth bullet banks</b> off the crust and walks into whoever is hiding behind the next bounty.</p>" +
      '<ul class="keys">' +
      "<li><b>A / D</b> walk the arc</li>" +
      "<li><b>W / SPACE</b> jump (low moon, long air)</li>" +
      "<li><b>MOUSE</b> aim &middot; <b>CLICK</b> fire</li>" +
      "<li><b>R</b> spin the cylinder</li>" +
      "<li><b>SHIFT</b> dash (one per hop, it dodges)</li>" +
      "<li><b>ESC / P</b> pause &middot; <b>M</b> mute</li></ul>" +
      '<div class="prompt">PRESS ENTER OR CLICK TO DRAW</div>', { state: "attract", anchor: "top" });
  };

  U.duelCard = function (duel, total, boss, seconds) {
    return panel(
      "<p class=\"kicker\">Duel " + pad(duel) + " of " + pad(total) + "</p>" +
      "<h2>" + (boss ? "Final duel: <em>The Grim Arguer</em>" : "Incoming: " + U.duelName(duel)) + "</h2>" +
      '<div class="rule"></div><p class="lede">' + flavour(duel, boss) + "</p>" +
      '<div class="prompt tiny" id="card-note">DRAW IN ' + seconds.toFixed(1) + "&hellip;</div>",
      { state: "card", anchor: "bottom", slide: "up" });
  };

  U.cardCountdown = function (seconds) {
    const note = document.getElementById("card-note");
    if (note) note.textContent = "DRAW IN " + Math.max(0, seconds).toFixed(1) + "\u2026";
  };

  U.results = function (d) {
    return panel(
      '<p class="kicker">' + (d.won ? "The moon goes quiet" : "Duel lost") + "</p>" +
      "<h2>" + (d.won ? "Twelve duels,<em>one gunman</em>" : "He never<em>got the reload off</em>") + "</h2>" +
      '<div class="rule"></div>' +
      '<dl class="tally">' +
      "<dt>Score</dt><dd>" + d.score + "</dd>" +
      "<dt>Best run</dt><dd>" + d.best + "</dd>" +
      "<dt>Bounties dusted</dt><dd>" + d.kills + "</dd>" +
      "<dt>Bank shots</dt><dd>" + d.banked + "</dd>" +
      "<dt>Longest chain</dt><dd>" + (d.bestCombo > 1 ? "x" + d.bestCombo : "&mdash;") + "</dd></dl>" +
      '<div class="prompt tiny">ENTER / CLICK FOR ANOTHER DUEL &middot; ESC FOR THE ATTRACT SCREEN</div>',
      { state: "results", slide: "up" });
  };

  U.pause = function (muted) {
    return panel(
      '<p class="kicker">Panel held</p><h2>Paused</h2><div class="rule"></div>' +
      '<ul class="keys"><li><b>ESC / P</b> resume</li><li><b>M</b> sound: ' + (muted ? "off" : "on") + "</li>" +
      "<li><b>T</b> restart the run</li></ul>", { state: "paused", anchor: "top" });
  };

  U.state = function (name) { document.body.dataset.state = name; };

  /* ---------- flavour ------------------------------------------------ */
  const NAMES = ["Tinker-Boot Pete", "Sable Nine-Finger", "Rivet Collan", "One-Ear Marla", "Kettle Dunn",
    "Ash Votary Ilo", "Powder Tom", "The Tin Choir", "Half-Track Benny", "Nine-Volt Sula", "Brass Ottermass", "Cinder Fen"];
  U.duelName = function (i) { return NAMES[(i - 1 + NAMES.length * 2) % NAMES.length]; };

  const FLAVOUR = [
    "Keep walking. Every sixth chamber banks along the crust and takes out whoever is standing behind the next bounty.",
    "Powder boys throw crates of black powder. Shoot the crate rather than the kid: much cheaper.",
    "Ash acolytes cross the gap in a single leap. Dash through it, land behind them, spend two chambers.",
    "The placard kid counts heads out loud. He is the only one of you two who can count.",
    "Slugs drop on the way out here. Aim just above the horizon and let the crust aim for you.",
    "Chain the bounties inside four seconds or the crowd stops paying.",
  ];
  function flavour(i, boss) {
    if (boss) return "Last out of the ash pit. Carries a nail longer than your arm and argues with everything, gravity included.";
    return FLAVOUR[(i - 1 + FLAVOUR.length * 2) % FLAVOUR.length];
  }

})();
