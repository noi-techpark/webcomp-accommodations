// SPDX-FileCopyrightText: NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import axios from "axios";
import config from "./config";

export function callGet(path, params) {
	// console.log("call = " + config.API_BASE_URL + path);
	// console.log("call params = ");
	// console.log(params);
	return axios
		.get(config.API_BASE_URL + path, {
			params: params
		})
		.then(function(response) {
			// console.log("call response = ");
			// console.log(response.data);
			//console.log(response.config);
			return response.data;
		})
		.catch(function(error) {
			console.log(error.response);
			throw error;
		});
}

export async function fetchAccommodations(pagesize, source) {
	return callGet("/Accommodation", {
            pagesize: pagesize != null ? pagesize.toString() : '500',
		    source: source != null ? source.toString() : '',
			origin: config.ORIGIN
		})
		.then(response => {
			this.accommodations = response.Items;
		})
		.catch(e => {
			console.log(e)
			throw e;
		});
}

export async function fetchDistricts(fields) {
    return callGet("/District", {
        origin: config.ORIGIN,
        fields: fields
    })
    .then(response => {
        this.districts = response;
    })
    .catch(e => {
        console.log(e)
        throw e;
    });
}