// SPDX-FileCopyrightText: NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// Renders the accommodation detail panel. All values coming from the api are escaped.

const escapeHtml = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const safeUrl = url => /^https?:\/\//i.test(url || '') ? url : null;

const withProtocol = url => url && !/^[a-z]+:\/\//i.test(url) ? 'http://' + url : url;

// Descriptions may contain markup, only the text is shown
const toText = html => html
  ? new DOMParser().parseFromString(html, 'text/html').body.textContent.trim()
  : '';

const icons = {
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  route: '<path d="m3 11 18-8-8 18-2-8z"/>',
  bed: '<path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="2"/>'
};

const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;

const closeButton = t => `<button class="detail__close" type="button" data-close aria-label="${t('close')}">${icon('close')}</button>`;

// "HotelPension" -> "Hotel Pension"
const humanize = value => String(value || '').replace(/([a-z])([A-Z])/g, '$1 $2');

// "3sstars" -> "★★★ S", "4suns" -> "☀☀☀☀", "2flowers" -> "✿✿"
function formatCategory(categoryId) {
  const match = /^(\d)(s?)(stars|suns|flowers)$/i.exec(categoryId || '');
  if (!match)
    return null;
  const symbol = { stars: '★', suns: '☀', flowers: '✿' }[match[3].toLowerCase()];
  return symbol.repeat(Number(match[1])) + (match[2] ? ' S' : '');
}

function pickDetail(accommodation, language) {
  const details = accommodation.AccoDetail || {};
  return details[language] || details.en || details.de || details.it || Object.values(details)[0] || {};
}

export function renderDetailLoading(panel, name, t) {
  panel.innerHTML = `
    <div class="detail__media detail__media--empty">${icon('bed')}</div>
    ${closeButton(t)}
    <div class="detail__body">
      <h2 class="detail__title">${escapeHtml(name || '')}</h2>
      <div class="skeleton" style="width: 40%"></div>
      <div class="skeleton" style="width: 85%"></div>
      <div class="skeleton" style="width: 70%"></div>
      <p class="sr-only">${t('loading')}</p>
    </div>`;
}

export function renderDetailError(panel, name, t) {
  panel.innerHTML = `
    <div class="detail__media detail__media--empty">${icon('bed')}</div>
    ${closeButton(t)}
    <div class="detail__body">
      <h2 class="detail__title">${escapeHtml(name || '')}</h2>
      <p class="detail__error">${t('loadError')}</p>
    </div>`;
}

export function renderDetail(panel, accommodation, language, t) {
  const detail = pickDetail(accommodation, language);
  const name = detail.Name || accommodation.Shortname || '';
  const image = (accommodation.ImageGallery || [])
    .slice()
    .sort((a, b) => (a.ListPosition ?? 99) - (b.ListPosition ?? 99))
    .find(img => safeUrl(img.ImageUrl));
  const category = formatCategory(accommodation.AccoCategoryId);
  const type = humanize(accommodation.AccoTypeId);
  const address = [detail.Street, [detail.Zip, detail.City].filter(Boolean).join(' ')].filter(Boolean);
  const website = safeUrl(withProtocol(detail.Website));
  const description = toText(detail.Shortdesc || detail.Longdesc);
  const hasPosition = accommodation.Latitude && accommodation.Longitude;
  const license = accommodation.LicenseInfo || {};
  const provider = safeUrl(license.LicenseHolder);
  const source = accommodation._Meta?.Source || accommodation.Source;

  const chips = [
    type && `<span class="chip">${escapeHtml(type)}</span>`,
    category && `<span class="chip chip--category" title="${escapeHtml(accommodation.AccoCategoryId)}">${category}</span>`,
    accommodation.Altitude && `<span class="chip chip--muted">${t('altitude')} ${Math.round(accommodation.Altitude)} m</span>`
  ].filter(Boolean).join('');

  const actions = [
    website && `<a class="action" href="${escapeHtml(website)}" target="_blank" rel="noopener">${icon('globe')}${t('website')}</a>`,
    detail.Phone && `<a class="action" href="tel:${escapeHtml(detail.Phone.replace(/\s+/g, ''))}">${icon('phone')}${t('call')}</a>`,
    detail.Email && `<a class="action" href="mailto:${escapeHtml(detail.Email)}">${icon('mail')}${t('email')}</a>`,
    hasPosition && `<a class="action" href="https://www.google.com/maps/dir/?api=1&destination=${accommodation.Latitude},${accommodation.Longitude}" target="_blank" rel="noopener">${icon('route')}${t('directions')}</a>`
  ].filter(Boolean).join('');

  const contacts = [
    address.length && `<li>${icon('pin')}<span>${address.map(escapeHtml).join('<br>')}</span></li>`,
    detail.Phone && `<li>${icon('phone')}<span>${escapeHtml(detail.Phone)}</span></li>`,
    detail.Email && `<li>${icon('mail')}<span>${escapeHtml(detail.Email)}</span></li>`
  ].filter(Boolean).join('');

  panel.innerHTML = `
    ${image
      ? `<div class="detail__media"><img src="${escapeHtml(image.ImageUrl)}" alt="${escapeHtml(image.ImageTitle?.[language] || name)}" loading="lazy"></div>`
      : `<div class="detail__media detail__media--empty">${icon('bed')}</div>`}
    ${closeButton(t)}
    <div class="detail__body">
      ${chips ? `<div class="chips">${chips}</div>` : ''}
      <h2 class="detail__title">${escapeHtml(name)}</h2>
      ${actions ? `<div class="actions">${actions}</div>` : ''}
      ${contacts ? `<ul class="contacts">${contacts}</ul>` : ''}
      ${description ? `<p class="detail__description">${escapeHtml(description)}</p>` : ''}
      <dl class="detail__meta">
        ${source ? `<div><dt>${t('source')}</dt><dd>${escapeHtml(source)}</dd></div>` : ''}
        ${license.License ? `<div><dt>${t('license')}</dt><dd>${escapeHtml(license.License)}</dd></div>` : ''}
        ${provider ? `<div><dt>${t('provider')}</dt><dd><a href="${escapeHtml(provider)}" target="_blank" rel="noopener">${escapeHtml(provider.replace(/^https?:\/\//, ''))}</a></dd></div>` : ''}
      </dl>
    </div>`;

  // Hide broken images instead of showing the browser placeholder
  const img = panel.querySelector('.detail__media img');
  if (img)
    img.addEventListener('error', () => {
      img.parentElement.classList.add('detail__media--empty');
      img.replaceWith(document.createRange().createContextualFragment(icon('bed')));
    });
}
