import { G3W_FID }                              from 'app/constant';
import { getAlphanumericPropertiesFromFeature } from 'utils/getAlphanumericPropertiesFromFeature';
import { convertFeatureToGEOJSON }              from 'utils/convertFeatureToGEOJSON';

/**
 * Convert feature to form Data for expression/expression_eval request
 * 
 * @param feature
 */
export function getFormDataExpressionRequestFromFeature(feature) {
  delete feature.attributes.geometry;

  const _feature   = new ol.Feature(feature.geometry);
  const properties = {};

  getAlphanumericPropertiesFromFeature(feature.attributes)
    .filter(p => G3W_FID !== p)
    .forEach(p => properties[p] = feature.attributes[p]);

  _feature.setProperties(properties);
  _feature.setId(feature.attributes[G3W_FID]);

  return convertFeatureToGEOJSON(_feature);
}