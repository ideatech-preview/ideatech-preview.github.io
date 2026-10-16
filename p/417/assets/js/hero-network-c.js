/**
 * Hero Circuit Board Grid Pulse Animation
 * 回路基板風グリッドパルス – Canvas ベース
 */
(function () {
  var canvas = document.getElementById('heroCanvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  // --- Config ---
  var GRID_SPACING = 60;
  var MAX_ACTIVE_PULSES = 5;
  var MIN_ACTIVE_PULSES = 3;
  var PULSE_SPAWN_INTERVAL = 800;  // ms between auto-spawns
  var PULSE_SPEED = 4;             // nodes per second propagation
  var PULSE_MAX_DEPTH = 12;        // how far a pulse can travel
  var PULSE_START_ALPHA = 0.7;

  // Palette (IDEATECH grand colors)
  var GRID_COLOR = { r: 227, g: 218, b: 204 };  // shiro3
  var GRID_ALPHA = 0.06;
  var DOT_ALPHA = 0.15;
  var DOT_RADIUS = 1.5;

  var PULSE_COLORS = [
    { r: 217, g: 119, b: 87 },   // daidai  #d97757
    { r: 106, g: 155, b: 204 },  // sora    #6a9bcc
    { r: 203, g: 202, b: 218 },  // kasumi  #cbcada
    { r: 192, g: 209, b: 202 },  // yomogi  #c0d1ca
  ];

  // --- State ---
  var w = 0;
  var h = 0;
  var dpr = window.devicePixelRatio || 1;
  var animId = null;
  var isVisible = true;
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var cols = 0;
  var rows = 0;
  var nodes = [];     // flat array of { x, y, col, row, lit, litColor, litAlpha }
  var pulses = [];    // active pulse wave objects
  var lastSpawnTime = 0;

  var mouse = { x: -9999, y: -9999 };
  var lastMouseNode = null;

  // --- Helpers ---
  function rgba(c, a) {
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  }

  function nodeIndex(col, row) {
    if (col < 0 || col >= cols || row < 0 || row >= rows) return -1;
    return row * cols + col;
  }

  function getNeighbors(col, row) {
    // 4-directional (circuit lines run horizontal/vertical)
    var dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    var result = [];
    for (var i = 0; i < dirs.length; i++) {
      var nc = col + dirs[i][0];
      var nr = row + dirs[i][1];
      var idx = nodeIndex(nc, nr);
      if (idx >= 0) result.push(idx);
    }
    return result;
  }

  // --- Resize & Init Grid ---
  function resize() {
    var rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function buildGrid() {
    cols = Math.floor(w / GRID_SPACING) + 1;
    rows = Math.floor(h / GRID_SPACING) + 1;
    nodes = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        nodes.push({
          x: c * GRID_SPACING,
          y: r * GRID_SPACING,
          col: c,
          row: r,
          lit: false,
          litColor: null,
          litAlpha: 0,
        });
      }
    }
  }

  // --- Pulse System ---
  function createPulse(startCol, startRow, color) {
    if (!color) {
      color = PULSE_COLORS[Math.floor(Math.random() * PULSE_COLORS.length)];
    }
    var startIdx = nodeIndex(startCol, startRow);
    if (startIdx < 0) return;

    var pulse = {
      color: color,
      // wavefront: array of { idx, depth, arrival }
      wavefront: [{ idx: startIdx, depth: 0, arrival: 0 }],
      visited: {},
      startTime: performance.now(),
      maxDepth: PULSE_MAX_DEPTH,
    };
    pulse.visited[startIdx] = true;
    pulses.push(pulse);
  }

  function spawnRandomPulse() {
    var c = Math.floor(Math.random() * cols);
    var r = Math.floor(Math.random() * rows);
    createPulse(c, r);
  }

  function updatePulses(now) {
    // Expand wavefronts and light up nodes
    for (var p = pulses.length - 1; p >= 0; p--) {
      var pulse = pulses[p];
      var elapsed = (now - pulse.startTime) / 1000; // seconds

      var newWavefront = [];
      var anyActive = false;

      for (var i = 0; i < pulse.wavefront.length; i++) {
        var wave = pulse.wavefront[i];
        var node = nodes[wave.idx];

        // Time this node should be reached
        var arrivalTime = wave.depth / PULSE_SPEED;
        if (elapsed < arrivalTime) {
          // Not yet reached – keep in wavefront
          newWavefront.push(wave);
          anyActive = true;
          continue;
        }

        // Node is lit – compute alpha with decay
        var age = elapsed - arrivalTime;
        var decayDuration = 1.2; // seconds to fade
        var alpha = PULSE_START_ALPHA * (1 - wave.depth / pulse.maxDepth) * Math.max(0, 1 - age / decayDuration);

        if (alpha > 0.01) {
          // Update node lighting (keep brightest)
          if (alpha > node.litAlpha) {
            node.lit = true;
            node.litColor = pulse.color;
            node.litAlpha = alpha;
          }
          anyActive = true;
        }

        // Expand to neighbors (only once per node)
        if (wave.depth < pulse.maxDepth && !wave.expanded) {
          wave.expanded = true;
          var neighbors = getNeighbors(node.col, node.row);
          for (var n = 0; n < neighbors.length; n++) {
            var nIdx = neighbors[n];
            if (!pulse.visited[nIdx]) {
              pulse.visited[nIdx] = true;
              newWavefront.push({
                idx: nIdx,
                depth: wave.depth + 1,
                arrival: (wave.depth + 1) / PULSE_SPEED,
              });
            }
          }
        }

        // Keep wave for fading
        if (alpha > 0.01) {
          newWavefront.push(wave);
        }
      }

      pulse.wavefront = newWavefront;

      if (!anyActive) {
        pulses.splice(p, 1);
      }
    }

    // Auto-spawn to maintain minimum active pulses
    if (pulses.length < MIN_ACTIVE_PULSES && now - lastSpawnTime > PULSE_SPAWN_INTERVAL) {
      spawnRandomPulse();
      lastSpawnTime = now;
    } else if (pulses.length < MAX_ACTIVE_PULSES && now - lastSpawnTime > PULSE_SPAWN_INTERVAL * 2) {
      spawnRandomPulse();
      lastSpawnTime = now;
    }
  }

  // --- Draw ---
  function draw() {
    ctx.clearRect(0, 0, w, h);

    // Draw grid lines
    ctx.strokeStyle = rgba(GRID_COLOR, GRID_ALPHA);
    ctx.lineWidth = 0.5;

    // Vertical lines
    for (var c = 0; c < cols; c++) {
      var x = c * GRID_SPACING;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, (rows - 1) * GRID_SPACING);
      ctx.stroke();
    }

    // Horizontal lines
    for (var r = 0; r < rows; r++) {
      var y = r * GRID_SPACING;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo((cols - 1) * GRID_SPACING, y);
      ctx.stroke();
    }

    // Draw lit segments (pulse traveling along grid lines)
    for (var p = 0; p < pulses.length; p++) {
      var pulse = pulses[p];
      var elapsed = (performance.now() - pulse.startTime) / 1000;

      for (var i = 0; i < pulse.wavefront.length; i++) {
        var wave = pulse.wavefront[i];
        var arrivalTime = wave.depth / PULSE_SPEED;
        if (elapsed < arrivalTime) continue;

        var age = elapsed - arrivalTime;
        var decayDuration = 1.2;
        var alpha = PULSE_START_ALPHA * (1 - wave.depth / pulse.maxDepth) * Math.max(0, 1 - age / decayDuration);
        if (alpha < 0.02) continue;

        var node = nodes[wave.idx];

        // Draw lit segments to neighbors that are also in wavefront
        ctx.strokeStyle = rgba(pulse.color, alpha * 0.6);
        ctx.lineWidth = 1.5;

        var neighbors = getNeighbors(node.col, node.row);
        for (var n = 0; n < neighbors.length; n++) {
          if (pulse.visited[neighbors[n]]) {
            var neighbor = nodes[neighbors[n]];
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(neighbor.x, neighbor.y);
            ctx.stroke();
          }
        }
      }
    }

    // Draw intersection dots
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];

      if (node.lit && node.litAlpha > 0.02) {
        // Lit node – pulse glow
        ctx.beginPath();
        ctx.arc(node.x, node.y, DOT_RADIUS + 2, 0, Math.PI * 2);
        ctx.fillStyle = rgba(node.litColor, node.litAlpha);
        ctx.fill();

        // Glow halo
        ctx.beginPath();
        ctx.arc(node.x, node.y, DOT_RADIUS + 5, 0, Math.PI * 2);
        ctx.fillStyle = rgba(node.litColor, node.litAlpha * 0.3);
        ctx.fill();
      } else {
        // Default dim dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = rgba(GRID_COLOR, DOT_ALPHA);
        ctx.fill();
      }

      // Reset node lighting for next frame
      node.lit = false;
      node.litAlpha = 0;
      node.litColor = null;
    }
  }

  // --- Static draw (reduced motion) ---
  function drawStatic() {
    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = rgba(GRID_COLOR, GRID_ALPHA);
    ctx.lineWidth = 0.5;

    for (var c = 0; c < cols; c++) {
      var x = c * GRID_SPACING;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, (rows - 1) * GRID_SPACING);
      ctx.stroke();
    }

    for (var r = 0; r < rows; r++) {
      var y = r * GRID_SPACING;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo((cols - 1) * GRID_SPACING, y);
      ctx.stroke();
    }

    // Dots
    for (var i = 0; i < nodes.length; i++) {
      ctx.beginPath();
      ctx.arc(nodes[i].x, nodes[i].y, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = rgba(GRID_COLOR, DOT_ALPHA);
      ctx.fill();
    }

    // A few static "lit" nodes for visual interest
    var litCount = Math.min(8, nodes.length);
    for (var j = 0; j < litCount; j++) {
      var idx = Math.floor(Math.random() * nodes.length);
      var color = PULSE_COLORS[j % PULSE_COLORS.length];
      ctx.beginPath();
      ctx.arc(nodes[idx].x, nodes[idx].y, DOT_RADIUS + 2, 0, Math.PI * 2);
      ctx.fillStyle = rgba(color, 0.4);
      ctx.fill();
    }
  }

  // --- Animation Loop ---
  function loop() {
    if (!isVisible) return;

    var now = performance.now();
    updatePulses(now);
    draw();
    animId = requestAnimationFrame(loop);
  }

  // --- Mouse events ---
  var heroSection = canvas.closest('.hero') || canvas.parentElement;

  heroSection.addEventListener('mousemove', function (e) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;

    // Find nearest grid node
    var nearestCol = Math.round(mouse.x / GRID_SPACING);
    var nearestRow = Math.round(mouse.y / GRID_SPACING);

    // Clamp
    nearestCol = Math.max(0, Math.min(cols - 1, nearestCol));
    nearestRow = Math.max(0, Math.min(rows - 1, nearestRow));

    var key = nearestCol + ',' + nearestRow;
    if (key !== lastMouseNode) {
      lastMouseNode = key;
      // Spawn pulse from hovered intersection
      if (pulses.length < MAX_ACTIVE_PULSES + 2) {
        createPulse(nearestCol, nearestRow);
      }
    }
  });

  heroSection.addEventListener('mouseleave', function () {
    mouse.x = -9999;
    mouse.y = -9999;
    lastMouseNode = null;
  });

  // --- Visibility (IntersectionObserver) ---
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
      buildGrid();
      pulses = [];
      lastSpawnTime = 0;
      if (prefersReducedMotion) {
        drawStatic();
      }
    }, 150);
  });

  // --- Start ---
  resize();
  buildGrid();

  if (prefersReducedMotion) {
    drawStatic();
  } else {
    // Seed initial pulses
    for (var i = 0; i < MIN_ACTIVE_PULSES; i++) {
      spawnRandomPulse();
      lastSpawnTime = performance.now();
    }
    loop();
  }
})();
