import CatalogLayersStoresRegistry  from 'core/catalog/cataloglayersstoresregistry';
import Service  from 'gui/inputs/service';

class SelectService extends Service {
  constructor(options={}) {
    super(options);
    this.layer = null;
  }

  _getLayerById(layer_id) {
    return CatalogLayersStoresRegistry.getLayerById(layer_id);
  };

  addValue(value) {
    this.state.input.options.values.push(value);
  };

  getKeyByValue({search}={}) {
    const options = this.state.input.options;
    const {value, key} = options;
    this.getData({
      key:value,
      value: key,
      search
    }).then(arrayValues => {
      const [_value] = arrayValues;
      const {$value : key, text: value} = _value;
      this.addValue({
        key,
        value
      })
    }).catch(err => console.log(err));
  };

  getData({layer_id= this.state.input.options.layer_id, key=this.state.input.options.key, value=this.state.input.options.value, search} = {}) {
    const search_value = `${key}|${search}`.trim();
    return new Promise((resolve, reject) => {
      if (!this._layer) this._layer = this._getLayerById(layer_id);
      this._layer.getDataTable({
        suggest: search_value,
        ordering: key
      }).then(response => {
        const values = [];
        const features = response.features;
        for (let i=0; i < features.length; i++) {
          values.push({
            text:features[i].properties[key],
            id: i,
            $value: features[i].properties[value]
          })
        }
        resolve(values);
      }).fail(err => reject(err));
    });
  };
}

export default  SelectService;
