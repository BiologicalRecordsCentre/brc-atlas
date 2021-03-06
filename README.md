### BRC Atlas library
The BRC Atlas library is a Javascript library for providing both easy and flexible APIs for creating static and slippy maps for atlas projects.

## Installing
You can get the javscript amd css builds from 
the [GitHub repo](https://github.com/BiologicalRecordsCentre/brc-atlas/tree/master/dist)
or include them in code directly from a CDN, e.g:
```
<script src="https://cdn.jsdelivr.net/gh/biologicalrecordscentre/brc-atlas/dist/brcatlas.umd.js"></script>
```
or a minified version generated by the CDN:
```
<script src="https://cdn.jsdelivr.net/gh/biologicalrecordscentre/brc-atlas/dist/brcatlas.umd.min.js"></script>
```
You will also need to inlcude the associated CSS, e.g.:
```
<link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/gh/biologicalrecordscentre/brc-atlas/dist/brcatlas.umd.css">
```
or a minified version generated by the CDN:
```
<link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/gh/biologicalrecordscentre/brc-atlas/dist/brcatlas.umd.min.css">
```
The CDN also exposes some geojson assets including:

- A geojson outline map of Britain, Ireland and the Channel islands (```https://cdn.jsdelivr.net/gh/biologicalrecordscentre/brc-atlas/dist/assets/GB-I-CI-27700-reduced.geojson```).
- A 100 km grid for Britain and Ireland (```https://cdn.jsdelivr.net/gh/biologicalrecordscentre/brc-atlas/dist/assets/GB-I-grid-27700-reduced.geojson```).

## API documentation and code examples
For details of the API, view the [JSDoc API documentation](https://biologicalrecordscentre.github.io/brc-atlas/docs/api/).

There are also a number of [working examples](https://biologicalrecordscentre.github.io/brc-atlas/docs/).
