/**
 * @file ORIGINAL SOURCE: g3w-client/src/services/iframe.js@4.0.0
 * 
 * @since 4.1.0
 * 
 * @example template.html
 * 
 * ```html
 * <!DOCTYPE html>
 * <html lang="en" style="width: 100%; height: 100%">
 * <head>
 *   <meta charset="UTF-8">
 *   <title>Test Iframe</title>
 * </head>
 * <body style="width:100%; height: 100%; margin: 0;">
 * <iframe style="width: 100%; height: 100%; border: 0;" src="http://192.168.1.4:3000/?project=test-iframe/qdjango/62"></iframe>
 * </body>
 * <script>
 *   // send message to iframe when app is ready
 *   const iframe = document.querySelector('iframe');
 *   window.addEventListener('message', evt => {
 *     const { action, response } = evt.data;
 *     if (action === "app:ready") {
 *       setTimeout(() => iframe.contentWindow.postMessage({
 *         id: null,                     // id of action,
 *         action: "<context>:<action>", // eg: "app:zoomtofeature"
 *         data: {}                      // data contain all mandatory attribute information
 *       }, '*'), 2000)
 *     }
 *   }, false);
 * </script>
 * </html>
 * ```
 */

import Emitter            from 'g3w-emitter';
import GUI                from 'g3w-app';
import ApplicationState   from 'g3w-state'
import { normalizeEpsg }  from 'utils/normalizeEpsg';
import { getUniqueDomId } from 'utils/getUniqueDomId';
import { waitFor }        from 'utils/waitFor';

export class IframeApp extends Emitter {

  constructor() {
    super();

    // handle all messages from the window
    window.addEventListener('message', async message => {
      if (!message?.data?.action?.startsWith('app:')) {
        return;
      }
      const id = message.data.id ?? getUniqueDomId();
      try {
        window.parent?.postMessage?.({
          id,
          action: message.data.action,
          response: {
            result: true,
            data:   'function' === typeof this[message.data.action] ? await this[message.data.action](message.data.data) : undefined
          }
        }, '*');
      } catch(e) {
        console.warn(e);
        window.parent?.postMessage?.({
          id,
          action: message.data.action,
          response: {
            result: false,
            data: e
          }
        }, '*');
      }
    }, false);

    // emit 'app:ready' message when ready
    GUI.isMapReady().then(async () => {
      // wait until "editing" plugin is loaded
      if (window.initConfig.plugins.editing) {
        await waitFor(() => GUI.getPlugin('editing'));
      }
      window.parent?.postMessage?.({
        id:        null,
        action:   'app:ready',
        response: {
          result: true,
          data: {
            layers: ApplicationState.project.state.layers.map(l => ({ id: l.id, name: l.name }))
          }
        },
      }, '*');
    });
  }

  /**
   * @returns { Promise<Array> }
   */
  async 'app:results'(params = {}) {
    GUI.showData.iframe = !!(params.capture ?? true);
    return [];
  }

  /**
   * @returns { Promise<void> }
   */
  async 'app:screenshot'(params = {}) {
    if (params.capture ?? true) {
      GUI.getMapControl('screenshot').overwriteOnClickEvent(blob => {
        try {
          window.parent?.postMessage?.({ id: null, action: 'app:screenshot', response: { result: true, data: blob } }, '*');
        } catch(e) {
          console.warn(e);
          window.parent?.postMessage?.({ id: null, action: 'app:screenshot', response: { result: false, data: e } }, '*');
        }
      });
    } else {
      GUI.getMapControl('screenshot').resetOriginalOnClickEvent();
    }
  }

  /**
   * @param { Object } params
   * @param params.epsg since 3.9.1 - projection in which we would like get map center
   * 
   * @returns { Promise<void> }
   */
  async 'app:getcenter'(params = {}) {
    const center = GUI.getCenter();
    if (undefined !== params.epsg) {
      params.epsg = normalizeEpsg(params.epsg)
      await ApplicationState.projections.set(params.epsg);
      return ol.proj.transform(center, GUI.getEpsg(), params.epsg);
    }
    return center;
  }

