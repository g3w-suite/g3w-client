const TYPES = {
  'wms': require('./wmslegend'),
  'argismapserver': require('./arcgismapserverlegend')
};

const Legendservice = {
  get({layer, params, options={}}={}) {
    const type = layer.isArcgisMapserver() ? 'argismapserver': 'wms';
    return TYPES[type]({
      layer,
      params,
      options
    })
  }
};

module.exports = Legendservice;
