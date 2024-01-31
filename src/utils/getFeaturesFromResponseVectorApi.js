import { convertVectorFeaturesToResultFeatures } from 'utils/convertVectorFeaturesToResultFeatures';

/**
 * @param response
 * @param { Object } opts
 * @param { 'vector' | 'results' } opts.type
 * 
 * @returns { Array | null | * }
 */
export function getFeaturesFromResponseVectorApi(response = {}, { type = 'vector' } = {}) {

  /** In case of result missing or false (error) */
  if (!response.result) {
    return null;
  }

  /** @FIXME add description */
  if ('result' === type) {
    return convertVectorFeaturesToResultFeatures(response.vector.data.features || []);
  }

  /** @FIXME add description */
  if ('vector' === type) {
    return response.vector.data.features || [];
  }

}