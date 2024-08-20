import { downloadCSV }                          from 'utils/downloadCSV';
import { getAlphanumericPropertiesFromFeature } from 'utils/getAlphanumericPropertiesFromFeature';

export function downloadCSVLayerFeatures({
  layer,
  alias = true,
} = {}) {
  //get headers
  const attributes = Object.keys(layer.features[0].attributes);
  const properties = getAlphanumericPropertiesFromFeature(attributes);
  const headers    = !alias ? properties : properties.map((property) => {
    const attribute = layer.attributes.find(attribute => attribute.name === property);
    return attribute ? attribute.label : property;
  });
  const items = layer.features.map((feature) => {
    const attributes = feature.attributes;
    const item = {};
    properties.forEach((property, index) => {
      const key = !alias && property || headers[index];
      item[key] = attributes[property];
    });
    return item;
  });

  downloadCSV({
    filename: layer.id,
    items
  })
}