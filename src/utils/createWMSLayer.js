import { getUniqueDomId } from 'utils/getUniqueDomId';

const { WMSLayer } = require('core/layers/imagelayer');

/**
 * @param { Object } wms 
 * @param { string } wms.url
 * @param { string } wms.name
 * @param wms.projection
 * @param { Array } wms.layers
 * 
 * @returns {{ olLayer, wmslayer: WMSLayer }}
 */
export function createWMSLayer({
  url,
  name,
  projection,
  layers = [],
} = {}) {
  const id       = name || getUniqueDomId();
  const wmslayer = new WMSLayer({ id, layers, projection, url });
  const olLayer  =  wmslayer.getOLLayer();
  olLayer.set('id', id); // set unique id
  olLayer.set('name', name || id);
  return {
    wmslayer,
    olLayer,
  }
}