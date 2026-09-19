/* ============================================================
   主题系统 · 14 套预设 + 任意 hex 覆盖
   —— 所有颜色最终落到 CSS 变量上，页面本身不写死任何颜色。
   —— 深色 11 套 / 浅色 3 套。浅色主题 mode 必须是 'light'，
      ts 必须用 'soft'，否则深字会被深色阴影漂白。
   ============================================================ */
(function (global) {
  'use strict';

  /* 预设主题。
     accent   主色：标题高亮 / 直播间按钮 / 头像描边
     accent2  主色的浅色端，用于头像与色卡渐变
     bg       条目底板色，bgOpacity 控制通透度
     color    歌名主色
     sub      歌手等次要文字
     line     描边色（深色主题用白、浅色主题用黑）
     tag*     标签色感：饱和度 / 明度 / 不透明度
     ts       文字阴影强度（浅色主题要弱得多，否则像糊了一层黑边） */
  var PRESETS = {
    aurora: {
      label: '极光 Aurora', mode: 'dark',
      accent: '#7C9CFF', accent2: '#C084FC',
      bg: '#080A10', bgOpacity: 0.55,
      color: '#FFFFFF', sub: '#B9C2D2',
      line: '#FFFFFF', lineOpacity: 0.08,
      tagSat: 0.62, tagLight: 0.62, tagAlpha: 0.90,
      ts: 'strong'
    },
    sakura: {
      label: '樱花 Sakura', mode: 'dark',
      accent: '#FF6FA5', accent2: '#FFB3D0',
      bg: '#150812', bgOpacity: 0.55,
      color: '#FFFFFF', sub: '#E8C4D6',
      line: '#FFFFFF', lineOpacity: 0.09,
      tagSat: 0.66, tagLight: 0.68, tagAlpha: 0.90,
      ts: 'strong'
    },
    midnight: {
      label: '午夜金 Midnight', mode: 'dark',
      accent: '#D9B45B', accent2: '#F3D98B',
      bg: '#0A0A0C', bgOpacity: 0.62,
      color: '#F7F3EA', sub: '#C9BFA6',
      line: '#FFFFFF', lineOpacity: 0.10,
      tagSat: 0.55, tagLight: 0.62, tagAlpha: 0.92,
      ts: 'strong'
    },
    neon: {
      label: '霓虹 Neon', mode: 'dark',
      accent: '#2DD4A7', accent2: '#7BEBCB',
      bg: '#04120E', bgOpacity: 0.50,
      color: '#FFFFFF', sub: '#A9D9CB',
      line: '#FFFFFF', lineOpacity: 0.10,
      tagSat: 0.78, tagLight: 0.58, tagAlpha: 0.90,
      ts: 'strong'
    },
    sunset: {
      label: '落日 Sunset', mode: 'dark',
      accent: '#FF7A45', accent2: '#FFB07A',
      bg: '#140A06', bgOpacity: 0.55,
      color: '#FFF6F1', sub: '#E0BCA8',
      line: '#FFFFFF', lineOpacity: 0.09,
      tagSat: 0.70, tagLight: 0.62, tagAlpha: 0.90,
      ts: 'strong'
    },

    /* ---- 以下 6 套为深色扩展 ---- */
    ocean: {
      label: '深海 Ocean', mode: 'dark',
      accent: '#38BDF8', accent2: '#7DD3FC',
      bg: '#04121C', bgOpacity: 0.55,
      color: '#F0F9FF', sub: '#A5C8DC',
      line: '#FFFFFF', lineOpacity: 0.09,
      tagSat: 0.68, tagLight: 0.60, tagAlpha: 0.90,
      ts: 'strong'
    },
    violet: {
      label: '紫晶 Violet', mode: 'dark',
      accent: '#A78BFA', accent2: '#D8B4FE',
      bg: '#0C0818', bgOpacity: 0.55,
      color: '#F6F2FF', sub: '#C4B5D9',
      line: '#FFFFFF', lineOpacity: 0.09,
      tagSat: 0.66, tagLight: 0.64, tagAlpha: 0.90,
      ts: 'strong'
    },
    forest: {
      label: '森野 Forest', mode: 'dark',
      accent: '#4ADE80', accent2: '#A7F3D0',
      bg: '#04140C', bgOpacity: 0.58,
      color: '#F0FDF4', sub: '#A7C9B4',
      line: '#FFFFFF', lineOpacity: 0.09,
      tagSat: 0.60, tagLight: 0.58, tagAlpha: 0.90,
      ts: 'strong'
    },
    rose: {
      label: '暗玫瑰 Rose', mode: 'dark',
      accent: '#FB7185', accent2: '#FDA4AF',
      bg: '#16070B', bgOpacity: 0.58,
      color: '#FFF1F2', sub: '#DCA8B0',
      line: '#FFFFFF', lineOpacity: 0.09,
      tagSat: 0.68, tagLight: 0.64, tagAlpha: 0.90,
      ts: 'strong'
    },
    /* 赛博主色的两端刻意拉开（品红 → 青），渐变与描边才有电子感 */
    cyber: {
      label: '赛博 Cyber', mode: 'dark',
      accent: '#F472B6', accent2: '#22D3EE',
      bg: '#0A0416', bgOpacity: 0.50,
      color: '#FFFFFF', sub: '#C4B0D6',
      line: '#FFFFFF', lineOpacity: 0.11,
      tagSat: 0.80, tagLight: 0.60, tagAlpha: 0.90,
      ts: 'strong'
    },
    /* 墨白：标签饱和度压到 0.10，整排标签只剩明暗层次，最不抢画面 */
    mono: {
      label: '墨白 Mono', mode: 'dark',
      accent: '#D4D4D8', accent2: '#A1A1AA',
      bg: '#0A0A0B', bgOpacity: 0.60,
      color: '#FAFAFA', sub: '#A1A1AA',
      line: '#FFFFFF', lineOpacity: 0.10,
      tagSat: 0.10, tagLight: 0.70, tagAlpha: 0.92,
      ts: 'strong'
    },

    light: {
      label: '白昼 Light', mode: 'light',
      accent: '#3B6FE0', accent2: '#7FA8F5',
      bg: '#FFFFFF', bgOpacity: 0.80,
      color: '#141821', sub: '#5A6472',
      line: '#0B0D13', lineOpacity: 0.10,
      tagSat: 0.58, tagLight: 0.54, tagAlpha: 0.95,
      ts: 'soft'
    },

    /* ---- 以下 2 套为浅色扩展 ---- */
    cream: {
      label: '奶油 Cream', mode: 'light',
      accent: '#C08A3E', accent2: '#E5B96C',
      bg: '#FFFBF3', bgOpacity: 0.85,
      color: '#2A2117', sub: '#7A6A55',
      line: '#2A2117', lineOpacity: 0.10,
      tagSat: 0.55, tagLight: 0.58, tagAlpha: 0.95,
      ts: 'soft'
    },
    mint: {
      label: '薄荷 Mint', mode: 'light',
      accent: '#1F9E8B', accent2: '#6FD3C3',
      bg: '#FFFFFF', bgOpacity: 0.85,
      color: '#0E211D', sub: '#5C7A73',
      line: '#0E211D', lineOpacity: 0.10,
      tagSat: 0.55, tagLight: 0.55, tagAlpha: 0.95,
      ts: 'soft'
    }
  };

  /* 主题分组：色板里按深 / 浅分两排，避免一排 14 个方块看不出差别 */
  function groupOf(name) {
    var t = PRESETS[name];
    return t && t.mode === 'light' ? 'light' : 'dark';
  }

  var TS = {
    strong: {
      ts: '0 .11em .70em rgba(0,0,0,.85), 0 .04em .16em rgba(0,0,0,.90)',
      soft: '0 .09em .55em rgba(0,0,0,.80), 0 .03em .12em rgba(0,0,0,.85)'
    },
    soft: {
      /* 浅色主题是"白底 + 深字"，阴影必须收成贴着字形的一圈细晕。
         直接照搬深色那套大范围阴影会把深字漂白，反而更糊。 */
      ts: '0 1px 2px rgba(255,255,255,.75), 0 1px 1px rgba(255,255,255,.60)',
      soft: '0 1px 2px rgba(255,255,255,.65)'
    }
  };

  /* ---------- 颜色工具 ---------- */
  function hexToRgb(hex) {
    var h = String(hex || '').trim().replace(/^#/, '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgbStr(rgb) { return rgb[0] + ',' + rgb[1] + ',' + rgb[2]; }

  /* 主体色亮度 → 用来决定标签上该用深字还是白字 */
  function luminance(rgb) {
    return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  }

  function clone(o) {
    var r = {};
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k];
    return r;
  }

  /* 自定义背景图会以 url("…") 的形式写进 CSS 变量，
     所以必须先剔掉能提前闭合引号的字符，以及 javascript: 这类协议。
     —— 背景图地址来自 URL 参数，等于用户可写的输入，这一步不能省。 */
  function safeUrl(u) {
    var s = String(u == null ? '' : u).trim();
    if (!s) return '';
    if (/^(javascript|vbscript|data:text\/html)/i.test(s)) return '';
    return s.replace(/["'\\\r\n\t]/g, '');
  }

  function clamp01(n) {
    n = parseFloat(n);
    if (!isFinite(n)) return null;
    return n < 0 ? 0 : (n > 1 ? 1 : n);
  }

  /* 取主题：名称未知时回落到第一个预设 */
  function get(name) {
    return clone(PRESETS[name] || PRESETS.aurora);
  }

  /* 用 URL 参数覆盖主题里的单点颜色。
     参数名和 CSS 变量一一对应，改一个不影响其它。 */
  function resolve(params, themeName) {
    var t = get(themeName);
    var p = params || {};

    function color(key, prop) {
      if (!p[key]) return;
      var rgb = hexToRgb(p[key]);
      if (rgb) t[prop] = p[key];
    }
    color('accent', 'accent');
    color('accent2', 'accent2');
    color('bg', 'bg');
    color('color', 'color');
    color('sub', 'sub');

    if (p.bgOpacity != null) t.bgOpacity = p.bgOpacity;
    if (p.tagAlpha != null) t.tagAlpha = p.tagAlpha;
    if (p.tagSat != null) t.tagSat = p.tagSat;
    if (p.tagLight != null) t.tagLight = p.tagLight;
    if (p.mode) t.mode = p.mode;

    /* 自定义背景图（可选，不写就没有这一层） */
    if (p.bgImage) {
      var u = safeUrl(p.bgImage);
      if (u) t.bgImage = u;
    }
    if (t.bgImage) {
      var a = clamp01(p.bgImgAlpha);
      t.bgImgAlpha = a == null ? (t.bgImgAlpha == null ? 0.55 : t.bgImgAlpha) : a;
      var b = parseFloat(p.bgImgBlur);
      t.bgImgBlur = isFinite(b) && b >= 0 ? b : (t.bgImgBlur || 0);
    }
    return t;
  }

  /* 把主题写成 CSS 变量。所有页面共用这一份。 */
  function apply(el, t, extra) {
    var s = (el || document.documentElement).style;
    var accent = hexToRgb(t.accent) || [124, 156, 255];
    var accent2 = hexToRgb(t.accent2) || accent;
    var bg = hexToRgb(t.bg) || [8, 10, 16];
    var color = hexToRgb(t.color) || [255, 255, 255];
    var sub = hexToRgb(t.sub) || [185, 194, 210];
    var line = hexToRgb(t.line) || [255, 255, 255];
    var shadow = TS[t.ts] || TS.strong;

    s.setProperty('--accent', t.accent);
    s.setProperty('--accent-rgb', rgbStr(accent));
    s.setProperty('--accent2', t.accent2);
    s.setProperty('--accent2-rgb', rgbStr(accent2));
    /* 主色上的文字色：浅主色配深字、深主色配白字。
       少了这一项，"白昼"主题那种深蓝主色上的黑字会糊成一片。 */
    s.setProperty('--accent-fg', luminance(accent) > 0.5 ? '#0B0D13' : '#FFFFFF');
    s.setProperty('--bg-rgb', rgbStr(bg));
    s.setProperty('--bg-a', t.bgOpacity);
    s.setProperty('--color', t.color);
    s.setProperty('--color-rgb', rgbStr(color));
    s.setProperty('--sub', t.sub);
    s.setProperty('--sub-rgb', rgbStr(sub));
    s.setProperty('--line-rgb', rgbStr(line));
    s.setProperty('--line-a', t.lineOpacity);
    s.setProperty('--tag-a', t.tagAlpha);
    s.setProperty('--tag-sat', t.tagSat);
    s.setProperty('--tag-light', t.tagLight);
    s.setProperty('--ts', shadow.ts);
    s.setProperty('--ts-soft', shadow.soft);

    /* 背景图层：地址为空就写 none，页面照常用纯色底，不会有半成品效果 */
    if (t.bgImage) {
      s.setProperty('--bg-img', 'url("' + t.bgImage + '")');
      s.setProperty('--bg-img-a', String(t.bgImgAlpha));
      s.setProperty('--bg-img-blur', String(t.bgImgBlur));
    } else {
      s.setProperty('--bg-img', 'none');
      s.setProperty('--bg-img-a', '0');
      s.setProperty('--bg-img-blur', '0');
    }

    if (extra) for (var k in extra) if (extra[k] != null) s.setProperty(k, extra[k]);

    var body = document.body;
    if (body) {
      body.classList.toggle('mode-light', t.mode === 'light');
      body.classList.toggle('mode-dark', t.mode !== 'light');
    }
    return t;
  }

  global.SLTheme = {
    PRESETS: PRESETS,
    names: Object.keys(PRESETS),
    get: get,
    resolve: resolve,
    apply: apply,
    hexToRgb: hexToRgb,
    rgbStr: rgbStr,
    luminance: luminance,
    safeUrl: safeUrl,
    groupOf: groupOf,
    label: function (name) {
      var t = PRESETS[name];
      return t ? t.label : '';
    },
    /* 深色一排、浅色一排，排内维持 PRESETS 的声明顺序 */
    groups: function () {
      var out = { dark: [], light: [] };
      Object.keys(PRESETS).forEach(function (n) { out[groupOf(n)].push(n); });
      return out;
    }
  };
})(window);
