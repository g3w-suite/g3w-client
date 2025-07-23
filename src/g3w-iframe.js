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

import G3WObject          from 'g3w-object';
import GUI                from 'services/gui';
import DataRouterService  from 'services/data';
import ApplicationState   from 'g3w-state'
import { normalizeEpsg }  from 'utils/normalizeEpsg';
import { getUniqueDomId } from 'utils/getUniqueDomId';

export class IframeApp extends G3WObject {

  pending = {};

  constructor() {

    super();

    // handle all messages from the window
    window.addEventListener('message', async message => {
      if (!message?.data || !message.data.action?.startsWith('app:') || 'app:ready' === message.data.action || 'function' !== typeof this[message.data.action]) {
        return;
      }
      const id = undefined !== message.data.id ?  message.data.id : getUniqueDomId();
      try {
        // stop pending actions
        if (message.data.single ?? true) {
          await Promise.allSettled(Object.keys(this.pending).map(id => {
            delete this.pending[id];
            return this['app:stop']();
          }));
        }
        this.pending[id] = {};
        window.parent?.postMessage?.({
          id,
          action: message.data.action,
          response: {
            result: true,
            data:   await this[message.data.action](message.data.data)
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
      delete this.pending[id];
    }, false);

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
  }

  /**
   * Return a qgs_layer_id array based on passed qgis_layer_id
   * 
   * @param { Object } opts
   * @param { string | string[] | null | undefined } opts.qgs_layer_id
   * @param { Array } noValue
   * 
   * @returns { string[] } qgs_layer_id
   * 
   * @private
   */
  'app:getQgsLayerId'({
    qgs_layer_id,
    noValue,
  }) {
    noValue = undefined !== noValue ? noValue : ApplicationState.project.state.layers.map(l => ({ id: l.id, name: l.name }));
    return qgs_layer_id ? [].concat(qgs_layer_id) : noValue;
  };

  /**
   * getFeature from DataProvider
   * 
   * @private
   */
  async 'app:searchFeature'({
    layer,
    feature,
  }) {
    const { data = [] } = await DataRouterService.getData('search:features', {
      inputs: {
        layer,
        filter: [].concat(feature.value).map(v => `${feature.field}|eq|${encodeURIComponent(v)}`).join('|OR,')
      },
      outputs: false
    });
    return data;
  };

  /**
   * Search feature(s) by field and value
   * 
   * @param { Object } opts
   * @param opts.qgs_layer_id
   * @param opts.feature
   * @param opts.zoom
   * @param opts.highlight
   * 
   * @returns { Promise<{ qgs_layer_id: null, features: [], found: boolean }>}
   */
  async 'app:findFeaturesWithGeometry'({
    feature,
    qgs_layer_id = [],
    zoom         = false,
    highlight    = false,
  } = {}) {
    const response = {
      found:        false,
      features:     [],
      qgs_layer_id: null
    };
    let layersCount = qgs_layer_id.length;
    let i = 0;
    while (!response.found && i < layersCount) {
      const layer = ApplicationState.project.getLayerById(qgs_layer_id[i]);
      try {
        const data     = layer && await this['app:searchFeature']({ layer, feature });
        const features = data.length && data[0].features;
        response.found = features && features.length > 0 && !!features.find(f => f.getGeometry());
        if (!features || !response.found) {
          throw 'invalid response';
        }
        response.features     = features;
        response.qgs_layer_id = qgs_layer_id[i];
        if (zoom) {
          await GUI.getService('map').zoomToFeatures(features, { highlight });
        }
      } catch(e) { i++; console.warn(e);}
    }
    // in case of no response zoom to an initial extent
    if (!response.found) {
      GUI.getService('map').zoomToExtent(GUI.getService('map').project.state.initextent)
    }
    return response;
  }

  /**
   * Overwrite single service: Usefult to stop eventually running action
   * 
   * @returns { Promise<void> }
   */
  async 'app:stop'() {}

  /**
   * Overwrite each single service
   */
  'app:clear'() {}

  /**
   * @returns { Promise<Array> }
   */
  async 'app:results'({
    capture = true,
  }) {
    GUI.currentoutputplace = capture ? 'iframe' : 'gui';
    return [];
  }

  /**
   * @returns { Promise<void> }
   */
  async 'app:screenshot'({
    capture = true,
  }) {
    // skip when ..
    if (!capture) {
      GUI.getService('map').getMapControlByType('screenshot').resetOriginalOnClickEvent();
      return;
    }

    GUI.getService('map').getMapControlByType('screenshot').overwriteOnClickEvent((blob) => {
      try {
        window.parent?.postMessage?.({
          id: null,
          action: 'app:screenshot',
          response: {
            result: true,
            data: blob
          }
        }, '*');
      } catch(e) {
        console.warn(e);
        window.parent?.postMessage?.({
          id: null,
          action: 'app:screenshot',
          response: {
            result: false,
            data: e
          }
        }, '*');
      }
    });
  }

  /**
   * Eventually send as param the projection in which we would like get center of map
   * 
   * @param { Object } params
   * @param params.epsg since 3.9.1
   * 
   * @returns { Promise<void> }
   */
  async 'app:getcenter'(params = {}) {
    const center = GUI.getService('map').getCenter();
    if (undefined !== params.epsg) {
      params.epsg = normalizeEpsg(params.epsg)
      await ApplicationState.projections.set(params.epsg);
      return ol.proj.transform(center, GUI.getService('map').getEpsg(), params.epsg);
    }
    return center;
  }

  /**
   * Zoom to coordinates
   * 
   * @param { Object } params
   * @param { Array } params.coordinates
   * @param params.epsg since 3.9.1
   * 
   * @returns { Promise<Array> }
   */
  async 'app:zoomtocoordinates'(params = {}) {
    let coords = undefined !== params.coordinates ? params.coordinates : [];
    // skip when coordinates in params are null or are an array with more than item 2
    if (!(coords && Array.isArray(coords) && 2 === coords.length)) {
      return Promise.reject(coords);
    }
    if (undefined !== params.epsg) {
      params.epsg = normalizeEpsg(params.epsg)
      await ApplicationState.projections.set(params.epsg);
      coords = ol.proj.transform(coordinates, params.epsg, GUI.getService('map').getEpsg());
    }
    GUI.getService('map').zoomTo(coords);
    return coords;
  }

  /**
   * Eventually send as param the projection in which we would like get center of map
   * 
   * @param { Object } params
   * @param params.epsg since 3.9.1
   * 
   * @returns { Promise<void> }
   */
  async 'app:getextent'(params = {}) {
    const extent = GUI.getService('map').getMapExtent();
    /** @FIXME add description */
    if (undefined !== params.epsg) {
      params.epsg = normalizeEpsg(params.epsg)
      await ApplicationState.projections.set(params.epsg);
      return ol.proj.transformExtent(extent, GUI.getService('map').getEpsg(), params.epsg);
    }
    return extent;
  }

  /**
   * @param { Object } params
   * @param { Array } params.extent
   * @param params.epsg since 3.9.1
   * 
   * @returns { Promise<Array> }
   */
  async 'app:zoomtoextent'(params = {}) {
    let extent = undefined !== params.extent ? params.extent : [];
    // skip when an extent is null ora an array with number of ites not equal to 4
    if (!(extent && Array.isArray(extent) && 4 === extent.length)) {
      return Promise.reject(extent);
    }
    /** If epsg is provide, get epsg definition */
    if (undefined !== params.epsg) {
      params.epsg = normalizeEpsg(params.epsg)
      await ApplicationState.projections.set(params.epsg);
      extent = ol.proj.transformExtent(extent, params.epsg, GUI.getService('map').getEpsg());
    } else {
      GUI.getService('map').goToBBox(extent);
    }
    return extent;
  };

  /**
   * Zoom to features
   * 
   * @param { Object } params
   * @param params.qgs_layer_id
   * @param params.feature
   * @param { boolean } params.highlight 
   * 
   * @returns { Promise } qgs_layer_id
   */
  async 'app:zoomtofeature'(params = {}) {
    let {
      qgs_layer_id,
      feature,
      highlight = false,
    } = params;

    qgs_layer_id = this['app:getQgsLayerId']({ qgs_layer_id });

    const response = await this['app:findFeaturesWithGeometry']({
      qgs_layer_id,
      feature,
      zoom: true,
      highlight,
    });

    return response.qgs_layer_id;
  }

}