import { GEOMETRY_FIELDS } from 'app/constant';
import { getUniqueDomId }  from "./getUniqueDomId";

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
  const {
    headers,
    separator,
    values,
    x,
    y,
  } = data;

  const features  = [];
  const errorrows = [];

  values
    .forEach((row, index) => {
      const properties = {};
      const rowvalues = row.split(separator);
      if (rowvalues.length === headers.length)  {
        const coordinates = [];
        rowvalues.forEach((value, index) => {
          const field = headers[index];
          if (field === x) {
            coordinates[0] = 1 * value;
          }
          if (field === y) {
            coordinates[1] = 1 * value;
          }
          properties[field] = value;
        });
        // check if all coordinates are right
        if (undefined === coordinates.find(value => Number.isNaN(value))) {
          const geometry = new ol.geom.Point(coordinates);
          if (crs !== mapCrs) {
            geometry.transform(crs, mapCrs);
          }
          const feature = new ol.Feature(geometry);
          feature.setId(index); // incremental id
          feature.setProperties(properties);
          features.push(feature);
        }
      } else {
        errorrows.push({ row: index + 1, value: values[index] });
      }
    });

  if (0 === features.length) {
    return Promise.reject();
  }

  if (errorrows.length) {
    GUI.showUserMessage({
      type: 'warning',
      message: 'sdk.mapcontrols.addlayer.messages.csv.warning',
      hooks: {
        footer: {
          template: `<select v-select2="errorrows[0].value" class="skin-color" :search="false" style="width:100%">
              <option v-for="errorrow in errorrows" :key="errorrow.row" :value="errorrow.value">[{{ errorrow.row}}] {{errorrow.value}}</option>
          </select>`,
          data() {
            return {
              errorrows,
            };
          }
        }
      },
      autoclose: false,
    });
  }

  return new ol.layer.Vector({
    source: new ol.source.Vector({ features }),
    name,
    _fields: headers,
    id:      getUniqueDomId(),
    style,
  });

}

async function _createKMZLayer(name, crs, mapCrs, style, data) {
  try {
    return await new Promise(async (resolve, reject) => {
      const zip = new JSZip();
      zip.load(await data.arrayBuffer(data));
      const kmlFiles = zip.file(/.kml$/i);
      /**
       * @TODO handle multiple network links
       * 
       * https://github.com/g3w-suite/g3w-client/pull/430/files#r1232092732
       */
      // get the last kml file (when doc.kml file has a reference to kml inside another folder)
      const kmlFile = kmlFiles[kmlFiles.length - 1];
      if (kmlFile) {
        resolve(_createVectorLayer(name, crs, mapCrs, style, kmlFile.asText(), new ol.format.KML({ extractStyles: false }), "EPSG:4326"));
      } else {
        reject();
      }
    });
  } catch(e) {
    console.warn(e);
    return Promise.reject(e);
  }
}

async function _createZIPLayer(name, crs, mapCrs, style, data) {
  try {
    return await new Promise(async (resolve, reject) => {
      shp(await data.arrayBuffer(data))
        .then(geojson => {
          resolve(_createVectorLayer(name, crs, mapCrs, style, JSON.stringify(geojson), new ol.format.GeoJSON({}), "EPSG:4326"));
        })
        .catch(e => {console.warn(e); reject(e); })
    });
  } catch(e) {
    console.warn(e);
    return Promise.reject(e);
  }
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
export async function createVectorLayerFromFile({
  name,
  type,
  crs,
  mapCrs,
  data,
  style
} = {}) {
  switch (type) {
    case 'gpx'    : return _createVectorLayer(name, crs, mapCrs, style, data, new ol.format.GPX());
    case 'gml'    : return _createVectorLayer(name, crs, mapCrs, style, data, new ol.format.WMSGetFeatureInfo());
    case 'geojson': return _createVectorLayer(name, crs, mapCrs, style, data, new ol.format.GeoJSON());
    case 'kml'    : return _createVectorLayer(name, crs, mapCrs, style, data, new ol.format.KML({ extractStyles: false }),  "EPSG:4326");
    case 'csv'    : return _createCSVLayer(name, crs, mapCrs, style, data);
    case 'kmz'    : return _createKMZLayer(name, crs, mapCrs, style, data);
    case 'zip'    : return _createZIPLayer(name, crs, mapCrs, style, data);
  }
  console.warn('invalid file type', type);
}