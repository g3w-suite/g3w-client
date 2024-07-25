import { getDefaultLayerStyle } from 'utils/getDefaultLayerStyle';

/**
 * @returns style function 
 */
export function createStyleFunctionToVectorLayer(opts = {}) {
  return Object.assign(
    (feat, res) => {
      opts.color = opts.color.rgba ? 'rgba(' + [opts.color.rgba.r, opts.color.rgba.g, opts.color.rgba.b, opts.color.rgba.a].join() + ')' : opts.color;
      const style = getDefaultLayerStyle(feat.getGeometry().getType(), { color: opts.color });
      if (opts.field) {
        style.setText(new ol.style.Text({
          text: `${feat.get(opts.field)}`,
          font: 'bold',
          scale: 2,
          offsetY: 15,
          fill: new ol.style.Fill({ color: opts.color }),
          stroke: new ol.style.Stroke(({ color: '#FFF', width: 2 })),
        }));
      }
      return style;
    }, { _g3w_options: opts }
  );
};