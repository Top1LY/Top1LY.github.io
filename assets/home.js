/* ============================================================
   首页 · 主播大厅
   读 data/streamers.json 拿名册，再各读一份 streamers/<id>.json
   统计曲目数（拿不到就显示"—"，不影响页面）。
   ============================================================ */
(function () {
  'use strict';

  var q = SL.params();
  var themeName = (q.get('theme') || 'aurora').toLowerCase();
  SLTheme.apply(document.documentElement, SLTheme.get(themeName));

  var cardsEl = SL.$('cards');
  var stateEl = SL.$('state');

  /* 每张卡片的强调色来自主播自己，不是页面主题色，
     所以"强调色上的字该用深还是浅"要按该主播的主色单独算一次。 */
  function accentFg(hex) {
    return SL.accentFg(hex || '#7C9CFF');
  }

  function avatarNode(streamer, cls) {
    var av = SL.el('span', cls + (streamer.avatar ? ' has-img' : ''));
    av.appendChild(SL.el('span', null, (streamer.name || '?').slice(0, 1)));
    if (streamer.avatar) av.style.backgroundImage = 'url("' + streamer.avatar + '")';
    av.style.setProperty('--card-accent', streamer.accent || '#7C9CFF');
    av.style.setProperty('--card-accent-fg', accentFg(streamer.accent));
    av.style.setProperty('--mini-accent', streamer.accent || '#7C9CFF');
    if (streamer.accent2) av.style.setProperty('--accent2', streamer.accent2);
    return av;
  }

  function detailUrl(id) { return 'profile.html?id=' + encodeURIComponent(id); }

  function card(s) {
    var el = SL.el('article', 'card');
    var acc = s.accent || '#7C9CFF';
    var accRgb = SLTheme.hexToRgb(acc);
    el.style.setProperty('--card-accent', acc);
    el.style.setProperty('--card-accent-rgb', accRgb ? SLTheme.rgbStr(accRgb) : '124,156,255');
    el.style.setProperty('--card-accent-fg', accentFg(acc));
    if (s.accent2) el.style.setProperty('--accent2', s.accent2);

    /* 整卡可点 */
    var hit = SL.el('a', 'card-link');
    hit.href = detailUrl(s.id);
    hit.setAttribute('aria-label', '进入 ' + s.name + ' 的主页');
    el.appendChild(hit);

    var top = SL.el('div', 'card-top');
    top.appendChild(avatarNode(s, 'avatar'));
    var names = SL.el('div');
    var h = SL.el('h2', 'who-name', s.name || '未命名主播');
    names.appendChild(h);
    var handle = '@' + (s.handle || s.id);
    names.appendChild(SL.el('div', 'who-handle',
      handle + (s.__count == null ? '' : ' · ' + s.__count + ' 首')));
    top.appendChild(names);
    el.appendChild(top);

    el.appendChild(SL.el('p', 'card-bio', s.bio || ''));

    var foot = SL.el('div', 'card-foot');
    var go = SL.el('a', 'btn btn-primary', '进入主页');
    go.href = detailUrl(s.id);
    foot.appendChild(go);

    var live = s.bilibili && (s.bilibili.live || s.bilibili.space);
    if (live) {
      var ext = SL.el('a', 'link-quiet', 'B站 · 直播 ›');
      ext.href = s.bilibili.live || s.bilibili.space;
      ext.target = '_blank';
      ext.rel = 'noopener';
      foot.appendChild(ext);
    }
    el.appendChild(foot);

    return el;
  }

  function render(list) {
    cardsEl.textContent = '';
    if (!list.length) {
      stateEl.hidden = false;
      stateEl.textContent = '还没有主播 · 在 data/streamers.json 里加上一位就行';
      return;
    }
    list.forEach(function (s) { cardsEl.appendChild(card(s)); });

    var total = list.reduce(function (n, s) { return n + (s.__count || 0); }, 0);
    SL.$('stat').textContent = list.length + ' 位主播 · ' + total + ' 首曲目';
    SL.$('studioLink').href = 'studio.html';
  }

  SL.loadRoster()
    .then(function (roster) {
      var site = roster.site || {};
      if (site.title) { document.title = site.title; SL.$('siteTitle').textContent = site.title; }
      if (site.tagline) SL.$('siteTagline').textContent = site.tagline;

      var list = (roster.streamers || []).slice();
      return Promise.all(list.map(function (s) {
        return SL.loadJSON('streamers/' + s.id + '.json')
          .then(function (d) { s.__count = (d.songs || []).length; })
          .catch(function () { s.__count = null; });
      })).then(function () { return list; });
    })
    .then(render)
    .catch(function (err) {
      console.error(err);
      stateEl.hidden = false;
      stateEl.textContent = '名册加载失败 · 请确认通过 http(s) 打开本页（fetch 不能读 file://）';
    });
})();
