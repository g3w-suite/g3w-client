import RasterLayers  from './rasters';
import {Tile as TileLayer} from 'ol/layer';
import {OSM, WMTS as WMTSSource, BingMaps} from "ol/source";
import {getWidth} from 'ol/extent';
import {getTopLeft} from 'ol/extent';
import WMTS from 'ol/tilegrid/WMTS';

const BaseLayers = {};

BaseLayers.OSM = {};

BaseLayers.OSM.get = function({title, id, url}={}) {
  return new TileLayer({
    source: new OSM({
      url
    }),
    id: id || 'osm',
    title: title || 'OSM',
    basemap: true
  });
};

BaseLayers.TMS =  {
  get({visible=false, url=null, source_type="xyz", minZoom, maxZoom, projection, attributions}={}) {
    let layer;
    switch(source_type) {
      case 'xyz':
        layer = RasterLayers.XYZLayer({
          url,
          visible,
          minZoom,
          maxZoom,
          attributions,
          projection
        });
        break;
      case 'arcgismapserver':
        layer = TiledArgisMapServer({
          url,
          visible,
          projection,
          attributions
        });
        break;
      default:
    }
    return layer;
  }
};

BaseLayers.WMS = {
  get({url, projection, attributions, layers, singleTile=false, opacity=1}) {
    return RasterLayers.WMSLayer({
      url,
      projection,
      attributions,
      layers,
      tiled: singleTile,
      opacity
    })
  }
};

BaseLayers.WMTS = {
  get({url, layer, visible, attributions, matrixSet, projection, requestEncoding, style='default', format='image/png', opacity=0.7} = {}) {
    const projectionExtent = projection.getExtent();
    const resolutions = new Array(14);
    const size = getWidth(projectionExtent) / 256;
    const matrixIds = new Array(14);
    for (var z = 0; z < 14; ++z) {
      // generate resolutions and matrixIds arrays for this WMTS
      resolutions[z] = size / Math.pow(2, z);
      matrixIds[z] = z;
    }
    return new TileLayer({
      opacity,
      source: new WMTSSource({
        url,
        projection,
        layer,
        matrixSet,
        requestEncoding,
        format,
        attributions,
        tileGrid: new WMTS({
          origin: getTopLeft(projectionExtent),
          resolutions: resolutions,
          matrixIds: matrixIds
        }),
        style
      })
    });
  }
};

BaseLayers.BING = {};

BaseLayers.BING.get = (config={})=>{
  const imagerySet = config.imagerySet || 'Aerial'; // 'Road', 'AerialWithLabels', 'Aerial'
  return new TileLayer({
    name: imagerySet,
    visible: false,
    preload: Infinity,
    source: new BingMaps({
      imagerySet: imagerySet,
      key: config.key
    }),
    basemap: true
  });
};

export default  BaseLayers;
