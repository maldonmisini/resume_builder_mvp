const PAGE_H = 1123;
const PAGE_W = 794;

let currentTemplate = 'blank';
let isDraggingFromSidebar = false;
let activeFont = 'Poppins';
let lastFocusedEditable = null;
let savedSelectionRange = null;
let _draggedType = null;

let sessionAssets = {
  photo: 'images/profile.png',
  cert: 'images/certificate.avif',
  signature: 'images/signature.png',
  link: 'www.example.com'
};

const sigFileInput = document.createElement('input');
sigFileInput.type = 'file';
sigFileInput.accept = 'image/*';
sigFileInput.style.display = 'none';
document.body.appendChild(sigFileInput);

function uid() {
  return 'b' + Math.random().toString(36).substr(2, 9);
}
function getContainer() {
  return document.getElementById('pages-container');
}

// ─── SESSION ─────────────────────────────────────────────────
function saveSession() {
  try {
    const c = getContainer(); if (!c) return;
    const blocks = [];
    c.querySelectorAll('.resume-block').forEach(b => blocks.push({
      type: b.getAttribute('data-block-type'),
      html: b.querySelector('.block-content').innerHTML
    }));
    sessionStorage.setItem('resume_blocks', JSON.stringify(blocks));
    sessionStorage.setItem('resume_template', currentTemplate);
    sessionStorage.setItem('resume_assets', JSON.stringify(sessionAssets));
  } catch (e) { }
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem('resume_blocks');
    const tpl = sessionStorage.getItem('resume_template');
    const assets = sessionStorage.getItem('resume_assets');
    if (assets) sessionAssets = { ...sessionAssets, ...JSON.parse(assets) };
    if (tpl) currentTemplate = tpl;
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.length > 0) {
        paginateInPlace(saved.map(b => createBlock(b.type, b.html)));
        applyTemplateClass(currentTemplate);
        highlightTemplate();
        return true;
      }
    }
  } catch (e) { }
  return false;
}

// ─── PROJECTS ────────────────────────────────────────────────
function saveProject(nameRaw) {
  try {
    const name = (nameRaw || 'Untitled Resume').trim();
    const projects = JSON.parse(sessionStorage.getItem('resume_projects') || '[]');
    const c = getContainer();
    const blocks = [];
    c.querySelectorAll('.resume-block').forEach(b => blocks.push({
      type: b.getAttribute('data-block-type'),
      html: b.querySelector('.block-content').innerHTML
    }));
    const project = { name, timestamp: new Date().toLocaleString(), template: currentTemplate, assets: { ...sessionAssets }, blocks };
    const idx = projects.findIndex(p => p.name === name);
    if (idx >= 0) projects[idx] = project; else projects.push(project);
    sessionStorage.setItem('resume_projects', JSON.stringify(projects));
  } catch (e) { console.warn('saveProject:', e); }
}

function loadProjectsList() {
  const list = document.getElementById('projects-list');
  if (!list) return;
  const projects = JSON.parse(sessionStorage.getItem('resume_projects') || '[]');
  if (!projects.length) {
    list.innerHTML = `<p style="color:white;text-align:center;padding:24px 0;opacity:0.6;font-size:13px;">No saved projects yet.<br>Download a resume to save it here.</p>`;
    return;
  }
  list.innerHTML = '';
  projects.forEach((proj, i) => {
    const card = document.createElement('div');
    card.className = 'project-card';
    const bg = proj.template === 'pink' ? 'linear-gradient(135deg,#ff9fb9,#ff6b9d)'
      : proj.template === 'dark' ? 'linear-gradient(135deg,#1e293b,#334155)'
        : proj.template === 'mint' ? 'linear-gradient(135deg,#6ee7b7,#34d399)'
          : '#e2e8f0';
    card.innerHTML = `
      <div class="project-preview-mini" style="background:${bg}">
        <img class="profile-mini" src="${proj.assets?.photo || 'images/profile.png'}" alt="" onerror="this.src='images/profile.png'">
        <div style="position:absolute;bottom:8px;left:8px;color:white;font-size:10px;font-weight:700;text-shadow:0 1px 3px #000">${proj.name}</div>
      </div>
      <div class="project-info"><h4>${proj.name}</h4><small>${proj.timestamp}</small></div>`;
    card.addEventListener('click', () => loadProject(i));
    list.appendChild(card);
  });
}

