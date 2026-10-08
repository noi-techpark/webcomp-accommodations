// SPDX-FileCopyrightText: NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

const translations = {
  en: {
    title: 'Accommodations',
    searchPlaceholder: 'Search a village or district…',
    searchUnavailable: 'Search unavailable',
    loading: 'Loading details…',
    loadError: 'Details could not be loaded. Please try again later.',
    close: 'Close',
    website: 'Website',
    directions: 'Directions',
    call: 'Call',
    email: 'E-mail',
    altitude: 'Altitude',
    source: 'Source',
    license: 'License',
    provider: 'Provider'
  },
  de: {
    title: 'Unterkünfte',
    searchPlaceholder: 'Ort oder Fraktion suchen…',
    searchUnavailable: 'Suche nicht verfügbar',
    loading: 'Details werden geladen…',
    loadError: 'Details konnten nicht geladen werden. Bitte später erneut versuchen.',
    close: 'Schließen',
    website: 'Webseite',
    directions: 'Route',
    call: 'Anrufen',
    email: 'E-Mail',
    altitude: 'Höhe',
    source: 'Quelle',
    license: 'Lizenz',
    provider: 'Anbieter'
  },
  it: {
    title: 'Alloggi',
    searchPlaceholder: 'Cerca un paese o una frazione…',
    searchUnavailable: 'Ricerca non disponibile',
    loading: 'Caricamento dettagli…',
    loadError: 'Impossibile caricare i dettagli. Riprova più tardi.',
    close: 'Chiudi',
    website: 'Sito web',
    directions: 'Indicazioni',
    call: 'Chiama',
    email: 'E-mail',
    altitude: 'Altitudine',
    source: 'Fonte',
    license: 'Licenza',
    provider: 'Fornitore'
  }
};

export function translate(language, key) {
  return (translations[language] || translations.en)[key] || translations.en[key] || key;
}
