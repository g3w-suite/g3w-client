import CatalogLayersStoresRegistry from 'store/catalog-layers';

const { inherit, base } = require('utils');
const Service = require('gui/inputs/service');

function SelectService(options={}) {
  base(this, options);
  this.layer = null;
}

inherit(SelectService, Service);

const proto = SelectService.prototype;

proto._getLayerById = function(layer_id) {
  return CatalogLayersStoresRegistry.getLayerById(layer_id);
};

proto.addValue = function(value) {
  this.state.input.options.values.push(value);
};

proto.getKeyByValue = function({ search }={}) {
  const { value, key } = this.state.input.options;
  return new Promise((resolve, reject) => {
    this.getData({
      key: value,
      value: key,
      search
    }).then(arrayValues => {
      const [_value] = arrayValues;
      const {$value : key, text: value} = _value;
      this.addValue({
        key,
        value
      })
      resolve(this.state.input.options.values)
    }).catch(err => {
      console.warn(err);
      reject(err);
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
proto.getData = function({
  layer_id= this.state.input.options.layer_id,
  key=this.state.input.options.key,
  value=this.state.input.options.value, search
} = {}) {
  const search_value = `${key}|${search}`.trim();
  return new Promise((resolve, reject) => {
    if (!this._layer) {
      this._layer = this._getLayerById(layer_id);
    }
    this._layer.getDataTable({
      suggest: search_value,
      ordering: key
    }).then(response => {
      const values = response.features.map(f =>({
        text:f.properties[key],
        id: f.properties[value],
        $value: f.properties[value]
      }))
      resolve(values);
    }).fail(err => reject(err));
  });
};

module.exports = SelectService;
