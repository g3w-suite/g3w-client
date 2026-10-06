import { unzip }           from 'fflate';
import { toGeoJSON }       from 'utils/toGeoJSON';

import { GEOMETRY_FIELDS } from 'g3w-constants';
import { getUniqueDomId }  from 'utils/getUniqueDomId';

/**
 * @param { Object } file
 * @param { string } file.name
 * @param file.type
 * @param file.crs
 * @param file.mapCrs
 * @param file.data
 * @param file.style
 * 
 * @returns { Promise } layer
 */
export async function createVectorLayerFromFile({ name, type, crs, mapCrs, data, style } = {}) {
  const errors = [];
  const epsg   = ['zip', 'kml', 'kmz'].includes(type) ? 'EPSG:4326' : crs;
  let features = [];

  // SHAPE FILE
  if ('zip' === type) {
    data = JSON.stringify(await toGeoJSON(await data.arrayBuffer())); // un-zip folder data
  }

  // KMZ FILE
  if ('kmz' === type) {
    const kmzData = new Uint8Array(await data.arrayBuffer());
    const archive = await new Promise((resolve, reject) => {
      unzip(kmzData, (error, files) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(files);
      });
    });
    const kmlPath = Object.keys(archive).filter(path => /\.kml$/i.test(path)).at(-1); // get last kml file within folder
    if (!kmlPath) {
      throw new Error('KMZ archive does not contain a KML file');
    }
    data = new TextDecoder().decode(archive[kmlPath]);
  }

  // CSV FILE
  if ('csv' === type) {
    data.values.forEach((row, i) => {
      const props = {};
      const cols = row.split(data.separator);
      if (cols.length !== data.headers.length) {
        return errors.push({ row: i + 1, value: data.values[i] });
      }
      const coords = [];
      cols.forEach((value, i) => {
        if (data.headers[i] === data.x) { coords[0] = 1 * value; }
        if (data.headers[i] === data.y) { coords[1] = 1 * value; }
        props[data.headers[i]] = value;
      });
      // check if all coordinates are right
      if (coords.every(d => !Number.isNaN(d))) {
        const feat = new ol.Feature((new ol.geom.Point(coords)).transform(crs, mapCrs));
        feat.setId(i); // incremental id
        feat.setProperties(props);
        features.push(feat);
      }
    });
  }

  if ('csv' !== type) {
    features = ({
      'gpx'    : new ol.format.GPX(),
      'gml'    : new ol.format.WMSGetFeatureInfo(),
      'geojson': new ol.format.GeoJSON(),
      'zip'    : new ol.format.GeoJSON(),
      'kml'    : new ol.format.KML({ extractStyles: false }),
      'kmz'    : new ol.format.KML({ extractStyles: false }),
    })[type].readFeatures(data, { dataProjection: epsg, featureProjection: mapCrs ?? epsg });
  }

  // ignore kml property [`<styleUrl>`](https://developers.google.com/kml/documentation/kmlreference)
  if (['kml', 'kmz'].includes(type)) {
    features.forEach(f => f.unset('styleUrl'));
  }

  if (errors.length) {
    GUI.showUserMessage({
      type: 'warning',
      message: 'The result in the map is partial due to the presence of the below incorrect records list:',
      hooks: {
        footer: {
          template: /* html */
          `<x-select
            style    = "width:100%"
            :value   = "errors[0].value"
            @change  = "errors[0].value = $event.target.value"
            class    = "skin-color"
          >
            <x-option
              v-for     = "e in errors"
              :key      = "e.row"
              :value    = "e.value"
            >[{{ e.row}}] {{e.value}}</x-option>
          </x-select>`,

          data: () => ({ errors }),
        }
      },
    });
  }

  if (features.length) {
    return new ol.layer.Vector({
      source: new ol.source.Vector({ features }),
      name,
      _fields: 'csv' === type ? data.headers : Object.keys(features[0].getProperties()).filter(prop => GEOMETRY_FIELDS.indexOf(prop) < 0),
      id:      getUniqueDomId(),
      style
    });
  }

  return Promise.reject();
}