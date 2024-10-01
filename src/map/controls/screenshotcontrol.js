/**
 * @file ORIGINAL SOURCE: src/app/g3w-ol/controls/screenshotcontrol.js@v3.10.2
 * @since 3.11.0
 */

import ApplicationState         from 'store/application';
import GUI                      from 'services/gui';
import { sameOrigin }           from 'utils/sameOrigin';
import InteractionControl       from 'map/controls/interactioncontrol';

/**
 * @FIXME prevent tainted canvas error
 * 
 * Because the pixels in a canvas's bitmap can come from a variety of sources,
 * including images or videos retrieved from other hosts, it's inevitable that
 * security problems may arise. As soon as you draw into a canvas any data that
 * was loaded from another origin without CORS approval, the canvas becomes
 * tainted.
 * 
 * A tainted canvas is one which is no longer considered secure, and any attempts
 * to retrieve image data back from the canvas will cause an exception to be thrown.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image
 */
export class ScreenshotControl extends InteractionControl {

  constructor(opts = {}) {
    opts.layers = undefined === opts.layers ? []: opts.layers;

    super({
      name: "maptoimage",
      tipLabel: "Screenshot",
      label: "\ue90f",
      clickmap: true,
      enabled:  true,
      layers: [],
      ...opts
    });

    this.types = [];

    (opts.types || []).forEach(type => this.addType(type));

    this.layers= opts.layers;

    //set visibility based on layers
    this.setVisible(this.checkVisible(this.layers));

    //only if is visible (no CORS issue) need to listen to add/remove layer
    if (this.isVisible()) {
      //listen to add/remove External Layer event to check visibility of the control
      GUI.getService('map').onafter('loadExternalLayer', this._addLayer.bind(this));
      GUI.getService('map').onafter('unloadExternalLayer', this._removeLayer.bind(this));
    }
  }

  /**
   * @param { 'screenshot' | 'geoscreenshot' } type
   *
   * @since 3.11.0
   */
  addType(type) {
    this.types.push(type);

    this.toggledTool = this.toggledTool || {
      __title: 'sdk.mapcontrols.screenshot.title',
      __iconClass: 'camera',
      data: () => ({ types: this.types, type: this.types[0] }),
      template: /* html */ `
        <div style="width: 100%; padding: 5px;">
          <select ref="select" style="width: 100%;" :search="false" v-select2="'type'">
            <option v-for="type in types" :value="type" v-t="'sdk.mapcontrols.screenshot.' + type"></option>
          </select>
          <button style="margin-top: 5px" class="btn btn-block btn-success" @click.stop="download" v-t="'sdk.mapcontrols.screenshot.download'"></button>
        </div>`,
      methods: {
        async download(e) {
          const map         = GUI.getService('map');
          // Start download
          ApplicationState.download = true;
          e.target.disabled = true;
          try {
            const blobImage = await map.createMapImage();

            if ('screenshot' === this.type) {                   // PNG
              window.saveAs(blobImage, `map_${Date.now()}.png`);
            } else {                                            // GeoTIFF
              const body = new FormData();
              body.append('image',               blobImage);
              body.append('csrfmiddlewaretoken', map.getCookie('csrftoken'));
              body.append('bbox',                map.getMapBBOX().toString());
              window.saveAs(
                await (await fetch(
                  `/${map.project.getType()}/api/asgeotiff/${map.project.getId()}/`,
                  { method: 'POST', body }
                )).blob(),
                `map_${Date.now()}.tif`
              );
            }
          } catch (e) {
            GUI.showUserMessage({
              type:    'SecurityError' === err.name ? 'warning' : 'alert',
              message: 'SecurityError' === err.name ? 'mapcontrols.screenshot.securityError' : 'mapcontrols.screenshot.error',
              autoclose: false
            });
            console.warn(e);
          }
          // End download
          ApplicationState.download = false;
          e.target.disabled = false;
          return true;
        }
      },
      created()       { GUI.toggleUserMessage(false); },
      beforeDestroy() { GUI.toggleUserMessage(true); }
    };
  }

  /**
   * Called when a new layer is added to Project (eg. wms or vector layer)
   * 
   * @since 3.8.3
   *
   */
  _addLayer(layer) {
    this.layers.push(layer);
    this.change(this.layers);
    layer.on('change:visible', () => this.change(this.layers));
  }

  /**
   * Called when a layer is removed from Project
   * 
   * @since 3.8.3 
   */
  _removeLayer(layer) {
    this.layers = this.layers.filter(l => l !== layer);
    this.change(this.layers);
  }

  /**
   * Called when a layer is added or removed
   * 
   * @param layers
   */
  change(layers = []) {
    this.setVisible(this.checkVisible(layers));
  }

  /**
   * Check visibility for map control based on layers URLs.
   * 
   * Allow printing external WMS layers only when they have
   * the same origin URL of the current application in order to avoid
   * CORS issue while getting map image.
   * 
   * Layers that don't have a source URL are excluded (eg. base layers)
   * 
   * @param {array} layers
   * 
   * @returns {boolean}
   */
  checkVisible(layers = []) {
    // Need to be visible.
    // If it was not visible, the CORS issue was raised.
    // Need to reload and remove layer
    return this.isVisible() && !layers.some(isCrossOrigin);
  }

}

/**
 * Check if a layer has a Cross Origin source URI
 * 
 * @param layer
 * 
 * @returns {boolean} `true` whether the given layer could cause CORS issues (eg. while printing raster layers). 
 */
function isCrossOrigin(layer) {
  let source_url;

  // vector or hidden layers can't cause CORS issues
  if ((layer.getVisible && !layer.getVisible()) || layer instanceof ol.layer.Vector) {
    return false;
  }
  
  // image layer (OpenLayers)
  if (layer instanceof ol.layer.Tile || layer instanceof ol.layer.Image) { 
    source_url = layer.getSource().getUrl();
    return source_url && !sameOrigin(source_url, location);
  }

  // external image layer (eg: "core/layers/imagelayer.js")
  if ((layer.getConfig().source || {}).external) { 
    source_url = layer.getConfig().source.url;
    return source_url && !sameOrigin(source_url, location);
  }

  return false;
}