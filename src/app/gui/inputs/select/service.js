import { getCatalogLayerById }        from 'utils/getCatalogLayerById';
import { createSingleFieldParameter } from 'utils/createSingleFieldParameter';


const Service = require('gui/inputs/service');

module.exports = class SelectService extends Service {
  constructor(opts = {}) {
    super(opts);
    this.layer = null;
  }

  _getLayerById(layer_id) {
    return getCatalogLayerById(layer_id);
  };

  addValue(value) {
    this.state.input.options.values.push(value);
  };

  sortValues() {
    const { orderbyvalue } = this.state.input.options;
    this.state.input.options.values.sort((a, b) => {
      const val1 = a[orderbyvalue ? 'value' : 'key'];
      const val2 = b[orderbyvalue ? 'value' : 'key'];
      if ( val1 < val2 ) {
        return -1;
      }
      if ( val1 > val2) {
        return 1;
      }
      return 0;
    });
  }

  getKeyByValue({ search } = {}) {
    const { value, key,  } = this.state.input.options;
    return new Promise((resolve, reject) => {
      this.getData({
        key,
        value,
        search
      }).then(values => {
        values.forEach(({ $value : key, text: value }) => {
          this.addValue({
            key,
            value
          })
        })
        this.sortValues();
        resolve(this.state.input.options.values);
      }).catch(e => { console.warn(e); reject(e); });
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

    return new Promise((resolve, reject) => {
      if (!this._layer) { this._layer = this._getLayerById(layer_id) }
      this._layer.getDataTable({
        [ Array.isArray(search) ? 'field' : 'suggest' ] : Array.isArray(search) //take in account multiselect value
          ? search
            .map((_, j) => createSingleFieldParameter({ field: key, value: search[j], operator: "eq", logicop: null }))
            .join('|OR,') || ''
          : `${key}|${search}`.trim(),
        ordering: this.state.input.options.orderbyvalue ? value : key, //@since 3.11.0
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
