'use strict';

/* ─────────────────────────────────────────
   Runtime asset lists — filled by scanFolders()
   Falls back to BS_DATA from gamedata.js
───────────────────────────────────────── */
let TEXTURES = [];
let SOUNDS   = [];
let MESHES   = [];   // always from gamedata.js (no folder scan needed for .bob)

/* ─────────────────────────────────────────
   Scan Textures/ and Sounds/ folders via
   a directory listing fetch trick.
   GitHub Pages doesn't support directory listing,
   so we try to GET the index and parse <a href>
   links, then fall back to BS_DATA.
───────────────────────────────────────── */
async function scanFolders() {
  showLoader(true);
  try {
    [TEXTURES, SOUNDS] = await Promise.all([
      scanFolder('Textures', ['.png', '.jpg']),
      scanFolder('Sounds',   ['.ogg', '.wav']),
    ]);
  } catch(e) {
    console.warn('Folder scan failed, using gamedata.js fallback:', e);
  }

  // Fallback to gamedata if scan returned nothing
  if (!TEXTURES.length) TEXTURES = BS_DATA.textures || [];
  if (!SOUNDS.length)   SOUNDS   = BS_DATA.sounds   || [];
  MESHES = BS_DATA.meshes || [];

  console.log(`Assets ready — Textures: ${TEXTURES.length}, Sounds: ${SOUNDS.length}, Meshes: ${MESHES.length}`);
  showLoader(false);
  initApp();
}

async function scanFolder(folderName, exts) {
  // Try fetching the folder listing page
  let html = '';
  try {
    const res = await fetch(`${folderName}/`, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch(e) {
    return [];
  }

  // Parse all <a href="filename.ext"> links
  const parser = new DOMParser();
  const doc    = parser.parseFromString(html, 'text/html');
  const links  = [...doc.querySelectorAll('a[href]')];
  const names  = [];

  for (const a of links) {
    const href = a.getAttribute('href');
    const lower = href.toLowerCase();
    for (const ext of exts) {
      if (lower.endsWith(ext)) {
        // Strip path prefix if any, then strip extension
        const base = href.split('/').pop();
        names.push(base.slice(0, base.lastIndexOf('.')));
        break;
      }
    }
  }

  return names.sort((a, b) => a.localeCompare(b));
}

function showLoader(show) {
  let el = document.getElementById('assetLoader');
  if (!el) return;
  el.style.display = show ? 'flex' : 'none';
}

/* ─────────────────────────────────────────
   State
───────────────────────────────────────── */
const TOTAL_STEPS = 7;
let currentStep   = 0;
let modalTarget   = null;
let modalMode     = 'texture';
let selectedStyle = '';
let selectedPos   = '';
let generatedCode = '';

/* ─────────────────────────────────────────
   Boot
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  scanFolders();
});

function initApp() {
  buildStyleGrid();
  buildStepTrail();
  bindAllPills();
  updateTrail();
}

/* ─────────────────────────────────────────
   Step Trail
───────────────────────────────────────── */
function buildStepTrail() {
  const trail = document.getElementById('stepTrail');
  trail.innerHTML = '';
  const labels = ['Identity','Head','Body','Arms','Legs','Extra','Sounds'];
  labels.forEach((lbl, i) => {
    const dot = document.createElement('div');
    dot.className = 'trail-dot';
    dot.id = `trail-${i}`;
    dot.title = lbl;
    trail.appendChild(dot);
  });
}
function updateTrail() {
  for (let i = 0; i < TOTAL_STEPS; i++) {
    const dot = document.getElementById(`trail-${i}`);
    if (!dot) continue;
    dot.className = 'trail-dot';
    if (i < currentStep)      dot.classList.add('done');
    else if (i === currentStep) dot.classList.add('active');
  }
}

/* ─────────────────────────────────────────
   Navigation
───────────────────────────────────────── */
function goNext(step) {
  if (!validateStep(step)) return;
  showStep(step + 1);
}
function goPrev(step) { showStep(step - 1); }

function showStep(n) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  const id = n >= TOTAL_STEPS ? 'step-extract' : `step-${n}`;
  document.getElementById(id).classList.add('active');
  currentStep = n;
  updateTrail();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ─────────────────────────────────────────
   Validation
───────────────────────────────────────── */
function validateStep(step) {
  if (step === 0) {
    if (!v('charName').trim())     { flash('charName',     'Enter a display name');  return false; }
    if (!v('charCodeName').trim()) { flash('charCodeName', 'Enter a code name');     return false; }
  }
  return true;
}
function flash(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.style.borderColor = 'var(--danger)'; el.focus(); setTimeout(() => el.style.borderColor = '', 1800); }
  showToast(msg);
}
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    Object.assign(t.style, {
      position:'fixed', bottom:'28px', left:'50%', transform:'translateX(-50%)',
      background:'var(--danger)', color:'#fff', padding:'10px 22px',
      borderRadius:'8px', fontWeight:'600', fontSize:'14px', zIndex:'999',
      transition:'opacity .3s', opacity:'0', pointerEvents:'none'
    });
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  setTimeout(() => { t.style.opacity = '0'; }, 2200);
}

