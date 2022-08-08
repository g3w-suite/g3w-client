const DataRouterService = require('core/data/routerservice');
const {convertFeatureToGEOJSON} = require('core/utils/geo');

export default {
  async handleFormInput({field, feature,qgs_layer_id}={}){
    const form_data = convertFeatureToGEOJSON(feature);
    const options = field.input.options;
    let {key, value, layer_id=qgs_layer_id, filter_expression, loading} = options;
    loading.state = 'loading';
    let features = [];
    try {
      features = await DataRouterService.getData('expression:expression', {
        inputs: {
          layer_id, // layer id owner of the data
          qgs_layer_id, //
          form_data,
          formatter:0,
          expression: filter_expression.expression
        },
        outputs: false
      });
    } catch(err){}
    //based on input type
    switch (field.input.type){
      case 'select_autocomplete':
        field.input.options.values = [];
        for (let i = 0; i < features.length; i++) {
          field.input.options.values.push({
            key: features[i].properties[key],
            value: features[i].properties[value]
          })
        }
        loading.state = 'ready';
    }
  }
}