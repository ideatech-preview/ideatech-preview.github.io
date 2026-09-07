/**
 * Hero Synapse Animation — Organic / Brain-like version
 * ノイズベースの有機的な動き・ベジエ曲線の接続・シナプス発火パルス
 */
(function () {
  var canvas = document.getElementById('heroCanvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  // --- Config ---
  var NODE_COUNT = 55;
  var CONNECT_DIST = 200;
  var MOUSE_DIST = 260;
  var BASE_SPEED = 0.3;
  var WANDER_STRENGTH = 0.015;
  var PULSE_SPEED = 0.025;

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
  var pulses = [];
  var mouse = { x: -9999, y: -9999 };
  var w = 0;
  var h = 0;
  var dpr = window.devicePixelRatio || 1;
  var animId = null;
  var isVisible = true;
  var time = 0;
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Simplex-like noise (lightweight 2D) ---
  var permutation = [];
  (function initPerm() {
    var p = [];
    for (var i = 0; i < 256; i++) p[i] = i;
    for (var i = 255; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = p[i]; p[i] = p[j]; p[j] = tmp;
    }
    for (var i = 0; i < 512; i++) permutation[i] = p[i & 255];
  })();

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + t * (b - a); }

  var grad2 = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
  function noise2d(x, y) {
    var X = Math.floor(x) & 255;
    var Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    var u = fade(x);
    var v = fade(y);
    var aa = permutation[permutation[X] + Y];
    var ab = permutation[permutation[X] + Y + 1];
    var ba = permutation[permutation[X + 1] + Y];
    var bb = permutation[permutation[X + 1] + Y + 1];
    var ga = grad2[aa & 7]; var gb = grad2[ba & 7];
    var gc = grad2[ab & 7]; var gd = grad2[bb & 7];
    var d1 = ga[0] * x + ga[1] * y;
    var d2 = gb[0] * (x - 1) + gb[1] * y;
    var d3 = gc[0] * x + gc[1] * (y - 1);
    var d4 = gd[0] * (x - 1) + gd[1] * (y - 1);
    return lerp(lerp(d1, d2, u), lerp(d3, d4, u), v);
  }

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

  function lerpColor(c1, c2, t) {
    return {
      r: Math.round(c1.r + (c2.r - c1.r) * t),
      g: Math.round(c1.g + (c2.g - c1.g) * t),
      b: Math.round(c1.b + (c2.b - c1.b) * t)
    };
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
      var node = {
        x: rand(0, w),
        y: rand(0, h),
        vx: rand(-BASE_SPEED, BASE_SPEED) || 0.1,
        vy: rand(-BASE_SPEED, BASE_SPEED) || 0.1,
        r: rand(1.5, 4),
        baseR: 0,
        currentR: 0,
        color: COLORS[Math.floor(rand(0, COLORS.length))],
        opacity: rand(0.4, 0.8),
        noiseOffsetX: rand(0, 1000),
        noiseOffsetY: rand(0, 1000),
        breathPhase: rand(0, Math.PI * 2),
        breathSpeed: rand(0.008, 0.02),
      };
      node.baseR = node.r;
      node.currentR = node.r;
      nodes.push(node);
    }
  }

  // --- Spawn pulse ---
  function spawnPulse(fromIdx, toIdx) {
    if (pulses.length > 30) return; // limit
    pulses.push({
      from: fromIdx,
      to: toIdx,
      progress: 0,
      speed: rand(0.012, 0.03),
      color: nodes[fromIdx].color,
      size: rand(2, 4),
      opacity: 0.9,
    });
  }

  // --- Update ---
  function update() {
    time += 1;

    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];

      // Noise-based wandering
      var nx = noise2d(n.noiseOffsetX + time * 0.003, i * 0.5);
      var ny = noise2d(n.noiseOffsetY + time * 0.003, i * 0.5 + 100);

      n.vx += nx * WANDER_STRENGTH;
      n.vy += ny * WANDER_STRENGTH;

      // Damping for organic drift
      n.vx *= 0.985;
      n.vy *= 0.985;

      // Minimum speed
      var speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
      if (speed < 0.1) {
        n.vx += (Math.random() - 0.5) * 0.05;
        n.vy += (Math.random() - 0.5) * 0.05;
      }

      // Move
      n.x += n.vx;
      n.y += n.vy;

      // Soft boundary repulsion (instead of hard bounce)
      var margin = 30;
      if (n.x < margin) n.vx += (margin - n.x) * 0.01;
      if (n.x > w - margin) n.vx -= (n.x - (w - margin)) * 0.01;
      if (n.y < margin) n.vy += (margin - n.y) * 0.01;
      if (n.y > h - margin) n.vy -= (n.y - (h - margin)) * 0.01;

      // Hard clamp
      n.x = Math.max(-10, Math.min(w + 10, n.x));
      n.y = Math.max(-10, Math.min(h + 10, n.y));

      // Breathing (size pulsation)
      n.breathPhase += n.breathSpeed;
      var breathScale = 1 + Math.sin(n.breathPhase) * 0.25;

      // Mouse interaction
      var md = dist(n, mouse);
      var targetR = md < MOUSE_DIST ? n.baseR * 2.5 : n.baseR;
      targetR *= breathScale;
      n.currentR += (targetR - n.currentR) * 0.08;

      // Opacity breathing
      n.opacity = 0.4 + Math.sin(n.breathPhase * 0.7) * 0.2 + 0.2;
    }

    // Random pulse spawning
    if (Math.random() < 0.03 && pulses.length < 20) {
      var a = Math.floor(rand(0, nodes.length));
      var b = -1;
      var bestDist = Infinity;
      // Find nearest neighbor within range
      for (var j = 0; j < nodes.length; j++) {
        if (j === a) continue;
        var d = dist(nodes[a], nodes[j]);
        if (d < CONNECT_DIST && d < bestDist) {
          bestDist = d;
          b = j;
        }
      }
      if (b >= 0) spawnPulse(a, b);
    }

    // Mouse-triggered pulses
    if (mouse.x > 0 && mouse.y > 0 && Math.random() < 0.08) {
      for (var i = 0; i < nodes.length; i++) {
        if (dist(nodes[i], mouse) < MOUSE_DIST * 0.6 && Math.random() < 0.15) {
          for (var j = 0; j < nodes.length; j++) {
            if (j !== i && dist(nodes[i], nodes[j]) < CONNECT_DIST && Math.random() < 0.3) {
              spawnPulse(i, j);
              break;
            }
          }
        }
      }
    }

    // Update pulses
    for (var i = pulses.length - 1; i >= 0; i--) {
      var p = pulses[i];
      p.progress += p.speed;
      // Fade out near end
      if (p.progress > 0.7) {
        p.opacity = 0.9 * (1 - (p.progress - 0.7) / 0.3);
      }
      if (p.progress >= 1) {
        // Chance to cascade to next node
        if (Math.random() < 0.25) {
          var nextFrom = p.to;
          var nextTo = -1;
          var bestD = Infinity;
          for (var j = 0; j < nodes.length; j++) {
            if (j === nextFrom || j === p.from) continue;
            var d2 = dist(nodes[nextFrom], nodes[j]);
            if (d2 < CONNECT_DIST && d2 < bestD) {
              bestD = d2;
              nextTo = j;
            }
          }
          if (nextTo >= 0) spawnPulse(nextFrom, nextTo);
        }
        pulses.splice(i, 1);
      }
    }
  }

  // --- Draw bezier connection ---
  function drawBezierLine(n1, n2, alpha, color, lineWidth) {
    var mx = (n1.x + n2.x) / 2;
    var my = (n1.y + n2.y) / 2;
    var dx = n2.x - n1.x;
    var dy = n2.y - n1.y;
    // Perpendicular offset for organic curve
    var offset = Math.sin(time * 0.005 + n1.x * 0.01 + n2.y * 0.01) * 20;
    var cpx = mx + (-dy * 0.15) + offset * (dy / (Math.abs(dx) + Math.abs(dy) + 1));
    var cpy = my + (dx * 0.15) + offset * (dx / (Math.abs(dx) + Math.abs(dy) + 1));

    ctx.beginPath();
    ctx.moveTo(n1.x, n1.y);
    ctx.quadraticCurveTo(cpx, cpy, n2.x, n2.y);
    ctx.strokeStyle = rgba(color, alpha);
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    return { cpx: cpx, cpy: cpy };
  }

  // --- Get point on quadratic bezier ---
  function bezierPoint(x0, y0, cpx, cpy, x1, y1, t) {
    var u = 1 - t;
    return {
      x: u * u * x0 + 2 * u * t * cpx + t * t * x1,
      y: u * u * y0 + 2 * u * t * cpy + t * t * y1
    };
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

    // Store control points for pulse rendering
    var cpCache = {};

    // Draw connections (bezier curves)
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var d = dist(nodes[i], nodes[j]);
        if (d > CONNECT_DIST) continue;

        var iNear = mouseNear.indexOf(i) !== -1;
        var jNear = mouseNear.indexOf(j) !== -1;
        var bothNear = iNear && jNear;

        var maxAlpha = bothNear ? 0.45 : 0.08;
        var alpha = maxAlpha * (1 - d / CONNECT_DIST);

        var color = bothNear ? lerpColor(nodes[i].color, nodes[j].color, 0.5) : LINE_COLOR;
        var lw = bothNear ? 1 : 0.5;

        var cp = drawBezierLine(nodes[i], nodes[j], alpha, color, lw);
        cpCache[i + ',' + j] = cp;
        cpCache[j + ',' + i] = cp;
      }
    }

    // Draw mouse-to-node lines (bezier)
    if (mouse.x > 0 && mouse.y > 0) {
      for (var k = 0; k < mouseNear.length; k++) {
        var n = nodes[mouseNear[k]];
        var md = dist(n, mouse);
        var alpha = 0.25 * (1 - md / MOUSE_DIST);
        drawBezierLine(mouse, n, alpha, n.color, 0.5);
      }
    }

    // Draw pulses (synaptic firing)
    for (var i = 0; i < pulses.length; i++) {
      var p = pulses[i];
      var n1 = nodes[p.from];
      var n2 = nodes[p.to];

      var key = p.from < p.to ? p.from + ',' + p.to : p.to + ',' + p.from;
      var cp = cpCache[key];
      if (!cp) continue;

      var t = p.from < p.to ? p.progress : 1 - p.progress;
      var pt = bezierPoint(
        p.from < p.to ? n1.x : n2.x,
        p.from < p.to ? n1.y : n2.y,
        cp.cpx, cp.cpy,
        p.from < p.to ? n2.x : n1.x,
        p.from < p.to ? n2.y : n1.y,
        p.from < p.to ? p.progress : 1 - p.progress
      );

      // Glow effect
      var glowR = p.size * 3;
      var grd = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, glowR);
      grd.addColorStop(0, rgba(p.color, p.opacity * 0.6));
      grd.addColorStop(1, rgba(p.color, 0));
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Core dot
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, p.size * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = rgba(p.color, p.opacity);
      ctx.fill();
    }

    // Draw nodes with glow
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];

      // Soft glow
      var glowSize = n.currentR * 3;
      var grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowSize);
      grd.addColorStop(0, rgba(n.color, n.opacity * 0.3));
      grd.addColorStop(1, rgba(n.color, 0));
      ctx.beginPath();
      ctx.arc(n.x, n.y, glowSize, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Core
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

  // --- Mouse events ---
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
    draw();
  } else {
    loop();
  }
})();
