import G3WObject from 'core/g3w-object';

module.exports = class MapLayer extends G3WObject {

  constructor(config={}) {
    super();

    this.config                 = config;
    this.id                     = config.id;
    this.iframe_internal        = config.iframe_internal || false;
    this.extent                 = config.extent;
    this.projection             = config.projection;
    this.layer                  = null;
    this.layers                 = config.layers || []; // store all enabled layers
    this.allLayers              = []; // store all layers
    this.showSpinnerWhenLoading = true;
  }

  getId() {
    return this.id;
  }
  
  getOLLayer() {
    console.log('every sub classes has to be override')
  }
  
  update(mapState={}, extraParams={}) {
    this._updateLayers(mapState, extraParams);
  }
  
  checkLayerDisabled(layer, resolution, mapUnits) {
    layer.setDisabled(resolution, mapUnits);
    return layer.isDisabled();
  }
  
  // check which layers has to be disabled
  checkLayersDisabled(resolution, mapUnits) {
    this.allLayers.forEach(layer => this.checkLayerDisabled(layer, resolution, mapUnits));
  }
  
  setupCustomMapParamsToLegendUrl(params={}) {
    //to owerwrite for each map layer subclass
  }

};