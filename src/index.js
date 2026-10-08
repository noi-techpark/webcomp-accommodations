// SPDX-FileCopyrightText: NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import maplibregl from 'maplibre-gl';
import style__maplibre from 'maplibre-gl/dist/maplibre-gl.css';
import style from './scss/main.scss';
import config from './api/config.js';
import { accommodationTilesUrl, fetchAccommodationDetail, fetchDistricts } from './api/api.js';
import { autocomplete } from './custom/autocomplete.js';
import { translate } from './custom/i18n.js';
import { renderDetail, renderDetailError, renderDetailLoading } from './custom/detail.js';

const DEFAULT_CENTER = [11.35, 46.6]; // lng, lat
const DEFAULT_ZOOM = 9;
const SOURCE_ID = 'accommodations';
const SOURCE_LAYER = 'accommodation'; // layer name inside the Geo Api tiles
const LAYER_CLUSTERS = 'accommodation-clusters';
const LAYER_POINTS = 'accommodation-points';

class OpendatahubAccommodations extends HTMLElement {
    constructor() {
        super();

        // We need an encapsulation of our component to not
        // interfer with the host, nor be vulnerable to outside
        // changes --> Solution = SHADOW DOM
        this.shadow = this.attachShadow({ mode: "open" });

        this.hoveredId = null;
        this.selectedId = null;
        this.detailRequest = 0;

        this.shadow.addEventListener('keydown', e => {
            if (e.key === 'Escape')
                this.closeDetail();
        });
    }

    static get observedAttributes() {
        return ['centermap', 'zoommap', 'source', 'language'];
    }

    attributeChangedCallback(propName, oldValue, newValue) {
        // Initial attributes are applied when the map is created
        if (!this.map || oldValue === newValue)
            return;

        if (propName === 'source') {
            this.closeDetail();
            this.map.getSource(SOURCE_ID)?.setTiles([accommodationTilesUrl(this.source)]);
        } else if (propName === 'centermap' || propName === 'zoommap') {
            this.map.jumpTo({ center: this.mapCenter, zoom: this.mapZoom });
        } else if (propName === 'language') {
            this.closeDetail();
            this.render();
            this.initializeMap();
        }
    }

    get centermap() {
        return this.getAttribute("centermap");
    }
    set centermap(newCentermap) {
        this.setAttribute("centermap", newCentermap);
    }

    get zoommap() {
        return this.getAttribute("zoommap");
    }
    set zoommap(newZoommap) {
        this.setAttribute("zoommap", newZoommap);
    }

    get source() {
        return this.getAttribute("source");
    }
    set source(newSource) {
        this.setAttribute("source", newSource);
    }

    get language() {
        return (this.getAttribute("language") || 'en').toLowerCase();
    }
    set language(newLanguage) {
        this.setAttribute("language", newLanguage);
    }

    // centermap is passed as "latitude,longitude", MapLibre expects [lng, lat]
    get mapCenter() {
        const [lat, lng] = (this.centermap || '').split(',').map(parseFloat);
        return Number.isFinite(lat) && Number.isFinite(lng) ? [lng, lat] : DEFAULT_CENTER;
    }

    get mapZoom() {
        const zoom = parseFloat(this.zoommap);
        return Number.isFinite(zoom) ? zoom : DEFAULT_ZOOM;
    }

    t(key) {
        return translate(this.language, key);
    }

    connectedCallback() {
        if (this.map)
            return;

        this.render();
        this.initializeMap();
    }

    disconnectedCallback() {
        this.map?.remove();
        this.map = null;
    }

    // Colors are defined once as CSS custom properties, the map layers reuse them
    themeColor(name) {
        return getComputedStyle(this.shadow.getElementById('webcomponents-map')).getPropertyValue(name).trim();
    }

