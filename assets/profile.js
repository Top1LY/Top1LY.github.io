/* ============================================================
   主播个人主页
   ?id=yuki  或  ?src=streamers/yuki.json
   页面本身跟随该主播的主题；右侧的地址生成器可以再改外观与主题。
   ============================================================ */
(function () {
  'use strict';

  var q = SL.params();
  var stateEl = SL.$('state');
  var roster = null;
  var data = null;
  var theme = null;

  /* 地址生成器状态：初始取主播自己的主题 */
  var gen = { style: q.get('style') || 'compact', theme: (q.get('theme') || '').toLowerCase() };

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

  function renderSongs(s) {
    var songs = s.songs || [];
    var box = SL.$('songs');
    box.textContent = '';
    SL.$('songTitle').textContent = s.title || '完整歌单';
    SL.$('songCount').textContent = '共 ' + songs.length + ' 首';

    if (!songs.length) {
      box.appendChild(SL.el('div', 'state', '这份歌单还是空的'));
      return;
    }

    songs.forEach(function (song, i) {
      var row = SL.el('div', 'song');
      row.appendChild(SL.el('span', 'song-num', String(i + 1).padStart(2, '0')));

      var tagName = song.tag || song.category || '';
      if (tagName) {
        var tag = SL.el('span', 'song-tag', tagName);
        var rgb = SL.tagRgb(tagName, theme, song.color);
        tag.style.setProperty('--tag-rgb', rgb.join(','));
        tag.style.setProperty('--tag-fg', SL.tagFg(rgb));
        tag.style.setProperty('--tag-a', theme.tagAlpha);
        row.appendChild(tag);
      }

      var text = SL.el('div', 'song-text');
      text.appendChild(SL.el('div', 'song-name', song.name || song.title || ''));
      if (song.artist) text.appendChild(SL.el('div', 'song-artist', song.artist));
      row.appendChild(text);

      box.appendChild(row);
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

  /* ---------- OBS 地址生成器 ---------- */
  function buildOverlayUrl(withPreview) {
    var p = new URLSearchParams();
    if (data && data.id) p.set('id', data.id);
    if (gen.style && gen.style !== 'compact') p.set('style', gen.style);
    if (gen.theme) p.set('theme', gen.theme);
    if (withPreview) p.set('preview', '1');
    return SL.buildUrl('overlay.html', p);
  }

  function syncGenerator() {
    SL.$('obsUrl').textContent = buildOverlayUrl(false);
    SL.$('previewObs').href = buildOverlayUrl(true);

    Array.prototype.forEach.call(SL.$('segStyle').children, function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.style === gen.style));
    });
    Array.prototype.forEach.call(SL.$('swatches').children, function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.theme === gen.theme));
    });
  }

  function renderGeneratorControls() {
    var seg = SL.$('segStyle');
    seg.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-style]');
      if (!b) return;
      gen.style = b.dataset.style;
      syncGenerator();
    });

    var sw = SL.$('swatches');
    SLTheme.names.forEach(function (name) {
      var t = SLTheme.get(name);
      var b = SL.el('button', 'swatch');
      b.type = 'button';
      b.dataset.theme = name;
      b.title = t.label;
      b.setAttribute('aria-label', t.label);
      b.style.background = 'linear-gradient(135deg,' + t.accent + ',' + t.accent2 + ')';
      sw.appendChild(b);
    });
    sw.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-theme]');
      if (!b) return;
      gen.theme = b.dataset.theme;
      syncGenerator();
    });

    SL.$('copyObs').addEventListener('click', function () {
      var btn = this;
      SL.copy(buildOverlayUrl(false)).then(function () { SL.flash(btn, '已复制'); });
    });
  }

  /* ---------- 启动 ---------- */
  SL.loadRoster().then(function (r) { roster = r; }).catch(function () {});

  SL.loadStreamerData(q)
    .then(function (r) {
      data = r.data;
      if (!data.id) data.id = q.get('id') || '';
      theme = SLTheme.resolve({}, data.theme || (roster && roster.defaults && roster.defaults.theme) || 'aurora');
      SLTheme.apply(document.documentElement, theme);
      if (!gen.theme) gen.theme = data.theme || 'aurora';

      renderHero(data);
      renderSongs(data);
      renderGeneratorControls();
      syncGenerator();

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