function loadProject(i) {
  const projects = JSON.parse(sessionStorage.getItem('resume_projects') || '[]');
  const proj = projects[i]; if (!proj) return;
  currentTemplate = proj.template || 'blank';
  sessionAssets = { ...sessionAssets, ...(proj.assets || {}) };
  paginateInPlace((proj.blocks || []).map(b => createBlock(b.type, b.html)));
  applyTemplateClass(currentTemplate);
  highlightTemplate();
  saveSession();
}

// ─── TEMPLATE ────────────────────────────────────────────────
function applyTemplateClass(name) {
  document.querySelectorAll('.preview-a4').forEach(p => {
    p.classList.remove('pink-modern', 'dark-professional', 'mint-fresh');
    if (name === 'pink') p.classList.add('pink-modern');
    if (name === 'dark') p.classList.add('dark-professional');
    if (name === 'mint') p.classList.add('mint-fresh');
  });
}

function highlightTemplate() {
  document.querySelectorAll('.template-mini-card').forEach(c =>
    c.classList.toggle('selected', c.getAttribute('data-template') === currentTemplate));
}

// ─── BLANK CANVAS ────────────────────────────────────────────
function renderBlankCanvas() {
  const c = getContainer(); if (!c) return;
  c.innerHTML = '';
  currentTemplate = 'blank';
  highlightTemplate();
  const page = makePage();
  page.innerHTML = `<div class="canvas-empty-state" id="canvas-empty">
    <div class="canvas-empty-icon"><i class="fas fa-file-alt"></i></div>
    <h3>Your canvas is empty</h3>
    <p>Pick a <strong>Template</strong> or go to <strong>Text Design</strong> to add sections.</p>
  </div>`;
  c.appendChild(page);
  saveSession();
}

// ─── PAGE FACTORY ────────────────────────────────────────────
function makePage() {
  const p = document.createElement('div');
  p.className = 'preview-a4';
  if (currentTemplate === 'pink') p.classList.add('pink-modern');
  if (currentTemplate === 'dark') p.classList.add('dark-professional');
  if (currentTemplate === 'mint') p.classList.add('mint-fresh');
  return p;
}

// ─── IN-PLACE PAGINATOR ──────────────────────────────────────
// Strategy: place blocks one-by-one into real pages already in the DOM.
// After adding each block, check if the page overflows (scrollHeight > PAGE_H).
// If it does, remove that block from the current page and start a new page.
// This is 100% accurate because layout happens in real CSS context.
function paginateInPlace(domBlocks) {
  const container = getContainer();
  if (!container) return;

  // Remove old pages
  container.innerHTML = '';
  if (!domBlocks.length) { renderBlankCanvas(); return; }

  // We need pages to be overflow:visible during measurement so scrollHeight works correctly
  // But we also need them visually overflow:hidden — so we measure then clip.
  // Solution: set overflow:visible while building, then lock to overflow:hidden at the end.

  let page = makePage();
  page.style.overflow = 'visible';
  page.style.height = 'auto';
  container.appendChild(page);

  let pageNum = 1;

  domBlocks.forEach(block => {
    page.appendChild(block);

    // scrollHeight is the full content height (ignoring clip)
    const contentH = page.scrollHeight;

    if (contentH > PAGE_H) {
      // This block caused overflow — move it to a new page
      page.removeChild(block);

      // Lock this page
      lockPage(page, pageNum);

      page = makePage();
      page.style.overflow = 'visible';
      page.style.height = 'auto';
      container.appendChild(page);
      pageNum++;

      page.appendChild(block);
    }
  });

  // Lock last page
  lockPage(page, pageNum);

  initAllBlocks();
  saveSession();
}

function lockPage(page, num) {
  page.style.overflow = '';
  page.style.height = '';
  if (num > 1) {
    const lbl = document.createElement('div');
    lbl.className = 'page-num-label';
    lbl.textContent = `Page ${num}`;
    page.appendChild(lbl);
  }
}

