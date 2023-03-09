import { SPATIALMETHODS, VM } from 'g3w-ol/constants';
import GUI from 'services/gui';
import DataRouterService from 'services/data';
import ProjectsRegistry from 'store/projects';

const { throttle }       = require('core/utils/utils');
const { Geometry }       = require('core/utils/geo');
const InteractionControl = require('g3w-ol/controls/interactioncontrol');

// Object contain properties of TOC layers that need to satisfy
const layersFilterObject = {
  SELECTEDORALL: true, // selected or all
  FILTERABLE: true, // check src/app/core/layers/layer.js#L925
  VISIBLE: true // need to be visible
};

const condition = {
  filtrable: {
    ows: 'WFS'
  }
};

const QueryBBoxControl = function(options = {}) {

  const {
    spatialMethod = SPATIALMETHODS[0]
  } = options;

  /**
   * @FIXME add description
   */
  this._startCoordinate = null;

  /**
   * @FIXME add description
   */
  this.unwatches        = [];


  /**
   * @FIXME add description
   */
  const layers           = GUI.getService('map').filterableLayersAvailable(condition) || [];
  layers.forEach(layer => layer.setTocHighlightable(true));

  const _options = {
    ...options,
    layers,
    offline: false,
    name: "querybbox",
    tipLabel: "sdk.mapcontrols.querybybbox.tooltip",
    label: options.label || "\ue902",
    clickmap: true, // set ClickMap
    interactionClass: ol.interaction.DragBox,
    onSelectlayer(selectLayer) {
      if (selectLayer.isSelected()) {
        const findLayer = this.layers.find(layer => layer === selectLayer);
        this.setEnable(!!findLayer && findLayer.isVisible());
      } else {
        this.setEnable(this.checkEnabled(this.layers));
      }
      this.toggle(this.isToggled() && this.getEnable());
    },
    onhover: true,
    toggledTool:{
      type: 'spatialMethod',
      how: 'toggled' // or hover
    },
    spatialMethod,
    help: {
      title:"sdk.mapcontrols.querybybbox.help.title",
      message:"sdk.mapcontrols.querybybbox.help.message",
    }
  };

  InteractionControl.call(this, _options);
  this.setVisible(this.checkVisible(this.layers));
  this.setEnable(this.checkEnabled(this.layers));

  /**
   * Store bbox coordinates
   * 
   * @type {ol.coordinate}
   */
  this.bbox = null;

};

ol.inherits(QueryBBoxControl, InteractionControl);

const proto = QueryBBoxControl.prototype;

/**
 * @since 3.8.0
 */
proto.listenLayersVisibilityChange = function() {
  this.unwatches.forEach(unwatch => unwatch());
  this.unwatches.splice(0);
  this.layers.forEach(layer => {
    this.unwatches
      .push(
        VM.$watch(
          () => layer.state.visible,
          visible => {
            if (true === layer.state.selected) {
              this.setEnable(visible);
            } else {
              this.setEnable(this.checkEnabled(this.layers))
            }
            this.toggle(this.isToggled() && this.getEnable());
          }
        )
      )
    }
  );
};

/**
 * @deprecated since 3.7
 * @param layers
 */
proto.change = function(layers=[]) {
  this.layers = layers;
  this.setVisible(this.checkVisible());
  this.setEnable(this.checkEnabled());
  this.listenLayersVisibilityChange();
};

proto.checkVisible = function() {
  return this.layers.length > 0 || this.externalLayers.length > 0;
};

proto.checkEnabled = function() {
  return !!(this._hasVisibleLayer() || this._hasVisibleExternalLayer());
};

/**
 * @param {ol.Map} map
 * 
 * @listens ol.interaction.DragBox~boxstart
 * @listens ol.interaction.DragBox~boxend
 */
proto.setMap = function(map) {

  InteractionControl.prototype.setMap.call(this, map);

  this._interaction
    .on('boxstart', evt => this._startCoordinate = evt.coordinate);

  const eventKey = this._interaction
    .on('boxend', throttle(evt => {

      this.bbox = ol.extent.boundingExtent([this._startCoordinate, evt.coordinate]);

      this.dispatchEvent({ type: 'bboxend', extent: this.bbox });

      this.runSpatialQuery();

      this._startCoordinate = null;

      if (this._autountoggle) {
        this.toggle();
      }

    }));

  this.setEventKey({ eventType: 'bboxend', eventKey });

};

/**
 * @returns {Promise<void>}
 * 
 * @since 3.8.0
 */
proto.runSpatialQuery = async function(){
  // skip if bbox is not set
  if (null === this.bbox) {
    return;
  }
  GUI.closeOpenSideBarComponent();
  try {
    const { data = [] } = await DataRouterService.getData('query:bbox', {
      inputs: {
        bbox: this.bbox,
        feature_count: ProjectsRegistry.getCurrentProject().getQueryFeatureCount(),
        layersFilterObject,
        filterConfig: {
          spatialMethod: this.getSpatialMethod(), // added spatial method to polygon filter
        },
        condition,
        multilayers: ProjectsRegistry.getCurrentProject().isQueryMultiLayers(this.name)
      }
    });
    if (data.length) {
      this.getMap().getView().setCenter(ol.extent.getCenter(this.bbox));
    }
  } catch(err){
    console.warn('Error running spatial query: ', err);
  }
};

/**
 * @param layer
 * @param unWatches
 * 
 * @since 3.8.0
 */
proto.handleAddExternalLayer = function(layer, unWatches) {
  // watch `layer.selected` property only on Polygon layers (in order to enable/disable map control)
  if (Geometry.isPolygonGeometryType(layer.geometryType)) {
    unWatches[layer.name].push(
      VM.$watch(
        () => layer.selected,                    // watch `layer.selected` property
        selected => {
          this.setSelectedLayer(true === selected ? layer : null);
          this.setEnable(true === selected ? layer.visible : this.checkEnabled());
          this.toggle(this.isToggled() && this.getEnable());
        })
    );
  }

  unWatches[layer.name].push(
    VM.$watch(
      () => layer.visible,                       // watch `layer.visible` property
      () => {
        this.setEnable(this.checkEnabled());
        this.toggle(this.isToggled() && this.getEnable());
      })
  );

  this.setEnable(this.checkEnabled());
};

/**
 * @param layer
 * 
 * @since 3.8.0
 */
proto.handleRemoveExternalLayer = function() {
  this.setEnable(this.isThereVisibleLayerNotSelected());
};


/**
 * @since 3.8.0
 */
proto.clear = function(){
  this.bbox = null;
};


module.exports = QueryBBoxControl;