    initializeMap() {
        this.map?.remove();

        this.map = new maplibregl.Map({
            container: this.shadow.getElementById('map'),
            style: config.BASEMAP_STYLE_URL,
            center: this.mapCenter,
            zoom: this.mapZoom,
            attributionControl: {
                compact: true,
                customAttribution: '<a target="_blank" rel="noopener" href="https://opendatahub.com">Open Data Hub</a>'
            }
        });
        this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
        this.map.addControl(new maplibregl.GeolocateControl(), 'bottom-right');

        this.map.on('load', () => {
            this.addAccommodationLayers();
            this.bindMapEvents();
        });

        this.addSearchInput();
    }

    addAccommodationLayers() {
        const primary = this.themeColor('--acco-primary');
        const primaryStrong = this.themeColor('--acco-primary-strong');
        const accent = this.themeColor('--acco-accent');
        const surface = this.themeColor('--acco-surface');
        const count = ['to-number', ['get', 'count'], 2];
        // Clusters grow with their count and shrink at low zoom, where the server grid is dense
        const clusterRadius = (extra) => ['interpolate', ['linear'], ['zoom'],
            8, ['interpolate', ['linear'], count, 2, 8 + extra, 50, 12 + extra, 1000, 18 + extra],
            13, ['interpolate', ['linear'], count, 2, 11 + extra, 50, 16 + extra, 1000, 24 + extra]
        ];
        const isActive = ['any',
            ['boolean', ['feature-state', 'hover'], false],
            ['boolean', ['feature-state', 'selected'], false]
        ];

        this.map.addSource(SOURCE_ID, {
            type: 'vector',
            tiles: [accommodationTilesUrl(this.source)],
            minzoom: 0,
            maxzoom: 22,
            promoteId: 'id'
        });

        // Soft halo behind each cluster
        this.map.addLayer({
            id: `${LAYER_CLUSTERS}-halo`,
            type: 'circle',
            source: SOURCE_ID,
            'source-layer': SOURCE_LAYER,
            filter: ['==', ['get', 'cluster'], true],
            layout: {
                'circle-sort-key': count
            },
            paint: {
                'circle-color': primary,
                'circle-opacity': 0.18,
                'circle-radius': clusterRadius(5)
            }
        });

        this.map.addLayer({
            id: LAYER_CLUSTERS,
            type: 'circle',
            source: SOURCE_ID,
            'source-layer': SOURCE_LAYER,
            filter: ['==', ['get', 'cluster'], true],
            layout: {
                'circle-sort-key': count
            },
            paint: {
                'circle-color': ['interpolate', ['linear'], count, 2, primary, 500, primaryStrong],
                'circle-radius': clusterRadius(0),
                'circle-stroke-width': 2,
                'circle-stroke-color': surface
            }
        });

        this.map.addLayer({
            id: `${LAYER_CLUSTERS}-count`,
            type: 'symbol',
            source: SOURCE_ID,
            'source-layer': SOURCE_LAYER,
            filter: ['==', ['get', 'cluster'], true],
            layout: {
                'text-field': ['to-string', count],
                'text-font': ['Noto Sans Bold'],
                'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 13, 12],
                'symbol-sort-key': count,
                'text-allow-overlap': true
            },
            paint: {
                'text-color': surface
            }
        });

        this.map.addLayer({
            id: LAYER_POINTS,
            type: 'circle',
            source: SOURCE_ID,
            'source-layer': SOURCE_LAYER,
            filter: ['!=', ['get', 'cluster'], true],
            paint: {
                'circle-color': ['case', isActive, accent, primary],
                'circle-radius': ['interpolate', ['linear'], ['zoom'],
                    8, ['case', isActive, 8, 5],
                    14, ['case', isActive, 11, 7],
                    18, ['case', isActive, 14, 10]
                ],
                'circle-stroke-width': 2,
                'circle-stroke-color': surface
            }
        });
    }

    setFeatureState(id, state) {
        if (id != null)
            this.map.setFeatureState({ source: SOURCE_ID, sourceLayer: SOURCE_LAYER, id: id }, state);
    }