// ─── REPAGINATE ───────────────────────────────────────────────
let _rpTimer = null;
function repaginate() {
  clearTimeout(_rpTimer);
  _rpTimer = setTimeout(() => {
    const c = getContainer(); if (!c) return;
    const blocks = Array.from(c.querySelectorAll('.resume-block'));
    if (!blocks.length) { renderBlankCanvas(); return; }
    paginateInPlace(blocks);
  }, 150);
}

// ─── BLOCK FACTORY ───────────────────────────────────────────
function createBlock(type, contentHTML) {
  const id = uid();
  const block = document.createElement('div');
  block.className = 'resume-block';
  block.setAttribute('data-block-id', id);
  block.setAttribute('data-block-type', type);

  const content = document.createElement('div');
  content.className = 'block-content';
  content.innerHTML = contentHTML;
  block.appendChild(content);

  const controls = document.createElement('div');
  controls.className = 'block-controls';
  controls.innerHTML = `<button class="block-delete-btn" title="Delete"><i class="fas fa-trash-alt"></i></button>`;
  controls.querySelector('.block-delete-btn').addEventListener('click', e => {
    e.stopPropagation();
    block.remove();
    repaginate();
  });
  block.appendChild(controls);

  return block;
}

function reattachDeleteListeners() {
  document.querySelectorAll('.resume-block').forEach(block => {
    const btn = block.querySelector('.block-delete-btn');
    if (!btn) return;
    const fresh = btn.cloneNode(true);
    btn.replaceWith(fresh);
    fresh.addEventListener('click', e => { e.stopPropagation(); block.remove(); repaginate(); });
  });
}

// ─── INIT INTERACTIONS ───────────────────────────────────────
function initAllBlocks() {
  reattachDeleteListeners();

  document.querySelectorAll('[contenteditable="true"]').forEach(el => {
    if (el._rbInit) return;
    el._rbInit = true;
    el.addEventListener('focus', () => { lastFocusedEditable = el; });
    el.addEventListener('blur', () => repaginate());
  });

  const sig = document.getElementById('signature-click-area');
  if (sig && !sig._siginit) {
    sig._siginit = true;
    sig.addEventListener('click', () => sigFileInput.click());
  }
}

// ─── CHANGE TEMPLATE ─────────────────────────────────────────
function changeTemplate(name) {
  currentTemplate = name;
  highlightTemplate();
  const { photo, cert, signature, link } = sessionAssets;

  const defs = [
    {
      type: 'profile-header',
      html: `<div class="resume-header">
        <img id="preview-photo" class="profile-photo" src="${photo}" alt="Profile">
        <div class="header-info">
          <h1 contenteditable="true" class="editable" id="preview-name">Name Surname</h1>
          <p contenteditable="true" class="editable" id="preview-summary">Passionate full-stack developer with over eight years of experience building modern web applications.</p>
          <div class="header-personal-info">
            <p contenteditable="true" class="editable"><i class="fas fa-phone"></i> +383 123 456</p>
            <p contenteditable="true" class="editable"><i class="fas fa-envelope"></i> email@example.com</p>
            <p contenteditable="true" class="editable"><i class="fa-solid fa-location-dot"></i> City, Country</p>
          </div>
          <p contenteditable="true" class="editable" id="preview-link"><i class="fas fa-link"></i> ${link}</p>
        </div>
      </div>`
    },
    {
      type: 'certifications',
      html: `<h3>Certifications</h3>
        <div class="cert-and-signature-wrapper">
          <div id="preview-cert" class="certificate-card">
            <img src="${cert}" alt="Certificate">
            <div class="cert-content">
              <h4 contenteditable="true" class="editable">Full-Stack Development</h4>
              <p contenteditable="true" class="editable">Successfully completed intensive course.</p>
            </div>
          </div>
          <div class="signature-beside-cert">
            <h3 class="signature-label">Signature</h3>
            <div id="signature-click-area" class="signature-clickable">
              <img id="preview-signature" src="${signature}" alt="Signature">
              <div class="signature-overlay"><i class="fas fa-cloud-upload-alt"></i> Click to upload</div>
            </div>
          </div>
        </div>`
    },
    {
      type: 'experience',
      html: `<h3>Experience</h3>
        <div class="item">
          <h4 contenteditable="true" class="editable">Senior Developer – Tech Company</h4>
          <span class="date" contenteditable="true" class="editable">2021 – Present</span>
          <ul contenteditable="true" class="editable">
            <li>Built scalable web applications using React &amp; Node.js</li>
            <li>Improved performance by 35% through code optimization</li>
          </ul>
        </div>
        <div class="item">
          <h4 contenteditable="true" class="editable">Frontend Developer – Startup XYZ</h4>
          <span class="date" contenteditable="true" class="editable">2019 – 2021</span>
          <ul contenteditable="true" class="editable">
            <li>Developed responsive UI components</li>
            <li>Collaborated with UX designers</li>
          </ul>
        </div>`
    },
    {
      type: 'education',
      html: `<h3>Education</h3>
        <div class="item">
          <h4 contenteditable="true" class="editable">BSc Computer Science</h4>
          <span class="date" contenteditable="true" class="editable">University Kadri Zeka, 2015 – 2019</span>
        </div>`
    },
    {
      type: 'skills',
      html: `<h3>Skills</h3>
        <div class="skills-grid">
          <span contenteditable="true" class="editable-skill">JavaScript</span>
          <span contenteditable="true" class="editable-skill">React</span>
          <span contenteditable="true" class="editable-skill">Node.js</span>
          <span contenteditable="true" class="editable-skill">HTML &amp; CSS</span>
          <span contenteditable="true" class="editable-skill">Git</span>
          <span contenteditable="true" class="editable-skill">SQL</span>
        </div>`
    }
  ];

  paginateInPlace(defs.map(d => createBlock(d.type, d.html)));
}

