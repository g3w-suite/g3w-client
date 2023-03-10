import { VM } from 'g3w-ol/constants';
import GUI from 'services/gui';
import DataRouterService from 'services/data';
import ProjectsRegistry from 'store/projects';

const { throttle }                       = require('core/utils/utils');
const { getMapLayersByFilter, Geometry } = require('core/utils/geo');
const BaseQueryPolygonControl            = require('g3w-ol/controls/basequerypolygoncontrol');
const PickCoordinatesInteraction         = require('g3w-ol/interactions/pickcoordinatesinteraction');

const VALIDGEOMETRIES = Geometry.getAllPolygonGeometryTypes();

const condition = {
  filtrable: {
    ows: 'WFS'
  }
};

const QueryByPolygonControl = function(options={}) {

  const controlQuerableLayers = getMapLayersByFilter({
    QUERYABLE: true,
    SELECTEDORALL: true
  });

  const controlFiltrableLayers = GUI.getService('map').filterableLayersAvailable({
    FILTERABLE: true,
    SELECTEDORALL: true
  }, condition);
  
  const _options = {
    ...options,
    offline: false,
    enabled: false,
    name: "querybypolygon",
    tipLabel: "sdk.mapcontrols.querybypolygon.tooltip",
    label: options.label || "\ue903",
    interactionClass: PickCoordinatesInteraction,
    layers: controlFiltrableLayers.length ? [... new Set([...controlFiltrableLayers, ...controlQuerableLayers])] : [],
    help: {
      title: "sdk.mapcontrols.querybypolygon.help.title",
      message: "sdk.mapcontrols.querybypolygon.help.message",
    }
  };



  BaseQueryPolygonControl.call(this, _options);

  /**
   * Data needed to runSpatialQuery
   */
  this.data = {
    layer: null,
    feature: null,
    coordinates: null
  }
};

ol.inherits(QueryByPolygonControl, BaseQueryPolygonControl);

const proto = QueryByPolygonControl.prototype;

/**
 * @since 3.8.0
 * @param layer
 */
proto.onSelectLayer = function(layer) {
  if (
    layer.isSelected() &&
    layer.isQueryable() &&
    -1 !== this.getGeometryTypes().indexOf(layer.getGeometryType())
  ) {
    this.setSelectedLayer(layer);
    this.setEnable(this.isThereVisibleLayerNotSelected());
    this.toggle(this.isToggled() && this.getEnable())
  } else {
    this.setSelectedLayer(null);
    this.setEnable(false);
    this.toggle(false);
  }
};

/**
 * @since 3.8.0 
 */
proto.listenLayersVisibilityChange = function() {
  this.unwatches.forEach(unwatch => unwatch());
  this.unwatches.splice(0);
  this.layers.forEach(layer => {
    this.unwatches.push(
      VM.$watch(
        () =>  layer.state.visible,
        visible => {
          if (layer.isSelected()) {
            this.setEnable(visible && this.isThereVisibleLayerNotSelected());
          } else {
            this.setEnable(this.isThereVisibleLayerNotSelected())
          }
          // enable control only if current changed visible layer is true or
          // if at least one layer (not selected) is visible
          this.toggle( this.isToggled() && this.getEnable());
        }
      )
    );
  });
};

/**
 * @deprecated since 3.7.0. Will be removed in 3.9.0
 * 
 * @param {unknown[]} layers
 */
proto.change = function(layers=[]) {
  this.layers = layers;
  this.setVisible(this.checkVisibile(layers));
  this.setEnable(false);
  this.listenLayersVisibilityChange();
};

/**
 * Check visibiliy of control
 * 
 * @param layers
 * 
 * @returns {boolean}
 */
proto.checkVisibile = function(layers) {
  // if no layer or just one
  if (!layers.length || layers.length === 1) {
    return false;
  }

  // get all layers that haven't the geometries above filterable
  const filterableLayers = layers.filter(layer => layer.isFilterable());
  // get all layer that have the valid geometries
  const queryableLayers = layers.filter(layer => -1 !== VALIDGEOMETRIES.indexOf(layer.getGeometryType()));

  if (queryableLayers.length === 1 && filterableLayers.length === 1) {
    return filterableLayers[0] !== queryableLayers[0];
  }

  return queryableLayers.length > 0 && filterableLayers.length > 0;
};

/**
 * @param {ol.Map} map 
 * 
 * @listens PickCoordinatesInteraction~picked
 */
