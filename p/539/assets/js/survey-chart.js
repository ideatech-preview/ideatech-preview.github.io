/**
 * 調査レポート自動グラフ化
 *
 * .cms-content 内の <ul> で、全 <li> が「テキスト：XX.X%」形式の場合、
 * リサピーページと同じ横棒グラフ（survey-bar）に自動変換する。
 */
document.addEventListener('DOMContentLoaded', function () {
  var content = document.querySelector('.cms-content');
  if (!content) return;

  var pattern = /^(.+)[：:](\d+\.?\d*)%$/;
  var lists = content.querySelectorAll('ul');

  for (var i = 0; i < lists.length; i++) {
    var ul = lists[i];
    var items = ul.querySelectorAll('li');
    if (items.length < 2) continue;

    // 全項目がパターンに一致するか判定
    var matched = [];
    var allMatch = true;
    for (var j = 0; j < items.length; j++) {
      var text = items[j].textContent.trim();
      var m = text.match(pattern);
      if (!m) {
        allMatch = false;
        break;
      }
      matched.push({ label: m[1], pct: parseFloat(m[2]) });
    }

    if (!allMatch || matched.length === 0) continue;

    // survey-question ラッパーを生成
    var wrap = document.createElement('div');
    wrap.className = 'survey-question';

    for (var k = 0; k < matched.length; k++) {
      var bar = document.createElement('div');
      bar.className = 'survey-bar';

      var labelEl = document.createElement('div');
      labelEl.className = 'survey-bar-label';
      labelEl.textContent = matched[k].label;

      var track = document.createElement('div');
      track.className = 'survey-bar-track';

      var fill = document.createElement('div');
      fill.className = 'survey-bar-fill';
      fill.style.setProperty('--fill', matched[k].pct + '%');

      var pct = document.createElement('span');
      pct.className = 'survey-bar-pct';
      pct.textContent = matched[k].pct + '%';

      track.appendChild(fill);
      track.appendChild(pct);
      bar.appendChild(labelEl);
      bar.appendChild(track);
      wrap.appendChild(bar);
    }

    ul.parentNode.replaceChild(wrap, ul);
  }
});