// ─── INSERT ZONES ────────────────────────────────────────────
function mkZone() {
  const z = document.createElement('div');
  z.className = 'insert-zone';
  z.innerHTML = `<div class="iz-inner"><div class="iz-line"></div><div class="iz-badge"><i class="fas fa-plus"></i> Drop here</div><div class="iz-line"></div></div>`;
  z.addEventListener('dragover', e => {
    e.preventDefault(); e.stopPropagation();
    document.querySelectorAll('.insert-zone').forEach(x => x.classList.remove('iz-active'));
    z.classList.add('iz-active');
  });
  z.addEventListener('dragleave', e => { if (!z.contains(e.relatedTarget)) z.classList.remove('iz-active'); });
  z.addEventListener('drop', e => {
    e.preventDefault(); e.stopPropagation();
    z.classList.remove('iz-active');
    const type = e.dataTransfer.getData('text/plain') || _draggedType;
    if (type) dropBlock(type, z);
    endDrag();
  });
  return z;
}

function showZones() {
  clearZones();
  const c = getContainer(); if (!c) return;
  const empty = document.getElementById('canvas-empty');
  if (empty) empty.style.opacity = '0.3';
  c.querySelectorAll('.preview-a4').forEach(page => {
    const blocks = Array.from(page.querySelectorAll(':scope > .resume-block'));
    if (!blocks.length) { page.appendChild(mkZone()); return; }
    page.insertBefore(mkZone(), blocks[0]);
    blocks.forEach(b => b.insertAdjacentElement('afterend', mkZone()));
  });
}

function clearZones() {
  document.querySelectorAll('.insert-zone').forEach(z => z.remove());
  const empty = document.getElementById('canvas-empty');
  if (empty) empty.style.opacity = '';
}

// ─── DRAG ────────────────────────────────────────────────────
function onDragStart(event) {
  _draggedType = event.currentTarget.getAttribute('data-type');
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData('text/plain', _draggedType);
  isDraggingFromSidebar = true;
  event.currentTarget.classList.add('td-dragging');
  showZones();
}

function onDragEnd(event) {
  event.currentTarget.classList.remove('td-dragging');
  setTimeout(endDrag, 100);
}

function endDrag() {
  isDraggingFromSidebar = false;
  _draggedType = null;
  clearZones();
}

