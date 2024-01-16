import { GEOMETRY_FIELDS as geometryFields } from 'app/constant';

/**
 * @param { Array } properties
 * 
 * @returns { Array }
 */
export function getAlphanumericPropertiesFromFeature(properties = []) {
  properties = Array.isArray(properties) ? properties : Object.keys(properties);
  return properties.filter(prop => -1 === geometryFields.indexOf(prop));
}