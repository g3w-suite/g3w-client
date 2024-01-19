/**
 * @param styleObj 
 * @returns { ol.style.Style | undefined } style
 */
export function createLayerStyle(styleObj) {
  // skip when no style object is passed
  if (!styleObj) {
    return;
  }

  return new ol.style.Style(
    Object
    .entries(styleObj)
    .reduce((styles, [type, config]) => {
      if ('point' === type && config.icon) {
        styles.image = new ol.style.Icon({ src: config.icon.url, imageSize: config.icon.width });
      }
      if ('line' === type) {
        styles.stroke = new ol.style.Stroke({ color: config.color, width: config.width });
      }
      if ('polygon' === type) {
        styles.fill = new ol.style.Fill({ color: config.color });
      }
      return styles;
    }, {})
  );
}