// ─── DROP BLOCK ──────────────────────────────────────────────
function dropBlock(type, zone) {
  const empty = document.getElementById('canvas-empty');
  if (empty) empty.remove();

  const tpls = {
    heading: `<h2 contenteditable="true" class="editable td-block-heading" style="font-family:${activeFont}">New Heading</h2>`,
    subheading: `<h3 contenteditable="true" class="editable td-block-subheading" style="font-family:${activeFont}">New Subheading</h3>`,
    body: `<p contenteditable="true" class="editable td-block-body" style="font-family:${activeFont}">Add your body text here...</p>`,
    divider: `<hr class="td-block-divider">`,
    'skills-row': `<h3>Skills</h3><div class="skills-grid"><span contenteditable="true" class="editable-skill">Skill 1</span><span contenteditable="true" class="editable-skill">Skill 2</span><span contenteditable="true" class="editable-skill">Skill 3</span></div>`,
    'experience-item': `<h3>Experience</h3><div class="item"><h4 contenteditable="true" class="editable">Job Title – Company</h4><span class="date" contenteditable="true" class="editable">Year – Year</span><ul contenteditable="true" class="editable"><li>Describe your responsibilities</li></ul></div>`,
    'education-item': `<h3>Education</h3><div class="item"><h4 contenteditable="true" class="editable">Degree – University</h4><span class="date" contenteditable="true" class="editable">Year – Year</span></div>`
  };

  const html = tpls[type]; if (!html) return;
  const newBlock = createBlock(type, html);
  const newBlockId = newBlock.getAttribute('data-block-id');

  // Insert temp block next to the zone, then collect ALL blocks in document order
  zone.insertAdjacentElement('afterend', newBlock);
  const allBlocks = Array.from(document.querySelectorAll('.resume-block'));
  getContainer().innerHTML = '';

  paginateInPlace(allBlocks);

  setTimeout(() => {
    const el = document.querySelector(`[data-block-id="${newBlockId}"] [contenteditable="true"]`);
    if (el) { el.focus(); lastFocusedEditable = el; }
  }, 80);
}

// ─── FONTS ───────────────────────────────────────────────────
function filterFonts(q) {
  document.querySelectorAll('.td-font-item').forEach(item =>
    item.style.display = item.getAttribute('data-font').toLowerCase().includes(q.toLowerCase()) ? '' : 'none');
}

function selectFont(name) {
  activeFont = name;
  document.querySelectorAll('.td-font-item').forEach(item =>
    item.classList.toggle('td-font-selected', item.getAttribute('data-font') === name));
  const sel = document.getElementById('td-font-select');
  if (sel) sel.value = name;
  if (lastFocusedEditable) { lastFocusedEditable.style.fontFamily = name; saveSession(); }
}

// ─── FORMATTING ──────────────────────────────────────────────
function applyFormatting(cmd, val) {
  if (lastFocusedEditable) lastFocusedEditable.focus();
  if (cmd === 'fontFamily') { selectFont(val); return; }
  if (cmd === 'fontSize') { if (lastFocusedEditable) { lastFocusedEditable.style.fontSize = val; saveSession(); } return; }
  if (cmd === 'foreColor') {
    // Restore the saved selection (mousedown saved it before blur fired)
    if (savedSelectionRange) {
      // Find the editable that owns this range
      const node = savedSelectionRange.commonAncestorContainer;
      const host = node.nodeType === 1 ? node : node.parentElement;
      const editable = host ? host.closest('[contenteditable="true"]') : null;
      if (editable) {
        editable.focus();
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedSelectionRange);
        document.execCommand('foreColor', false, val);
        saveSession();
        return;
      }
    }
    // Fallback: apply at cursor
    document.execCommand('foreColor', false, val);
    saveSession();
    return;
  }
  document.execCommand(cmd, false, null);
  saveSession();
}

