// SPDX-FileCopyrightText: NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

export default {
	API_BASE_URL: process.env.TOURISM_BASE_PATH || 'https://tourism.opendatahub.com/v1',
	GEO_BASE_URL: process.env.GEO_BASE_PATH || 'https://geo.api.opendatahub.com',
	BASEMAP_STYLE_URL: process.env.BASEMAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/positron',
	ORIGIN: 'webcomp-accommodations'
};
