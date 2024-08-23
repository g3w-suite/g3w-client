import CatalogLayersStoresRegistry from 'store/catalog-layers';

const Service = require('gui/inputs/service');

module.exports = class SelectService extends Service {
  constructor(opts = {}) {
    super(opts);
    this.layer = null;
  }

  _getLayerById(layer_id) {
    return CatalogLayersStoresRegistry.getLayerById(layer_id);
  };

  addValue(value) {
    this.state.input.options.values.push(value);
  };

  getKeyByValue({ search } = {}) {
    const { value, key } = this.state.input.options;
    return new Promise((resolve, reject) => {
      this.getData({
        key:   value,
        value: key,
        search
      }).then(arrayValues => {
        const [_value] = arrayValues;
        const {$value : key, text: value} = _value;
        this.addValue({
          key,
          value
        })
        resolve(this.state.input.options.values);
      }).catch(e => {
        console.warn(e);
        reject(e);
      });
    })
  };

  /**
   *
   * @param layer_id
   * @param key
   * @param value
   * @param search
   * @return {Promise<unknown>}
   */
  getData({
    layer_id = this.state.input.options.layer_id,
    key      = this.state.input.options.key,
    value    = this.state.input.options.value,
    search,
  } = {}) {
    const search_value = `${key}|${search}`.trim();
    return new Promise((resolve, reject) => {
      if (!this._layer) { this._layer = this._getLayerById(layer_id) }

      this._layer.getDataTable({
        suggest:  search_value,
        ordering: key
      }).then(response => {
        const values = response.features.map(f =>({
          text:   f.properties[key],
          id:     f.properties[value],
          $value: f.properties[value]
        }))
        resolve(values);
      }).fail(e => { console.warn(e); reject(e) });
    });
  };
};