// ─── UPLOAD ──────────────────────────────────────────────────
function applyChanges() {
  let pending = 0;
  const done = () => {
    if (pending > 0) return;
    const ph = document.getElementById('preview-photo'); if (ph) ph.src = sessionAssets.photo;
    const ci = document.querySelector('#preview-cert img'); if (ci) ci.src = sessionAssets.cert;
    const si = document.getElementById('preview-signature'); if (si) si.src = sessionAssets.signature;
    const li = document.getElementById('preview-link');
    if (li) li.innerHTML = `<i class="fas fa-link"></i> ${sessionAssets.link}`;
    saveSession();
  };

  const li = document.getElementById('link-input');
  if (li?.value.trim()) sessionAssets.link = li.value.trim();

  const pi = document.getElementById('image-upload');
  if (pi?.files?.[0]) {
    pending++;
    const r = new FileReader();
    r.onload = e => { sessionAssets.photo = e.target.result; pending--; done(); };
    r.readAsDataURL(pi.files[0]);
  }
  const ci = document.getElementById('cert-upload');
  if (ci?.files?.[0]) {
    pending++;
    const r = new FileReader(); r.onload = e => { sessionAssets.cert = e.target.result; pending--; done(); }; r.readAsDataURL(ci.files[0]);
  }
  done();
}

function showFileName(input, type) {
  if (!input.files?.[0]) return;
  const n = input.files[0].name;
  const st = document.querySelector(`#${type}-upload-section .file-status`);
  if (st) st.textContent = `Selected: ${n.length > 24 ? n.substring(0, 24) + '…' : n}`;
  const lb = document.querySelector(`#${type}-upload-section .upload-label`);
  if (lb) { lb.innerHTML = '<i class="fas fa-check-circle"></i> File Selected'; lb.style.borderColor = '#2ecc71'; }
}

sigFileInput.addEventListener('change', e => {
  const f = e.target.files?.[0]; if (!f) return;
  const r = new FileReader();
  r.onload = ev => {
    sessionAssets.signature = ev.target.result;
    const si = document.getElementById('preview-signature');
    if (si) si.src = sessionAssets.signature;
    saveSession();
  };
  r.readAsDataURL(f);
});

document.addEventListener('click', e => {
  if (e.target.closest('#signature-click-area')) sigFileInput.click();
});

// ─── EXPORT ──────────────────────────────────────────────────
function downloadPDF() {
  document.getElementById('format-modal').style.display = 'flex';
}

// Stitch canvases vertically with an optional gap between them
function stitchCanvases(canvases, gapPx, gapColor) {
  const W = canvases[0].width;
  const H = canvases.reduce((s, c) => s + c.height, 0) + gapPx * Math.max(0, canvases.length - 1);
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const ctx = out.getContext('2d');
  if (gapColor) { ctx.fillStyle = gapColor; ctx.fillRect(0, 0, W, H); }
  let y = 0;
  canvases.forEach((c, i) => {
    ctx.drawImage(c, 0, y);
    if (i < canvases.length - 1) y += c.height + gapPx;
  });
  return out;
}

