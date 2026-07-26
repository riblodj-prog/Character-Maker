'use strict';

/* ─────────────────────────────────────────
   State
───────────────────────────────────────── */
const TOTAL_STEPS = 7; // 0-6 + extract
let currentStep = 0;
let modalTarget  = null;
let modalMode    = 'texture'; // 'texture' | 'mesh' | 'sound'
let selectedStyle = '';
let selectedPos   = '';
let generatedCode = '';

/* ─────────────────────────────────────────
   Init
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  buildStyleGrid();
  buildStepTrail();
  bindAllPills();
  updateTrail();
});

/* ─────────────────────────────────────────
   Step Trail
───────────────────────────────────────── */
function buildStepTrail() {
  const trail = document.getElementById('stepTrail');
  const labels = ['Identity','Head','Body','Arms','Legs','Extra','Sounds'];
  labels.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'trail-dot';
    dot.id = `trail-${i}`;
    dot.title = labels[i];
    trail.appendChild(dot);
  });
}

function updateTrail() {
  for (let i = 0; i < TOTAL_STEPS; i++) {
    const dot = document.getElementById(`trail-${i}`);
    if (!dot) continue;
    dot.className = 'trail-dot';
    if (i < currentStep) dot.classList.add('done');
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
  const target = n >= TOTAL_STEPS ? 'step-extract' : `step-${n}`;
  document.getElementById(target).classList.add('active');
  currentStep = n;
  updateTrail();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ─────────────────────────────────────────
   Validation
───────────────────────────────────────── */
function validateStep(step) {
  if (step === 0) {
    const name     = v('charName').trim();
    const codeName = v('charCodeName').trim();
    if (!name)     { flash('charName', 'Enter a character name'); return false; }
    if (!codeName) { flash('charCodeName', 'Enter a code name'); return false; }
  }
  return true;
}

function flash(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = 'var(--danger)';
  el.focus();
  setTimeout(() => el.style.borderColor = '', 1800);
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
      transition:'opacity .3s', opacity:'0'
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
  BS_DATA.styles.forEach(style => {
    const card = document.createElement('div');
    card.className = 'style-card';
    card.dataset.style = style;
    card.innerHTML = `<span class="style-icon">${STYLE_EMOJI[style] || '👤'}</span>
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
  if (!fields) return;
  fields.classList.toggle('hidden', !enabled);
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
   Bind all select-pills
───────────────────────────────────────── */
function bindAllPills() {
  document.querySelectorAll('.select-pill[data-target]').forEach(pill => {
    pill.addEventListener('click', () => {
      const target = pill.dataset.target;
      const isSound = target.toLowerCase().includes('snd');
      const isMesh  = target.toLowerCase().includes('mesh');
      openModal(target, isSound ? 'sound' : (isMesh ? 'mesh' : 'texture'));
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

  const labels = { texture:'Select Texture', mesh:'Select Mesh', sound:'Select Sound' };
  title.textContent = labels[mode] || 'Select';
  search.value = '';
  grid.innerHTML = '';

  const list = mode === 'sound' ? BS_DATA.sounds :
               mode === 'mesh'  ? BS_DATA.meshes  : BS_DATA.textures;

  const current = document.getElementById(targetId)?.value || '';

  list.forEach(name => {
    const item = document.createElement('div');
    item.className = 'modal-item' + (mode === 'sound' ? ' sound-item' : '');
    if (name === current) item.classList.add('selected');
    item.dataset.name = name;

    if (mode === 'sound') {
      item.innerHTML = `<span class="item-name">${name}</span>
        <button class="play-btn" title="Preview" onclick="playSound('${name}', event)">▶</button>`;
    } else {
      const imgSrc = `Textures/${name}.png`;
      item.innerHTML = `<img src="${imgSrc}" alt="${name}" onerror="this.style.display='none'" />
                        <span class="item-name">${name}</span>`;
    }

    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('play-btn')) return;
      selectModalItem(item, name);
    });
    grid.appendChild(item);
  });

  overlay.classList.remove('hidden');
  search.focus();
}

function selectModalItem(item, name) {
  document.querySelectorAll('#modalGrid .modal-item').forEach(i => i.classList.remove('selected'));
  item.classList.add('selected');

  // write to hidden input
  const hidden = document.getElementById(modalTarget);
  if (hidden) hidden.value = name;

  // update pill label
  const valSpan = document.getElementById(`${modalTarget}Val`);
  if (valSpan) valSpan.textContent = name;

  // mark pill filled
  const pill = document.querySelector(`.select-pill[data-target="${modalTarget}"]`);
  if (pill) pill.classList.add('filled');

  // auto-close after short delay so user sees selection
  setTimeout(() => {
    document.getElementById('modalOverlay').classList.add('hidden');
  }, 180);
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
  if (e.target === document.getElementById('modalOverlay')) {
    document.getElementById('modalOverlay').classList.add('hidden');
  }
}

function filterModal(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('#modalGrid .modal-item').forEach(item => {
    item.style.display = item.dataset.name.toLowerCase().includes(q) ? '' : 'none';
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
   Helper: read value
───────────────────────────────────────── */
function v(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function soundList(...ids) {
  return ids.map(id => v(id)).filter(s => s.trim());
}

/* ─────────────────────────────────────────
   Extract & Generate Python
───────────────────────────────────────── */
function startExtract() {
  showStep(99); // extract screen
  const msgs = [
    'Reading meshes…', 'Compiling textures…', 'Loading sounds…',
    'Wiring up materials…', 'Registering appearance…', 'Writing Python…', 'Done! 💥'
  ];
  const bar = document.getElementById('progressBar');
  const sub = document.getElementById('extractSub');
  let i = 0;

  const interval = setInterval(() => {
    i++;
    bar.style.width = `${(i / msgs.length) * 100}%`;
    sub.textContent = msgs[i - 1] || '';
    if (i >= msgs.length) {
      clearInterval(interval);
      generatedCode = generatePython();
      document.getElementById('downloadBtn').classList.remove('hidden');
      document.getElementById('extractSub').textContent = '✅ Character ready!';
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
   Python Code Generator
───────────────────────────────────────── */
function generatePython() {
  const charName  = v('charName').trim();
  const codeName  = v('charCodeName').trim();
  const iconTex   = v('iconTexture')   || `${codeName}Icon`;
  const iconMask  = v('iconMask')      || `${codeName}IconColorMask`;
  const style     = selectedStyle      || 'spaz';

  // color texture = first filled body texture or fallback
  const colorTex  = v('torsoTex') || `${codeName}Color`;
  const colorMask = v('bodyMask') || `${codeName}ColorMask`;

  // Meshes
  const headMesh    = v('headMesh')    || `${codeName}Head`;
  const torsoMesh   = v('torsoMesh')   || `${codeName}Torso`;
  const pelvisMesh  = v('pelvisMesh')  || `${codeName}Pelvis`;
  const upperArm    = v('upperArmMesh')|| `${codeName}UpperArm`;
  const forearm     = v('forearmMesh') || `${codeName}ForeArm`;
  const handMesh    = v('leftHandMesh')|| `${codeName}Hand`;
  const upperLeg    = v('upperLegMesh')|| `${codeName}UpperLeg`;
  const lowerLeg    = v('lowerLegMesh')|| `${codeName}LowerLeg`;
  const toesMesh    = v('toesMesh')    || `${codeName}Toes`;

  // Sounds
  const jumpSounds   = soundList('jumpSnd0','jumpSnd1','jumpSnd2','jumpSnd3');
  const attackSounds = soundList('attackSnd0','attackSnd1','attackSnd2','attackSnd3');
  const hitSounds    = soundList('hitSnd0','hitSnd1','hitSnd2','hitSnd3');
  const pickupSounds = soundList('pickupSnd0','pickupSnd1');
  const fallSounds   = soundList('fallSnd0');
  const deathSounds  = soundList('deathSnd0','deathSnd1');

  // Fall back to spaz sounds if nothing selected
  const jsFallback = (arr, fallback) => arr.length ? arr : fallback;
  const js = jsFallback;
  const finalJump   = js(jumpSounds,   ['spazJump01','spazJump02','spazJump03','spazJump04']);
  const finalAtk    = js(attackSounds, ['spazAttack01','spazAttack02','spazAttack03','spazAttack04']);
  const finalHit    = js(hitSounds,    ['spazImpact01','spazImpact02','spazImpact03','spazImpact04']);
  const finalPickup = js(pickupSounds, ['spazPickup01']);
  const finalFall   = js(fallSounds,   ['spazFall01']);
  const finalDeath  = js(deathSounds,  ['spazDeath01']);

  const pyList = (arr) => arr.length === 0 ? '[]' :
    '[\n        ' + arr.map(s => `'${s}'`).join(', ') + '\n    ]';

  const headEnabled  = document.getElementById('headEnabled')?.checked;
  const bodyEnabled  = document.getElementById('bodyEnabled')?.checked;
  const extraEnabled = document.getElementById('extraEnabled')?.checked;

  let extraComment = '';
  if (extraEnabled && v('extraMesh')) {
    const posMap = {
      right_shoulder: '(0.15, 0.3, 0)',
      left_shoulder:  '(-0.15, 0.3, 0)',
      back:           '(0, 0.2, -0.3)',
      front:          '(0, 0.2, 0.3)',
      head_top:       '(0, 0.8, 0)'
    };
    const pos = posMap[selectedPos] || '(0, 0.5, 0)';
    extraComment = `
    # ── Extra Attachment ──────────────────────────
    # To attach an extra mesh, add this inside your custom Actor's __init__:
    #
    #   self._extra_node = bs.newnode('prop', attrs={{
    #       'mesh': bs.getmesh('${v('extraMesh')}'),
    #       'color_texture': bs.gettexture('${v('extraTex') || 'white'}'),
    #       'position': ${pos},
    #       'body': 'empty',
    #       'shadow_size': 0.0,
    #       'is_area_of_interest': False,
    #   }})
    #   self.node.connectattr('position', self._extra_node, 'position')
`;
  }

  const now = new Date().toISOString().split('T')[0];

  return `# -*- coding: utf-8 -*-
# ba_meta require api 9
# ba_meta export babase.Plugin
#
# Character: ${charName}
# Generated by BombSquad Character Maker — ${now}
# https://github.com/YOUR_USERNAME/bombsquad-character-maker
#
# HOW TO INSTALL:
#   1. Drop this file into your BombSquad mods folder.
#   2. Restart the server / game.
#   3. The character '${charName}' will appear in the character list.
#
# Compatible with Ballistica API 9 (BombSquad 1.7.x+)

from __future__ import annotations

import babase
from bascenev1lib.actor.spazappearance import Appearance


def register_${codeName}_appearance() -> None:
    """Register the '${charName}' character appearance."""

    t = Appearance('${charName}')

    # ── Icon (lobby / profile) ──────────────────
    t.icon_texture      = '${iconTex}'
    t.icon_mask_texture = '${iconMask}'

    # ── Body textures ────────────────────────────
    t.color_texture      = '${colorTex}'
    t.color_mask_texture = '${colorMask}'

    # ── Meshes ───────────────────────────────────
    t.head_mesh      = '${headEnabled ? headMesh : ''}'
    t.torso_mesh     = '${bodyEnabled ? torsoMesh : ''}'
    t.pelvis_mesh    = '${bodyEnabled ? pelvisMesh : ''}'
    t.upper_arm_mesh = '${upperArm}'
    t.forearm_mesh   = '${forearm}'
    t.hand_mesh      = '${handMesh}'
    t.upper_leg_mesh = '${upperLeg}'
    t.lower_leg_mesh = '${lowerLeg}'
    t.toes_mesh      = '${toesMesh}'

    # ── Sounds ───────────────────────────────────
    t.jump_sounds   = ${pyList(finalJump)}
    t.attack_sounds = ${pyList(finalAtk)}
    t.impact_sounds = ${pyList(finalHit)}
    t.pickup_sounds = ${pyList(finalPickup)}
    t.fall_sounds   = ${pyList(finalFall)}
    t.death_sounds  = ${pyList(finalDeath)}

    # ── Style (controls animations / physics) ────
    t.style = '${style}'
    ${extraComment}

# ─────────────────────────────────────────────────────────────────────────────
# Plugin entry-point — runs automatically when BombSquad loads this file
# ─────────────────────────────────────────────────────────────────────────────

class ${toPascal(charName)}Plugin(babase.Plugin):
    """Registers the '${charName}' character on startup."""

    def on_app_running(self) -> None:
        try:
            register_${codeName}_appearance()
            print(f'[CharacterMaker] ✅ "${charName}" registered successfully.')
        except RuntimeError as e:
            # Silently ignore if already registered (server hot-reload)
            if 'already exists' not in str(e):
                raise
`;
}

function toPascal(str) {
  return str.replace(/(?:^|\s+)(\w)/g, (_, c) => c.toUpperCase()).replace(/\s+/g, '');
}
