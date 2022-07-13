const TYPES = {
  wms: require('./wmslegend'),
  argismapserver: require('./arcgismapserverlegend'),
};

const Legendservice = {
  get({ layer, params } = {}) {
    const type = layer.isArcgisMapserver() ? 'argismapserver' : 'wms';
    return TYPES[type]({
      layer,
      params,
    });
  },
};

module.exports = Legendservice;