/* ─────────────────────────────────────────
   Style Grid
───────────────────────────────────────── */
const STYLE_EMOJI = {
  spaz:'🧡', female:'👱‍♀️', ninja:'🥷', kronk:'💪', mel:'👨‍🍳',
  agent:'🕵️', ali:'🥊', bear:'🐻', bones:'💀', bunny:'🐰',
  cyborg:'🤖', frosty:'⛄', penguin:'🐧', pirate:'🏴‍☠️', pixie:'🧚', santa:'🎅'
};
function buildStyleGrid() {
  const grid = document.getElementById('styleGrid');
  if (!grid) return;
  grid.innerHTML = '';
  BS_DATA.styles.forEach(style => {
    const card = document.createElement('div');
    card.className = 'style-card';
    card.dataset.style = style;
    card.innerHTML = `<span class="style-icon">${STYLE_EMOJI[style]||'👤'}</span>
                      <span class="style-name">${style}</span>`;
    card.onclick = () => {
      document.querySelectorAll('.style-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedStyle = style;
    };
    grid.appendChild(card);
  });
}

/* ─────────────────────────────────────────
   Toggle sections
───────────────────────────────────────── */
function toggleSection(name, enabled) {
  const fields = document.getElementById(`${name}-fields`);
  if (fields) fields.classList.toggle('hidden', !enabled);
}

/* ─────────────────────────────────────────
   Position picker
───────────────────────────────────────── */
function selectPos(btn) {
  document.querySelectorAll('.pos-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedPos = btn.dataset.pos;
  document.getElementById('extraPos').value = selectedPos;
}

/* ─────────────────────────────────────────
   Bind pills
───────────────────────────────────────── */
function bindAllPills() {
  document.querySelectorAll('.select-pill[data-target]').forEach(pill => {
    pill.addEventListener('click', () => {
      const target = pill.dataset.target;
      const t = target.toLowerCase();
      const mode = t.includes('snd') ? 'sound' : t.includes('mesh') ? 'mesh' : 'texture';
      openModal(target, mode);
    });
  });
}

/* ─────────────────────────────────────────
   Modal
───────────────────────────────────────── */
function openModal(targetId, mode) {
  modalTarget = targetId;
  modalMode   = mode;

  const overlay = document.getElementById('modalOverlay');
  const grid    = document.getElementById('modalGrid');
  const title   = document.getElementById('modalTitle');
  const search  = document.getElementById('modalSearch');

  title.textContent = mode === 'sound' ? 'Select Sound' : mode === 'mesh' ? 'Select Mesh' : 'Select Texture';
  search.value = '';
  grid.innerHTML = '<div class="modal-loading">Loading…</div>';
  overlay.classList.remove('hidden');

  // Render items async so overlay shows immediately
  setTimeout(() => {
    grid.innerHTML = '';
    const list    = mode === 'sound' ? SOUNDS : mode === 'mesh' ? MESHES : TEXTURES;
    const current = document.getElementById(targetId)?.value || '';

    if (!list.length) {
      grid.innerHTML = `<div class="modal-empty">No ${mode}s found in ${mode==='sound'?'Sounds/':mode==='mesh'?'gamedata.js':'Textures/'}</div>`;
      search.focus();
      return;
    }

    // Use DocumentFragment for performance
    const frag = document.createDocumentFragment();
    list.forEach(name => {
      const item = document.createElement('div');
      item.className = 'modal-item' + (mode === 'sound' ? ' sound-item' : '');
      if (name === current) item.classList.add('selected');
      item.dataset.name = name.toLowerCase();
      item.dataset.display = name;

      if (mode === 'sound') {
        item.innerHTML = `<span class="item-name">${name}</span>
          <button class="play-btn" title="Preview" onclick="playSound('${name}',event)">▶</button>`;
      } else {
        item.innerHTML = `<img src="${mode==='texture'?'Textures':'Meshes'}/${name}.png"
                               alt="${name}"
                               loading="lazy"
                               onerror="this.parentElement.classList.add('no-img')" />
                          <span class="item-name">${name}</span>`;
      }

      item.addEventListener('click', e => {
        if (e.target.classList.contains('play-btn')) return;
        selectModalItem(item, name);
      });
      frag.appendChild(item);
    });
    grid.appendChild(frag);
    search.focus();
  }, 0);
}

function selectModalItem(item, name) {
  document.querySelectorAll('#modalGrid .modal-item').forEach(i => i.classList.remove('selected'));
  item.classList.add('selected');

  const hidden = document.getElementById(modalTarget);
  if (hidden) hidden.value = name;

  const valSpan = document.getElementById(`${modalTarget}Val`);
  if (valSpan) valSpan.textContent = name;

  const pill = document.querySelector(`.select-pill[data-target="${modalTarget}"]`);
  if (pill) pill.classList.add('filled');

  setTimeout(() => document.getElementById('modalOverlay').classList.add('hidden'), 160);
}

function clearSelection() {
  if (!modalTarget) return;
  const hidden = document.getElementById(modalTarget);
  if (hidden) hidden.value = '';
  const valSpan = document.getElementById(`${modalTarget}Val`);
  if (valSpan) valSpan.textContent = 'Select';
  const pill = document.querySelector(`.select-pill[data-target="${modalTarget}"]`);
  if (pill) pill.classList.remove('filled');
  document.querySelectorAll('#modalGrid .modal-item').forEach(i => i.classList.remove('selected'));
  document.getElementById('modalOverlay').classList.add('hidden');
}

function closeModal(e) {
  if (e.target === document.getElementById('modalOverlay'))
    document.getElementById('modalOverlay').classList.add('hidden');
}

function filterModal(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('#modalGrid .modal-item').forEach(item => {
    item.style.display = item.dataset.name.includes(q) ? '' : 'none';
  });
}

/* ─────────────────────────────────────────
   Sound Preview
───────────────────────────────────────── */
let currentAudio = null;
function playSound(name, e) {
  e.stopPropagation();
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  const audio = new Audio(`Sounds/${name}.ogg`);
  currentAudio = audio;
  audio.play().catch(() => {});
}

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
function v(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function soundList(...ids) { return ids.map(id => v(id)).filter(s => s.trim()); }
function fallback(arr, def) { return arr.length ? arr : def; }

/* ─────────────────────────────────────────
   Extract
───────────────────────────────────────── */
function startExtract() {
  showStep(99);
  const msgs = ['Reading meshes…','Compiling textures…','Loading sounds…',
                'Wiring materials…','Registering appearance…','Writing Python…','Done! 💥'];
  const bar = document.getElementById('progressBar');
  const sub = document.getElementById('extractSub');
  let i = 0;
  const iv = setInterval(() => {
    i++;
    bar.style.width = `${(i / msgs.length) * 100}%`;
    sub.textContent = msgs[i - 1] || '';
    if (i >= msgs.length) {
      clearInterval(iv);
      generatedCode = generatePython();
      document.getElementById('downloadBtn').classList.remove('hidden');
      sub.textContent = '✅ Character ready!';
    }
  }, 320);
}

function downloadFile() {
  const name = v('charName').trim().replace(/\s+/g, '_') || 'MyCharacter';
  const blob = new Blob([generatedCode], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `char_${name}.py`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─────────────────────────────────────────
   Python Generator
───────────────────────────────────────── */
function generatePython() {
  const charName  = v('charName').trim();
  const codeName  = v('charCodeName').trim();
  const style     = selectedStyle || 'spaz';

  // Icon
  const iconTex   = v('iconTexture')   || `${codeName}Icon`;
  const iconMask  = v('iconMask')      || `${codeName}IconColorMask`;

  // Color — ONE pair for the whole character
  const colorTex  = v('colorTex')   || `${codeName}Color`;
  const colorMask = v('colorMask')  || `${codeName}ColorMask`;

  // Meshes
  const headEnabled  = document.getElementById('headEnabled')?.checked;
  const bodyEnabled  = document.getElementById('bodyEnabled')?.checked;

  const headMesh    = headEnabled  ? (v('headMesh')    || `${codeName}Head`)    : '';
  const torsoMesh   = bodyEnabled  ? (v('torsoMesh')   || `${codeName}Torso`)   : '';
  const pelvisMesh  = bodyEnabled  ? (v('pelvisMesh')  || `${codeName}Pelvis`)  : '';
  const upperArm    = v('upperArmMesh')  || `${codeName}UpperArm`;
  const forearm     = v('forearmMesh')   || `${codeName}ForeArm`;
  const handMesh    = v('leftHandMesh')  || `${codeName}Hand`;
  const upperLeg    = v('upperLegMesh')  || `${codeName}UpperLeg`;
  const lowerLeg    = v('lowerLegMesh')  || `${codeName}LowerLeg`;
  const toesMesh    = v('toesMesh')      || `${codeName}Toes`;

  // Sounds
  const finalJump   = fallback(soundList('jumpSnd0','jumpSnd1','jumpSnd2','jumpSnd3'),
                               ['spazJump01','spazJump02','spazJump03','spazJump04']);
  const finalAtk    = fallback(soundList('attackSnd0','attackSnd1','attackSnd2','attackSnd3'),
                               ['spazAttack01','spazAttack02','spazAttack03','spazAttack04']);
  const finalHit    = fallback(soundList('hitSnd0','hitSnd1','hitSnd2','hitSnd3'),
                               ['spazImpact01','spazImpact02','spazImpact03','spazImpact04']);
  const finalPickup = fallback(soundList('pickupSnd0','pickupSnd1'), ['spazPickup01']);
  const finalFall   = fallback(soundList('fallSnd0'),  ['spazFall01']);
  const finalDeath  = fallback(soundList('deathSnd0','deathSnd1'), ['spazDeath01']);

  const pyList = arr => arr.length === 0 ? '[]'
    : '[\n        ' + arr.map(s => `'${s}'`).join(', ') + '\n    ]';

  // Extra attachment — real Python code inside the Plugin
  let extraImport = '';
  let extraBlock  = '';
  const extraEnabled = document.getElementById('extraEnabled')?.checked;
  if (extraEnabled && v('extraMesh')) {
    const posMap = {
      right_shoulder: '(0.15, 0.3, 0.0)',
      left_shoulder:  '(-0.15, 0.3, 0.0)',
      back:           '(0.0, 0.2, -0.3)',
      front:          '(0.0, 0.2, 0.3)',
      head_top:       '(0.0, 0.8, 0.0)'
    };
    const pos     = posMap[selectedPos] || '(0.0, 0.5, 0.0)';
    const mesh    = v('extraMesh');
    const tex     = v('extraTex') || 'white';
    extraImport   = `import bascenev1 as bs`;
    extraBlock    = `

    def _attach_extra(spaz_node: bs.Node) -> None:
        """Attach the extra mesh to the character node."""
        extra = bs.newnode(
            'prop',
            attrs={
                'mesh': bs.getmesh('${mesh}'),
                'color_texture': bs.gettexture('${tex}'),
                'body': 'empty',
                'shadow_size': 0.0,
                'is_area_of_interest': False,
            },
        )
        spaz_node.connectattr('position', extra, 'position')
        return extra`;
  }

  const now = new Date().toISOString().split('T')[0];
  const pascal = charName.replace(/(?:^|\s)(\w)/g, (_, c) => c.toUpperCase()).replace(/\s+/g, '');

  const extraImportLine = extraImport ? `\n${extraImport}` : '';

  return `# -*- coding: utf-8 -*-
# ba_meta require api 9
#
# Character : ${charName}
# Code name : ${codeName}
# Style     : ${style}
# Generated : ${now}  —  BombSquad Character Maker
#
# INSTALL:
#   Copy this file into your BombSquad mods folder, then restart.
#   The character '${charName}' will appear in the character chooser.
#
# Tested with Ballistica API 9 (BombSquad 1.7.37+)

from __future__ import annotations
import babase${extraImportLine}
from bascenev1lib.actor.spazappearance import Appearance
${extraBlock}

def _register() -> None:
    t = Appearance('${charName}')

    # ── Icon ──────────────────────────────────────────────────────────────────
    t.icon_texture      = '${iconTex}'
    t.icon_mask_texture = '${iconMask}'

    # ── Color / Mask  (one pair — applied to the whole body) ──────────────────
    t.color_texture      = '${colorTex}'
    t.color_mask_texture = '${colorMask}'

    # ── Meshes ────────────────────────────────────────────────────────────────
    t.head_mesh      = '${headMesh}'
    t.torso_mesh     = '${torsoMesh}'
    t.pelvis_mesh    = '${pelvisMesh}'
    t.upper_arm_mesh = '${upperArm}'
    t.forearm_mesh   = '${forearm}'
    t.hand_mesh      = '${handMesh}'
    t.upper_leg_mesh = '${upperLeg}'
    t.lower_leg_mesh = '${lowerLeg}'
    t.toes_mesh      = '${toesMesh}'

    # ── Sounds ────────────────────────────────────────────────────────────────
    t.jump_sounds   = ${pyList(finalJump)}
    t.attack_sounds = ${pyList(finalAtk)}
    t.impact_sounds = ${pyList(finalHit)}
    t.pickup_sounds = ${pyList(finalPickup)}
    t.fall_sounds   = ${pyList(finalFall)}
    t.death_sounds  = ${pyList(finalDeath)}

    # ── Style ─────────────────────────────────────────────────────────────────
    t.style = '${style}'


# ba_meta export babase.Plugin
class ${pascal}Plugin(babase.Plugin):
    """Registers '${charName}' on startup."""

    def on_app_running(self) -> None:
        try:
            _register()
            print('[CharMaker] ✅ ${charName} registered.')
        except RuntimeError as exc:
            if 'already exists' not in str(exc):
                raise
`;
}
   
