import {SPATIALMETHODS, VM} from '../constants';
import InteractionControl  from './interactioncontrol';
import PickCoordinatesInteraction  from '../interactions/pickcoordinatesinteraction';
import {getAllPolygonGeometryTypes} from 'core/geometry/geometry';
const VALIDGEOMETRIES = getAllPolygonGeometryTypes();

class QueryByPolygonControl extends InteractionControl {
  constructor(options={}) {
    const {spatialMethod=SPATIALMETHODS[0]} = options;
    options = {
      ...options,
      offline: false,
      name: "querybypolygon",
      tipLabel: "sdk.mapcontrols.querybypolygon.tooltip",
      label: options.label || "\ue903",
      // function to get selection layer
      onSelectlayer(selectedLayer) {
        const selected = selectedLayer.isSelected();
        const geometryType = selectedLayer.getGeometryType();
        const querable = selectedLayer.isQueryable();
        if (selected) {
          if (this.getGeometryTypes().indexOf(geometryType) !== -1) {
            this.setEnable(querable ? selectedLayer.isVisible(): querable);
          } else this.setEnable(false, false);
        } else this.setEnable(false, false);
      },
      clickmap: true, // set ClickMap
      interactionClass: PickCoordinatesInteraction,
      spatialMethod,
      toggledTool:{
        type: 'spatialMethod',
        how: 'toggled' // or hover
      },
      onhover: true
    };
    options.geometryTypes = VALIDGEOMETRIES;
    super(options);
    this.layers = options.layers || [];
    this.unwatches = [];
    this.listenPolygonLayersChange();
    this.setVisible(this.checkVisibile(this.layers));
    //starting disabled
    this.setEnable(false);
  }

  listenPolygonLayersChange() {
    this.unwatches.forEach(unwatch => unwatch());
    this.unwatches.splice(0);
    const polygonLayers = this.layers.filter(layer => VALIDGEOMETRIES.indexOf(layer.getGeometryType()) !== -1);
    polygonLayers.forEach(layer => {
      const {state} = layer;
      this.unwatches.push(VM.$watch(() =>  state.visible, visible => {
        // need to be visible or selected
        this.setEnable(visible && state.selected);
      }));
    });
  };

  change(layers=[]) {
    this.layers = layers;
    const visible = this.checkVisibile(layers);
    this.setVisible(visible);
    this.setEnable(false);
    this.listenPolygonLayersChange();
  };

  checkVisibile(layers) {
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
      if (querableLength === 1 && filterableLength === 1) {
        visible = filterableLayers[0] !== querableLayers[0];
      } else visible = querableLength > 0 && filterableLength > 0;
    }
    return visible;
  };

  setMap(map) {
    super.setMap(map);
    this._interaction.on('picked', evt => {
      this.dispatchEvent({
        type: 'picked',
        coordinates: evt.coordinate
      });
      this._autountoggle && this.toggle();
    });
    this.setEnable(false);
  };
};


export default  QueryByPolygonControl;
