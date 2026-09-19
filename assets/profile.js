/* ============================================================
   主播个人主页
   ?id=yuki  或  ?src=streamers/yuki.json
   这里只负责「看」：歌单、搜索、按标签分类、点歌名复制。
   OBS 地址一律在 studio.html 里生成，本页只给一个入口。
   ============================================================ */
(function () {
  'use strict';

  var q = SL.params();
  var stateEl = SL.$('state');
  var roster = null;
  var data = null;
  var theme = null;

  /* 标签配色：模式来自 URL 或数据，自定义色逐个合并（URL 覆盖数据） */
  var tagMode = 'auto';
  var tagCustom = {};

  function tagRgb(name, fixed) {
    return SL.resolveTagRgb(name, theme, { fixed: fixed, mode: tagMode, custom: tagCustom });
  }

  /* ---------- 渲染 ---------- */
  function renderHero(s) {
    var av = SL.$('heroAvatar');
    SL.$('heroInitial').textContent = (s.name || '?').slice(0, 1);
    if (s.avatar) {
      av.classList.add('has-img');
      av.style.backgroundImage = 'url("' + s.avatar + '")';
    }

    SL.$('heroName').textContent = s.name || '未命名主播';
    document.title = (s.name || '主播') + ' · 歌单主页';

    var handleBits = [];
    if (s.handle) handleBits.push('@' + s.handle);
    if (s.tags && s.tags.length) handleBits.push(s.tags.join(' / '));
    SL.$('heroHandle').textContent = handleBits.join('　·　');

    SL.$('heroIntro').textContent = s.intro || s.bio || '';

    var songs = s.songs || [];
    SL.$('heroMeta').textContent = songs.length + ' 首曲目' +
      (s.updated ? ' · 歌单更新于 ' + s.updated : '');

    var bili = s.bilibili || {};
    var live = SL.$('btnLive'), space = SL.$('btnSpace');
    if (bili.live) { live.href = bili.live; } else { live.hidden = true; }
    if (bili.space) { space.href = bili.space; } else { space.hidden = true; }
  }

  /* ---------- 歌单：搜索 + 按标签分类 ---------- */
  var allSongs = [];
  var flt = { q: '', tags: [] };

  function isFiltering() { return !!flt.q || flt.tags.length > 0; }

  function songRow(song, indexInAll) {
    var row = SL.el('div', 'song');
    row.appendChild(SL.el('span', 'song-num', String(indexInAll).padStart(2, '0')));

    var tagName = SL.tagOf(song);
    if (tagName) {
      var tag = SL.el('span', 'song-tag', tagName);
      var rgb = tagRgb(tagName, song.color);
      tag.style.setProperty('--tag-rgb', rgb.join(','));
      tag.style.setProperty('--tag-fg', SL.tagFg(rgb));
      tag.style.setProperty('--tag-a', theme.tagAlpha);
      row.appendChild(tag);
    }

    var text = SL.el('div', 'song-text');

    var nameEl = SL.el('div', 'song-name', song.name || song.title || '');
    nameEl.title = '点击复制歌名';
    nameEl.addEventListener('click', function () { SL.copySong(song); });
    text.appendChild(nameEl);

    if (song.artist) text.appendChild(SL.el('div', 'song-artist', song.artist));
    row.appendChild(text);

    /* 行尾复制按钮：给一个明确的落点，不然只靠「歌名能点」很难被发现 */
    var copy = SL.el('button', 'song-copy');
    copy.type = 'button';
    copy.title = '复制歌名';
    copy.setAttribute('aria-label', '复制 ' + (song.name || song.title || ''));
    copy.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true">' +
      '<rect x="7.5" y="7.5" width="9" height="9" rx="2"></rect>' +
      '<path d="M5.5 12.5H4.6A1.6 1.6 0 0 1 3 10.9V4.6A1.6 1.6 0 0 1 4.6 3h6.3A1.6 1.6 0 0 1 12.5 4.6v.9"></path>' +
      '</svg>';
    copy.addEventListener('click', function () { SL.copySong(song); });
    row.appendChild(copy);

    return row;
  }

  /* 标签条 = 分类入口。每个 chip 带该标签的曲目数，
     点一下切换选中，多选之间是「或」。 */
  function renderTagbar() {
    var bar = SL.$('tagbar');
    bar.textContent = '';

    var stats = SL.tagStats(allSongs);
    if (stats.length < 2) { bar.hidden = true; return; }
    bar.hidden = false;

    var all = SL.el('button', 'tagpick is-all');
    all.type = 'button';
    all.setAttribute('aria-pressed', String(!flt.tags.length));
    all.appendChild(SL.el('span', 'tagpick-name', '全部'));
    all.appendChild(SL.el('span', 'tagpick-count', String(allSongs.length)));
    all.addEventListener('click', function () {
      flt.tags = [];
      syncFilter();
    });
    bar.appendChild(all);

    stats.forEach(function (st) {
      var b = SL.el('button', 'tagpick');
      b.type = 'button';
      b.dataset.tag = st.tag;
      b.setAttribute('aria-pressed', String(flt.tags.indexOf(st.tag) >= 0));

      var rgb = tagRgb(st.tag, null);
      b.style.setProperty('--tag-rgb', rgb.join(','));
      b.style.setProperty('--tag-fg', SL.tagFg(rgb));
      b.style.setProperty('--tag-a', theme.tagAlpha);

      b.appendChild(SL.el('span', 'tagpick-name', st.tag));
      b.appendChild(SL.el('span', 'tagpick-count', String(st.count)));

      b.addEventListener('click', function () {
        var i = flt.tags.indexOf(st.tag);
        if (i >= 0) flt.tags.splice(i, 1);
        else flt.tags.push(st.tag);
        syncFilter();
      });
      bar.appendChild(b);
    });
  }

  function renderList() {
    var box = SL.$('songs');
    var list = SL.filterSongs(allSongs, flt);
    box.textContent = '';

    SL.$('songCount').textContent = isFiltering()
      ? '筛出 ' + list.length + ' / 共 ' + allSongs.length + ' 首'
      : '共 ' + allSongs.length + ' 首';
    SL.$('clearFilter').hidden = !isFiltering();

    /* 命中说明：让「筛掉了什么」始终可见，不然用户会以为歌单变短了 */
    var stat = SL.$('filterStat');
    if (!isFiltering()) {
      stat.textContent = '';
      stat.hidden = true;
    } else {
      var bits = [];
      if (flt.q) bits.push('关键词「' + flt.q + '」');
      if (flt.tags.length) bits.push('标签 ' + flt.tags.join('、'));
      stat.textContent = bits.join(' · ') + ' → ' + list.length + ' 首';
      stat.hidden = false;
    }

    if (!allSongs.length) {
      box.appendChild(SL.el('div', 'state', '这份歌单还是空的'));
      return;
    }
    if (!list.length) {
      box.appendChild(SL.el('div', 'state', '没有匹配的曲目 · 换个关键词，或点「全部」'));
      return;
    }

    list.forEach(function (song) {
      /* 序号沿用它在完整歌单里的位置：筛选时不会整排重新编号，
         对着数据文件也还能一眼找到是第几条。 */
      box.appendChild(songRow(song, allSongs.indexOf(song) + 1));
    });
  }

  function syncUrl() {
    if (!history.replaceState) return;
    var p = new URLSearchParams(location.search);
    if (flt.q) p.set('q', flt.q); else p.delete('q');
    if (flt.tags.length) p.set('tag', flt.tags.join(',')); else p.delete('tag');
    var s = p.toString();
    history.replaceState(null, '', location.pathname + (s ? '?' + s : ''));
  }

  /* 每次筛选变化都重画标签条 —— chip 的选中态与计数都在里面，
     分开更新容易漏掉一处。列表小，重画比逐项打补丁更不容易错。 */
  function syncFilter() {
    renderTagbar();
    renderList();
    syncUrl();
  }

  function renderSongs(s) {
    allSongs = s.songs || [];
    SL.$('songTitle').textContent = s.title || '完整歌单';

    /* 初值可以来自地址栏，方便把「筛好的视图」直接发给别人 */
    var q0 = q.get('q') || '';
    flt.q = q0;
    flt.tags = SL.parseTags(q.get('tag'));
    SL.$('q').value = q0;

    SL.$('filter').hidden = !allSongs.length;
    syncFilter();
  }

  function bindFilter() {
    SL.$('q').addEventListener('input', function () {
      flt.q = this.value;
      syncFilter();
    });
    SL.$('clearFilter').addEventListener('click', function () {
      flt.q = '';
      flt.tags = [];
      SL.$('q').value = '';
      syncFilter();
    });
  }

  function renderOthers(currentId) {
    var box = SL.$('others');
    box.textContent = '';
    var others = ((roster && roster.streamers) || []).filter(function (x) { return x.id !== currentId; });
    if (!others.length) {
      box.appendChild(SL.el('div', 'state', '暂时只有这一位'));
      return;
    }
    others.forEach(function (s) {
      var a = SL.el('a', 'mini');
      a.href = 'profile.html?id=' + encodeURIComponent(s.id);
      var av = SL.el('span', 'mini-avatar' + (s.avatar ? ' has-img' : ''));
      av.appendChild(SL.el('span', null, (s.name || s.id || '?').slice(0, 1)));
      if (s.avatar) av.style.backgroundImage = 'url("' + s.avatar + '")';
      if (s.accent) {
        av.style.setProperty('--mini-accent', s.accent);
        av.style.setProperty('--mini-fg', SL.accentFg(s.accent));
      }
      a.appendChild(av);
      a.appendChild(SL.el('span', 'mini-name', s.name || s.id));
      a.appendChild(SL.el('span', 'mini-go', '›'));
      box.appendChild(a);
    });
  }

  /* ---------- OBS 入口 ----------
     本页不再出现带参数的地址，只留两个入口：
     一个进配置页生成地址，一个直接看悬浮层效果。 */
  function bindObsLinks() {
    var id = (data && data.id) || '';
    var studio = 'studio.html' + (id ? '?id=' + encodeURIComponent(id) : '');
    SL.$('btnStudio').href = studio;

    /* 预览用默认外观；要挑外观和主题，就进配置页那边看实时预览 */
    var p = new URLSearchParams();
    if (id) p.set('id', id);
    p.set('preview', '1');
    SL.$('btnPreview').href = SL.buildUrl('overlay.html', p);
  }

  /* ---------- 启动 ---------- */
  SL.loadRoster().then(function (r) { roster = r; }).catch(function () {});

  SL.loadStreamerData(q)
    .then(function (r) {
      data = r.data;
      if (!data.id) data.id = q.get('id') || '';

      /* 主题优先级：URL 的 theme > 数据里的 theme > 名册默认。
         背景图同理，URL 参数盖过数据字段，方便不改文件先试效果。 */
      var themeName = (q.get('theme') || '').toLowerCase() ||
                      data.theme ||
                      (roster && roster.defaults && roster.defaults.theme) || 'aurora';
      theme = SLTheme.resolve({
        bgImage: q.get('bgImage') || data.bgImage,
        bgImgAlpha: q.get('bgImgAlpha') != null ? q.get('bgImgAlpha') : data.bgImgAlpha,
        bgImgBlur: q.get('bgImgBlur') != null ? q.get('bgImgBlur') : data.bgImgBlur
      }, themeName);
      SLTheme.apply(document.documentElement, theme);

      /* 自定义背景图：只切 class，具体地址与强度来自 :root 上的变量 */
      SL.applyBgImage(SL.$('hero'), theme);

      /* 标签配色：模式与自定义色都是 URL 盖过数据字段。
         必须在 renderSongs 之前定好 —— 标签条和曲目行都要用它。 */
      tagMode = SL.normTagMode(q.get('tagMode') || data.tagMode);
      var dc = data.tagColors || {};
      for (var dk in dc) if (Object.prototype.hasOwnProperty.call(dc, dk)) tagCustom[dk] = dc[dk];
      var uc = SL.parseTagColors(q.get('tagColors'));
      for (var uk in uc) if (Object.prototype.hasOwnProperty.call(uc, uk)) tagCustom[uk] = uc[uk];

      renderHero(data);
      bindFilter();
      bindObsLinks();
      renderSongs(data);

      SL.$('state').hidden = true;
      SL.$('profile').hidden = false;

      /* 名册可能后到，到了再画"其他主播" */
      if (roster) renderOthers(data.id);
      else setTimeout(function () { if (roster) renderOthers(data.id); }, 400);
    })
    .catch(function (err) {
      console.error(err);
      stateEl.textContent = '找不到这位主播 · 检查地址里的 id，或确认通过 http(s) 打开本页';
    });
})();
