/* 黒い地の面（TOP の FV・ListHero・ページ下の相談の帯）の共通の飾り（2026-11-11）。見た目は style.css の .dot-field。
 * BaseLayout が全ページで1回だけ読み込む。
 *
 * 1) 点の格子：[data-dot-field] の中の canvas.dot-field に、16px おきの薄い点を描く。
 *    カーソルのまわり（半径 100px）の点だけをほんのり明るくし、同じ場所に長く置くほど少しずつ濃くなる（約3秒で最大）。
 *    離れた点はゆっくり元の薄さへ戻るので、動かすと淡い軌跡が残る。点の位置は動かさない。
 *    カーソルが面の上にある間と、濃さが戻りきるまでだけ描き直す（30コマ/秒）。タッチ端末・動きを減らす設定では、点だけ描く。
 *    スクリプトが動かないときは CSS の点（[data-dot-field]::before）が出る。
 *    data-dot-field="dark" のときは明るい地用に黒い点で描く（記事の詳細ページのヒーロー・2026-11-11）。
 * 2) ヘッダーとのつなぎ目：[data-seamless-hero] があるページでは、ヘッダーの区切り線を、その面の下端を過ぎてから出す
 *    （is-past-hero を付ける。ヘッダーを透明にする条件は style.css）。
 */
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var interactive = matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce;

  [].forEach.call(document.querySelectorAll('[data-dot-field]'), function (host) {
    var cv = host.querySelector(':scope > canvas.dot-field');
    if (!cv || !cv.getContext || host.classList.contains('has-dot-field')) return;
    var ctx = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var RGB = host.getAttribute('data-dot-field') === 'dark' ? '20,20,19' : '255,255,255';  /* 明るい地（記事の詳細のヒーロー）は黒い点 */
    var GAP = 16, R = 100, LIFT = 0.3, HEAT = 0.45, GROW = 0.35, DECAY = 0.8, A = 0.14;
    var W = 0, H = 0, cols = 0, rows = 0, heat = new Float32Array(0), hot = 0;
    var px = -9999, py = -9999, tx = -9999, ty = -9999, amp = 0, ampT = 0, raf = 0, last = 0;
    function size() {
      W = host.clientWidth; H = host.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil((W - GAP / 2) / GAP); rows = Math.ceil((H - GAP / 2) / GAP);
      heat = new Float32Array(cols * rows); hot = 0;
      draw(0);
    }
    function draw(dt) {
      ctx.clearRect(0, 0, W, H);
      var grow = dt * GROW * amp, keep = Math.exp(-dt * DECAY), mx = 0;
      for (var j = 0; j < rows; j++) {
        var y = GAP / 2 + j * GAP;
        for (var i = 0; i < cols; i++) {
          var x = GAP / 2 + i * GAP, k = j * cols + i, dx = x - px, dy = y - py, d = Math.sqrt(dx * dx + dy * dy), f = 0;
          if (d < R) { f = 1 - d / R; f *= f; }  /* 中心ほど強く、縁へなめらかに 0 */
          var h = heat[k];
          if (dt) { h = f > 0 && amp > 0.01 ? Math.min(1, h + grow * f) : h * keep; if (h < 0.002) h = 0; heat[k] = h; }
          if (h > mx) mx = h;
          var a = Math.min(0.9, A + LIFT * amp * f + HEAT * h);
          ctx.fillStyle = 'rgba(' + RGB + ',' + a.toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(x, y, 1, 0, 6.2832); ctx.fill();
        }
      }
      hot = mx;
    }
    function tick(now) {
      raf = 0;
      if (now - last >= 32) {
        var dt = last ? Math.min(0.1, (now - last) / 1000) : 0.033; last = now;
        px += (tx - px) * 0.25; py += (ty - py) * 0.25; amp += (ampT - amp) * 0.15;
        draw(dt);
      }
      if (ampT > 0 || amp > 0.002 || hot > 0) raf = requestAnimationFrame(tick); else last = 0;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(tick); }
    host.classList.add('has-dot-field');
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(host); else { size(); window.addEventListener('resize', size); }
    if (!interactive) return;
    window.addEventListener('pointermove', function (e) {
      var r = host.getBoundingClientRect(), inside = e.clientY >= r.top && e.clientY <= r.bottom;
      if (inside) { tx = e.clientX - r.left; ty = e.clientY - r.top; if (px < -999) { px = tx; py = ty; } }
      ampT = inside ? 1 : 0; kick();
    }, { passive: true });
    window.addEventListener('scroll', function () { if (ampT) { ampT = 0; kick(); } }, { passive: true });  /* スクロールでカーソルが面から外れたら止める */
    document.addEventListener('pointerleave', function () { ampT = 0; kick(); });
  });

  var header = document.querySelector('.header'), hero = document.querySelector('[data-seamless-hero]');
  if (header && hero) {
    if (!('IntersectionObserver' in window)) { header.classList.add('is-past-hero'); return; }
    new IntersectionObserver(function (es) { header.classList.toggle('is-past-hero', !es[0].isIntersecting); },
      { rootMargin: '-' + header.offsetHeight + 'px 0px 0px 0px' }).observe(hero);
  }
})();