  /**
   * Zoom to coordinates
   * 
   * @param { Object } params
   * @param { Array } params.coordinates
   * @param params.epsg since 3.9.1 - projection in which we would like get map coordinates
   * 
   * @returns { Promise<Array> }
   */
  async 'app:zoomtocoordinates'(params = {}) {
    let coords = params?.coordinates ?? [];
    // skip when coordinates in params are null or are an array with more than item 2
    if (!(coords && Array.isArray(coords) && 2 === coords.length)) {
      return Promise.reject(coords);
    }
    if (params.epsg) {
      params.epsg = normalizeEpsg(params.epsg)
      await ApplicationState.projections.set(params.epsg);
      coords = ol.proj.transform(coordinates, params.epsg, GUI.getEpsg());
    }
    const view = GUI.getMap().getView();
    view.setCenter(coords);
    view.setZoom(6);
    return coords;
  }

  /**
   * @param { Object } params
   * @param params.epsg since 3.9.1 - projection in which we would like get map extent
   * 
   * @returns { Promise<void> }
   */
  async 'app:getextent'(params = {}) {
    const extent = GUI.getMapExtent();
    if (params.epsg) {
      params.epsg = normalizeEpsg(params.epsg)
      await ApplicationState.projections.set(params.epsg);
      return ol.proj.transformExtent(extent, GUI.getEpsg(), params.epsg);
    }
    return extent;
  }

  /**
   * @param { Object } params
   * @param { Array } params.extent
   * @param params.epsg since 3.9.1 - projection in which we would like get map extent
   * 
   * @returns { Promise<Array> }
   */
  async 'app:zoomtoextent'(params = {}) {
    let extent = params?.extent ?? [];
    // skip when an extent is null ora an array with number of ites not equal to 4
    if (!(extent && Array.isArray(extent) && 4 === extent.length)) {
      return Promise.reject(extent);
    }
    /** If epsg is provide, get epsg definition */
    if (params.epsg) {
      params.epsg = normalizeEpsg(params.epsg)
      await ApplicationState.projections.set(params.epsg);
      extent = ol.proj.transformExtent(extent, params.epsg, GUI.getEpsg());
    } else {
      const geometry = ol.extent.containsExtent(ApplicationState.project.state.extent, extent) ? extent : ApplicationState.project.state.extent;
      const view = GUI.getMap().getView();
      view.animate(
        { duration: 200, center:     view.getCenter() },
        { duration: 200, resolution: view.getResolution() }
      );
      view.fit(geometry, { constrainResolution: true, size: GUI.getMap().getSize() });
    }
    return extent;
  };

  /**
   * @param { Object } params
   * @param params.qgs_layer_id
   * @param params.feature
   * @param { boolean } params.highlight 
   * 
   * @returns { Promise } qgs_layer_id
   */
  async 'app:zoomtofeature'(params = {}) {
    params.qgs_layer_id = params.qgs_layer_id ? [].concat(params.qgs_layer_id) : ApplicationState.project.state.layers.map(l => ({ id: l.id, name: l.name }));
    
    let found = false;

    const response = {
      features:     [],
      qgs_layer_id: null,
    };

    let i = 0;

    while (!found && i < params.qgs_layer_id.length) {
      const layer = ApplicationState.project.getLayerById(params.qgs_layer_id[i]);
      try {
        const data = layer && (await GUI.getData('search:features', {
          inputs: {
            layer,
            filter: [].concat(params.feature.value).map(v => `${params.feature.field}|eq|${encodeURIComponent(v)}`).join('|OR,')
          },
          outputs: false
        }))?.data || [];
        const features = data?.[0]?.features;
        found = !!features?.find(f => f.getGeometry());
        if (!features || !found) {
          throw 'invalid response';
        }
        response.features     = features;
        response.qgs_layer_id = params.qgs_layer_id[i];
        await GUI.zoomToFeatures(features, { highlight: (params.highlight ?? false) });
      } catch(e) {
        i++;
        console.warn(e);
      }
    }

    // feature not found → zoom to initial extent
    if (!found) {
      GUI.zoomToExtent(GUI.project.state.initextent)
    }

    return response.qgs_layer_id;
  }

}