proto.setMap = function(map) {

  BaseQueryPolygonControl.prototype.setMap.call(this, map);
  
  const eventKey = this._interaction
    .on('picked', throttle(async evt => {
      this.data.coordinates = evt.coordinate;

      this.dispatchEvent({ type: 'picked', coordinates: this.data.coordinates });

      GUI.closeOpenSideBarComponent();

      // ask for coordinates
      try {
        const { data = [] } = await DataRouterService.getData('query:coordinates', {
          inputs: {
            feature_count: ProjectsRegistry.getCurrentProject().getQueryFeatureCount(),
            coordinates: this.data.coordinates
          },
          outputs: {
            // whether to show picked coordinates on map
            show({data = [], query}) {
              const show = data.length === 0;
              // set query coordinates to null in case to avoid `externalvector` added to query response
              query.coordinates = show ? query.coordinates : null;
              return show;
            }
          }
        });
        if (data.length && data[0].features.length) {
          this.data.feature = data[0].features[0];
          this.data.layer = data[0].layer;
          this.runSpatialQuery();
        }
      } catch(err) {
        console.warn('Error running spatial query:', err);
      }

      this.setEventKey({ eventType: 'picked', eventKey });

      if (this._autountoggle) {
        this.toggle();
      }

    }));

  this.setEnable(false);
};

/**
 * @returns {boolean} whether at least a visible layer not selected
 * 
 * @since 3.8.0
 */
proto.isThereVisibleLayerNotSelected = function() {
  return !!(
    // check if user has selected a layer
    this.selectedLayer &&
    // check if current selected layer is visible
    this.isSelectedLayerVisible() &&
    // check if at least one layer is visible (project or external layer)
    (
      this.layers.find(layer => layer !== this.selectedLayer && (layer.isVisible() && layer.isFilterable(condition.filtrable))) ||
      this.externalLayers.find(layer => layer !== this.selectedLayer && true === layer.visible)
    )
  )
};

/**
 * @deprecated since v3.8.0. Will be removed in v4.0.0. Use `QueryByPolygonControl::listenLayersVisibilityChange()` instead.
 */
proto.listenPolygonLayersChange = function() {
  this.listenLayersVisibilityChange();
};

/**
 * @param layer
 * @param unWatches
 * 
 * @since 3.8.0
 */
proto.onAddExternalLayer = function({layer, unWatches}) {

  // watch `layer.selected` property only on Polygon layers (in order to enable/disable map control)
  if (Geometry.isPolygonGeometryType(layer.geometryType)) {
    unWatches[layer.name].push(
      VM.$watch(
        () => layer.selected,                                    // watch `layer.selected` property
        selected => {
          if (true === selected) {
            this.setSelectedLayer(layer);
            this.setEnable(layer.visible && this.isThereVisibleLayerNotSelected());
          } else {
            this.setEnable(false);
          }
          this.toggle(this.isToggled() && this.getEnable());
        })
    );

    unWatches[layer.name].push(
      VM.$watch(
        () => layer.visible,                                       // watch `layer.visible` property
        (visible) => {
          if (layer.selected){
            this.setEnable(visible && this.isThereVisibleLayerNotSelected());
          } else {
            this.setEnable(this.isThereVisibleLayerNotSelected());
          }
          this.toggle(this.isToggled() && this.getEnable());
        })
    );
  }

  this.setEnable(this.isThereVisibleLayerNotSelected());
};

/**
 * @since 3.8.0
 * @param layer
 */
proto.onRemoveExternalLayer = function() {
  this.setEnable(this.isThereVisibleLayerNotSelected());
};

/**
 * Execute query Polygon request to server
 * 
 * @since 3.8.0
 */
proto.runSpatialQuery = async function() {
  // skip when .. ?
  if (!(null !== this.data.coordinates && null !== this.data.feature && null !== this.data.layer)) {
    return;
  }

  const { data = [] } = await DataRouterService.getData('query:polygon', {
    inputs: {
      layerName: this.data.layer.getName ? this.data.layer.getName() : this.data.layer.get('name'),
      excludeSelected: true,
      feature: this.data.feature,
      filterConfig:{
        spatialMethod: this.getSpatialMethod() // added spatial method to polygon filter
      },
      multilayers: ProjectsRegistry.getCurrentProject().isQueryMultiLayers(this.name)
    },
    outputs: {
      show({error=false}) {
        return !error;
      }
    }
  });
  if (data.length) {
    this.getMap().getView().setCenter(this.data.coordinates);
  }
};

/**
 * @since v3.8.0
 */
proto.clear = function() {
  this.data.layer = this.data.feature = this.data.coordinates = null;
};

module.exports = QueryByPolygonControl;
