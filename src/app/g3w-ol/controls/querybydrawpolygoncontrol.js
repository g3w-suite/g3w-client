/**
 * @file
 * @since v3.8
 */
import GUI from 'services/gui';
import DataRouterService from 'services/data';
import ProjectsRegistry from 'store/projects';

const { throttle }            = require('core/utils/utils');
const BaseQueryPolygonControl = require('g3w-ol/controls/basequerypolygoncontrol');

const QueryByDrawPolygonControl = function(options={}) {
  const layers           = GUI.getService('map').filterableLayersAvailable({ filtrable: { ows: 'WFS' } }) || [];
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
    enabled: true,
    layers,
    help: {
      title:"sdk.mapcontrols.querybybbox.help.title",
      message:"sdk.mapcontrols.querybybbox.help.message",
    }
  };

  BaseQueryPolygonControl.call(this, _options);

  this.setEnable(this.isThereVisibleLayers());

  /**
   * Store drawed ol.Feature
   */
  this.feature = null;
};

ol.inherits(QueryByDrawPolygonControl, BaseQueryPolygonControl);

const proto = QueryByDrawPolygonControl.prototype;

/**
 * @param {ol.Map} map
 * 
 * @listens ol.interaction.Draw~drawend
 */
proto.setMap = function(map) {
  
  BaseQueryPolygonControl.prototype.setMap.call(this, map);

 this._interaction.on('drawend', throttle(evt => {
    this.feature = evt.feature;
    this.dispatchEvent({ type: 'drawend', feature: this.feature });
    if (this._autountoggle) {
      this.toggle();
    }
  }));

  this.setEventKey({
    eventType: 'drawend',
    eventKey: this.on('drawend', this.runSpatialQuery)
  });

};

/**
 * Check visibiliy of control
 * 
 * @param layers
 * 
 * @returns {boolean}
 */
proto.checkVisibile = function(layers) {
  // if no layer
  if (!layers.length) {
    return false;
  }
  // get all layers filterable
  return layers.filter(layer => layer.isFilterable()).length > 0;
};

/**
 * @since 3.8.0
 */
proto.onSelectLayer = function(layer) {
  this.setEnable((layer && layer.isFilterable()) || this.isThereVisibleLayers());
  this.toggle(this.isToggled() && this.getEnable());
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
        if (null === this.getSelectedLayer()) {
          this.setEnable(this.isThereVisibleLayers());
        } else {
          // enable control only if current changed visible layer is true or
          // if at least one layer (not selected) is visible
          this.setEnable(this.isSelectedLayerVisible());
        }
        this.toggle(this.isToggled() && this.getEnable())
      }));
  });
};

/**
 * @param {{ layer, unWatches }}
 * 
 * @since 3.8.0
 */
proto.onAddExternalLayer = function({layer, unWatches}) {

  unWatches.push(
    this.watchLayer(
      () => layer.selected,                                    // watch `layer.selected` property
      selected => {
        this.setEnable(true === selected ? layer.visible : this.isThereVisibleLayers());
        this.toggle(this.isToggled() && this.getEnable());
      })
  );

  unWatches.push(
    this.watchLayer(
      () => layer.visible,                                     // watch `layer.visible` property
      (visible) => {
        this.setEnable(true === layer.selected ? visible : this.isThereVisibleLayers());
        this.toggle(this.isToggled() && this.getEnable());
      })
  );

  this.setEnable(this.isThereVisibleLayers());
};

/**
 * @since 3.8.0
 */
proto.onRemoveExternalLayer = function() {
  this.setEnable(this.isThereVisibleLayers());
};

/**
 * @since 3.8.0
 */
proto.isThereVisibleLayers = function() {
  return !!(
    // check if user has selected a layer
    this.getSelectedLayer() &&
    // check if current selected layer is visible
    this.isSelectedLayerVisible() ||
    // check if at least one layer is visible (project or external layer)
    (
      this.layers.find(layer => layer && layer.isVisible()) ||
      this.getExternalLayers().find(layer => true === layer.visible)
    )
  )
};

/**
 * @returns {Promise<void>}
 * 
 * @since 3.8.0
 */
proto.runSpatialQuery = async function() {
  GUI.closeOpenSideBarComponent();

  try {
    const { data = [] } = await DataRouterService.getData('query:polygon', {
      inputs: {
        layerName: 'Draw',
        feature: this.feature,
        excludeSelected: null === this.getSelectedLayer(),
        external: {
          add: this.addExternalLayerToResult(),
          filter: {
            SELECTED: this.isExternalLayerSelected()
          }
        },
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

  } catch(err){
    console.log(err)
  }
};

/**
 * @since 3.8.0
 */
proto.clear = function() {
  this.feature = null;
};

module.exports = QueryByDrawPolygonControl;