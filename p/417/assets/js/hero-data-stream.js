/**
 * Hero Data Stream Animation
 * テキストブロック（段落）を模したドキュメント断片が漂う
 */
(function () {
  var canvas = document.getElementById('heroDataStreamCanvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  // --- Config ---
  var FRAGMENT_COUNT = 14;
  var LINE_H = 2;
  var HEADING_H = 3;
  var LINE_GAP = 5;
  var HEADING_GAP = 8;
  var BLOCK_MIN_W = 60;
  var BLOCK_MAX_W = 130;
  var SPEED_Y_MIN = 6;
  var SPEED_Y_MAX = 16;
  var BASE_ALPHA = 0.10;

  // Colors
  var BASE_COLOR = { r: 61, g: 61, b: 58 };       // kuro4
  var HEADING_COLOR = { r: 61, g: 61, b: 58 };    // kuro4
  var ACCENT_COLORS = [
    { r: 217, g: 119, b: 87 },   // daidai
    { r: 106, g: 155, b: 204 },  // sora
    { r: 203, g: 202, b: 218 },  // kasumi
  ];

  // --- State ---
  var fragments = [];
  var w = 0;
  var h = 0;
  var dpr = window.devicePixelRatio || 1;
  var animId = null;
  var isVisible = true;
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Helpers ---
  function rgba(c, a) {
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
  }

  // --- Create fragment ---
  function createFragment(startY) {
    var blockW = rand(BLOCK_MIN_W, BLOCK_MAX_W);
    var hasHeading = Math.random() < 0.6;
    var lineCount = randInt(3, 6);
    var isAccent = Math.random() < 0.12;
    var headingColor = isAccent
      ? ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)]
      : HEADING_COLOR;

    var lines = [];

    // Heading line
    if (hasHeading) {
      lines.push({
        w: blockW * rand(0.4, 0.65),
        h: HEADING_H,
        color: headingColor,
        alpha: isAccent ? rand(0.18, 0.30) : rand(BASE_ALPHA + 0.04, BASE_ALPHA + 0.10),
        isHeading: true,
      });
    }

    // Body lines
    for (var i = 0; i < lineCount; i++) {
      var isLast = i === lineCount - 1;
      var lineW = isLast
        ? blockW * rand(0.25, 0.55)
        : blockW * rand(0.75, 1.0);

      lines.push({
        w: lineW,
        h: LINE_H,
        color: BASE_COLOR,
        alpha: rand(BASE_ALPHA, BASE_ALPHA + 0.06),
        isHeading: false,
      });
    }

    // Calculate total height
    var totalH = 0;
    for (var j = 0; j < lines.length; j++) {
      totalH += lines[j].h;
      if (j < lines.length - 1) {
        totalH += lines[j].isHeading ? HEADING_GAP : LINE_GAP;
      }
    }

    return {
      x: rand(w * 0.05, w * 0.95 - blockW),
      y: startY,
      blockW: blockW,
      totalH: totalH,
      lines: lines,
      speedY: -rand(SPEED_Y_MIN, SPEED_Y_MAX),
      swayPhase: rand(0, Math.PI * 2),
      swayAmp: rand(0.3, 0.8),
      swayFreq: rand(0.3, 0.7),
    };
  }

  // --- Init fragments ---
  function initFragments() {
    fragments = [];
    for (var i = 0; i < FRAGMENT_COUNT; i++) {
      var frag = createFragment(rand(-h * 0.3, h * 1.1));
      fragments.push(frag);
    }
  }

  // --- Resize ---
  function resize() {
    var rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initFragments();
  }

  // --- Update ---
  function update(dt) {
    var dtSec = dt / 1000;

    for (var i = 0; i < fragments.length; i++) {
      var frag = fragments[i];

      // Drift upward
      frag.y += frag.speedY * dtSec;

      // Gentle horizontal sway
      frag.swayPhase += frag.swayFreq * dtSec;

      // Respawn at bottom when gone off top
      if (frag.y + frag.totalH < -20) {
        var newFrag = createFragment(h + rand(20, 80));
        fragments[i] = newFrag;
      }
    }
  }

  // --- Draw ---
  function draw() {
    ctx.clearRect(0, 0, w, h);

    for (var i = 0; i < fragments.length; i++) {
      var frag = fragments[i];
      var swayX = Math.sin(frag.swayPhase) * frag.swayAmp;
      var curY = frag.y;

      for (var j = 0; j < frag.lines.length; j++) {
        var line = frag.lines[j];
        var drawX = frag.x + swayX;
        var drawY = curY;

        // Skip if off-screen
        if (drawY + line.h > 0 && drawY < h) {
          ctx.fillStyle = rgba(line.color, line.alpha);
          ctx.fillRect(
            Math.round(drawX),
            Math.round(drawY),
            Math.round(line.w),
            line.h
          );
        }

        curY += line.h + (line.isHeading ? HEADING_GAP : LINE_GAP);
      }
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
    update(3000);
    draw();
  } else {
    loop(performance.now());
  }
})();
