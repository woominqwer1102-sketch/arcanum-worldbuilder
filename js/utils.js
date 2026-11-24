/* =========================================================
   ARCANUM · utils (DOM, sheets, toast, files, images)
   ========================================================= */
(function (global) {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function uid(prefix) {
    const rnd = Math.random().toString(36).slice(2, 8);
    return (prefix || 'id') + '_' + Date.now().toString(36).slice(-4) + rnd;
  }

  function debounce(fn, wait) {
    let t = 0;
    return function () {
      const args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(ctx, args), wait);
    };
  }

  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

  function todayLabel(d) {
    const dt = d ? new Date(d) : new Date();
    const p = (n) => String(n).padStart(2, '0');
    return dt.getFullYear() + '.' + p(dt.getMonth() + 1) + '.' + p(dt.getDate());
  }

  function fileStamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  }

  /* ---------------- Toast ---------------- */
  function toast(message, opts) {
    const root = $('#toast-root');
    if (!root) return;
    const node = document.createElement('div');
    node.className = 'toast';
    node.innerHTML = '<svg><use href="#' + ((opts && opts.icon) || 'i-check') + '"/></svg><span></span>';
    node.querySelector('span').textContent = message;
    root.appendChild(node);
    setTimeout(() => {
      node.classList.add('is-out');
      setTimeout(() => node.remove(), 260);
    }, (opts && opts.duration) || 2000);
  }

  /* ---------------- Sheets ---------------- */
  const sheetStack = [];

  function openSheet(opts) {
    const o = opts || {};
    const root = $('#sheet-root');
    const backdrop = document.createElement('div');
    backdrop.className = 'sheet-backdrop';

    const sheet = document.createElement('section');
    sheet.className = 'sheet' + (o.full ? ' sheet--full' : '');
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');

    sheet.innerHTML =
      '<div class="sheet__grab"></div>' +
      '<div class="sheet__head">' +
        '<div class="sheet__head-text">' +
          (o.eyebrow ? '<div class="sheet__eyebrow">' + esc(o.eyebrow) + '</div>' : '') +
          '<h2 class="sheet__title"></h2>' +
          (o.sub ? '<div class="sheet__sub">' + esc(o.sub) + '</div>' : '') +
        '</div>' +
        '<button class="sheet__close" type="button" aria-label="닫기"><svg><use href="#i-x"/></svg></button>' +
      '</div>' +
      '<div class="sheet__body"></div>' +
      (o.foot ? '<div class="sheet__foot"></div>' : '');

    sheet.querySelector('.sheet__title').textContent = o.title || '';
    const body = sheet.querySelector('.sheet__body');
    if (typeof o.body === 'string') body.innerHTML = o.body;
    else if (o.body) body.appendChild(o.body);

    let closed = false;

    function close() {
      if (closed) return;
      closed = true;
      sheet.classList.remove('is-open');
      backdrop.classList.remove('is-open');
      setTimeout(() => { sheet.remove(); backdrop.remove(); }, 320);
      const idx = sheetStack.indexOf(handle);
      if (idx > -1) sheetStack.splice(idx, 1);
      if (!sheetStack.length) document.body.classList.remove('sheet-open');
      if (o.onClose) o.onClose();
    }

    const handle = { el: sheet, body: body, close: close, foot: sheet.querySelector('.sheet__foot') };
    sheetStack.push(handle);
    document.body.classList.add('sheet-open');

    sheet.querySelector('.sheet__close').addEventListener('click', close);
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape' && sheetStack[sheetStack.length - 1] === handle) close();
      if (closed) document.removeEventListener('keydown', onKey);
    });

    // drag-down to dismiss
    let startY = null;
    const head = sheet.querySelector('.sheet__head');
    const grab = sheet.querySelector('.sheet__grab');
    [head, grab].forEach((zone) => {
      zone.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
      zone.addEventListener('touchmove', (e) => {
        if (startY === null) return;
        const dy = e.touches[0].clientY - startY;
        if (dy > 0) sheet.style.transform = 'translateY(' + dy + 'px)';
      }, { passive: true });
      zone.addEventListener('touchend', (e) => {
        if (startY === null) return;
        const dy = (e.changedTouches[0] ? e.changedTouches[0].clientY : startY) - startY;
        startY = null;
        sheet.style.transform = '';
        if (dy > 110) close();
      });
    });

    root.appendChild(backdrop);
    root.appendChild(sheet);
    // force reflow so the transition plays
    void sheet.offsetHeight;
    requestAnimationFrame(() => {
      backdrop.classList.add('is-open');
      sheet.classList.add('is-open');
    });

    if (o.foot) {
      const foot = sheet.querySelector('.sheet__foot');
      o.foot.forEach((btn) => {
        if (!btn) return;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn ' + (btn.className || '');
        if (btn.icon) b.innerHTML = '<svg><use href="#' + btn.icon + '"/></svg>';
        if (btn.label && btn.icon) b.insertAdjacentHTML('beforeend', '<span>' + esc(btn.label) + '</span>');
        else if (btn.label) b.textContent = btn.label;
        if (btn.id) b.id = btn.id;
        b.addEventListener('click', () => {
          if (btn.onClick) {
            const r = btn.onClick(handle);
            if (r === 'close') close();
          } else if (btn.close !== false) close();
        });
        foot.appendChild(b);
      });
    }

    if (o.onReady) o.onReady(handle);
    return handle;
  }

  function confirmSheet(opts) {
    return new Promise((resolve) => {
      let decided = false;
      const body = document.createElement('div');
      body.className = 'prose';
      body.style.fontSize = '13.5px';
      body.textContent = opts.message || '';
      const h = openSheet({
        eyebrow: opts.eyebrow || '확인',
        title: opts.title || '계속할까요?',
        body: body,
        foot: [
          { label: '취소', className: 'btn--ghost', onClick: () => { decided = true; resolve(false); return 'close'; } },
          { label: opts.confirmText || '확인', className: opts.danger ? 'btn--danger' : 'btn--gold', onClick: () => { decided = true; resolve(true); return 'close'; } }
        ],
        onClose: () => { if (!decided) resolve(false); }
      });
      return h;
    });
  }

  /* ---------------- Files ---------------- */
  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(fr.error || new Error('파일을 읽지 못했어요.'));
      fr.readAsDataURL(file);
    });
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(fr.error || new Error('파일을 읽지 못했어요.'));
      fr.readAsText(file);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('이미지를 열지 못했어요.'));
      img.src = src;
    });
  }

  // Resize + compress a photo from the camera roll down to a data URL.
  async function resizeImage(file, maxDim, quality) {
    const limit = maxDim || 1200;
    const q = quality || 0.82;
    const raw = await readFileAsDataURL(file);
    if (/^data:image\/svg/.test(raw)) return raw;
    const img = await loadImage(raw);
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    if (!w || !h) return raw;
    const scale = Math.min(1, limit / Math.max(w, h));
    w = Math.round(w * scale);
    h = Math.round(h * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#171310';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    try {
      return canvas.toDataURL('image/jpeg', q);
    } catch (e) {
      return raw;
    }
  }

  function downloadText(filename, text, mime) {
    const blob = new Blob([text], { type: mime || 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1200);
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* fall through to legacy path */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      ta.style.top = '0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand && document.execCommand('copy');
      ta.remove();
      return !!ok;
    } catch (e) {
      return false;
    }
  }

  function pickFile(accept) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept || 'image/*';
      input.style.position = 'fixed';
      input.style.opacity = '0';
      input.style.pointerEvents = 'none';
      document.body.appendChild(input);
      input.addEventListener('change', () => {
        const f = input.files && input.files[0];
        setTimeout(() => input.remove(), 500);
        resolve(f || null);
      });
      input.click();
    });
  }

  function haptic(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) {}
  }

  /* ---------------- Form building ---------------- */
  function field(labelText, controlHTML, hint, required) {
    return '<label class="field">' +
      '<span class="field__label">' + esc(labelText) + (required ? ' <b>*</b>' : '') + '</span>' +
      controlHTML +
      (hint ? '<span class="field-hint">' + esc(hint) + '</span>' : '') +
      '</label>';
  }

  function textInput(name, value, opts) {
    const o = opts || {};
    return '<input class="input" name="' + esc(name) + '" type="' + (o.type || 'text') + '"' +
      (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') +
      (o.value !== undefined || value ? ' value="' + esc(value || '') + '"' : '') +
      (o.inputmode ? ' inputmode="' + esc(o.inputmode) + '"' : '') +
      (o.autocomplete ? ' autocomplete="' + esc(o.autocomplete) + '"' : '') +
      (o.list ? ' list="' + esc(o.list) + '"' : '') +
      (o.step ? ' step="' + esc(o.step) + '"' : '') +
      '>';
  }

  function textArea(name, value, placeholder, rows) {
    return '<textarea class="textarea" name="' + esc(name) + '" rows="' + (rows || 4) + '"' +
      (placeholder ? ' placeholder="' + esc(placeholder) + '"' : '') + '>' + esc(value || '') + '</textarea>';
  }

  function selectInput(name, options, value) {
    return '<select class="select" name="' + esc(name) + '">' +
      options.map((opt) => {
        const v = typeof opt === 'string' ? opt : opt.value;
        const l = typeof opt === 'string' ? opt : opt.label;
        return '<option value="' + esc(v) + '"' + (String(v) === String(value) ? ' selected' : '') + '>' + esc(l) + '</option>';
      }).join('') + '</select>';
  }

  // Multi/single chip picker with a getSelected() accessor.
  function chipPicker(items, selected, opts) {
    const o = opts || {};
    const multi = !!o.multi;
    let chosen = new Set(multi ? (selected || []) : (selected ? [selected] : []));
    const wrap = document.createElement('div');
    wrap.className = 'picker';
    wrap.innerHTML = items.map((it) => {
      const value = typeof it === 'string' ? it : it.value;
      const label = typeof it === 'string' ? it : it.label;
      const on = chosen.has(value);
      return '<button type="button" class="chip' + (on ? ' chip--active' : '') + '" data-value="' + esc(value) + '">' + esc(label) + '</button>';
    }).join('');
    wrap.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      const v = btn.dataset.value;
      if (multi) {
        if (chosen.has(v)) { chosen.delete(v); btn.classList.remove('chip--active'); }
        else { chosen.add(v); btn.classList.add('chip--active'); }
      } else {
        chosen = new Set([v]);
        $$('.chip', wrap).forEach((b) => b.classList.toggle('chip--active', b.dataset.value === v));
      }
      haptic(6);
      if (o.onChange) o.onChange(multi ? Array.from(chosen) : v);
    });
    wrap.getSelected = () => (multi ? Array.from(chosen) : (Array.from(chosen)[0] || ''));
    wrap.setSelected = (val) => {
      chosen = new Set(multi ? (val || []) : (val ? [val] : []));
      $$('.chip', wrap).forEach((b) => b.classList.toggle('chip--active', chosen.has(b.dataset.value)));
    };
    return wrap;
  }

  function datalist(id, items) {
    const seen = new Set();
    const opts = [];
    (items || []).forEach((it) => {
      const v = String(it || '').trim();
      if (!v || seen.has(v)) return;
      seen.add(v);
      opts.push('<option value="' + esc(v) + '"></option>');
    });
    return '<datalist id="' + esc(id) + '">' + opts.join('') + '</datalist>';
  }

  /* ---------------- Misc ---------------- */
  function initials(name) {
    const s = String(name || '').trim();
    if (!s) return '?';
    return s.slice(0, 1);
  }

  function plural(n, unit) { return String(n) + unit; }

  global.UI = {
    $, $$, esc, uid, debounce, clamp, toast, openSheet, confirmSheet,
    readFileAsDataURL, readFileAsText, loadImage, resizeImage, downloadText, copyText,
    pickFile, haptic, field, textInput, textArea, selectInput, chipPicker, datalist,
    initials, todayLabel, fileStamp, plural
  };
})(window);
