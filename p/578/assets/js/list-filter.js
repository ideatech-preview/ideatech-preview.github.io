/**
 * 汎用リストフィルター（複数選択 + サブグループAND対応）
 *
 * ▼ 新形式（複数選択 + 群間AND）
 *   ボタン: data-filter-btn="<group>" data-filter-group="<sub>" data-filter="<key|all>"
 *   アイテム: data-filter-item="<group>" data-filter-<sub>="<keys カンマ区切り>"
 *     例) data-filter-cat="3点セット" data-filter-tag="AI,BtoB"
 *   挙動:
 *     - 同じ data-filter-group 内: トグル選択（再クリックで解除）、OR で絞り込み
 *     - data-filter-group が異なるサブグループ間: AND で絞り込み
 *     - "all" ボタンクリック: そのサブグループの選択を全解除
 *
 * ▼ 旧形式（単一選択、後方互換）
 *   ボタン: data-filter-btn="<group>" data-filter="<key|all>"
 *   アイテム: data-filter-item="<group>" data-filter-key="<keys カンマ区切り>"
 *   挙動: data-filter で単一選択、"all" は全表示
 *
 * ▼ 共通
 *   検索: data-filter-search="<group>" (input要素)
 *     → カテゴリ条件と AND 結合（テキスト含有検索）
 *   URLパラメータ ?tag=xxx → 初期フィルター適用（tag サブグループ or 旧形式）
 */
document.addEventListener('DOMContentLoaded', function () {
  var groups = {};

  function ensureGroup(name) {
    if (!groups[name]) {
      groups[name] = {
        btns: [],
        items: [],
        selections: {},   // 新形式: { subGroup: Set(values) }
        legacyFilter: 'all',
        query: '',
      };
    }
    return groups[name];
  }

  // ボタン収集
  document.querySelectorAll('[data-filter-btn]').forEach(function (btn) {
    var group = btn.getAttribute('data-filter-btn');
    var subGroup = btn.getAttribute('data-filter-group');
    var g = ensureGroup(group);
    g.btns.push(btn);
    if (subGroup && !g.selections[subGroup]) {
      g.selections[subGroup] = new Set();
    }
  });

  // アイテム収集
  document.querySelectorAll('[data-filter-item]').forEach(function (item) {
    var group = item.getAttribute('data-filter-item');
    ensureGroup(group).items.push(item);
  });

  // 検索入力収集
  var searchInputs = {};
  document.querySelectorAll('[data-filter-search]').forEach(function (input) {
    var group = input.getAttribute('data-filter-search');
    ensureGroup(group);
    searchInputs[group] = input;
  });

  function applyFilter(groupName) {
    var g = groups[groupName];
    if (!g) return;
    var query = g.query.toLowerCase();
    var useNewMode = Object.keys(g.selections).length > 0;

    // ボタンの is-active 反映
    g.btns.forEach(function (b) {
      var subGroup = b.getAttribute('data-filter-group');
      var filter = b.getAttribute('data-filter');
      if (subGroup) {
        var sel = g.selections[subGroup] || new Set();
        if (filter === 'all') {
          b.classList.toggle('is-active', sel.size === 0);
        } else {
          b.classList.toggle('is-active', sel.has(filter));
        }
      } else {
        b.classList.toggle('is-active', filter === g.legacyFilter);
      }
    });

    // アイテム表示判定
    g.items.forEach(function (item) {
      var visible = true;

      if (useNewMode) {
        // サブグループ間 AND
        for (var subGroup in g.selections) {
          var sel = g.selections[subGroup];
          if (sel.size === 0) continue;
          var raw = item.getAttribute('data-filter-' + subGroup) || '';
          var values = raw.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
          var hit = false;
          var selArr = Array.from(sel);
          for (var i = 0; i < selArr.length; i++) {
            if (values.indexOf(selArr[i]) !== -1) { hit = true; break; }
          }
          if (!hit) { visible = false; break; }
        }
      } else {
        // 旧形式
        var key = item.getAttribute('data-filter-key') || '';
        var hitLegacy = g.legacyFilter === 'all'
          || key === g.legacyFilter
          || key.split(',').indexOf(g.legacyFilter) !== -1;
        if (!hitLegacy) visible = false;
      }

      if (visible && query) {
        var text = (item.textContent || '').toLowerCase();
        if (text.indexOf(query) === -1) visible = false;
      }

      item.style.display = visible ? '' : 'none';
    });
  }

  // ボタンイベント登録
  Object.keys(groups).forEach(function (groupName) {
    var g = groups[groupName];
    g.btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var subGroup = btn.getAttribute('data-filter-group');
        var filter = btn.getAttribute('data-filter');
        if (subGroup) {
          var sel = g.selections[subGroup];
          if (filter === 'all') {
            sel.clear();
          } else if (sel.has(filter)) {
            sel.delete(filter);
          } else {
            sel.add(filter);
          }
        } else {
          g.legacyFilter = filter;
        }
        applyFilter(groupName);
      });
    });
  });

  // 検索イベント
  Object.keys(searchInputs).forEach(function (groupName) {
    searchInputs[groupName].addEventListener('input', function () {
      groups[groupName].query = this.value;
      applyFilter(groupName);
    });
  });

  // URLパラメータ ?tag=xxx
  var params = new URLSearchParams(window.location.search);
  var tagParam = params.get('tag');
  if (tagParam) {
    Object.keys(groups).forEach(function (groupName) {
      var g = groups[groupName];
      if (g.selections.tag) {
        g.selections.tag.add(tagParam);
      } else {
        g.legacyFilter = tagParam;
      }
      applyFilter(groupName);
    });
  }
});
