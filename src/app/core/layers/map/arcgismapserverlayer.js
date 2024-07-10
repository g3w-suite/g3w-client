const WMSLAYER = require('core/layers/map/wmslayer');

module.exports = class ARCGISMAPSERVERLayer extends WMSLAYER {

  _makeOlLayer() {
    const olLayer = new ol.layer.Tile({
      // extent: opts.extent,
      visible: true,
      source: new ol.source.TileArcGISRest({
        url:          this.config.url,
        projection:   this.config.projection,
        // attributions: opts.attributions,
        // crossOrigin:  opts.crossOrigin,
      }),
    })

    olLayer.getSource().on('imageloadstart', () => { this.emit('loadstart'); });
    olLayer.getSource().on('imageloadend',   () => { this.emit('loadend'); });
    olLayer.getSource().on('imageloaderror', () => { this.emit('loaderror'); });

    return olLayer
  }

};