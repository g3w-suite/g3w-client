import { GEOMETRY_FIELDS } from 'g3w-constants';

/**
 * @param layerAttributes
 * @param featureAttributes
 * 
 * @returns { Array }
 */
export function parseAttributes(layerAttributes=[], featureAttributes) {
  /** @FIXME add description */
  if (layerAttributes && layerAttributes.length > 0) {
    return layerAttributes.filter(attr => Object.keys(featureAttributes).indexOf(attr.name) > -1)
  }
  return Object
    .keys(featureAttributes)
    .filter(name => -1 === GEOMETRY_FIELDS.indexOf(name))
    .map(featureAttributesName => ({ name: featureAttributesName, label: featureAttributesName }));
  }