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
    titleText: ''
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
    SLTheme.names.forEach(function (name) {
      var t = SLTheme.get(name);
      var b = SL.el('button', 'swatch');
      b.type = 'button';
      b.dataset.theme = name;
      b.title = t.label;
      b.setAttribute('aria-label', t.label);
      b.setAttribute('aria-pressed', String(name === state.theme));
      b.style.background = 'linear-gradient(135deg,' + t.accent + ',' + t.accent2 + ')';
      box.appendChild(b);
    });
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-theme]');
      if (!b) return;
      state.theme = b.dataset.theme;
      Array.prototype.forEach.call(box.children, function (x) {
        x.setAttribute('aria-pressed', String(x === b));
      });
      syncPickersFromTheme();
      readControls();
      applyOwnTheme();
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

  /* ---------- 数据编辑 ---------- */
  function loadJsonIntoEditor(id) {
    return fetch('streamers/' + id + '.json?_t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.text(); })
      .then(function (t) { $('json').value = t; })
      .catch(function () { $('json').value = '{\n  "id": "' + id + '",\n  "songs": []\n}'; });
  }

  function bindDataEditor() {
    $('apply').addEventListener('click', function () {
      try {
        var data = JSON.parse($('json').value);
        sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(data));
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
    sessionStorage.removeItem(PREVIEW_KEY);

    if (!firstTime) {
      /* 换主播时套用他自己的主题与外观，标题清空 */
      var s = roster.filter(function (x) { return x.id === id; })[0];
      if (s && s.theme) {
        state.theme = s.theme;
        Array.prototype.forEach.call($('swatches').children, function (x) {
          x.setAttribute('aria-pressed', String(x.dataset.theme === state.theme));
        });
      }
      $('titleText').value = '';
      state.titleText = '';
    }

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
          x.setAttribute('aria-pressed', String(x.dataset.theme === state.theme));
        });
      }

      bindStyleSeg();
      bindColorInputs();
      bindCopy();
      bindDataEditor();
      useStreamer(first, true);
    })
    .catch(function (err) {
      console.error(err);
      $('out').textContent = '名册加载失败 · 请通过 http(s) 打开本页';
    });
})();
