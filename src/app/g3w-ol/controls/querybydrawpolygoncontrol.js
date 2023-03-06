/**
 * @file
 * @since v3.8
 */

import GUI from 'services/gui';

const BaseQueryPolygonControl = require('g3w-ol/controls/basequerypolygoncontrol');

const QueryByDrawPolygonControl = function(options={}) {

  const _options = {
    name: "querybydrawpolygon",
    tipLabel: "sdk.mapcontrols.querybydrawpolygon.tooltip",
    customClass: GUI.getFontClass('draw'),
    clickmap: true, // set ClickMap
    interactionClass: ol.interaction.Draw,
    interactionClassOptions: {
      type: 'Polygon'
    },
    /**
     * method to handle selection layer
     * @param layer
     */
    onSelectlayer(layer) {
      if (
        layer.isSelected()
      ) {
        this.setSelectedLayer(layer);
        this.setEnable(layer.isFilterable());
      } else {
        this.setSelectedLayer(null);
        this.setEnable(true);
      }
    },
    enabled: true,
    ...options
  };

  BaseQueryPolygonControl.call(this, _options);
};

ol.inherits(QueryByDrawPolygonControl, BaseQueryPolygonControl);

const proto = QueryByDrawPolygonControl.prototype;

/**
 * @param {ol.Map} map
 */
proto.setMap = function(map) {
  
  BaseQueryPolygonControl.prototype.setMap.call(this, map);

  this._interaction.on('drawend', evt => {
    this.dispatchEvent({ type: 'drawend', feature: evt.feature });
    if (this._autountoggle) {
      this.toggle();
    }
  });
};

/**
 * Check visibiliy of control
 * @param layers
 * @returns {boolean}
 */
proto.checkVisibile = function(layers) {
  let visible;
  // if no layer
  if (!layers.length) visible = false;
  else {
    // get all layers filterable
    const filterableLayers = layers.filter(layer => layer.isFilterable());
    visible = filterableLayers.length > 0;
  }
  return visible;
};


/**
 * @param { unknown | null } layer
 *
 * @since 3.8.0
 */
proto.listenLayersVisibilityChange = function() {
  this.unwatches.forEach(unwatch => unwatch());
  this.unwatches.splice(0);
  this.layers.forEach(layer => {
    this.unwatches.push(
      this.watchLayer(() =>  layer.state.visible, visible => {
        // check if a selectedLayer i set
        if (null !== this.selectedLayer) {
          // enable control only if current changed visible layer is true or
          // if at least one layer (not selected) is visible
          this.setEnable(this.isSelectedLayerVisible());
        } else {
          this.setEnable(this.isThereVisibleLayers());
        }
      }));
  });
};

/**
 * @since v3.8
 * @param layer
 */
proto.handleAddExternalLayer = function(layer, unWatches) {
  unWatches[layer.name].push(
    this.watchLayer(
      () => layer.selected,                                    // watch `layer.selected` property
      selected => {
        this.setSelectedLayer(true === selected ? layer : null);
        this.setEnable(this.isThereVisibleLayers()); // layer must be visible and selected.
      })
  );

  unWatches[layer.name].push(
    this.watchLayer(
      () => layer.visible,                                       // watch `layer.visible` property
      (visible) => {
        this.setEnable(this.isThereVisibleLayers());   // layer must be selected in TOC.
      })
  );

  this.setEnable(this.isThereVisibleLayers());
};

/**
 * @since v3.8
 * @param layer
 */
proto.handleRemoveExternalLayer = function(layer) {
  this.setEnable(this.isThereVisibleLayers());
};

/**
 * @since v3.8
 */
proto.isThereVisibleLayers = function(){
  return !!(
    // check if user has selected a layer
    this.selectedLayer &&
    // check if current selected layer is visible
    this.isSelectedLayerVisible() ||
    // check if at least one layer is visible (project or external layer)
    (
      this.layers.find(layer => layer && layer.isVisible()) ||
      this.externalLayers.find(layer => true === layer.visible)
    )
  )
};

module.exports = QueryByDrawPolygonControl;