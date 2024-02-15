/**
 * @file
 * @since v3.6
 */

import CatalogLayersStoresRegistry from 'store/catalog-layers';
import ProjectsRegistry            from 'store/projects';
import DataRouterService           from 'services/data';
import G3WObject                   from 'core/g3wobject';

const { XHR, createSingleFieldParameter }                          = require('utils');
const { sanitizeFidFeature, getAlphanumericPropertiesFromFeature } = require('utils/geo');

class RelationsService extends G3WObject {

  createUrl(options={}) {
    const {
      layer     = {},
      relation  = {},
      fid,
      type      = 'data', // type : <editing, data, xls>
      formatter = 1
    } = options;

    const {
      father,
      child,
      referencedLayer,
      referencingLayer,
      id: relationId
    } = relation;

    return `${ProjectsRegistry.getCurrentProject().getLayerById(undefined === father ? (layer.id === referencedLayer ? referencingLayer: referencedLayer) : (layer.id === father ? child: father)).getUrl(type)}?relationonetomany=${relationId}|${sanitizeFidFeature(fid)}&formatter=${formatter}`;
  }

  getRelations(options={}) {
    return XHR.get({ url: this.createUrl(options) });
  };

  /**
   * Get relations NM
   * 
   * @param nmRelation
   * @param features
   * @returns {Promise<[]>}
   */
  async getRelationsNM({nmRelation, features=[]}={}) {
    const {
      referencedLayer,
      referencingLayer,
      fieldRef: {
        referencingField,
        referencedField
      }
    } = nmRelation;

    let response;

    if (features.length) {
      response = await DataRouterService
        .getData('search:features', {
          inputs: {
            layer: CatalogLayersStoresRegistry.getLayerById(referencedLayer),
            filter: `${createSingleFieldParameter({
              field: referencedField,
              value: features.map(feature => feature.attributes[referencingField]),
              logicop: 'OR'
            })}`,
            formatter: 1, // set formatter to
            search_endpoint: 'api'
          },
          outputs: null
        });
    }

    return (
      features.length &&
      response.data &&
      response.data[0] &&
      Array.isArray(response.data[0].features)
      )
        ? response.data[0].features.map(feature => {
          return {
            id: feature.getId(),
            attributes: getAlphanumericPropertiesFromFeature(feature.getProperties()).reduce((acc, prop) => {
              acc[prop] = feature.get(property);
              return acc;
            }, {}),
            geometry: feature.getGeometry()
          }
        })
        : []; // empty relation
  }

  save(options={}) {
    return XHR.fileDownload({
      url: this.createUrl(options),
      httpMethod: "GET"
    });
  };

}

export default new RelationsService();