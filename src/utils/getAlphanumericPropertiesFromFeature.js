import { GEOMETRY_FIELDS } from 'app/constant';

/**
 * @param { Array } properties
 * 
 * @returns { Array }
 */
export function getAlphanumericPropertiesFromFeature(properties = []) {
  return (Array.isArray(properties) ? properties : Object.keys(properties)).filter(p => !GEOMETRY_FIELDS.includes(p));
}