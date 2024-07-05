/**
 * @file
 * @since v3.8
 */
import GUI               from 'services/gui';
import DataRouterService from 'services/data';
import ProjectsRegistry  from 'store/projects';
import { throttle }      from 'utils/throttle';

const BaseQueryPolygonControl = require('g3w-ol/controls/basequerypolygoncontrol');

module.exports = class QueryByDrawPolygonControl extends BaseQueryPolygonControl {

  constructor(options={}) {

    super({
      ...options,
      name:                    "querybydrawpolygon",
      tipLabel:                "sdk.mapcontrols.querybydrawpolygon.tooltip",
      customClass:             GUI.getFontClass('draw'),
      clickmap:                true,
      interactionClass:        ol.interaction.Draw,
      interactionClassOptions: { type: 'Polygon' },
      layers:                  GUI.getService('map').filterableLayersAvailable({ filtrable: { ows: 'WFS' } }) || [],
      help:                    { title:"sdk.mapcontrols.querybybbox.help.title", message:"sdk.mapcontrols.querybybbox.help.message", }
    });

    this.setEnable(this.hasVisibleLayers());
  
    /**
     * Store drawed ol.Feature
     */
    this.feature = null;
  }

  /**
   * @param {ol.Map} map
   * 
   * @listens ol.interaction.Draw~drawend
   */
  setMap(map) {

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

  }

  /**
   * @since 3.8.0
   */
  onSelectLayer(layer) {
    if (layer) {
      const findLayer = this.layers.find(l => l === layer);
      this.setEnable(!!findLayer && findLayer.isVisible());
    } else {
      this.setEnable((this.hasVisibleLayers()));
    }
    this.toggle(this.isToggled() && this.getEnable());
  }

  /**
   * @param { unknown | null } layer
   *
   * @since 3.8.0
   */
  listenLayersVisibilityChange() {
    this.unwatches.forEach(unwatch => unwatch());
    this.unwatches.splice(0);
    this.layers.forEach(layer => {
      this.unwatches.push(
        this.watchLayer(() => layer.state.visible, visible => {
          // check if a selectedLayer i set
          if (null === this.getSelectedLayer()) {
            this.setEnable(this.hasVisibleLayers());
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
  onAddExternalLayer({layer, unWatches}) {

    unWatches.push(
      this.watchLayer(
        () => layer.selected,                                    // watch `layer.selected` property
        selected => {
          this.setEnable(true === selected ? layer.visible : this.hasVisibleLayers());
          this.toggle(this.isToggled() && this.getEnable());
        })
    );

    unWatches.push(
      this.watchLayer(
        () => layer.visible,                                     // watch `layer.visible` property
        (visible) => {
          this.setEnable(true === layer.selected ? visible : this.hasVisibleLayers());
          this.toggle(this.isToggled() && this.getEnable());
        })
    );

    this.setEnable(this.hasVisibleLayers());
  }

  /**
   * @since 3.8.0
   */
  onRemoveExternalLayer() {
    this.setEnable(this.hasVisibleLayers());
  }

  /**
   * @returns {Promise<void>}
   * 
   * @since 3.8.0
   */
  async runSpatialQuery(){
    GUI.closeOpenSideBarComponent();

    try {
      await DataRouterService.getData('query:polygon', {
        inputs: {
          feature: this.feature,
          excludeSelected: (null === this.getSelectedLayer()),
          external: {
            add: this.addExternalLayerToResult(),
            filter: {
              SELECTED: this.isExternalLayerSelected()
            }
          },
          filterConfig: {
            spatialMethod: this.getSpatialMethod()
          },
          multilayers: ProjectsRegistry.getCurrentProject().isQueryMultiLayers(this.name),
          /**@since 3.9.0**/
          //add a custom type
          type: 'drawpolygon',
        },
        outputs: {
          show({error = false}) {
            return !error;
          }
        }
      });

    } catch(e) {
      console.warn(e);
    }
  }

  /**
   * @since 3.8.0
   */
  clear() {
    this.feature = null;
  }

};