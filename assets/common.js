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
