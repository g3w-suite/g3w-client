import { getDefaultLayerStyle } from 'utils/getDefaultLayerStyle';

export function createStyleFunctionToVectorLayer(options = {}) {
  const styleFunction = (feature, resolution) => {
    let { color, field } = options;
    color = color.rgba ? 'rgba(' + color.rgba.r + ',' + color.rgba.g + ',' + color.rgba.b + ','  + color.rgba.a + ')': color;
    const style = getDefaultLayerStyle(feature.getGeometry().getType(), { color });
    if (field) {
      style.setText(new ol.style.Text({
        text: `${feature.get(field)}`,
        font: 'bold',
        scale: 2,
        offsetY: 15,
        fill: new ol.style.Fill({ color }),
        stroke: new ol.style.Stroke(({ color: '#FFF', width: 2 })),
      }));
    }
    return style;
  };
  styleFunction._g3w_options = options;
  return styleFunction;
};