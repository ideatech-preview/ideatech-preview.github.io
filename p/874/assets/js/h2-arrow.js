/* 節の見出しの矢印（.h2arrow）の出現（2026-11-11）。見出しが画面に入ったら、矢印が端から見出しまでにょきっと伸びる。
 * 伸びる前は arrow-wait で端の外へずらしておく（見た目は style.css の .h2arrow）。動きを減らす設定の人・スクリプトが動かないときは最初から出ている。
 * BaseLayout が全ページで1回だけ読み込む。 */
(function () {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var hs = [].slice.call(document.querySelectorAll('h2:has(> .h2arrow)'));
  hs.forEach(function (h) { h.classList.add('arrow-wait'); });
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.remove('arrow-wait'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -15% 0px' });
  hs.forEach(function (h) { io.observe(h); });
})();