async function exportResume(format) {
  document.getElementById('format-modal').style.display = 'none';

  const c = getContainer(); if (!c) return;
  const pages = Array.from(c.querySelectorAll('.preview-a4'));
  if (!pages.length) return;

  const resumeName = (document.getElementById('preview-name')?.textContent?.trim().replace(/\s+/g, '_') || 'Resume');

  // Hide UI chrome before capture
  document.querySelectorAll('.block-controls, .insert-zone, .page-num-label').forEach(el => el.style.visibility = 'hidden');
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  try {
    // Pre-convert all <img> srcs to base64 data URLs so html2canvas
    // never encounters cross-origin / file:// images (avoids SecurityError).
    const allImgs = Array.from(document.querySelectorAll('.preview-a4 img'));
    const originalSrcs = new Map();

    await Promise.all(allImgs.map(img => {
      const src = img.src;
      if (!src || src.startsWith('data:')) return Promise.resolve();
      return new Promise(resolve => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', src, true);
        xhr.responseType = 'blob';
        xhr.onload = () => {
          const reader = new FileReader();
          reader.onloadend = () => {
            originalSrcs.set(img, src);
            img.src = reader.result;
            // wait for the img element to repaint
            img.onload = resolve;
            img.onerror = resolve;
            if (img.complete) resolve();
          };
          reader.readAsDataURL(xhr.response);
        };
        xhr.onerror = () => {
          // XHR failed (e.g. file already data: or CORS) — draw canvas without it
          resolve();
        };
        xhr.send();
      });
    }));

    // Now capture — all images are data URLs, no taint possible
    const canvases = await Promise.all(pages.map(page => {
      const save = { r: page.style.borderRadius, s: page.style.boxShadow };
      page.style.borderRadius = '0';
      page.style.boxShadow = 'none';
      return html2canvas(page, {
        scale: 2,
        useCORS: false,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll('img').forEach(img => {
            if (!img.src.startsWith('data:')) {
              // Replace with a transparent 1x1 placeholder — avoids taint
              img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            }
          });
        }
      }).then(canvas => {
        page.style.borderRadius = save.r;
        page.style.boxShadow = save.s;
        return canvas;
      });
    }));

    // Restore original image srcs
    if (format === 'pdf') {
      // Get jsPDF — html2pdf.bundle exposes it at window.jspdf.jsPDF
      const jsPDFCtor = (window.jspdf && window.jspdf.jsPDF)
        || window.jsPDF
        || null;

      if (!jsPDFCtor) {
        alert('PDF library not loaded. Please check your internet connection and reload the page.');
        return;
      }

      // Create PDF, one page per captured canvas
      const doc = new jsPDFCtor({
        unit: 'px',
        format: [PAGE_W, PAGE_H],
        orientation: 'portrait',
        hotfixes: ['px_scaling']
      });

      canvases.forEach((canvas, i) => {
        if (i > 0) doc.addPage([PAGE_W, PAGE_H], 'portrait');
        doc.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, PAGE_W, PAGE_H);
      });

      doc.save(`Resume_${resumeName}.pdf`);

    } else {
      // Image formats — stitch pages with a grey gap between them
      const GAP = 80; // at scale:2 this is 40px visual gap
      const final = stitchCanvases(canvases, GAP, '#d1d5db');
      const mime = { jpg: 'image/jpeg', webp: 'image/webp', png: 'image/png' }[format] || 'image/png';
      const a = document.createElement('a');
      a.download = `Resume_${resumeName}.${format}`;
      a.href = final.toDataURL(mime, 0.95);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    // Auto-save to My Projects on every download
    saveProject(resumeName.replace(/_/g, ' '));

  } catch (err) {
    console.error('Export error:', err);
    alert('Download failed:\n' + err.message);
  } finally {
    document.querySelectorAll('.block-controls, .page-num-label').forEach(el => el.style.visibility = '');
  }
}

// ─── HELPERS ─────────────────────────────────────────────────
function animateUpdate() {
  const c = getContainer(); if (!c) return;
  c.style.opacity = '0.75';
  requestAnimationFrame(() => { c.style.transition = 'opacity 0.2s'; c.style.opacity = '1'; });
  setTimeout(() => { c.style.transition = ''; }, 250);
}

// ─── INIT ────────────────────────────────────────────────────
// Save selection continuously while user is selecting text in editables
document.addEventListener('selectionchange', () => {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const node = range.commonAncestorContainer;
  const el = node.nodeType === 1 ? node : node.parentElement;
  if (el && el.closest('[contenteditable="true"]')) {
    savedSelectionRange = range.cloneRange();
  }
});

// When any sidebar formatting control is mousedown'd, save selection FIRST
// (mousedown fires before blur — this is the critical timing)
document.addEventListener('mousedown', (e) => {
  const ctrl = e.target.closest('.td-fmt-btn, .td-select, .td-size-input, .td-color-input, .td-color-trigger, .td-font-item');
  if (!ctrl) return;
  // Save the current selection before focus shifts away
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    const node = range.commonAncestorContainer;
    const host = node.nodeType === 1 ? node : node.parentElement;
    if (host && host.closest('[contenteditable="true"]')) {
      savedSelectionRange = range.cloneRange();
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('projects-list')) loadProjectsList();
  if (!loadSession()) renderBlankCanvas();

  const c = getContainer();
  if (c) {
    c.addEventListener('dragover', e => { if (isDraggingFromSidebar) e.preventDefault(); });
    c.addEventListener('drop', e => {
      if (!isDraggingFromSidebar) return;
      e.preventDefault();
      const type = e.dataTransfer.getData('text/plain') || _draggedType;
      if (type) {
        const zones = document.querySelectorAll('.insert-zone');
        if (zones.length) dropBlock(type, zones[zones.length - 1]);
      }
      endDrag();
    });
  }
});
