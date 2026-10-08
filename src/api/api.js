// SPDX-FileCopyrightText: NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import axios from "axios";
import config from "./config";

export function callGet(path, params) {
	return axios
		.get(config.API_BASE_URL + path, {
			params: { origin: config.ORIGIN, ...params }
		})
		.then(response => response.data);
}

// Vector tile URL template of the Geo Api, clustering is done server side
export function accommodationTilesUrl(source) {
	const params = new URLSearchParams({
		operationmode: 'points',
		enableclustering: 'true'
	});
	if (source)
		params.set('source', source);

	return `${config.GEO_BASE_URL}/api/tiles/accommodation/{z}/{x}/{y}.pbf?${params}`;
}

// The Geo Api serves the open data copy of a record, suffixed with "_REDUCED".
// The Content Api expects the plain Id.
export function toContentApiId(tileFeatureId) {
	return String(tileFeatureId).replace(/_REDUCED$/i, '');
}

export function fetchAccommodationDetail(id) {
	return callGet("/Accommodation/" + encodeURIComponent(toContentApiId(id)), {
		removenullvalues: 'true'
	});
}

export function fetchDistricts(language) {
	const titleFields = [...new Set([language, 'de'])].map(lang => `Detail.${lang}.Title`);

	return callGet("/District", {
		fields: [...titleFields, 'Latitude', 'Longitude'].join(',')
	}).then(districts => (Array.isArray(districts) ? districts : districts.Items || [])
		.map(district => ({
			title: titleFields.map(field => district[field]).find(Boolean),
			lngLat: [district.Longitude, district.Latitude]
		}))
		.filter(district => district.title && district.lngLat[0] && district.lngLat[1])
		.sort((a, b) => a.title.localeCompare(b.title)));
}
