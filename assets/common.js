/* ============================================================
   公共脚本 · 参数解析 / 数据加载 / 标签配色 / 小工具
   首页、主播主页、悬浮层、配置台四处共用，避免各写一套。
   ============================================================ */
(function (global) {
  'use strict';

  var SL = {};

  /* ---------- URL 参数 ---------- */
  SL.params = function (search) {
    return new URLSearchParams(search == null ? location.search : search);
  };

  SL.num = function (q, key, fallback) {
    var v = parseFloat(q.get(key));
    return isFinite(v) ? v : fallback;
  };

  SL.flag = function (q, key, fallback) {
    var v = q.get(key);
    if (v === null || v === '') return fallback;
    return ['0', 'false', 'off', 'no'].indexOf(String(v).toLowerCase()) < 0;
  };

  SL.clamp = function (v, min, max) {
    return v < min ? min : (v > max ? max : v);
  };

  /* ---------- 取数据 ---------- */
  SL.loadJSON = function (url) {
    var u = url + (url.indexOf('?') < 0 ? '?' : '&') + '_t=' + Date.now();
    return fetch(u, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status + ' · ' + url);
      return res.json();
    });
  };

  SL.loadRoster = function () {
    return SL.loadJSON('data/streamers.json');
  };

  /* 悬浮层的数据来源，三种写法都支持：
     ?id=yuki            → streamers/yuki.json
     ?src=streamers/x.json → 指定文件
     都不写              → 名册里的 defaults.streamer */
  SL.loadStreamerData = function (q) {
    var src = q.get('src');
    var id = q.get('id');

    if (src) {
      return SL.loadJSON(src).then(function (d) { return { data: d, src: src }; });
    }
    if (id) {
      var p = 'streamers/' + id + '.json';
      return SL.loadJSON(p).then(function (d) {
        if (!d.id) d.id = id;
        return { data: d, src: p };
      });
    }
    return SL.loadRoster().then(function (roster) {
      var def = (roster.defaults && roster.defaults.streamer) ||
                (roster.streamers && roster.streamers[0] && roster.streamers[0].id);
      var path = 'streamers/' + def + '.json';
      return SL.loadJSON(path).then(function (d) {
        if (!d.id) d.id = def;
        d.__roster = roster;
        return { data: d, src: path };
      });
    });
  };

  /* ---------- 标签配色 ----------
     每个标签固定一个色相，饱和度 / 明度 / 不透明度交给主题控制，
     所以换主题时整排标签一起变调，不会各说各话。
     没写过的标签名会自动 hash 出一个稳定色相。 */
  var HUE = {
    '日语': 337, '中文': 11, '英文': 220, '高音': 39,
    '韩语': 255, '电音': 164, '粤语': 198, '纯音乐': 213,
    'rap': 330, 'RAP': 330
  };

  function hashHue(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
    return h;
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2, r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }

  /* 数据里可以写死某个标签的颜色：{"tag":"限定","color":"#FF0000"} */
  SL.tagRgb = function (name, theme, fixed) {
    if (fixed) {
      var fx = SLTheme.hexToRgb(fixed);
      if (fx) return fx;
    }
    var hue = HUE[name] != null ? HUE[name] : hashHue(String(name));
    var sat = theme ? theme.tagSat : 0.62;
    var light = theme ? theme.tagLight : 0.62;
    return hslToRgb(hue, sat, light);
  };

  /* 浅色标签自动换深字，保证对比度。
     阈值取 0.56 而不是 0.62：主题把标签明度调高时（比如樱花主题），
     0.62 会让一批浅橙、浅粉标签仍在用白字，读起来发飘。 */
  SL.tagFg = function (rgb) {
    return SLTheme.luminance(rgb) > 0.56 ? '#141821' : '#FFFFFF';
  };

  /* 主色上的文字色：浅主色配深字、深主色配白字。
     头像上的首字、主按钮、跳转胶囊都用它。
     主播可以单独指定 accent，所以这里必须按"传入的那个主色"算，
     不能用页面主题的 --accent-fg 一把梭。 */
  SL.accentFg = function (hex) {
    var rgb = SLTheme.hexToRgb(hex);
    return (!rgb || SLTheme.luminance(rgb) > 0.5) ? '#0B0D13' : '#FFFFFF';
  };

  /* ---------- 曲目筛选 ----------
     歌单的搜索与「按标签分类」都走这里，主页和悬浮层共用一个实现，
     免得两边对「关键词命中」的定义慢慢跑偏。 */

  SL.tagOf = function (song) {
    return (song && (song.tag || song.category)) || '';
  };

  /* 歌名 / 歌手 / 标签三处一起搜 */
  SL.songText = function (song) {
    return [song && (song.name || song.title) || '', (song && song.artist) || '', SL.tagOf(song)]
      .join(' ').toLowerCase();
  };

  /* 关键词按空格拆词，每个词都要命中（AND）。
     搜「yoasobi 夜」能同时缩小到那一条，比整串当子串匹配更好用。 */
  SL.matchSong = function (song, query) {
    var kw = String(query == null ? '' : query).trim().toLowerCase();
    if (!kw) return true;
    var text = SL.songText(song);
    return kw.split(/\s+/).every(function (w) { return text.indexOf(w) >= 0; });
  };

  /* 标签计数，顺便保留数据里出现的先后顺序（比按字母排更像人排的） */
  SL.tagStats = function (songs) {
    var count = {}, order = [];
    (songs || []).forEach(function (s) {
      var t = SL.tagOf(s);
      if (!t) return;
      if (count[t] == null) { count[t] = 0; order.push(t); }
      count[t]++;
    });
    return order.map(function (t) { return { tag: t, count: count[t] }; });
  };

  /* 多标签之间是「或」：勾「日语 + 中文」是想看这两类曲目，
     而不是想看「既是日语又是中文」的曲目——后者基本永远为空。 */
  SL.filterSongs = function (songs, opts) {
    var o = opts || {};
    var tags = o.tags || [];
    return (songs || []).filter(function (s) {
      if (tags.length && tags.indexOf(SL.tagOf(s)) < 0) return false;
      return SL.matchSong(s, o.q);
    });
  };

  /* 逗号分隔的标签串 ↔ 数组，三个页面统一用它 */
  SL.parseTags = function (v) {
    return String(v == null ? '' : v)
      .split(',')
      .map(function (x) { return x.trim(); })
      .filter(Boolean);
  };

  SL.safeUrl = function (u) {
    return SLTheme.safeUrl ? SLTheme.safeUrl(u) : String(u || '').trim();
  };

  /* 自定义背景图：地址为空就把这一层撤掉，不留半截效果。
     真正的颜色与模糊值由 theme.js 写在 :root 上，这里只切 class。 */
  SL.applyBgImage = function (el, theme) {
    if (!el) return;
    el.classList.toggle('has-bgimg', !!(theme && theme.bgImage));
  };

  /* ---------- 标签配色模式 ----------
     解决「颜色太多」这件事，给三档从克制到自由：
       accent 整排标签跟随主题主色，只靠明暗区分（最克制）
       auto   每个标签一个色相（原来的行为，最花）
       custom 用 tagColors 里指定的颜色，没指定的回落到 auto
     单条曲目自己写的 color 永远最优先，不受模式影响。 */
  SL.TAG_MODES = ['accent', 'auto', 'custom'];
  SL.TAG_MODE_LABEL = {
    accent: '跟随主色',
    auto: '各自配色',
    custom: '逐个指定'
  };

  SL.normTagMode = function (m) {
    var s = String(m == null ? '' : m).toLowerCase();
    return SL.TAG_MODES.indexOf(s) >= 0 ? s : 'auto';
  };

  SL.resolveTagRgb = function (name, theme, opt) {
    var o = opt || {};

    /* 某一条曲目写死的颜色优先级最高，任何模式下都生效 */
    if (o.fixed) {
      var fx = SLTheme.hexToRgb(o.fixed);
      if (fx) return fx;
    }

    var mode = SL.normTagMode(o.mode);
    if (mode === 'accent') {
      return SLTheme.hexToRgb(theme && theme.accent) || [124, 156, 255];
    }
    if (mode === 'custom' && o.custom && o.custom[name]) {
      var c = SLTheme.hexToRgb(o.custom[name]);
      if (c) return c;
    }
    return SL.tagRgb(name, theme, null);
  };

  /* tagColors 的 URL 串 ↔ 对象
     格式：日语:%23FF6FA5,中文:%23FF6B4A   （# 在地址里要写成 %23） */
  SL.parseTagColors = function (v) {
    var out = {};
    String(v == null ? '' : v).split(',').forEach(function (pair) {
      var i = pair.indexOf(':');
      if (i <= 0) return;
      var k = pair.slice(0, i).trim();
      var c;
      try { c = decodeURIComponent(pair.slice(i + 1).trim()); }
      catch (e) { c = pair.slice(i + 1).trim(); }
      if (k && SLTheme.hexToRgb(c)) out[k] = c;
    });
    return out;
  };

  SL.stringifyTagColors = function (map) {
    var bits = [];
    Object.keys(map || {}).forEach(function (k) {
      if (SLTheme.hexToRgb(map[k])) bits.push(k + ':' + map[k]);
    });
    return bits.join(',');
  };

  /* 自动算出来的标签色要回填到 <input type="color">，
     而那个控件只认 #RRGGBB，所以得有个反向转换。 */
  SL.rgbToHex = function (rgb) {
    if (!rgb || rgb.length < 3) return '#000000';
    return '#' + rgb.slice(0, 3).map(function (n) {
      var h = Math.round(n).toString(16);
      return h.length < 2 ? '0' + h : h;
    }).join('');
  };

  /* ---------- 轻提示 ---------- */
  var toastEl = null, toastTimer = null;

  SL.toast = function (msg, kind) {
    if (!toastEl) {
      toastEl = SL.el('div', 'sltoast');
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.className = 'sltoast is-on' + (kind ? ' is-' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.className = 'sltoast'; }, 1900);
  };

  /* 复制一条曲目。文案在这里统一 —— 页面和悬浮层复制出来的是同一个格式，
     否则主播从两处拿到的东西不一样，贴出去容易对不上。 */
  SL.copySong = function (song) {
    var name = (song && (song.name || song.title)) || '';
    if (!name) return;
    var artist = (song && song.artist) || '';
    var text = artist ? name + ' - ' + artist : name;
    SL.copy(text).then(function () {
      SL.toast('已复制：' + text);
    }).catch(function () {
      SL.toast('浏览器不允许自动复制，请手动选中', 'warn');
    });
  };

  /* ---------- DOM ---------- */
  SL.el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  SL.$ = function (id) { return document.getElementById(id); };

  /* ---------- 杂项 ---------- */
  SL.copy = function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); resolve(); } catch (e) { reject(e); }
      document.body.removeChild(ta);
    });
  };

  /* 点击后短暂改文案，给个反馈 */
  SL.flash = function (btn, text, ms) {
    if (!btn) return;
    if (!btn.__label) btn.__label = btn.textContent;
    btn.textContent = text;
    clearTimeout(btn.__t);
    btn.__t = setTimeout(function () { btn.textContent = btn.__label; }, ms || 1600);
  };

  /* 当前页面所在目录，用来拼绝对地址 */
  SL.baseUrl = function () {
    return location.href.replace(/[^/]*$/, '').replace(/[?#].*$/, '');
  };

  SL.buildUrl = function (page, params) {
    var s = params.toString();
    return SL.baseUrl() + page + (s ? '?' + s : '');
  };

  global.SL = SL;
})(window);
