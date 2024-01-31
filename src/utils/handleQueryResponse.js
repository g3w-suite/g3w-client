import { response as ResponseParser } from 'utils/parsers';


/**
 * @param { Object } opts
 * @param opts.response
 * @param opts.projections
 * @param opts.layers
 * @param { boolean } opts.wms
 */
export function handleQueryResponse({
  response,
  projections,
  layers,
  wms = true,
} = {}) {
  layers = layers ? layers : [this._layer];
  return ResponseParser.get(layers[0].getInfoFormat())({ response, projections, layers, wms });
}