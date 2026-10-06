import { items, itemById, profile } from './content.js';

const $ = id => document.getElementById(id);

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function itemHTML(item) {
  const tags = item.tags?.length ? `<ul class="tags">${item.tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
  const links = item.links?.length
    ? `<p class="links">${item.links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('')}</p>`
    : '';
  return `<span class="kind">${esc(item.kind)}</span><h3>${esc(item.title)}</h3><p>${esc(item.body)}</p>${tags}${links}`;
}

export function createUI({ onStart, onPause, onJump, onSpin, onRestart }) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const opened = new Set();
  let started = false, hintTimer = 0, cardTimer = 0;

  document.title = `${profile.name}'s Island`;
  $('startTitle').textContent = `${profile.name}'s Island`;
  $('startRole').textContent = profile.role;

  const hud = $('hud'), hint = $('hint'), touch = $('touch'), allBtn = $('allBtn');
  const startSign = $('startSign'), card = $('card'), summary = $('summary');

  function focusGame() {
    document.activeElement?.blur();
    $('scene').focus({ preventScroll: true });
  }

  function start() {
    started = true;
    startSign.classList.add('hidden');
    startSign.inert = true;
    hud.classList.add('show');
    hint.classList.add('show');
    touch.hidden = false;
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => hint.classList.remove('show'), 8000);
    focusGame();
    onStart();
  }

  // Content card that pops up when a crate breaks
  function showCard(id) {
    const item = itemById[id];
    if (!item) return;
    opened.add(id);
    $('cardBody').innerHTML = itemHTML(item);
    card.classList.remove('show');
    void card.offsetWidth;
    card.classList.add('show');
    card.inert = false;
    clearTimeout(cardTimer);
  }
  function hideCard() {
    card.classList.remove('show');
    card.inert = true;
    focusGame();
  }
  $('cardClose').addEventListener('click', hideCard);

  // Summary of every item, used by "See everything" and at the finish
  function openSummary({ heading, stats = '', finished = false }) {
    $('summaryTitle').textContent = heading;
    $('summaryStats').textContent = stats;
    $('summaryList').innerHTML = items.map(item =>
      `<li class="${opened.has(item.id) ? 'found' : ''}">${itemHTML(item)}${opened.has(item.id) ? '<span class="badge">Found</span>' : ''}</li>`
    ).join('');
    $('backBtn').hidden = finished;
    summary.classList.remove('hidden');
    summary.inert = false;
    hideCard();
    onPause(true);
    $('summaryTitle').focus();
  }
  function closeSummary() {
    summary.classList.add('hidden');
    summary.inert = true;
    onPause(false);
    if (started) focusGame(); else $('startBtn').focus();
  }

  $('startBtn').addEventListener('click', start);
  $('skipBtn').addEventListener('click', () => openSummary({ heading: 'Everything on the island' }));
  allBtn.addEventListener('click', () => openSummary({ heading: 'Everything on the island', stats: started ? 'Paused. Items you already found are marked.' : '' }));
  $('backBtn').addEventListener('click', closeSummary);
  $('againBtn').addEventListener('click', onRestart);
  window.addEventListener('keydown', e => {
    if (e.code !== 'Escape') return;
    if (!summary.classList.contains('hidden') && !$('backBtn').hidden) closeSummary();
    else if (card.classList.contains('show')) hideCard();
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
  $('jumpBtn').addEventListener('pointerdown', e => { e.preventDefault(); onJump(); });
  $('spinBtn').addEventListener('pointerdown', e => { e.preventDefault(); onSpin(); });

  // HUD
  function bump(el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  const fruitEl = $('fruitCount'), crateEl = $('crateCount');

  return {
    joy, reduceMotion,
    showCard,
    setFruit(n) { fruitEl.textContent = n; bump(fruitEl.parentElement); },
    setCrates(n, total) { crateEl.textContent = `${n} / ${total}`; if (n) bump(crateEl.parentElement); },
    flash() { const f = $('fade'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); },
    showFinish({ secs, fruit, fruitTotal, crates, crateTotal }) {
      const m = Math.floor(secs / 60), s = secs % 60;
      touch.hidden = true;
      hint.classList.remove('show');
      setTimeout(() => openSummary({
        heading: 'You made it!',
        stats: `${m ? m + ' min ' : ''}${s} sec · ${fruit}/${fruitTotal} fruit · ${crates}/${crateTotal} crates`,
        finished: true
      }), 700);
    }
  };
}
