import { G3W_FID } from 'g3w-constants';

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

  /** convert vector features to result features */
  if ('result' === type) {
    return (response.vector.data.features || []).map(f => {
      f.properties[G3W_FID] = f.id;
      return {
        geometry:   f.geometry,
        attributes: f.properties,
        id:         f.id,
      };
    });
  }

  /** @FIXME add description */
  if ('vector' === type) {
    return response.vector.data.features || [];
  }

}