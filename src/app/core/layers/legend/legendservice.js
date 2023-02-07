const TYPES = {
  'wms': require('./wmslegend'),
  'arcgismapserver': require('./arcgismapserverlegend')
};

const Legendservice = {
  get({layer, params, options={}}={}) {
    const type = layer.isArcgisMapserver() ? 'arcgismapserver': 'wms';
    return TYPES[type]({
      layer,
      params,
      options
    })
  }
};

module.exports = Legendservice;
