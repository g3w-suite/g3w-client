import wms from './wmslegend';
import argismapserver from './arcgismapserverlegend';

const TYPES = {
  wms,
  argismapserver,
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

export default Legendservice;
