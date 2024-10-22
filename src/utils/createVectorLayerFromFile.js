import { GEOMETRY_FIELDS } from 'g3w-constants';
import { getUniqueDomId }  from 'utils/getUniqueDomId';

function _createVectorLayer(name, crs, mapCrs, style, data, format, epsg) {
  epsg = undefined === epsg ? crs : epsg;

  const features = format.readFeatures(data, { dataProjection: epsg, featureProjection: mapCrs || epsg });

  // skip when no features
  if (0 === features.length) {
    return;
  }

  // ignore kml property [`<styleUrl>`](https://developers.google.com/kml/documentation/kmlreference)
  if (format instanceof ol.format.KML) {
    features.forEach(f => f.unset('styleUrl'));
  }

  return new ol.layer.Vector({
    source: new ol.source.Vector({ features }),
    name,
    _fields: Object.keys(features[0].getProperties()).filter(prop => GEOMETRY_FIELDS.indexOf(prop) < 0),
    id:      getUniqueDomId(),
    style
  });
}

function _createCSVLayer(name, crs, mapCrs, style, data) {
  const features  = [];
  const errors = [];

  data.values.forEach((row, i) => {
    const props = {};
    const cols = row.split(data.separator);
    if (cols.length === data.headers.length)  {
      const coords = [];
      cols.forEach((value, i) => {
        if (data.headers[i] === data.x) {
          coords[0] = 1 * value;
        }
        if (data.headers[i] === data.y) {
          coords[1] = 1 * value;
        }
        props[data.headers[i]] = value;
      });
      // check if all coordinates are right
      if (coords.every(d => !Number.isNaN(d))) {
        const geometry = new ol.geom.Point(coords);
        if (crs !== mapCrs) {
          geometry.transform(crs, mapCrs);
        }
        const feat = new ol.Feature(geometry);
        feat.setId(i); // incremental id
        feat.setProperties(props);
        features.push(feat);
      }
    } else {
      errors.push({ row: i + 1, value: data.values[i] });
    }
  });

  if (0 === features.length) {
    return Promise.reject();
  }

  if (errors.length) {
    GUI.showUserMessage({
      type: 'warning',
      message: 'sdk.mapcontrols.addlayer.messages.csv.warning',
      hooks: {
        footer: {
          template: `<select v-select2="errors[0].value" class="skin-color" :search="false" style="width:100%"><option v-for="e in errors" :key="e.row" :value="e.value">[{{ e.row}}] {{e.value}}</option></select>`,
          data: () => ({ errors }),
        }
      },
      autoclose: false,
    });
  }

  return new ol.layer.Vector({
    source: new ol.source.Vector({ features }),
    name,
    _fields: data.headers,
    id:      getUniqueDomId(),
    style,
  });

}

async function _createKMZLayer(name, crs, mapCrs, style, data) {
  const zip = new JSZip();
  zip.load(await data.arrayBuffer(data));
  /**
   * @TODO handle multiple network links
   * 
   * https://github.com/g3w-suite/g3w-client/pull/430/files#r1232092732
   */
  // get the last kml file (when doc.kml file has a reference to kml inside another folder)
  return _createVectorLayer(name, crs, mapCrs, style, zip.file(/.kml$/i).at(-1).asText(), new ol.format.KML({ extractStyles: false }), "EPSG:4326");
}

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
  switch (type) {
    case 'gpx'    : return _createVectorLayer(name, crs, mapCrs, style, data, new ol.format.GPX());
    case 'gml'    : return _createVectorLayer(name, crs, mapCrs, style, data, new ol.format.WMSGetFeatureInfo());
    case 'geojson': return _createVectorLayer(name, crs, mapCrs, style, data, new ol.format.GeoJSON());
    case 'zip'    : return _createVectorLayer(name, crs, mapCrs, style, JSON.stringify(await shp(await data.arrayBuffer(data))), new ol.format.GeoJSON({}), "EPSG:4326");
    case 'kml'    : return _createVectorLayer(name, crs, mapCrs, style, data, new ol.format.KML({ extractStyles: false }), "EPSG:4326");
    case 'kmz'    : return _createKMZLayer(name, crs, mapCrs, style, data);
    case 'csv'    : return _createCSVLayer(name, crs, mapCrs, style, data);
  }
  console.warn('invalid file type', type);
}