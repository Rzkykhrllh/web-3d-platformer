import { items, itemById, profile } from './content.js';
import { itemHTML } from './render-content.js';
import { GAME_NAME, SHOW_PORTFOLIO } from './config.js';

const $ = id => document.getElementById(id);
const SETTINGS_KEY = 'island-settings';

function loadSettings() {
  const defaults = { music: 0.5, sfx: 0.8, quality: 'auto', shake: true, muted: false };
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; }
  catch { return defaults; }
}
function saveSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* private mode */ } }

// Screens: loading -> menu -> playing <-> pause/settings/summary -> finish
export function createUI(handlers) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const settings = loadSettings();
  if (reduceMotion && localStorage.getItem(SETTINGS_KEY) === null) settings.shake = false;
  const opened = new Set();
  let mode = 'loading';
  const overlayStack = [];
  let hintTimer = 0, toastTimer = 0;

  document.title = GAME_NAME;
  $('menuTitle').textContent = GAME_NAME;
  if (SHOW_PORTFOLIO) $('menuRole').textContent = profile.role;
  else {
    $('menuTag').textContent = 'Smash crates. Grab the crystal. Watch out for TNT.';
    for (const id of ['menuRole', 'skipBtn', 'allBtn', 'pauseAllBtn', 'finishAllBtn']) $(id).hidden = true;
  }

  const hud = $('hud'), corner = $('corner'), hint = $('hint'), touch = $('touch'), card = $('card');

  function show(el, on) {
    el.classList.toggle('hidden', !on);
    el.inert = !on;
  }
  function focusGame() {
    document.activeElement?.blur?.();
    $('scene').focus({ preventScroll: true });
  }
  const click = () => handlers.onSound?.('click');

  // Overlays stack on top of each other (pause -> settings -> back to pause)
  function openOverlay(id, focusId) {
    const top = overlayStack[overlayStack.length - 1];
    if (top) show($(top), false);
    overlayStack.push(id);
    show($(id), true);
    if (mode === 'playing') handlers.onPause(true);
    hideCard();
    ($(focusId) || $(id).querySelector('h2'))?.focus();
  }
  function closeOverlay() {
    const id = overlayStack.pop();
    if (id) show($(id), false);
    const prev = overlayStack[overlayStack.length - 1];
    if (prev) { show($(prev), true); $(prev).querySelector('h2')?.focus(); return; }
    if (mode === 'playing') { handlers.onPause(false); focusGame(); }
    else if (mode === 'menu') $('playBtn').focus();
  }

  // Loading
  function setLoading(p, text) {
    $('loadBar').style.width = `${Math.round(p * 100)}%`;
    if (text) $('loadText').textContent = text;
  }
  function ready() {
    $('loading').classList.add('hidden');
    mode = 'menu';
    show($('menu'), true);
    corner.classList.add('show');
    $('pauseBtn').hidden = true;
    $('playBtn').focus();
  }

  function play() {
    handlers.onUnlock?.();
    click();
    mode = 'playing';
    show($('menu'), false);
    hud.classList.add('show');
    $('pauseBtn').hidden = false;
    hint.classList.add('show');
    touch.hidden = false;
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => hint.classList.remove('show'), 7000);
    focusGame();
    handlers.onPlay();
  }

  // Content card
  function showCard(id) {
    const item = itemById[id];
    if (!item || !SHOW_PORTFOLIO) return;
    opened.add(id);
    $('cardBody').innerHTML = itemHTML(item);
    card.classList.remove('show');
    void card.offsetWidth;
    card.classList.add('show');
    card.inert = false;
    handlers.onSound?.('card');
  }
  function hideCard() {
    if (!card.classList.contains('show')) return;
    card.classList.remove('show');
    card.inert = true;
    if (mode === 'playing' && !overlayStack.length) focusGame();
  }
  $('cardClose').addEventListener('click', hideCard);

  function openSummary() {
    $('summaryStats').textContent = mode === 'playing' ? 'Paused. Items you already found are marked.' : '';
    $('summaryList').innerHTML = items.map(item =>
      `<li class="${opened.has(item.id) ? 'found' : ''}">${itemHTML(item)}${opened.has(item.id) ? '<span class="badge">Found</span>' : ''}</li>`
    ).join('');
    openOverlay('summary');
  }

  // Settings
  const form = { music: $('setMusic'), sfx: $('setSfx'), quality: $('setQuality'), shake: $('setShake') };
  function syncForm() {
    form.music.value = settings.music; form.sfx.value = settings.sfx;
    form.quality.value = settings.quality; form.shake.checked = settings.shake;
    $('muteBtn').setAttribute('aria-pressed', String(settings.muted));
    $('muteBtn').classList.toggle('off', settings.muted);
  }
  function applySettings() { saveSettings(settings); syncForm(); handlers.onSettings(settings); }
  form.music.addEventListener('input', () => { settings.music = +form.music.value; applySettings(); });
  form.sfx.addEventListener('input', () => { settings.sfx = +form.sfx.value; applySettings(); handlers.onSound?.('fruit'); });
  form.quality.addEventListener('change', () => { settings.quality = form.quality.value; applySettings(); });
  form.shake.addEventListener('change', () => { settings.shake = form.shake.checked; applySettings(); });
  $('settingsForm').addEventListener('submit', e => e.preventDefault());
  syncForm();

  // Buttons
  $('playBtn').addEventListener('click', play);
  $('skipBtn').addEventListener('click', () => { handlers.onUnlock?.(); click(); openSummary(); });
  $('menuSettingsBtn').addEventListener('click', () => { click(); openOverlay('settings'); });
  $('allBtn').addEventListener('click', () => { click(); openSummary(); });
  $('pauseBtn').addEventListener('click', () => { click(); openOverlay('pause'); });
  $('muteBtn').addEventListener('click', () => { handlers.onUnlock?.(); settings.muted = !settings.muted; applySettings(); });
  $('resumeBtn').addEventListener('click', () => { click(); closeOverlay(); });
  $('pauseAllBtn').addEventListener('click', () => { click(); openSummary(); });
  $('pauseSettingsBtn').addEventListener('click', () => { click(); openOverlay('settings'); });
  $('restartBtn').addEventListener('click', () => { click(); handlers.onRestart(); });
  $('settingsBack').addEventListener('click', () => { click(); closeOverlay(); });
  $('backBtn').addEventListener('click', () => { click(); closeOverlay(); });
  $('againBtn').addEventListener('click', () => { click(); handlers.onRestart(); });
  $('finishAllBtn').addEventListener('click', () => { click(); openSummary(); });

  window.addEventListener('keydown', e => {
    if (e.code === 'Escape') {
      if (overlayStack.length && overlayStack[overlayStack.length - 1] !== 'finish') { e.preventDefault(); closeOverlay(); }
      else if (card.classList.contains('show')) hideCard();
      else if (mode === 'playing') openOverlay('pause');
    } else if (e.code === 'KeyP' && mode === 'playing' && !overlayStack.length) {
      openOverlay('pause');
    } else if (e.code === 'Enter' && mode === 'menu' && !overlayStack.length && document.activeElement === document.body) {
      play();
    }
  });

  // Touch controls
  const stick = $('stick'), knob = $('knob');
  const joy = { x: 0, y: 0, id: null };
  function moveJoy(e) {
    const r = stick.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy), max = 45;
    if (len > max) { dx *= max / len; dy *= max / len; }
    joy.x = dx / max; joy.y = dy / max;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  stick.addEventListener('pointerdown', e => { joy.id = e.pointerId; stick.setPointerCapture(e.pointerId); moveJoy(e); });
  stick.addEventListener('pointermove', e => { if (e.pointerId === joy.id) moveJoy(e); });
  const endJoy = e => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
  stick.addEventListener('pointerup', endJoy);
  stick.addEventListener('pointercancel', endJoy);
  const touchButtons = { jump: false, spin: false };
  [['jumpBtn', 'jump'], ['spinBtn', 'spin']].forEach(([id, key]) => {
    const b = $(id);
    b.addEventListener('pointerdown', e => { e.preventDefault(); touchButtons[key] = true; handlers[key === 'jump' ? 'onJump' : 'onSpin'](); });
    const up = () => { touchButtons[key] = false; };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
  });

  // HUD
  function bump(el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  const fruitEl = $('fruitCount'), crateEl = $('crateCount');

  function toast(text) {
    const t = $('toast');
    t.textContent = text;
    t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1600);
  }

  function showFinish({ secs, fruit, fruitTotal, crates, crateTotal, crystal, gem, deaths }) {
    mode = 'finished';
    hideCard();
    touch.hidden = true;
    hint.classList.remove('show');
    $('pauseBtn').hidden = true;
    const m = Math.floor(secs / 60), s = secs % 60;
    const crateRatio = crateTotal ? crates / crateTotal : 1;
    const found = items.filter(i => opened.has(i.id)).length;
    const rank = crateRatio === 1 ? 'gold' : crateRatio >= 0.7 ? 'silver' : 'bronze';
    const rankText = {
      gold: 'Gold: every crate broken.',
      silver: 'Silver: most of the crates. Some are still out there.',
      bronze: 'Bronze: plenty left to find. Try again, or see everything below.'
    }[rank];
    $('medal').className = `medal ${rank}`;
    $('rankText').textContent = rankText;
    $('results').innerHTML = [
      ['Time', `${m ? m + ' min ' : ''}${s} sec`],
      ['Fruit', `${fruit} / ${fruitTotal}`],
      ['Crates', `${crates} / ${crateTotal}`],
      ['Deaths', String(deaths)],
      ...(crystal === null ? [] : [['Power crystal', crystal ? 'Found' : 'Missed']]),
      ['Green gem', gem ? 'Found' : crates === crateTotal ? 'Left behind' : 'Locked'],
      ...(SHOW_PORTFOLIO ? [['Portfolio found', `${found} / ${items.length}`]] : [])
    ].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
    setTimeout(() => {
      overlayStack.length = 0;
      ['pause', 'settings', 'summary'].forEach(id => show($(id), false));
      overlayStack.push('finish');
      show($('finish'), true);
      $('finishTitle').focus();
    }, 900);
  }

  return {
    joy, touchButtons, reduceMotion, settings, opened,
    get mode() { return mode; },
    get paused() { return overlayStack.length > 0; },
    setLoading, ready, showCard, hideCard, toast, showFinish,
    setFruit(n) { fruitEl.textContent = n; bump(fruitEl.parentElement); },
    setDeaths(n) { $('deathCount').textContent = n; bump($('deathCount').parentElement); },
    setCrates(n, total) { crateEl.textContent = `${n} / ${total}`; if (n) bump(crateEl.parentElement); },
    // Crystal and gem icons: dim until collected; levels without a crystal hide its icon
    initPickups(hasCrystal) { $('crystalIcon').hidden = !hasCrystal; },
    gotPickup(name) {
      const el = $(`${name}Icon`);
      el.classList.add('got');
      el.setAttribute('aria-label', name === 'gem' ? 'Green gem: found' : 'Power crystal: found');
      bump($('treasure'));
    },
    flash() { const f = $('fade'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
  };
}