    bindMapEvents() {
        [LAYER_CLUSTERS, LAYER_POINTS].forEach(layer => {
            this.map.on('mouseenter', layer, () => this.map.getCanvas().style.cursor = 'pointer');
            this.map.on('mouseleave', layer, () => this.map.getCanvas().style.cursor = '');
        });

        this.map.on('mousemove', LAYER_POINTS, e => {
            const id = e.features[0]?.id;
            if (id === this.hoveredId)
                return;
            this.setFeatureState(this.hoveredId, { hover: false });
            this.hoveredId = id;
            this.setFeatureState(id, { hover: true });
        });
        this.map.on('mouseleave', LAYER_POINTS, () => {
            this.setFeatureState(this.hoveredId, { hover: false });
            this.hoveredId = null;
        });

        // Clusters are computed server side, zooming in splits them up
        this.map.on('click', LAYER_CLUSTERS, e => {
            this.map.easeTo({
                center: e.features[0].geometry.coordinates,
                zoom: Math.min(this.map.getZoom() + 2, 17)
            });
        });

        this.map.on('click', e => {
            const feature = this.map.queryRenderedFeatures(e.point, { layers: [LAYER_POINTS] })[0];
            if (feature)
                this.openDetail(feature);
            else if (!this.map.queryRenderedFeatures(e.point, { layers: [LAYER_CLUSTERS] }).length)
                this.closeDetail();
        });
    }

    async openDetail(feature) {
        const panel = this.shadow.getElementById('detail');
        const request = ++this.detailRequest;

        this.setFeatureState(this.selectedId, { selected: false });
        this.selectedId = feature.id;
        this.setFeatureState(this.selectedId, { selected: true });

        panel.hidden = false;
        panel.scrollTop = 0;
        renderDetailLoading(panel, feature.properties.data, this.t.bind(this));

        try {
            const accommodation = await fetchAccommodationDetail(feature.id);
            // Ignore responses of an accommodation that is no longer selected
            if (request === this.detailRequest)
                renderDetail(panel, accommodation, this.language, this.t.bind(this));
        } catch (e) {
            console.error(e);
            if (request === this.detailRequest)
                renderDetailError(panel, feature.properties.data, this.t.bind(this));
        }
    }

    closeDetail() {
        this.detailRequest++;
        this.setFeatureState(this.selectedId, { selected: false });
        this.selectedId = null;
        const panel = this.shadow.getElementById('detail');
        if (panel)
            panel.hidden = true;
    }

    async addSearchInput() {
        const input = this.shadow.getElementById('searchInput');
        const list = this.shadow.getElementById('searchResults');

        try {
            const districts = await fetchDistricts(this.language);
            autocomplete(input, list, districts, district => {
                this.searchMarker?.remove();
                this.searchMarker = new maplibregl.Marker({ color: this.themeColor('--acco-accent') })
                    .setLngLat(district.lngLat)
                    .addTo(this.map);
                this.map.flyTo({ center: district.lngLat, zoom: 13 });
            });
        } catch (e) {
            console.error(e);
            input.disabled = true;
            input.placeholder = this.t('searchUnavailable');
        }
    }

    render() {
        this.shadow.innerHTML = `
            <style>
                ${style__maplibre}
                ${style}
            </style>
            <div id="webcomponents-map">
                <div class="search-card">
                    <div class="search-card__title">
                        <span class="search-card__dot"></span>${this.t('title')}
                    </div>
                    <div class="search">
                        <svg class="search__icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                        <input id="searchInput" type="search" autocomplete="off" role="combobox"
                            aria-expanded="false" aria-controls="searchResults" aria-label="${this.t('searchPlaceholder')}"
                            placeholder="${this.t('searchPlaceholder')}">
                        <ul id="searchResults" class="search__results" role="listbox" hidden></ul>
                    </div>
                </div>
                <aside id="detail" class="detail" hidden aria-live="polite"></aside>
                <div id="map" class="map"></div>
            </div>
        `;

        this.shadow.getElementById('detail').addEventListener('click', e => {
            if (e.target.closest('[data-close]'))
                this.closeDetail();
        });
    }
}

// Register our first Custom Element named <webcomp-accommodations>
customElements.define('webcomp-accommodations', OpendatahubAccommodations);
