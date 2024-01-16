import { GEOMETRY_FIELDS as geometryFields } from 'app/constant';

/**
 * @param layerAttributes
 * @param featureAttributes
 * 
 * @returns { Array }
 */
export function parseAttributes(layerAttributes, featureAttributes) {
  /** @FIXME add description */
  if (layerAttributes && layerAttributes.length) {
    let names = Object.keys(featureAttributes);
    return layerAttributes.filter(attr => names.indexOf(attr.name) > -1)
  }
  return Object
    .keys(featureAttributes)
    .filter(name => -1 === geometryFields.indexOf(name))
    .map(featureAttributesName => ({ name: featureAttributesName, label: featureAttributesName }));
};