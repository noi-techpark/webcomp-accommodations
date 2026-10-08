<!--
SPDX-FileCopyrightText: NOI Techpark <digital@noi.bz.it>

SPDX-License-Identifier: CC0-1.0
-->

# Webcomponent Opendatahub Accommodations 

[![REUSE Compliance](https://github.com/noi-techpark/webcomp-boilerplate/actions/workflows/reuse.yml/badge.svg)](https://github.com/noi-techpark/odh-docs/wiki/REUSE#badges)
[![REUSE status](https://api.reuse.software/badge/github.com/noi-techpark/webcomp-boilerplate)](https://api.reuse.software/info/github.com/noi-techpark/webcomp-boilerplate)
[![CI/CD](https://github.com/noi-techpark/webcomp-boilerplate/actions/workflows/main.yml/badge.svg)](https://github.com/noi-techpark/webcomp-boilerplate/actions/workflows/main.yml)

This webcomponent shows the accommodations of the Open Data Hub on an interactive map.
The map is rendered from clustered vector tiles of the [Open Data Hub Geo Api](https://geo.api.opendatahub.com/swagger/index.html),
the [Open Data Hub Tourism Api](https://tourism.opendatahub.com/swagger/index.html) is only called to load the details of a selected accommodation.

- [Webcomponent Accommodations](#webcomponent-opendatahub-accommodations)
  - [Usage](#usage)
    - [Attributes](#attributes)
    - [Styling](#styling)
    - [Configuration](#configuration)
  - [How it works](#how-it-works)
    - [Vector tiles from the Geo Api](#vector-tiles-from-the-geo-api)
    - [Details from the Tourism Api](#details-from-the-tourism-api)
    - [District search](#district-search)
    - [Basemap](#basemap)
    - [Changes compared to the previous REST based version](#changes-compared-to-the-previous-rest-based-version)
  - [Getting started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Source code](#source-code)
    - [Dependencies](#dependencies)
    - [Build](#build)
  - [Deployment](#deployment)
  - [Run with docker](#run-with-docker)
    - [Installation](#installation)
    - [Start the docker containers](#start-the-docker-containers)
    - [Publish a new version of your webcomponent](#publish-a-new-version-of-your-webcomponent)
    - [Stop the docker containers](#stop-the-docker-containers)
    - [Delete your webcomponents from the store](#delete-your-webcomponents-from-the-store)
  - [Information](#information)
    - [Support](#support)
    - [Contributing](#contributing)
    - [Documentation](#documentation)
    - [Boilerplate](#boilerplate)
    - [License](#license)

## Usage

Include the webcomponent script file `dist/webcomp-accommodations.min.js` in your HTML and define the web component like this:

```html
<webcomp-accommodations centermap="46.641532,11.355583" zoommap="10" source="lts" language="en"></webcomp-accommodations>
```

### Attributes

#### centermap

Initial center of the map as `latitude,longitude`.

Type: string
Default: "46.6,11.35"

#### zoommap

Initial zoom level of the map.

Type: number
Default: 9

#### source

Only show accommodations of these sources, comma separated. Empty shows all sources.

Type: string
Options: "lts", "discoverswiss"

#### language

Language of the labels and of the accommodation details. Falls back to English.

Type: string
Options: "en", "de", "it"
Default: "en"

### Styling

The colors are defined as CSS custom properties and can be overridden by the embedding page:

```css
webcomp-accommodations {
  height: 500px;
  --acco-primary: #0e6b5c;        /* points, clusters, buttons */
  --acco-primary-strong: #08453b; /* large clusters */
  --acco-accent: #e07a2e;         /* hovered / selected accommodation */
}
```

### Configuration

The api endpoints are configured at build time with a `.env` file (see `.env.example`):

| Variable | Default |
|---|---|
| `TOURISM_BASE_PATH` | `https://tourism.opendatahub.com/v1` |
| `GEO_BASE_PATH` | `https://geo.api.opendatahub.com` |
| `BASEMAP_STYLE_URL` | `https://tiles.openfreemap.org/styles/positron` |

## How it works

```
                 vector tiles (.pbf, clustered)
  Geo Api  ─────────────────────────────────────▶  map: clusters + points
                                                        │ click on a point
  Tourism Api  ◀── GET /Accommodation/{id} ─────────────┘
               ───▶ detail panel (image, category, address, contacts, license)
```

### Vector tiles from the Geo Api

The accommodations are not downloaded as a list anymore. [MapLibre GL](https://maplibre.org/) requests
[Mapbox Vector Tiles](https://github.com/mapbox/vector-tile-spec) for the visible part of the map only:

```
GET {GEO_BASE_PATH}/api/tiles/accommodation/{z}/{x}/{y}.pbf?operationmode=points&enableclustering=true&source={source}
```

| Parameter | Value |
|---|---|
| `type` (path) | `accommodation` |
| `operationmode` | `points` |
| `enableclustering` | `true`, the Geo Api clusters the points server side up to zoom level 16 |
| `source` | value of the `source` attribute, omitted when empty |

Each tile feature (source layer `accommodation`) carries these properties:

| Property | Description |
|---|---|
| `id` | Id of the accommodation, for clusters the smallest Id of the cluster |
| `data` | Name (Shortname) of the accommodation |
| `cluster` | `true` if the feature is a cluster |
| `count` | Number of accommodations in the cluster |

Clusters are drawn as circles with the count, sized by count and zoom level. Clicking a cluster zooms in by
two levels. From zoom level 17 the Geo Api returns all points unclustered.

### Details from the Tourism Api

The Tourism Api is only called when an accommodation is clicked:

```
GET {TOURISM_BASE_PATH}/Accommodation/{id}?removenullvalues=true&origin=webcomp-accommodations
```

The Geo Api serves the open data copy of a record, its Id ends with `_REDUCED`
(e.g. `C579122163B611D4AAEE00105A4AB73F_REDUCED`). The suffix is removed before calling the Tourism Api,
which expects the plain Id. While the details load, the name from the tile is shown immediately.

The detail panel shows the first image, type, category (stars/suns/flowers), altitude, address, phone, e-mail,
website, a directions link and source / license / provider. Texts are taken from `AccoDetail` in the
configured `language`, with fallback to `en`, `de`, `it`. All values are escaped before rendering.

### District search

The search box loads the districts once from the Tourism Api
(`GET /District?fields=Detail.{language}.Title,Detail.de.Title,Latitude,Longitude`) and matches the
entered text anywhere in the name. Selecting a district flies the map to it and sets a marker.

### Basemap

The basemap is the [OpenFreeMap](https://openfreemap.org/) Positron vector style (no api key required),
configurable with `BASEMAP_STYLE_URL`. Any MapLibre compatible style that provides `glyphs` with the
font `Noto Sans Bold` can be used (needed for the cluster labels).

### Changes compared to the previous REST based version

| Before | Now |
|---|---|
| Leaflet + leaflet.markercluster | MapLibre GL |
| All accommodations loaded with `GET /Accommodation?pagesize=500` at startup | Vector tiles for the visible area only, clustered by the Geo Api |
| Only the first `pagesize` accommodations were shown | All accommodations of the selected sources are shown |
| Popup built from the list response | Detail panel loaded on click from `GET /Accommodation/{id}` |
| `pagesize` attribute | removed |
| District search used `GpsPoints.position` (empty in the api) | Uses `Latitude` / `Longitude` |
| – | `language` attribute (`en`, `de`, `it`) |
| node-sass, Node 12/16 | sass (Dart Sass), Node 20 |

## Getting started

These instructions will get you a copy of the project up and running
on your local machine for development and testing purposes.

### Prerequisites

To build the project, the following prerequisites must be met:

- Node 20.19 or newer / NPM 10 (see `.nvmrc`)

For a ready to use Docker environment with all prerequisites already installed and prepared, you can check out the [Docker environment](#run-with-docker) section.

### Source code

Get a copy of the repository:

```bash
git clone https://github.com/noi-techpark/webcomp-accommodations.git
```

Change directory:

```bash
cd webcomp-accommodations/
```

### Dependencies

Download all dependencies:

```bash
npm install
```

Create the `.env` file with the api endpoints (the example points to the test environment):

```bash
cp .env.example .env
```

### Build

Build and start the project:

```bash
npm run start
```

The application will be served and can be accessed at [http://localhost:8990](http://localhost:8990).

## Deployment

To create the distributable files, execute the following command:

```bash
npm run build
```

## Run with docker

If you want to test the webcomponent on a local instance of the [webcomponent store](https://webcomponents.opendatahub.com/) to make sure that it will run correctly also on the real store.
You can also access the webcomponent running in a simple separated docker container outside of the store.

If you have already developed your webcomponent and now want to test it on a local instance of the store, just copy `.env.example`, `docker-compose.yml`, `wcs-manifest.json` and `infrastructure/docker` into your root folder. Adjust your `package.json` and `wcs-manifest.json` files as described on the top of this readme. Then follow the instructions below.

For accessing the webcomponent in a separated docker in the browser you will need a server (e.g. webpack dev-server) that is hosting a page which includes the webcomponent tag, as well as the script defining it. This page needs to be hosted on port 8080 as specified in your docker-compose file.

### Installation

Install [Docker](https://docs.docker.com/install/) (with Docker Compose) locally on your machine.

### Start the docker containers
- Create a .env file: <br>
  `cp .env.example .env`
- [Optional] Adjust port numbers in .env if they have conflicts with services already running on your machine
- Start the store with: <br>
  `docker-compose up -d`
- Wait until the containers are running. You can check the current state with: <br>
  `docker-compose logs --tail 500 -f`
- Access the store in your browser on: <br>
  `localhost:8999`
- Access webcomponent running in separated docker in your browser on: <br>
  `localhost:8990`

### Publish a new version of your webcomponent
- Increase version number WC_VERSION in your .env file
- Then run: `docker-compose up wcstore-cli`

### Stop the docker containers
- `docker-compose stop`

### Delete your webcomponents from the store
- `[sudo] rm -f workspace`
- `docker-compose rm -f -v postgres`


## Information

### Support

For support, please contact [help@opendatahub.com](mailto:help@opendatahub.com).

### Contributing

If you'd like to contribute, please follow the following instructions:

- Fork the repository.
- Checkout a topic branch from the `main` branch.
- Make sure the tests are passing.
- Create a pull request against the `main` branch.

A more detailed description have a look at our [Getting Started
Guide](https://github.com/noi-techpark/odh-docs/wiki/Contributor-Guidelines:-Getting-started).

### Documentation

More documentation can be found at [https://docs.opendatahub.com](https://docs.opendatahub.com).

### Boilerplate

The project uses this boilerplate: [https://github.com/noi-techpark/webcomp-boilerplate](https://github.com/noi-techpark/webcomp-boilerplate).

### License

The code in this project is licensed under the GNU AFFERO GENERAL PUBLIC LICENSE Version 3 license. See the [LICENSE.md](LICENSE.md) file for more information.

### REUSE

This project is [REUSE](https://reuse.software) compliant, more information about the usage of REUSE in NOI Techpark repositories can be found [here](https://github.com/noi-techpark/odh-docs/wiki/Guidelines-for-developers-and-licenses#guidelines-for-contributors-and-new-developers).

Since the CI for this project checks for REUSE compliance you might find it useful to use a pre-commit hook checking for REUSE compliance locally. The [pre-commit-config](.pre-commit-config.yaml) file in the repository root is already configured to check for REUSE compliance with help of the [pre-commit](https://pre-commit.com) tool.

Install the tool by running:
```bash
pip install pre-commit
```
Then install the pre-commit hook via the config file by running:
```bash
pre-commit install
```

