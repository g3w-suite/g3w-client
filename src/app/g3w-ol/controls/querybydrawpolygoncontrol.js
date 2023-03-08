/**
 * @file
 * @since v3.8
 */
import GUI from 'services/gui';
import DataRouterService from 'services/data';
import ProjectsRegistry from 'store/projects';

const {throttle} = require('core/utils/utils');
const BaseQueryPolygonControl = require('g3w-ol/controls/basequerypolygoncontrol');

const QueryByDrawPolygonControl = function(options={}) {
  const layers           = GUI.getService('map').filterableLayersAvailable({iltrable: {ows: 'WFS'}}) || [];
  layers.forEach(layer => layer.setTocHighlightable(true));

  const _options = {
    ...options,
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
      this.toggle(this.isToggled() && this.getEnable());
    },
    enabled: true,
    layers,
    help: {
      title:"sdk.mapcontrols.querybybbox.help.title",
      message:"sdk.mapcontrols.querybybbox.help.message",
    }
  };

  this.unwatches = [];

  BaseQueryPolygonControl.call(this, _options);

  // feature used to store feature drawend
  this.feature = null;
};

ol.inherits(QueryByDrawPolygonControl, BaseQueryPolygonControl);

const proto = QueryByDrawPolygonControl.prototype;

/**
 * @param {ol.Map} map
 */
proto.setMap = function(map) {
  
  BaseQueryPolygonControl.prototype.setMap.call(this, map);

  const eventKey = this._interaction.on('drawend', throttle(evt => {
    this.feature = evt.feature;
    this.dispatchEvent({ type: 'drawend', feature: this.feature });

    this.runSpatialQuery();

    if (this._autountoggle) {
      this.toggle();
    }
  }));

  this.setEventKey({
    eventType: 'drawend',
    eventKey
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
 * @since 3.8.0
 * @param layer
 */
proto.handleAddExternalLayer = function(layer, unWatches) {
  unWatches[layer.name].push(
    this.watchLayer(
      () => layer.selected,                                    // watch `layer.selected` property
      selected => {
        if (true === selected) {
          this.setSelectedLayer(layer);
          this.setEnable(layer.visible);
        } else {
          this.setSelectedLayer(null);
          this.setEnable(this.isThereVisibleLayers());
          this.toggle(this.isToggled() && this.getEnable());
        }
      })
  );

  unWatches[layer.name].push(
    this.watchLayer(
      () => layer.visible,                                       // watch `layer.visible` property
      (visible) => {
        if (true === layer.selected) {
          this.setEnable(visible);
        } else {
          this.setEnable(this.isThereVisibleLayers());
        }
        this.toggle(this.isToggled() && this.getEnable());
      })
  );

  this.setEnable(this.isThereVisibleLayers());
};

/**
 * @since 3.8.0
 * @param layer
 */
proto.handleRemoveExternalLayer = function() {
  this.setEnable(this.isThereVisibleLayers());
};

/**
 * @since 3.8.0
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

/**
 * @since 3.8.0
 */

proto.runSpatialQuery = async function(){
  GUI.closeOpenSideBarComponent();

  try {
    const {data=[]} = await DataRouterService.getData('query:polygon', {
      inputs: {
        layerName: 'Draw',
        feature: this.feature,
        filterConfig: {
          spatialMethod: this.getSpatialMethod() // added spatial method to polygon filter
        },
        multilayers: ProjectsRegistry.getCurrentProject().isQueryMultiLayers(this.name)
      },
      outputs: {
        show({error = false}) {
          return !error;
        }
      }
    });

    if (data.length) {
      GUI.getService('map').zoomToFeatures([this.feature]);
    }

  } catch(err){
    console.log(err)
  }
};

/**
 * @since 3.8.0
 */
proto.clear = function(){
  this.feature = null;
};

module.exports = QueryByDrawPolygonControl;