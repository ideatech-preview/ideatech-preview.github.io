/**
 * Hero Network Node Animation
 * Canvas ベースのインタラクティブなネットワークノード
 */
(function () {
  var canvas = document.getElementById('heroCanvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  // --- Config ---
  var NODE_COUNT = 40;
  var CONNECT_DIST = 150;
  var MOUSE_DIST = 200;
  var BASE_SPEED = 0.3;

  // Palette (IDEATECH grand colors)
  var COLORS = [
    { r: 217, g: 119, b: 87 },   // daidai  #d97757
    { r: 106, g: 155, b: 204 },  // sora    #6a9bcc
    { r: 203, g: 202, b: 218 },  // kasumi  #cbcada
    { r: 227, g: 218, b: 204 },  // shiro3  #e3dacc
    { r: 192, g: 209, b: 202 },  // yomogi  #c0d1ca
  ];
  var LINE_COLOR = { r: 227, g: 218, b: 204 }; // shiro3

  // --- State ---
  var nodes = [];
  var mouse = { x: -9999, y: -9999 };
  var w = 0;
  var h = 0;
  var dpr = window.devicePixelRatio || 1;
  var animId = null;
  var isVisible = true;
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Helpers ---
  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function rgba(c, a) {
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  }

  function dist(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // --- Resize ---
  function resize() {
    var rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // --- Init nodes ---
  function initNodes() {
    nodes = [];
    for (var i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: rand(0, w),
        y: rand(0, h),
        vx: rand(-BASE_SPEED, BASE_SPEED) || 0.1,
        vy: rand(-BASE_SPEED, BASE_SPEED) || 0.1,
        r: rand(2, 5),
        baseR: 0,
        currentR: 0,
        color: COLORS[Math.floor(rand(0, COLORS.length))],
        opacity: rand(0.4, 0.8),
      });
      nodes[i].baseR = nodes[i].r;
      nodes[i].currentR = nodes[i].r;
    }
  }

  // --- Update ---
  function update() {
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];

      // Move
      n.x += n.vx;
      n.y += n.vy;

      // Bounce
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;

      // Clamp
      n.x = Math.max(0, Math.min(w, n.x));
      n.y = Math.max(0, Math.min(h, n.y));

      // Mouse interaction: grow radius
      var md = dist(n, mouse);
      var targetR = md < MOUSE_DIST ? n.baseR * 1.8 : n.baseR;
      n.currentR += (targetR - n.currentR) * 0.08;
    }
  }

  // --- Draw ---
  function draw() {
    ctx.clearRect(0, 0, w, h);

    var mouseNear = [];

    // Identify mouse-near nodes
    for (var i = 0; i < nodes.length; i++) {
      if (dist(nodes[i], mouse) < MOUSE_DIST) {
        mouseNear.push(i);
      }
    }

    // Draw connections
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var d = dist(nodes[i], nodes[j]);
        if (d > CONNECT_DIST) continue;

        var iNear = mouseNear.indexOf(i) !== -1;
        var jNear = mouseNear.indexOf(j) !== -1;
        var bothNear = iNear && jNear;

        var maxAlpha = bothNear ? 0.35 : 0.1;
        var alpha = maxAlpha * (1 - d / CONNECT_DIST);

        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.strokeStyle = rgba(bothNear ? nodes[i].color : LINE_COLOR, alpha);
        ctx.lineWidth = bothNear ? 1 : 0.5;
        ctx.stroke();
      }
    }

    // Draw mouse-to-node lines
    if (mouse.x > 0 && mouse.y > 0) {
      for (var k = 0; k < mouseNear.length; k++) {
        var n = nodes[mouseNear[k]];
        var md = dist(n, mouse);
        var alpha = 0.2 * (1 - md / MOUSE_DIST);
        ctx.beginPath();
        ctx.moveTo(mouse.x, mouse.y);
        ctx.lineTo(n.x, n.y);
        ctx.strokeStyle = rgba(n.color, alpha);
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    // Draw nodes
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.currentR, 0, Math.PI * 2);
      ctx.fillStyle = rgba(n.color, n.opacity);
      ctx.fill();
    }
  }

  // --- Loop ---
  function loop() {
    if (!isVisible) return;
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  // --- Mouse events (on hero section, since canvas is behind content) ---
  var heroSection = canvas.closest('.hero') || canvas.parentElement;
  heroSection.addEventListener('mousemove', function (e) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  heroSection.addEventListener('mouseleave', function () {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  // --- Visibility (perf) ---
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      isVisible = entries[0].isIntersecting;
      if (isVisible && !prefersReducedMotion && !animId) {
        loop();
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
      // Redistribute nodes if canvas size changed significantly
      for (var i = 0; i < nodes.length; i++) {
        nodes[i].x = Math.min(nodes[i].x, w);
        nodes[i].y = Math.min(nodes[i].y, h);
      }
    }, 150);
  });

  // --- Start ---
  resize();
  initNodes();

  if (prefersReducedMotion) {
    // Static render only
    draw();
  } else {
    loop();
  }
})();
