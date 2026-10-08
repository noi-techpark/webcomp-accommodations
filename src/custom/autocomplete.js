// SPDX-FileCopyrightText: NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

const MAX_RESULTS = 8;

const normalize = value => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Attaches a keyboard accessible suggestion list to an input.
 * @param {HTMLInputElement} input
 * @param {HTMLElement} list - empty element rendered below the input
 * @param {Array<{title: string}>} items
 * @param {Function} onSelect - called with the chosen item
 */
export function autocomplete(input, list, items, onSelect) {
  let matches = [];
  let active = -1;

  const close = () => {
    matches = [];
    active = -1;
    list.replaceChildren();
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
  };

  const choose = item => {
    input.value = item.title;
    close();
    onSelect(item);
  };

  const highlight = index => {
    active = index;
    [...list.children].forEach((option, i) => option.classList.toggle('active', i === active));
  };

  const render = () => {
    const query = normalize(input.value.trim());
    if (!query) return close();

    matches = items
      .filter(item => normalize(item.title).includes(query))
      // Names starting with the query first
      .sort((a, b) => normalize(b.title).startsWith(query) - normalize(a.title).startsWith(query))
      .slice(0, MAX_RESULTS);
    active = -1;

    list.replaceChildren(...matches.map(item => {
      const option = document.createElement('li');
      option.setAttribute('role', 'option');
      const start = normalize(item.title).indexOf(query);
      const mark = document.createElement('mark');
      mark.textContent = item.title.substr(start, query.length);
      option.append(item.title.substr(0, start), mark, item.title.substr(start + query.length));
      // mousedown fires before the input loses focus
      option.addEventListener('mousedown', e => {
        e.preventDefault();
        choose(item);
      });
      return option;
    }));
    list.hidden = matches.length === 0;
    input.setAttribute('aria-expanded', String(!list.hidden));
  };

  input.addEventListener('input', render);
  input.addEventListener('focus', render);
  input.addEventListener('blur', close);
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' && matches.length) {
      e.preventDefault();
      highlight((active + 1) % matches.length);
    } else if (e.key === 'ArrowUp' && matches.length) {
      e.preventDefault();
      highlight((active - 1 + matches.length) % matches.length);
    } else if (e.key === 'Enter' && matches.length) {
      e.preventDefault();
      choose(matches[Math.max(active, 0)]);
    } else if (e.key === 'Escape') {
      close();
    }
  });
}
