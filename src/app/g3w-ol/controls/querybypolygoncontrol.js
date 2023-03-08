import { VM } from 'g3w-ol/constants';
import GUI from 'services/gui';
import DataRouterService from 'services/data';
import ProjectsRegistry from 'store/projects';

const {throttle} = require('core/utils/utils');
const {getMapLayersByFilter} = require('core/utils/geo');
const BaseQueryPolygonControl = require('g3w-ol/controls/basequerypolygoncontrol');
const PickCoordinatesInteraction = require('g3w-ol/interactions/pickcoordinatesinteraction');

// TODO: make it easier to understand.. (what variables are declared? which ones are aliased?)
const {
  Geometry : {
    getAllPolygonGeometryTypes,
    isPolygonGeometryType
  }
} = require('core/utils/geo');

const VALIDGEOMETRIES = getAllPolygonGeometryTypes();


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
  const layers = controlFiltrableLayers.length ? [... new Set([...controlFiltrableLayers, ...controlQuerableLayers])] : [];

  const _options = {
    ...options,
    offline: false,
    enabled: false,
    name: "querybypolygon",
    tipLabel: "sdk.mapcontrols.querybypolygon.tooltip",
    label: options.label || "\ue903",
    // update selected layer
    onSelectlayer(layer) {
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
    },
    interactionClass: PickCoordinatesInteraction,
    layers,
    help: {
      title: "sdk.mapcontrols.querybypolygon.help.title",
      message: "sdk.mapcontrols.querybypolygon.help.message",
    }
  };
  this.unwatches = [];

  BaseQueryPolygonControl.call(this, _options);
  // data need to runSpatialQuery
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
 */
proto.listenLayersVisibilityChange = function() {
  this.unwatches.forEach(unwatch => unwatch());
  this.unwatches.splice(0);
  this.layers.forEach(layer => {
    this.unwatches.push(
      VM.$watch(() =>  layer.state.visible, visible => {
       // check if a selectedLayer i set
        if (null !== this.selectedLayer) {
          // enable control only if current changed visible layer is true or
          // if at least one layer (not selected) is visible
          this.setEnable(this.isThereVisibleLayerNotSelected());
          this.toggle(this.isToggled() && this.getEnable());
        } else {
          this.setEnable(false);
          this.toggle(false);
        }
      }));
  });
};

/**
 * @deprecated since 3.7.0 Remove from 3.9.0
 * @param layers<Array>
 */
proto.change = function(layers=[]){
  this.layers = layers;
  const visible = this.checkVisibile(layers);
  this.setVisible(visible);
  this.setEnable(false);
  this.listenLayersVisibilityChange();
};

/**
 * Check visibiliy of control
 * @param layers
 * @returns {boolean}
 */
proto.checkVisibile = function(layers) {
  let visible;
  // if no layer or just one
  if (!layers.length || layers.length === 1) visible = false;
  else {
    // geometries to check
    // get all layers that haven't the geometries above filterable
    const filterableLayers = layers.filter(layer => layer.isFilterable());
    // get all layer that have the valid geometries
    const querableLayers = layers.filter(layer => VALIDGEOMETRIES.indexOf(layer.getGeometryType()) !== -1);
    const filterableLength = filterableLayers.length;
    const querableLength = querableLayers.length;
    if (querableLength === 1 && filterableLength === 1){
      visible = filterableLayers[0] !== querableLayers[0];
    } else visible = querableLength > 0 && filterableLength > 0;
  }
  return visible;
};

proto.setMap = function(map) {
  BaseQueryPolygonControl.prototype.setMap.call(this, map);
  const eventKey = this._interaction.on('picked', throttle(async evt => {
    this.data.coordinates = evt.coordinate;
    this.dispatchEvent({
      type: 'picked',
      coordinates: this.data.coordinates
    });
    GUI.closeOpenSideBarComponent();
    // ask for coordinates
    try {
      const {data: dataCoordinates = []} = await DataRouterService.getData('query:coordinates', {
        inputs: {
          feature_count: ProjectsRegistry.getCurrentProject().getQueryFeatureCount(),
          coordinates: this.data.coordinates
        },
        outputs: {
          show({data = [], query}) {
            const show = data.length === 0;
            // set coordinates to null in case of show  is false to avoid that externalvector added to query result
            // response to coordinates otherwise we show coordinate in point
            query.coordinates = !show ? null : query.coordinates;
            return show;
          }
        }
      });
      if (dataCoordinates.length && dataCoordinates[0].features.length) {
        this.data.feature = dataCoordinates[0].features[0];
        this.data.layer = dataCoordinates[0].layer;
        // run query Polygon Request to server
        this.runSpatialQuery();
      }
    } catch(err){
      console.log(err)
    }

    this.setEventKey({
      eventType: 'picked',
      eventKey
    });

    this._autountoggle && this.toggle();
  }));
  this.setEnable(false);
};

/**
 * @returns {boolean} whether at least a visible layer not selected
 * 
 * @since 3.8.0
 */
proto.isThereVisibleLayerNotSelected = function(){
  return !!(
    // check if user has selected a layer
    this.selectedLayer &&
    // check if current selected layer is visible
    this.isSelectedLayerVisible() &&
    // check if at least one layer is visible (project or external layer)
    (
      this.layers.find(layer => layer !== this.selectedLayer && layer.isVisible()) ||
      this.externalLayers.find(layer => layer !== this.layer && true === layer.visible)
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
            this.setEnable(layer.isvisible && this.isThereVisibleLayerNotSelected()); // layer must be visible and selected.
          } else {
            this.setSelectedLayer(null);
            this.setEnable(false);
          }
          this.toggle(this.isToggled() && this.getEnable());
        })
    );
  }

  unWatches[layer.name].push(
    VM.$watch(
      () => layer.visible,                                       // watch `layer.visible` property
      (visible) => {
        if (true === visible) {
          this.setEnable(this.isThereVisibleLayerNotSelected());   // layer must be selected in TOC.
        } else {
          this.setEnable(this.selected ? false : this.isThereVisibleLayerNotSelected());   // layer must be selected in TOC.
        }
        this.toggle(this.isToggled() && this.getEnable());
      })
  );

  this.setEnable(this.isThereVisibleLayerNotSelected());
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
proto.runSpatialQuery = async function(){
  if (null !== this.data.coordinates && null !== this.data.feature && null !== this.data.layer) {
    const layerName = this.data.layer.getName ? this.data.layer.getName() : this.data.layer.get('name');
    const {data=[]} = await DataRouterService.getData('query:polygon', {
      inputs: {
        layerName,
        excludeSelected: true,
        feature: this.data.feature,
        filterConfig:{
          spatialMethod: this.getSpatialMethod() // added spatial method to polygon filter
        },
        multilayers: ProjectsRegistry.getCurrentProject().isQueryMultiLayers(this.name)
      },
      outputs: {
        show({error=false}){
          return !error;
        }
      }
    });
    data.length && this.getMap().getView().setCenter(this.data.coordinates);
  }
};

/**
 * @since v3.8.0
 */
proto.clear = function(){
  this.data.layer = this.data.feature = this.data.coordinates = null;
};

module.exports = QueryByPolygonControl;
