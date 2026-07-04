(function() {
  'use strict';

  let extractedColors = [];
  let currentImage = null;

  const DOM = {};

  function cacheDOM() {
    DOM.navLinks = document.getElementById('navLinks');
    DOM.navToggle = document.getElementById('navToggle');
    DOM.navbar = document.getElementById('navbar');
    DOM.cursorGlow = document.getElementById('cursorGlow');
    DOM.heroCta = document.getElementById('heroCta');
    DOM.uploadArea = document.getElementById('uploadArea');
    DOM.fileInput = document.getElementById('fileInput');
    DOM.uploadContent = document.getElementById('uploadContent');
    DOM.uploadPreview = document.getElementById('uploadPreview');
    DOM.previewImage = document.getElementById('previewImage');
    DOM.changeImage = document.getElementById('changeImage');
    DOM.extractBtn = document.getElementById('extractBtn');
    DOM.colorCount = document.getElementById('colorCount');
    DOM.colorCountLabel = document.getElementById('colorCountLabel');
    DOM.quality = document.getElementById('quality');
    DOM.qualityLabel = document.getElementById('qualityLabel');
    DOM.paletteGrid = document.getElementById('paletteGrid');
    DOM.paletteEmpty = document.getElementById('paletteEmpty');
    DOM.paletteActions = document.getElementById('paletteActions');
    DOM.exportBtn = document.getElementById('exportBtn');
    DOM.exportActions = document.getElementById('exportActions');
    DOM.downloadBtn = document.getElementById('downloadBtn');
  }

  // Navigation
  function initNavigation() {
    const navItems = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    const activateSection = (id) => {
      sections.forEach(s => s.classList.remove('active'));
      navItems.forEach(n => n.classList.remove('active'));
      document.getElementById(id)?.classList.add('active');
      document.querySelector(`.nav-link[href="#${id}"]`)?.classList.add('active');
      if (DOM.navLinks) DOM.navLinks.classList.remove('open');
    };
    navItems.forEach(link => {
      link.addEventListener('click', e => { e.preventDefault(); activateSection(link.getAttribute('href').slice(1)); });
    });
    if (DOM.heroCta) DOM.heroCta.addEventListener('click', e => { e.preventDefault(); activateSection('extract'); });
    const hash = location.hash.slice(1) || 'overview';
    activateSection(hash);
  }

  // Color Quantization — Median Cut Algorithm
  function medianCutQuantize(pixels, numColors) {
    if (!pixels.length) return [];

    const sample = [];
    for (let i = 0; i < pixels.length; i += 4) {
      sample.push([pixels[i], pixels[i+1], pixels[i+2]]);
    }

    function colorDistance(a, b) {
      return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);
    }

    function averageColor(bucket) {
      const len = bucket.length;
      if (!len) return [0,0,0];
      let r=0,g=0,b=0;
      for (const c of bucket) { r+=c[0]; g+=c[1]; b+=c[2]; }
      return [Math.round(r/len), Math.round(g/len), Math.round(b/len)];
    }

    function split(bucket) {
      if (!bucket.length) return [];
      const rMin = Math.min(...bucket.map(c=>c[0])), rMax = Math.max(...bucket.map(c=>c[0]));
      const gMin = Math.min(...bucket.map(c=>c[1])), gMax = Math.max(...bucket.map(c=>c[1]));
      const bMin = Math.min(...bucket.map(c=>c[2])), bMax = Math.max(...bucket.map(c=>c[2]));
      const rRange = rMax - rMin, gRange = gMax - gMin, bRange = bMax - bMin;
      const channel = rRange >= gRange && rRange >= bRange ? 0 : gRange >= bRange ? 1 : 2;
      bucket.sort((a,b) => a[channel] - b[channel]);
      const mid = Math.floor(bucket.length / 2);
      return [bucket.slice(0, mid), bucket.slice(mid)];
    }

    function quantize(buckets, target) {
      if (buckets.length >= target) return buckets;
      let largestIdx = 0, largestSize = 0;
      for (let i = 0; i < buckets.length; i++) {
        if (buckets[i].length > largestSize) {
          largestSize = buckets[i].length;
          largestIdx = i;
        }
      }
      if (largestSize < 2) return buckets;
      const [a, b] = split(buckets[largestIdx]);
      buckets.splice(largestIdx, 1, a, b);
      return quantize(buckets, target);
    }

    let buckets = [sample];
    buckets = quantize(buckets, numColors);
    const colors = buckets.map(b => averageColor(b));

    // Deduplicate
    const unique = [];
    for (const c of colors) {
      const dup = unique.some(u => colorDistance(u, c) < 15);
      if (!dup) unique.push(c);
    }

    // Sort by luminance (darkest first)
    unique.sort((a,b) => {
      const lumA = 0.299*a[0] + 0.587*a[1] + 0.114*a[2];
      const lumB = 0.299*b[0] + 0.587*b[1] + 0.114*b[2];
      return lumA - lumB;
    });

    return unique.map(rgb => ({
      hex: rgbToHex(rgb[0], rgb[1], rgb[2]),
      rgb: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
      hsl: rgbToHsl(rgb[0], rgb[1], rgb[2]),
      r: rgb[0], g: rgb[1], b: rgb[2],
    }));
  }

  function rgbToHex(r, g, b) {
    return '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join('');
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return `hsl(${Math.round(h*360)}, ${Math.round(s*100)}%, ${Math.round(l*100)}%)`;
  }

  function extractColorsFromImage(img, numColors, quality) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const scale = quality / 5;
    const maxDim = 200 * scale;
    let w = img.naturalWidth, h = img.naturalHeight;
    if (w > maxDim || h > maxDim) {
      const ratio = Math.min(maxDim / w, maxDim / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    canvas.width = w; canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    return medianCutQuantize(imageData.data, numColors);
  }

  // UI
  function handleImageUpload(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        currentImage = img;
        DOM.previewImage.src = e.target.result;
        DOM.uploadContent.style.display = 'none';
        DOM.uploadPreview.style.display = 'flex';
        DOM.extractBtn.disabled = false;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function extractAndShow() {
    if (!currentImage) return;
    const numColors = parseInt(DOM.colorCount.value);
    const quality = parseInt(DOM.quality.value);
    extractedColors = extractColorsFromImage(currentImage, numColors, quality);

    renderPalette();
    updateExports();

    DOM.paletteEmpty.style.display = 'none';
    DOM.paletteGrid.style.display = 'grid';
    DOM.paletteActions.style.display = 'block';
    DOM.exportActions.style.display = 'block';

    // Switch to palette
    document.querySelector('.nav-link[href="#palette"]')?.click();
  }

  function renderPalette() {
    DOM.paletteGrid.innerHTML = extractedColors.map(c => `
      <div class="palette-swatch glass">
        <div class="palette-color" style="background:${c.hex}" title="Click to copy hex">
          <span class="copy-hint">Click to copy</span>
        </div>
        <div class="palette-info">
          <div class="palette-hex" data-hex="${c.hex}">${c.hex}</div>
          <div class="palette-rgb">${c.rgb}</div>
          <div class="palette-hsl">${c.hsl}</div>
        </div>
      </div>
    `).join('');

    // Click to copy hex
    DOM.paletteGrid.querySelectorAll('.palette-color').forEach(el => {
      el.addEventListener('click', () => {
        const swatch = el.closest('.palette-swatch');
        const hex = swatch.querySelector('.palette-hex').dataset.hex;
        navigator.clipboard.writeText(hex).then(() => {
          const hint = el.querySelector('.copy-hint');
          hint.textContent = 'Copied!';
          setTimeout(() => hint.textContent = 'Click to copy', 1200);
        });
      });
    });
  }

  function generateExports(colors) {
    const css = ':root {\n' + colors.map((c,i) => `  --color-${i+1}: ${c.hex};`).join('\n') + '\n}';
    const tw = 'module.exports = {\n  theme: {\n    extend: {\n      colors: {\n' + colors.map((c,i) => `        '${i+1}': '${c.hex}',`).join('\n') + '\n      }\n    }\n  }\n}';
    const json = JSON.stringify(colors.map(c => ({ hex: c.hex, rgb: c.rgb, hsl: c.hsl })), null, 2);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + (colors.length * 60) + ' 60">\n' + colors.map((c,i) => `  <rect x="${i*60}" width="60" height="60" fill="${c.hex}" rx="0"/>`).join('\n') + '\n</svg>';
    const txt = '— AEL Color Extractor Palette —\n' + colors.map(c => `${c.hex}  ${c.rgb}  ${c.hsl}`).join('\n');
    return { css, tailwind: tw, json, svg, txt };
  }

  function updateExports() {
    if (!extractedColors.length) return;
    const exports = generateExports(extractedColors);
    document.getElementById('exportCodeCss').textContent = exports.css;
    document.getElementById('exportCodeTailwind').textContent = exports.tailwind;
    document.getElementById('exportCodeJson').textContent = exports.json;
    document.getElementById('exportCodeSvg').textContent = exports.svg;
    document.getElementById('exportCodeTxt').textContent = exports.txt;
  }

  function init() {
    cacheDOM();
    initNavigation();

    // File upload
    DOM.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) handleImageUpload(e.target.files[0]);
    });

    DOM.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault(); DOM.uploadArea.classList.add('dragover');
    });
    DOM.uploadArea.addEventListener('dragleave', () => {
      DOM.uploadArea.classList.remove('dragover');
    });
    DOM.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault(); DOM.uploadArea.classList.remove('dragover');
      if (e.dataTransfer.files.length) handleImageUpload(e.dataTransfer.files[0]);
    });

    DOM.changeImage.addEventListener('click', () => {
      DOM.fileInput.click();
    });

    // Sliders
    DOM.colorCount.addEventListener('input', () => {
      DOM.colorCountLabel.textContent = DOM.colorCount.value;
    });
    DOM.quality.addEventListener('input', () => {
      const labels = ['Fastest','Fast','Medium','Accurate','Most Accurate'];
      DOM.qualityLabel.textContent = labels[parseInt(DOM.quality.value) - 1] || 'Medium';
    });

    DOM.extractBtn.addEventListener('click', extractAndShow);

    // Export tabs
    const exportTabs = document.querySelectorAll('.export-tab');
    const exportPanels = document.querySelectorAll('.export-panel');
    exportTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        exportTabs.forEach(t => t.classList.remove('active'));
        exportPanels.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('export-' + tab.dataset.format)?.classList.add('active');
      });
    });

    // Copy buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const format = btn.dataset.format;
        const codeEl = document.getElementById('exportCode' + format.charAt(0).toUpperCase() + format.slice(1));
        if (!codeEl) return;
        navigator.clipboard.writeText(codeEl.textContent).then(() => {
          btn.textContent = 'Copied!';
          btn.classList.add('copied');
          setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1800);
        });
      });
    });

    // Download
    DOM.downloadBtn.addEventListener('click', () => {
      if (!extractedColors.length) return;
      const exports = generateExports(extractedColors);
      const blob = new Blob([exports.json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ael-palette-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    // Export btn → navigate
    DOM.exportBtn.addEventListener('click', () => {
      document.querySelector('.nav-link[href="#export"]')?.click();
    });

    // Cursor
    document.addEventListener('mousemove', e => {
      if (DOM.cursorGlow) { DOM.cursorGlow.style.opacity = '1'; DOM.cursorGlow.style.left = e.clientX + 'px'; DOM.cursorGlow.style.top = e.clientY + 'px'; }
    });
    document.addEventListener('mouseleave', () => { if (DOM.cursorGlow) DOM.cursorGlow.style.opacity = '0'; });

    // Mobile
    DOM.navToggle.addEventListener('click', () => DOM.navLinks?.classList.toggle('open'));

    // Scroll
    window.addEventListener('scroll', () => DOM.navbar?.classList.toggle('scrolled', window.scrollY > 50));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
