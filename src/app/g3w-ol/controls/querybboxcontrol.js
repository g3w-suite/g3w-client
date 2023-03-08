import { SPATIALMETHODS, VM } from 'g3w-ol/constants';
import GUI from 'services/gui';
import DataRouterService from 'services/data';
import ProjectsRegistry from 'store/projects';

const {throttle} = require('core/utils/utils');
const InteractionControl = require('g3w-ol/controls/interactioncontrol');

// get all filtrable layers in toc no based on selection or visibility
const layersFilterObject = {
  SELECTEDORALL: true, // selected or all
  FILTERABLE: true,
  VISIBLE: true
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

  this.layers           = GUI.getService('map').filterableLayersAvailable(condition) || [];
  this.layers.forEach(layer => layer.setTocHighlightable(true));

  options.visible       = this.checkVisible(this.layers);
  options.enabled       = options.visible && this.checkEnabled(this.layers);

  this.listenLayersChange();

  const _options = {
    ...options,
    offline: false,
    name: "querybbox",
    tipLabel: "sdk.mapcontrols.querybybbox.tooltip",
    label: options.label || "\ue902",
    clickmap: true, // set ClickMap
    interactionClass: ol.interaction.DragBox,
    onSelectlayer(selectLayer) {
      if (selectLayer.isSelected()) {
        const findLayer = this.layers.find(layer => layer === selectLayer);
        const bool = !!findLayer && findLayer.isVisible();
        this.setEnable(bool);
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

  //store bbox
  this.bbox = null;

};

ol.inherits(QueryBBoxControl, InteractionControl);

const proto = QueryBBoxControl.prototype;

proto.listenLayersChange = function() {
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
              const enabled = this.checkEnabled(this.layers);
              if (this.getEnable() !== enabled) {
                this.setEnable(enabled)
              }
            }
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
  this.listenLayersChange();
};

proto.checkVisible = function() {
  return this.layers.length > 0 || this.externalLayers.length > 0;
};

proto.checkEnabled = function() {
  return !!(
    (
      (this.layers.length > 0) && this.layers.find(layer => layer.isVisible())
    ) ||
    this.externalLayers.find(layer => layer !== this.layer && true === layer.visible)
  )
};

/**
 * @param {ol.Map} map 
 */
proto.setMap = function(map) {
  InteractionControl.prototype.setMap.call(this, map);

  this._interaction.on('boxstart', evt => this._startCoordinate = evt.coordinate);
  const eventKey = this._interaction.on('boxend', throttle(evt => {
    this.bbox = ol.extent.boundingExtent([this._startCoordinate, evt.coordinate]);
    this.dispatchEvent({
      type: 'bboxend',
      extent: this.bbox
    });

    this.runSpatialQuery();

    this._startCoordinate = null;
    if (this._autountoggle) {
      this.toggle();
    }
  }));

  this.setEventKey({
    eventType: 'bboxend',
    eventKey
  });
};

/**
 *
 * @param extent
 * @returns {Promise<void>}
 */
proto.runSpatialQuery = async function(){
  if (null !== this.bbox) {
    GUI.closeOpenSideBarComponent();
    try {
      const {data=[]} = await DataRouterService.getData('query:bbox', {
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
      console.log(err)
    }
  }
};

/**
 * @since 3.8.0
 * @param layer
 */
proto.handleAddExternalLayer = function(layer, unWatches) {
  // watch `layer.selected` property only on Polygon layers (in order to enable/disable map control)
  if (isPolygonGeometryType(layer.geometryType)) {
    unWatches[layer.name].push(
      VM.$watch(
        () => layer.selected,                                    // watch `layer.selected` property
        selected => {
          if (true === selected) {
            this.setSelectedLayer(layer);
            this.setEnable(layer.visible); // layer must be visible and selected.
          } else {
            this.setSelectedLayer(null);
            this.setEnable(this.checkEnabled()); // layer must be visible and selected.
          }
          this.toggle(this.isToggled() && this.getEnable());
        })
    );
  }

  unWatches[layer.name].push(
    VM.$watch(
      () => layer.visible,                                       // watch `layer.visible` property
      () => {
        this.setEnable(this.checkEnabled());
        this.toggled(this.isToggled() && this.getEnable());
      })
  );

  this.setEnable(this.checkEnabled());
};

/**
 * @since 3.8.0
 * @param layer
 */
proto.handleRemoveExternalLayer = function(layer) {
  this.setEnable(this.isThereVisibleLayerNotSelected());
};


/**
 * @since 3.8.0
 */
proto.clear = function(){
  this.bbox = null;
};

module.exports = QueryBBoxControl;
