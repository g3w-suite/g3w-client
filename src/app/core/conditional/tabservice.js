const {XHR} = require('core/utils/utils');
const {getAlphanumericPropertiesFromFeature} = require('core/utils/geo');
const ProjectsRegistry = require('core/project/projectsregistry');
export default {
  async getVisibility({qgs_layer_id, expression, feature={}}){
    delete feature.attributes.geometry;
    const _feature = new ol.Feature(feature.geometry);
    const properties = {};
    getAlphanumericPropertiesFromFeature(feature.attributes).forEach(property =>{
      properties[property] = feature.attributes[property]
    });
    _feature.setProperties(properties);
    const GeoJSONFormat = new ol.format.GeoJSON();
    const form_data = GeoJSONFormat.writeFeatureObject(_feature);
    const url = ProjectsRegistry.getCurrentProject().getUrl('expression_eval');
    let visible = true;
    try {
      const response = await XHR.post({
        url,
        contentType: 'application/json',
        data: JSON.stringify({
          qgs_layer_id,
          form_data,
          expression
        })
      });
    } catch(err){
      console.log(err)
    }
    return visible;
  }
}