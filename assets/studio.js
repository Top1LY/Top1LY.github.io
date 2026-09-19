/* ============================================================
   配置台逻辑
   调好的结果全部编码进 URL —— 页面本身不存任何服务端状态，
   所以"配置"和"预览"永远一致，也不会出现改了没生效的情况。
   ============================================================ */
(function () {
  'use strict';

  var $ = SL.$;
  var SIZE_DEFAULT = { compact: 16, banner: 34, minimal: 16 };
  var PREVIEW_KEY = 'songlist:preview';

  var roster = [];

  var state = {
    id: '',
    style: 'compact',
    theme: 'aurora',
    accent: '#7C9CFF',
    bg: '#080A10',
    color: '#FFFFFF',
    bgOpacity: 55,
    tagAlpha: 90,
    tagSat: 62,
    tagLight: 62,
    size: 16,
    max: 0,
    playing: -1,
    radius: 100,
    blur: 100,
    refresh: 60,
    identity: true,
    avatar: true,
    link: true,
    tags: true,
    panel: true,
    head: true,
    titleText: '',

    /* 筛选：留空 = 完整歌单。写进地址的是 q / tag 两个参数 */
    filterQ: '',
    filterTags: [],

    /* 标签配色：accent 全部跟随主色 / auto 各自配色 / custom 逐个指定 */
    tagMode: 'auto',
    tagColors: {},

    /* 自定义背景图：默认关闭，关着就不往地址里写任何背景参数 */
    bgOn: false,
    bgUrl: '',
    bgImgAlpha: 55,
    bgImgBlur: 0
  };

  /* 哪几项被手动改过 —— 只有改过的才写进 URL，
     否则换主题时这些参数会把主题的值死死按住。 */
  var touched = {
    accent: false, bg: false, color: false,
    bgOpacity: false, tagAlpha: false, tagSat: false, tagLight: false,
    size: false
  };

  var tick = 0;

  /* ---------- 主题同步 ---------- */
  function currentTheme() {
    return SLTheme.get(state.theme);
  }

  function syncPickersFromTheme() {
    var t = currentTheme();
    state.accent = t.accent;
    state.bg = t.bg;
    state.color = t.color;
    state.bgOpacity = Math.round(t.bgOpacity * 100);
    state.tagAlpha = Math.round(t.tagAlpha * 100);
    state.tagSat = Math.round(t.tagSat * 100);
    state.tagLight = Math.round(t.tagLight * 100);

    touched.accent = touched.bg = touched.color = false;
    touched.bgOpacity = touched.tagAlpha = touched.tagSat = touched.tagLight = false;

    $('accent').value = t.accent;
    $('bg').value = t.bg;
    $('color').value = t.color;
    $('bgOpacity').value = state.bgOpacity;
    $('tagAlpha').value = state.tagAlpha;
    $('tagSat').value = state.tagSat;
    $('tagLight').value = state.tagLight;
  }

  /* 配置台自身的配色也跟着走，改色时整页立刻有反馈 */
  function applyOwnTheme() {
    var theme = SLTheme.resolve({
      accent: touched.accent ? state.accent : null,
      bg: touched.bg ? state.bg : null,
      color: touched.color ? state.color : null,
      bgOpacity: touched.bgOpacity ? state.bgOpacity / 100 : null,
      tagAlpha: touched.tagAlpha ? state.tagAlpha / 100 : null,
      tagSat: touched.tagSat ? state.tagSat / 100 : null,
      tagLight: touched.tagLight ? state.tagLight / 100 : null
    }, state.theme);
    SLTheme.apply(document.documentElement, theme);
  }

  /* ---------- URL 生成 ---------- */
  function buildParams(withPreview) {
    var p = new URLSearchParams();
    if (state.id) p.set('id', state.id);
    if (state.style !== 'compact') p.set('style', state.style);
    if (state.theme) p.set('theme', state.theme);

    if (touched.accent) p.set('accent', state.accent);
    if (touched.bg) p.set('bg', state.bg);
    if (touched.color) p.set('color', state.color);
    if (touched.bgOpacity) p.set('bgOpacity', (state.bgOpacity / 100).toFixed(2));
    if (touched.tagAlpha) p.set('tagAlpha', (state.tagAlpha / 100).toFixed(2));
    if (touched.tagSat) p.set('tagSat', (state.tagSat / 100).toFixed(2));
    if (touched.tagLight) p.set('tagLight', (state.tagLight / 100).toFixed(2));

    if (touched.size && state.size !== SIZE_DEFAULT[state.style]) p.set('size', state.size);
    if (state.max > 0) p.set('max', state.max);
    if (state.playing >= 0) p.set('playing', state.playing);
    if (state.radius !== 100) p.set('radius', (state.radius / 100).toFixed(2));
    if (state.blur !== 100) p.set('blur', (state.blur / 100).toFixed(2));
    if (state.refresh !== 60) p.set('refresh', state.refresh);

    if (!state.identity) p.set('identity', '0');
    if (!state.avatar) p.set('avatar', '0');
    if (!state.link) p.set('link', '0');
    if (!state.tags) p.set('tags', '0');
    if (!state.panel) p.set('panel', '0');
    if (!state.head) p.set('title', '0');
    else if (state.titleText) p.set('title', state.titleText);

    /* 筛选：空值不写，保持地址干净 —— 没填就是"没有筛选" */
    if (state.filterQ) p.set('q', state.filterQ);
    if (state.filterTags.length) p.set('tag', state.filterTags.join(','));

    /* 标签配色：auto 是默认行为，不写；自定义色只在 custom 模式下才有意义 */
    if (state.tagMode !== 'auto') p.set('tagMode', state.tagMode);
    if (state.tagMode === 'custom') {
      var tcs = SL.stringifyTagColors(state.tagColors);
      if (tcs) p.set('tagColors', tcs);
    }

    /* 背景图：只有开了开关且填了地址才写，
       否则地址里留着 bgImage= 空值会让悬浮层去试加载一张不存在的图 */
    if (state.bgOn && state.bgUrl) {
      p.set('bgImage', state.bgUrl);
      p.set('bgImgAlpha', (state.bgImgAlpha / 100).toFixed(2));
      if (state.bgImgBlur > 0) p.set('bgImgBlur', state.bgImgBlur);
    }

    if (withPreview) p.set('preview', '1');
    return p;
  }

  function sync() {
    $('out').textContent = SL.buildUrl('overlay.html', buildParams(false));
    $('outProfile').textContent = SL.buildUrl('profile.html',
      new URLSearchParams(state.id ? { id: state.id } : {}));
    $('preview').src = 'overlay.html?' + buildParams(true).toString() + '&_r=' + (++tick);
  }

  /* ---------- 读数 ---------- */
  function readControls() {
    state.style = document.querySelector('#segStyle button[aria-pressed="true"]').dataset.style;
    state.size = +$('size').value;
    state.max = +$('max').value;
    state.playing = +$('playing').value;
    state.radius = +$('radius').value;
    state.blur = +$('blur').value;
    state.refresh = +$('refresh').value;
    state.identity = $('identity').checked;
    state.avatar = $('avatar').checked;
    state.link = $('link').checked;
    state.tags = $('tags').checked;
    state.panel = $('panel').checked;
    state.head = $('head').checked;
    state.titleText = $('titleText').value.trim();

    state.filterQ = $('filterQ').value.trim();
    var sm = document.querySelector('#segTagMode button[aria-pressed="true"]');
    if (sm) state.tagMode = sm.dataset.tagmode;

    state.bgOn = $('bgOn').checked;
    state.bgUrl = $('bgUrl').value.trim();
    state.bgImgAlpha = +$('bgImgAlpha').value;
    state.bgImgBlur = +$('bgImgBlur').value;

    $('vBgOpacity').textContent = state.bgOpacity;
    $('vTagAlpha').textContent = state.tagAlpha;
    $('vTagSat').textContent = state.tagSat;
    $('vTagLight').textContent = state.tagLight;
    $('vSize').textContent = state.size;
    $('vMax').textContent = state.max === 0 ? '全部' : state.max;
    $('vPlaying').textContent = state.playing < 0 ? '不标记' : '第 ' + (state.playing + 1) + ' 首';
    $('vRadius').textContent = state.radius;
    $('vBlur').textContent = state.blur;
    $('vRefresh').textContent = state.refresh;
    $('vFilterTags').textContent = state.filterTags.length ? state.filterTags.join('、') : '全部';
    $('vTagColorCount').textContent = Object.keys(state.tagColors).length + ' 个';
    $('vBgImgAlpha').textContent = state.bgImgAlpha;
    $('vBgImgBlur').textContent = state.bgImgBlur;
  }

  /* ---------- 控件绑定 ---------- */
  function bindStyleSeg() {
    document.querySelectorAll('#segStyle button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.style === state.style));
    });
    $('segStyle').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-style]');
      if (!b) return;
      state.style = b.dataset.style;
      document.querySelectorAll('#segStyle button').forEach(function (x) {
        x.setAttribute('aria-pressed', String(x === b));
      });
      /* 换外观时把字号带到该外观的推荐值（手动调过则尊重） */
      if (!touched.size) {
        state.size = SIZE_DEFAULT[state.style];
        $('size').value = state.size;
      }
      if (state.style === 'minimal') { $('head').checked = false; state.head = false; }
      readControls(); sync();
    });
  }

  function bindSwatches() {
    var box = $('swatches');

    function add(name) {
      var t = SLTheme.get(name);
      var b = SL.el('button', 'swatch');
      b.type = 'button';
      b.dataset.theme = name;
      b.dataset.mode = t.mode;
      b.title = t.label;
      b.setAttribute('aria-label', t.label);
      b.setAttribute('aria-pressed', String(name === state.theme));
      b.style.background = 'linear-gradient(135deg,' + t.accent + ',' + t.accent2 + ')';
      box.appendChild(b);
    }

    /* 14 套平铺成一排看不出深浅差别，用一条竖线分成两排语义 */
    var g = SLTheme.groups();
    g.dark.forEach(add);
    if (g.dark.length && g.light.length) box.appendChild(SL.el('span', 'swatch-sep'));
    g.light.forEach(add);

    box.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-theme]');
      if (!b) return;
      state.theme = b.dataset.theme;
      Array.prototype.forEach.call(box.children, function (x) {
        if (!x.dataset.theme) return;              /* 分隔线没有主题名 */
        x.setAttribute('aria-pressed', String(x === b));
      });
      syncPickersFromTheme();
      readControls();
      applyOwnTheme();
      /* 换主题会改掉自动算出来的标签色，取色器要跟着刷新；
         已经手动指定的那几个保持不动。 */
      renderTagColorBar(songsNow);
      sync();
    });
  }

  function bindColorInputs() {
    ['accent', 'bg', 'color'].forEach(function (id) {
      $(id).addEventListener('input', function () {
        state[id] = this.value;
        touched[id] = true;
        applyOwnTheme();
        sync();
      });
    });

    [['bgOpacity', 'bgOpacity'], ['tagAlpha', 'tagAlpha'],
     ['tagSat', 'tagSat'], ['tagLight', 'tagLight']].forEach(function (pair) {
      $(pair[0]).addEventListener('input', function () {
        state[pair[1]] = +this.value;
        touched[pair[1]] = true;
        readControls();
        applyOwnTheme();
        sync();
      });
    });

    ['size', 'max', 'playing', 'radius', 'blur', 'refresh'].forEach(function (id) {
      $(id).addEventListener('input', function () {
        if (id === 'size') touched.size = true;
        readControls();
        sync();
      });
    });

    ['identity', 'avatar', 'link', 'tags', 'panel', 'head'].forEach(function (id) {
      $(id).addEventListener('change', function () { readControls(); sync(); });
    });

    $('titleText').addEventListener('input', function () { readControls(); sync(); });
  }

  function bindCopy() {
    $('copy').addEventListener('click', function () {
      var btn = this;
      SL.copy($('out').textContent).then(function () { SL.flash(btn, '已复制'); });
    });
    $('copyProfile').addEventListener('click', function () {
      var btn = this;
      SL.copy($('outProfile').textContent).then(function () { SL.flash(btn, '已复制'); });
    });
    $('open').addEventListener('click', function () {
      window.open('overlay.html?' + buildParams(true).toString(), '_blank');
    });
  }

  /* ---------- 筛选 ---------- */
  function songsOf(text) {
    try { return (JSON.parse(text) || {}).songs || []; } catch (e) { return []; }
  }

  /* 标签条直接从「当前正在编辑的 JSON」生成，不从线上文件生成 ——
     否则改了歌单还没保存时，筛选项和预览会对不上。 */
  function renderTagBar(songs) {
    var bar = $('tagBar');
    bar.textContent = '';

    var stats = SL.tagStats(songs);
    if (!stats.length) {
      bar.appendChild(SL.el('span', 'tagpick-empty',
        songs.length ? '这份歌单还没标分类' : '这份歌单还没有曲目'));
      state.filterTags = [];
      return;
    }

    /* 丢掉已经不存在的标签：换成另一份歌单后，旧条件可能已无对应曲目 */
    var names = stats.map(function (s) { return s.tag; });
    state.filterTags = state.filterTags.filter(function (t) { return names.indexOf(t) >= 0; });

    var theme = currentTheme();
    stats.forEach(function (st) {
      var b = SL.el('button', 'tagpick');
      b.type = 'button';
      b.dataset.tag = st.tag;
      b.setAttribute('aria-pressed', String(state.filterTags.indexOf(st.tag) >= 0));

      var rgb = SL.resolveTagRgb(st.tag, theme, {
        mode: state.tagMode, custom: state.tagColors
      });
      b.style.setProperty('--tag-rgb', rgb.join(','));
      b.style.setProperty('--tag-fg', SL.tagFg(rgb));
      b.style.setProperty('--tag-a', theme.tagAlpha);

      b.appendChild(SL.el('span', 'tagpick-name', st.tag));
      b.appendChild(SL.el('span', 'tagpick-count', String(st.count)));

      b.addEventListener('click', function () {
        var i = state.filterTags.indexOf(st.tag);
        if (i >= 0) state.filterTags.splice(i, 1);
        else state.filterTags.push(st.tag);
        renderTagBar(songs);
        readControls();
        sync();
      });
      bar.appendChild(b);
    });
  }

  /* ---------- 标签配色 ---------- */
  var songsNow = [];

  function syncTagModeSeg() {
    Array.prototype.forEach.call($('segTagMode').children, function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.tagmode === state.tagMode));
    });
  }

  /* 每个标签一行：左边名字，右边取色器，末尾恢复按钮。
     自动算出来的颜色会回填进取色器 —— 改颜色是有起点的，
     不用对着一个黑色方块从零猜。 */
  function renderTagColorBar(songs) {
    var bar = $('tagColorBar');
    bar.textContent = '';

    var stats = SL.tagStats(songs);
    if (!stats.length) {
      bar.appendChild(SL.el('span', 'tagpick-empty',
        songs.length ? '这份歌单还没标分类' : '这份歌单还没有曲目'));
      return;
    }

    /* 丢掉已经不存在的标签，免得留下一个对不上任何曲目的颜色设定 */
    var names = stats.map(function (s) { return s.tag; });
    Object.keys(state.tagColors).forEach(function (k) {
      if (names.indexOf(k) < 0) delete state.tagColors[k];
    });

    var theme = currentTheme();
    stats.forEach(function (st) {
      var row = SL.el('div', 'tagcolor');
      row.appendChild(SL.el('span', 'tagcolor-name', st.tag));

      var input = document.createElement('input');
      input.type = 'color';
      input.value = state.tagColors[st.tag] ||
                    SL.rgbToHex(SL.resolveTagRgb(st.tag, theme, { mode: 'auto' }));
      input.title = '给「' + st.tag + '」指定颜色';
      input.addEventListener('input', function () {
        state.tagColors[st.tag] = this.value;
        /* 在别的模式下改颜色是"改了没反应"的，所以顺手切到逐个指定，
           让这个动作做出来的事和它看起来该做的事一致。 */
        if (state.tagMode !== 'custom') {
          state.tagMode = 'custom';
          syncTagModeSeg();
        }
        readControls();
        renderTagBar(songsNow);
        sync();
      });
      row.appendChild(input);

      var clear = SL.el('button', 'tagcolor-clear', '↺');
      clear.type = 'button';
      clear.title = '恢复「' + st.tag + '」的自动配色';
      clear.setAttribute('aria-label', clear.title);
      clear.addEventListener('click', function () {
        delete state.tagColors[st.tag];
        readControls();
        renderTagUI(songsNow);
        sync();
      });
      row.appendChild(clear);

      bar.appendChild(row);
    });
  }

  /* 标签的两处 UI 都从同一份 songs 生成，一起重画才不会互相打架 */
  function renderTagUI(songs) {
    songsNow = songs || [];
    renderTagBar(songsNow);
    renderTagColorBar(songsNow);
  }

  function bindTagMode() {
    syncTagModeSeg();

    $('segTagMode').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-tagmode]');
      if (!b) return;
      state.tagMode = b.dataset.tagmode;
      syncTagModeSeg();
      readControls();
      renderTagBar(songsNow);      /* 标签条要立刻反映新的配色 */
      sync();
    });

    $('tagColorReset').addEventListener('click', function () {
      state.tagColors = {};
      state.tagMode = 'auto';
      syncTagModeSeg();
      readControls();
      renderTagUI(songsNow);
      sync();
    });
  }

  /* 主播推荐的主题：数据里 themes 列到的就打上标记。
     换主播时重标，但不动色板顺序 —— 每次切人都重排一遍会更难找。 */
  function markRecommended(list) {
    var rec = list || [];
    Array.prototype.forEach.call($('swatches').children, function (b) {
      if (!b.dataset.theme) return;
      var on = rec.indexOf(b.dataset.theme) >= 0;
      b.classList.toggle('is-rec', on);
    });
  }

  function bindFilterAndBg() {
    $('filterQ').addEventListener('input', function () { readControls(); sync(); });
    $('bgOn').addEventListener('change', function () { readControls(); sync(); });
    $('bgUrl').addEventListener('input', function () { readControls(); sync(); });
    ['bgImgAlpha', 'bgImgBlur'].forEach(function (id) {
      $(id).addEventListener('input', function () { readControls(); sync(); });
    });
  }

  /* ---------- 返回上一级 ---------- */
  function initBack() {
    var a = $('backLink');
    if (!a) return;

    /* 只有「同站来路」才走 history.back()：从主播主页进来就退回主页。
       直接新开标签页打开时没有来路，用 href 兜底回首页，
       不然 history.back() 可能把人送到站外去。 */
    var ref = document.referrer || '';
    var sameSite = ref.indexOf(location.origin) === 0 && ref.indexOf('studio.html') < 0;
    a.href = sameSite ? ref : 'index.html';

    if (sameSite) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        history.back();
      });
    }
  }

  /* ---------- 数据编辑 ---------- */
  function loadJsonIntoEditor(id) {
    return fetch('streamers/' + id + '.json?_t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.text(); })
      .then(function (t) {
        $('json').value = t;
        renderTagUI(songsOf(t));
      })
      .catch(function () {
        $('json').value = '{\n  "id": "' + id + '",\n  "songs": []\n}';
        renderTagUI([]);
      });
  }

  function bindDataEditor() {
    $('apply').addEventListener('click', function () {
      try {
        var data = JSON.parse($('json').value);
        sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(data));
        /* 歌单改了，可选的标签与标签颜色跟着变 */
        renderTagUI(data.songs || []);
        readControls();
        sync();
      } catch (e) {
        alert('JSON 格式有误：' + e.message);
      }
    });

    $('download').addEventListener('click', function () {
      try { JSON.parse($('json').value); } catch (e) {
        alert('JSON 格式有误：' + e.message); return;
      }
      var blob = new Blob([$('json').value], { type: 'application/json;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = state.id + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        URL.revokeObjectURL(a.href);
        document.body.removeChild(a);
      }, 500);
    });

    $('reset').addEventListener('click', function () {
      sessionStorage.removeItem(PREVIEW_KEY);
      loadJsonIntoEditor(state.id).then(sync);
    });
  }

  /* ---------- 选主播 ---------- */
  function useStreamer(id, firstTime) {
    state.id = id;
    $('dataName').textContent = id;

    var lp = $('linkProfile');
    if (lp) lp.href = 'profile.html?id=' + encodeURIComponent(id);

    sessionStorage.removeItem(PREVIEW_KEY);

    var meta = roster.filter(function (x) { return x.id === id; })[0];

    if (!firstTime) {
      /* 换主播时套用他自己的主题，标题清空 */
      if (meta && meta.theme) {
        state.theme = meta.theme;
        Array.prototype.forEach.call($('swatches').children, function (x) {
          if (!x.dataset.theme) return;            /* 分隔线没有主题名 */
          x.setAttribute('aria-pressed', String(x.dataset.theme === state.theme));
        });
      }
      $('titleText').value = '';
      state.titleText = '';
      /* 换主播等于换一整份歌单，旧的筛选条件留着只会让人以为歌变少了 */
      $('filterQ').value = '';
      state.filterQ = '';
      state.filterTags = [];
    }

    markRecommended(meta && meta.themes);

    syncPickersFromTheme();
    readControls();
    applyOwnTheme();
    loadJsonIntoEditor(id).then(sync);
    sync();
  }

  function bindStreamerSelect() {
    var sel = $('streamer');
    roster.forEach(function (s) {
      var o = document.createElement('option');
      o.value = s.id;
      o.textContent = (s.name || s.id) + '　@' + (s.handle || s.id);
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () { useStreamer(this.value, false); });
  }

  /* ---------- 启动 ---------- */
  SL.loadRoster()
    .then(function (r) {
      roster = r.streamers || [];
      bindStreamerSelect();

      var q = SL.params();
      var first = q.get('id') || (r.defaults && r.defaults.streamer) || (roster[0] && roster[0].id);
      $('streamer').value = first;

      bindSwatches();

      var s0 = roster.filter(function (x) { return x.id === first; })[0];
      if (s0 && s0.theme) {
        state.theme = s0.theme;
        Array.prototype.forEach.call($('swatches').children, function (x) {
          if (!x.dataset.theme) return;            /* 分隔线没有主题名 */
          x.setAttribute('aria-pressed', String(x.dataset.theme === state.theme));
        });
      }

      bindStyleSeg();
      bindColorInputs();
      bindCopy();
      bindDataEditor();
      bindFilterAndBg();
      bindTagMode();
      initBack();
      useStreamer(first, true);
    })
    .catch(function (err) {
      console.error(err);
      $('out').textContent = '名册加载失败 · 请通过 http(s) 打开本页';
    });
})();
