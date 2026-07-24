/**
 * Hero Pulse Grid Animation (Unified)
 * 共通ドットグリッド + サービス別モード + data-pulse-color でカラー指定
 *
 * data-pulse-mode:
 *   "data"    — 縦バー型ウェーブ（データ・グラフ）
 *   "stream"  — 横スイープ（テキスト・レポート）
 *   "ripple"  — 同心円パルス（波紋・影響力）
 *   "scatter" — 小波紋が散在（質問・アイデア）
 *   "cascade" — 斜めウェーブ（AI・処理フロー）
 *
 * data-pulse-color: sora | daidai | yomogi | kinari | momo | kasumi | karashi
 */
(function () {
  var canvas = document.getElementById('heroPulseCanvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  // --- Mode & Color ---
  var mode = canvas.getAttribute('data-pulse-mode') || 'ripple';

  var COLOR_MAP = {
    sora:    { r: 106, g: 155, b: 204 },
    daidai:  { r: 217, g: 119, b: 87 },
    yomogi:  { r: 192, g: 209, b: 202 },
    kinari:  { r: 206, g: 199, b: 188 },
    momo:    { r: 196, g: 102, b: 134 },
    kasumi:  { r: 203, g: 202, b: 218 },
    karashi: { r: 218, g: 179, b: 81 },
  };

  var colorName = canvas.getAttribute('data-pulse-color');
  var pulseColor = (colorName && COLOR_MAP[colorName]) ? COLOR_MAP[colorName] : null;

  // --- Common Config ---
  var DOT_SPACING = 36;
  var DOT_BASE_R = 2;
  var DOT_BASE_ALPHA = 0.25;
  var PULSE_MAX_RADIUS = 200;
  var DOT_COLOR = { r: 61, g: 61, b: 58 }; // kuro4

  // --- Mode Config ---
  var MODES = {
    data: {
      fallbackColor: COLOR_MAP.sora,
      interval: 400,
      maxPulses: 15,
      speed: 120,
      ringWidth: 70,
      maxRadius: 0, // dynamic: set to canvas height
      colSpread: 2.5,
    },
    stream: {
      fallbackColor: COLOR_MAP.daidai,
      interval: 1200,
      maxPulses: 5,
      speed: 65,
      ringWidth: 50,
    },
    ripple: {
      fallbackColor: COLOR_MAP.yomogi,
      interval: 1500,
      maxPulses: 5,
      speed: 50,
      ringWidth: 40,
    },
    scatter: {
      fallbackColor: COLOR_MAP.momo,
      interval: 400,
      maxPulses: 12,
      speed: 35,
      ringWidth: 25,
      maxRadius: 70,
    },
    cascade: {
      fallbackColor: COLOR_MAP.sora,
      interval: 1000,
      maxPulses: 6,
      speed: 350,
      ringWidth: 55,
    },
  };

  var cfg = MODES[mode] || MODES.ripple;
  var activeColor = pulseColor || cfg.fallbackColor;

  // --- State ---
  var dots = [];
  var pulses = [];
  var w = 0;
  var h = 0;
  var dpr = window.devicePixelRatio || 1;
  var animId = null;
  var isVisible = true;
  var lastPulseTime = 0;
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Helpers ---
  function rgba(c, a) {
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  }

  // --- Resize ---
  function resize() {
    var rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initDots();
  }

  // --- Init dots ---
  function initDots() {
    dots = [];
    var cols = Math.ceil(w / DOT_SPACING) + 1;
    var rows = Math.ceil(h / DOT_SPACING) + 1;
    var offsetX = (w - (cols - 1) * DOT_SPACING) / 2;
    var offsetY = (h - (rows - 1) * DOT_SPACING) / 2;

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        dots.push({
          x: offsetX + c * DOT_SPACING,
          y: offsetY + r * DOT_SPACING,
          currentR: DOT_BASE_R,
          currentAlpha: DOT_BASE_ALPHA,
          currentColor: DOT_COLOR,
        });
      }
    }
  }

  // --- Spawn pulse ---
  function spawnPulse() {
    if (pulses.length >= cfg.maxPulses) return;

    if (mode === 'data') {
      var cols = Math.ceil(w / DOT_SPACING) + 1;
      var offsetX = (w - (cols - 1) * DOT_SPACING) / 2;
      var col = Math.floor(Math.random() * cols);
      pulses.push({
        x: offsetX + col * DOT_SPACING,
        y: h + 20,
        traveled: 0,
        color: activeColor,
      });

    } else if (mode === 'stream') {
      var rows = Math.ceil(h / DOT_SPACING) + 1;
      var offsetY = (h - (rows - 1) * DOT_SPACING) / 2;
      var row = Math.floor(Math.random() * rows);
      pulses.push({
        x: -20,
        y: offsetY + row * DOT_SPACING,
        traveled: 0,
        color: activeColor,
      });

    } else if (mode === 'cascade') {
      pulses.push({
        pos: -(h + 40),
        traveled: 0,
        color: activeColor,
      });

    } else {
      // ripple & scatter
      var idx = Math.floor(Math.random() * dots.length);
      var dot = dots[idx];
      pulses.push({
        x: dot.x,
        y: dot.y,
        radius: 0,
        color: activeColor,
      });
    }
  }

  // --- Calculate influence ---
  function calcInfluence(dot, pulse) {
    var maxR, fadeFactor, influence;

    if (mode === 'data') {
      var colDist = Math.abs(dot.x - pulse.x);
      var colSpread = DOT_SPACING * (cfg.colSpread || 1.2);
      if (colDist > colSpread) return 0;
      var colFactor = 1 - colDist / colSpread;

      var vertDist = Math.abs(dot.y - pulse.y);
      if (vertDist >= cfg.ringWidth) return 0;
      influence = 1 - vertDist / cfg.ringWidth;

      maxR = cfg.maxRadius || h + 40;
      fadeFactor = 1 - pulse.traveled / maxR;
      if (fadeFactor <= 0) return 0;
      return influence * colFactor * fadeFactor;

    } else if (mode === 'stream') {
      var rowDist = Math.abs(dot.y - pulse.y);
      var rowSpread = DOT_SPACING * 1.2;
      if (rowDist > rowSpread) return 0;
      var rowFactor = 1 - rowDist / rowSpread;

      var horizDist = Math.abs(dot.x - pulse.x);
      if (horizDist >= cfg.ringWidth) return 0;
      influence = 1 - horizDist / cfg.ringWidth;

      fadeFactor = 1 - pulse.traveled / (w + 40);
      if (fadeFactor <= 0) return 0;
      return influence * rowFactor * fadeFactor;

    } else if (mode === 'cascade') {
      var dotDiag = dot.x - dot.y;
      var dist = Math.abs(dotDiag - pulse.pos);
      if (dist >= cfg.ringWidth) return 0;
      influence = 1 - dist / cfg.ringWidth;

      maxR = w + h;
      fadeFactor = 1 - pulse.traveled / maxR;
      if (fadeFactor <= 0) return 0;
      return influence * fadeFactor;

    } else {
      // ripple & scatter
      var dx = dot.x - pulse.x;
      var dy = dot.y - pulse.y;
      var distance = Math.sqrt(dx * dx + dy * dy);
      var ringDist = Math.abs(distance - pulse.radius);
      if (ringDist >= cfg.ringWidth) return 0;
      influence = 1 - ringDist / cfg.ringWidth;

      maxR = cfg.maxRadius || PULSE_MAX_RADIUS;
      fadeFactor = 1 - pulse.radius / maxR;
      if (fadeFactor <= 0) return 0;
      return influence * fadeFactor;
    }
  }

  // --- Update ---
  function update(dt) {
    var dtSec = dt / 1000;

    // Spawn
    lastPulseTime += dt;
    if (lastPulseTime > cfg.interval) {
      spawnPulse();
      lastPulseTime = 0;
    }

    // Update pulses
    for (var i = pulses.length - 1; i >= 0; i--) {
      var p = pulses[i];

      if (mode === 'data') {
        p.y -= cfg.speed * dtSec;
        p.traveled += cfg.speed * dtSec;
        if (p.traveled > (cfg.maxRadius || h + 40)) pulses.splice(i, 1);

      } else if (mode === 'stream') {
        p.x += cfg.speed * dtSec;
        p.traveled += cfg.speed * dtSec;
        if (p.x > w + 40) pulses.splice(i, 1);

      } else if (mode === 'cascade') {
        p.pos += cfg.speed * dtSec;
        p.traveled += cfg.speed * dtSec;
        if (p.pos > w + 40) pulses.splice(i, 1);

      } else {
        // ripple & scatter
        p.radius += cfg.speed * dtSec;
        if (p.radius > (cfg.maxRadius || PULSE_MAX_RADIUS)) pulses.splice(i, 1);
      }
    }

    // Update dots
    for (var d = 0; d < dots.length; d++) {
      var dot = dots[d];
      var maxInf = 0;
      var infColor = DOT_COLOR;

      for (var p = 0; p < pulses.length; p++) {
        var inf = calcInfluence(dot, pulses[p]);
        if (inf > maxInf) {
          maxInf = inf;
          infColor = pulses[p].color;
        }
      }

      var targetR = DOT_BASE_R + maxInf * 4;
      var targetAlpha = DOT_BASE_ALPHA + maxInf * 0.6;
      dot.currentR += (targetR - dot.currentR) * 0.15;
      dot.currentAlpha += (targetAlpha - dot.currentAlpha) * 0.15;
      dot.currentColor = maxInf > 0.05 ? infColor : DOT_COLOR;
    }
  }

  // --- Draw ---
  function draw() {
    ctx.clearRect(0, 0, w, h);

    for (var i = 0; i < dots.length; i++) {
      var dot = dots[i];
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.currentR, 0, Math.PI * 2);
      ctx.fillStyle = rgba(dot.currentColor, dot.currentAlpha);
      ctx.fill();
    }
  }

  // --- Loop ---
  var lastTime = 0;
  function loop(time) {
    if (!isVisible) return;
    var dt = lastTime ? time - lastTime : 16;
    lastTime = time;
    update(dt);
    draw();
    animId = requestAnimationFrame(loop);
  }

  // --- Visibility (perf) ---
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      isVisible = entries[0].isIntersecting;
      if (isVisible && !prefersReducedMotion && !animId) {
        lastTime = 0;
        loop(performance.now());
      }
    }, { threshold: 0.1 });
    observer.observe(canvas);
  }

  // --- Resize handling ---
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      dpr = window.devicePixelRatio || 1;
      resize();
    }, 150);
  });

  // --- Start ---
  resize();

  if (prefersReducedMotion) {
    spawnPulse();
    spawnPulse();
    update(500);
    draw();
  } else {
    spawnPulse();
    loop(performance.now());
  }
})();
