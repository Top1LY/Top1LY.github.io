/* ============================================================
   悬浮层逻辑 · 零依赖，全部通过 URL 参数配置
   地址示例：
     overlay.html?id=yuki&style=compact&theme=aurora
     overlay.html?id=luna&style=banner&size=34&accent=%23FF6FA5
   ============================================================ */
(function () {
  'use strict';

  var q = SL.params();

  var STYLES = ['compact', 'banner', 'minimal'];
  var SIZE_DEFAULT = { compact: 16, banner: 34, minimal: 16 };
  var RADIUS_K = { compact: .75, banner: .47, minimal: .50 };

  var style = String(q.get('style') || 'compact').toLowerCase();
  if (STYLES.indexOf(style) < 0) style = 'compact';

  function numOrNull(key) {
    var v = q.get(key);
    if (v === null || v === '') return null;
    var n = parseFloat(v);
    return isFinite(n) ? n : null;
  }

  var rawTitle = q.get('title');

  var opts = {
    style: style,
    size: SL.clamp(SL.num(q, 'size', SIZE_DEFAULT[style]), 6, 120),
    tags: SL.flag(q, 'tags', style !== 'minimal'),
    panel: SL.flag(q, 'panel', true),
    identity: SL.flag(q, 'identity', style !== 'minimal'),
    avatar: SL.flag(q, 'avatar', true),
    link: SL.flag(q, 'link', true),
    head: rawTitle !== '0',                                              // title=0 隐藏标题行
    titleOverride: (rawTitle && rawTitle !== '0') ? rawTitle : null,
    max: SL.num(q, 'max', 0),
    playing: q.get('playing') === null ? -1 : parseInt(q.get('playing'), 10),
    refresh: SL.num(q, 'refresh', 60),
    preview: SL.flag(q, 'preview', false),
    radiusK: numOrNull('radius'),
    blurK: numOrNull('blur'),
    font: q.get('font'),
    themeName: (q.get('theme') || '').toLowerCase(),

    /* 颜色覆盖：没写的项保持主题原值 */
    colors: {
      accent: q.get('accent'),
      accent2: q.get('accent2'),
      bg: q.get('bg'),
      color: q.get('color'),
      sub: q.get('sub'),
      bgOpacity: numOrNull('bgOpacity'),
      tagAlpha: numOrNull('tagAlpha'),
      tagSat: numOrNull('tagSat'),
      tagLight: numOrNull('tagLight')
    }
  };

  var els = {
    bar:      SL.$('bar'),
    whoAvatar: SL.$('whoAvatar'),
    whoInitial: SL.$('whoInitial'),
    whoName:  SL.$('whoName'),
    whoHandle: SL.$('whoHandle'),
    head:     SL.$('head'),
    headTitle: SL.$('headTitle'),
    headCount: SL.$('headCount'),
    links:    SL.$('links'),
    chipSpace: SL.$('chipSpace'),
    chipLive: SL.$('chipLive'),
    list:     SL.$('list'),
    empty:    SL.$('empty')
  };

  var theme = null;
  var timer = null;

  /* ---------- 把参数写进 DOM / CSS 变量 ---------- */
  function restyle() {
    var b = document.body;
    b.className = 'style-' + opts.style;
    if (opts.preview) b.classList.add('preview');
    if (!opts.panel) b.classList.add('no-panel');
    if (!opts.tags) b.classList.add('no-tags');
    if (!opts.head) b.classList.add('no-head');
    if (!opts.identity) b.classList.add('no-identity');
    if (!opts.avatar) b.classList.add('no-avatar');
    if (!opts.link) b.classList.add('no-link');

    var extra = {
      '--fs': opts.size,
      '--radius-k': RADIUS_K[opts.style] * (opts.radiusK == null ? 1 : opts.radiusK),
      '--blur-k': 0.62 * (opts.blurK == null ? 1 : opts.blurK)
    };
    if (opts.font) {
      extra['--font'] = '"' + opts.font + '", "Noto Sans SC", "PingFang SC", system-ui, sans-serif';
    }

    SLTheme.apply(document.documentElement, theme, extra);
  }

  /* ---------- 渲染 ---------- */
  function render(data) {
    var isPlainList = Array.isArray(data);
    var songs = isPlainList ? data : (data && data.songs) || [];
    if (opts.max > 0) songs = songs.slice(0, opts.max);

    /* 主题优先级：URL 参数 > 数据文件里的 theme > 极光 */
    var themeName = opts.themeName || (data && data.theme) || 'aurora';
    theme = SLTheme.resolve(opts.colors, themeName);
    restyle();

    /* --- 主播身份行 --- */
    var name = !isPlainList && data && data.name;
    if (name && opts.identity) {
      els.bar.hidden = false;
      els.whoName.textContent = name;

      var handle = data.handle;
      els.whoHandle.textContent = handle ? '@' + handle : '';
      els.whoHandle.hidden = !handle;

      if (data.avatar && opts.avatar) {
        els.whoAvatar.classList.add('has-img');
        els.whoAvatar.style.backgroundImage = 'url("' + data.avatar + '")';
      } else {
        els.whoAvatar.classList.remove('has-img');
        els.whoAvatar.style.backgroundImage = '';
        els.whoInitial.textContent = name.slice(0, 1);
      }
      els.whoAvatar.hidden = !opts.avatar;

      var bili = data.bilibili || {};
      if (bili.space) { els.chipSpace.hidden = false; els.chipSpace.href = bili.space; }
      else { els.chipSpace.hidden = true; els.chipSpace.removeAttribute('href'); }
      if (bili.live) { els.chipLive.hidden = false; els.chipLive.href = bili.live; }
      else { els.chipLive.hidden = true; els.chipLive.removeAttribute('href'); }
      els.links.hidden = !(bili.space || bili.live);
    } else {
      els.bar.hidden = true;
    }

    /* --- 标题行 --- */
    var title = opts.titleOverride || (isPlainList ? '' : data && data.title) || '';
    if (opts.head && title) {
      els.head.hidden = false;
      els.headTitle.textContent = title;
      els.headCount.textContent = '共 ' + songs.length + ' 首';
    } else {
      els.head.hidden = true;
    }

    /* --- 曲目 --- */
    els.list.textContent = '';
    els.empty.hidden = songs.length > 0;

    songs.forEach(function (song, i) {
      var li = SL.el('li', 'item');
      if (i === opts.playing) li.classList.add('is-playing');

      var tagName = song.tag || song.category || '';
      if (tagName) {
        var tag = SL.el('span', 'tag', tagName);
        var rgb = SL.tagRgb(tagName, theme, song.color);
        tag.style.setProperty('--tag-rgb', rgb.join(','));
        tag.style.setProperty('--tag-fg', SL.tagFg(rgb));
        li.appendChild(tag);
      }

      var meta = SL.el('div', 'meta');
      meta.appendChild(SL.el('span', 'name', song.name || song.title || ''));
      if (song.artist) meta.appendChild(SL.el('span', 'artist', song.artist));
      li.appendChild(meta);

      els.list.appendChild(li);
    });

    if (name) document.title = name + ' · 歌单悬浮层';
  }

  /* ---------- 加载 ---------- */
  function showError(err) {
    console.error('[歌单] 加载失败：', err);
    if (opts.preview) {
      els.empty.hidden = false;
      els.empty.textContent = '歌单加载失败 · 请确认通过 http(s) 打开本页，并检查 id / src 参数';
    }
  }

  function load() {
    /* 配置台（studio.html）把正在编辑的数据放进 sessionStorage，
       只在 preview 模式下生效，OBS 用的地址永远不会读它。 */
    if (opts.preview) {
      try {
        var cached = sessionStorage.getItem('songlist:preview');
        if (cached) { render(JSON.parse(cached)); return; }
      } catch (e) { /* 忽略，回落到文件加载 */ }
    }
    SL.loadStreamerData(q).then(function (r) { render(r.data); }).catch(showError);
  }

  /* 先用默认主题落一份样式，等数据到了再按数据里的 theme 覆盖，
     避免首帧闪一下没颜色。 */
  theme = SLTheme.resolve(opts.colors, opts.themeName || 'aurora');
  restyle();
  load();

  /* 定时刷新：主播改完 json 推上去，画面不用重开 */
  if (opts.refresh > 0) {
    timer = setInterval(load, opts.refresh * 1000);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) load();
    });
  }

  window.addEventListener('beforeunload', function () {
    if (timer) clearInterval(timer);
  });
})();
