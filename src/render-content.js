// Turns portfolio items into HTML. No DOM access, so the build step can use it
// to write the static page as well as the game using it for cards.

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function itemHTML(item, heading = 'h3') {
  const tags = item.tags?.length ? `<ul class="tags">${item.tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
  const links = item.links?.length
    ? `<p class="links">${item.links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('')}</p>`
    : '';
  return `<span class="kind">${esc(item.kind)}</span><${heading}>${esc(item.title)}</${heading}><p>${esc(item.body)}</p>${tags}${links}`;
}

// Body of the plain portfolio page: grouped by kind, in content order
export function portfolioHTML(profile, items) {
  const groups = [];
  for (const it of items) {
    let g = groups.find(x => x.kind === it.kind);
    if (!g) groups.push(g = { kind: it.kind, items: [] });
    g.items.push(it);
  }
  return `
    <header><h1>${esc(profile.name)}</h1><p>${esc(profile.role)}</p></header>
    ${groups.map(g => `
      <section><h2>${esc(g.kind)}</h2>
        ${g.items.map(it => `<article>${itemHTML(it)}</article>`).join('')}
      </section>`).join('')}`;
}
