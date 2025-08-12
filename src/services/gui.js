import { G3W_FID }                              from 'g3w-constants';
import Emitter                                  from 'g3w-emitter';
import Component                                from 'g3w-component';
import Panel                                    from 'g3w-panel';
import { gettext as _ }                         from 'g3w-i18n';
import ApplicationState                         from 'g3w-state';
import { IframeApp }                            from 'g3w-iframe';

import DataRouterService                        from 'services/data';

import { getUniqueDomId }                       from 'utils/getUniqueDomId';
import { toRawType }                            from 'utils/toRawType';
import { getListableProjects }                  from 'utils/getListableProjects';
import { getProjectUrl }                        from 'utils/getProjectUrl';
import { getCatalogLayerById }                  from 'utils/getCatalogLayerById';
import { getAlphanumericPropertiesFromFeature } from 'utils/getAlphanumericPropertiesFromFeature';
import { intersects }                           from 'utils/intersects';
import { within }                               from 'utils/within';
import { saveBlob }                             from 'utils/saveBlob';
import { throttle }                             from 'utils/throttle';

import PickCoordinatesInteraction               from 'map/interactions/pickcoordinatesinteraction';

Object
  .entries({
    Emitter,
    Component,
    Panel,
    _,
    ApplicationState,
    IframeApp,
    DataRouterService,
    PickCoordinatesInteraction,
  })
  .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

export default new (class GUI extends Emitter {

  /** store legacy frontend components */
  #COMPONENTS = {}

  /* service know by the applications (standard) */
  #SERVICES = {
    navbar:   null,
    sidebar:  null,
    viewport: null,
  }

  isready = false;

  /** whether to push new data content to result */
  push_content = false;

  #closeUserMessage = true;

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   */
  #events = [];

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   */
  #atlas = [];

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * <Object> to store relations (key is referenceLayer of relation)
   */
  #relations = {};

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   */
  plotLayerIds = [];

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * <Array> where are store vector layer add on runtime
   */
  #vectorLayers = [];

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Reactive state
   */
  state = {

    logged: undefined !== window.initConfig.user.id,

    /**
     * @FIXME add description
     */
    components: [],

    /**
     * @FIXME add description
     */
    layers: [],

    /**
     * @FIXME add description
     */
    changed: false,

    /**
     * @FIXME add description
     */
    query: null,

    /**
     * 'ows' = default
     * 'api' = search
     */
    type: 'ows',

    /**
     * An action is an object that contains:
     *
     * ```
     * {
     *   "id":       (required) Unique action Id
     *   "download": whether action is download or not
     *   "class":    (required) fontawsome classname to show icon
     *   "state":    need to be reactive. Used for example to toggled state of action icon
     *   "hint":     Tooltip text
     *   "init":     Method called when action is loaded
     *   "clear":    Method called before clear the service. Used for example to clear unwatch
     *   "change":   Method called when feature of layer is changed
     *   "cbk":      (required) Method called when action is cliccked
     * }
     * ```
     **/
    layersactions: {},

    /**
     * Add action tools (for features)
     */
    actiontools: {},

    /**
     * Current action tools contain component
     * of a specific action (eg. download)
     */
    currentactiontools:{},

    /**
     * Contains current action that expose vue component
     * (useful for comparing the id other action is
     * triggered and exposing the component)
     */
    currentactionfeaturelayer:{},

    /**
     * @FIXME add description
     */
    layeractiontool: {},

    /**
     * @FIXME add description
     */
    layersFeaturesBoxes:{},

    /**
     * Used to show a custom component for a layer
     */
    layerscustomcomponents: {}

  };

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   */
  #interaction = {

    /**
     * Reference to current layer
     */
    id: null,

    /**
     * Interaction bind to layer,
     */
    interaction: null,

    /**
     * Add current toggled map control if toggled
     */
    mapcontrol: null,

    /**
     * Method that handles interaction when a mapcontrol is toggled
     */
    toggleeventhandler: null

  };

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   */
  #asyncFnc = {
    todo:                      () => {},
    zoomToLayerFeaturesExtent: { async: false },
    highLightLayerFeatures:    { async: false },
    goToGeometry:              { async: false },
  };

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Vector layer used by query result to show query
   * request as coordinates, bbox, polygon, etc ..
   *
   * @type {ol.layer.Vector}
   */
  #layer = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style: feat => new ol.style.Style('Point' === feat.getGeometry().getType()
      ? { text:   new ol.style.Text({ fill: new ol.style.Stroke({ color: 'black' }), text: '\uf3c5', font: '900 3em "Font Awesome 5 Free"', offsetY : -15 }) }
      : { stroke: new ol.style.Stroke({ color: 'black' }) }
    )
  });

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Layer ids sorted by TOC
   */
  #layer_ids = [];

  /*
  * Based on bootbox.js v4.4.0
  * Copyright 2011-2020 Nick Payne
  * Licensed under MIT (https://github.com/bootboxjs/bootbox/blob/v4.x/LICENSE.md)
  */
  dialog = {
  
    dialog(options, callback) {

    // BACKCOMP: v3.x
    if (undefined != callback) {
      console.warn('GUI.dialog.confirm(message, callback) is deprecated')
      options = {
        message: options,
        callback,
        buttons: {
          cancel:  { label: "Cancel" },
          confirm: { label: "OK" }
        }
      };
      options.buttons.cancel.callback  = function() { return options.callback.call(this, false); };
      options.buttons.confirm.callback = function() { return options.callback.call(this, true); };
    }

    options = Object.assign({
        className:   null,   // additional class string applied to the top level dialog
        closeButton: true,   // whether or not to include a close button
        show:        true,   // show the dialog immediately by default
        container:   "body", // dialog container
        buttons:     {},
        message:     '',
      }, options);
  
      const dialog = $(/* html */ `<div class="bootbox modal fade ${options.className || ''}" tabindex="-1" role="dialog">
        <div class="modal-dialog ${({ large: "modal-lg", small: "modal-sm" })[options.size] || '' }">
          <div class="modal-content">
            ${ options.title ? "<div class='modal-header'><h4 class='modal-title'></h4></div>" : '' }
            <div class="modal-body"><div class="bootbox-body"></div></div>
          </div>
        </div>
      </div>`);

      dialog.find(".bootbox-body").html(options.message);
  
      let btns = "";
      const callbacks = {};
  
      Object.keys(options.buttons).forEach((key, i, arr) => {
        if ('function' === typeof options.buttons[key]) {
          options.buttons[key] = { callback: options.buttons[key] };
        }
        // the lack of an explicit label means we'll assume the key is good enough
        if (!options.buttons[key].label) {
          options.buttons[key].label = key;
        }
        // always add a primary to the main option in a two-button dialog
        if (!options.buttons[key].className) {
          options.buttons[key].className = arr.length <= 2 && i === arr.length - 1 ? "btn-primary" : "btn-default";
        }
        btns += "<button data-bbx='" + key + "' type='button' class='btn " + options.buttons[key].className + "'>" + options.buttons[key].label + "</button>";
        callbacks[key] = options.buttons[key].callback;
      });
    
      if (options.closeButton) {
        const close = $("<button type='button' class='bootbox-close-button close' data-dismiss='modal' aria-hidden='true'>&times;</button>");
        if (options.title) {
          dialog.find(".modal-header").prepend(close);
        } else {
          close.css("margin-top", "-10px").prependTo(dialog.find(".modal-body"));
        }
      }
    
      if (options.title) {
        dialog.find(".modal-title").html(options.title);
      }
    
      if (btns) {
        dialog.find(".modal-body").after("<div class='modal-footer'></div>");
        dialog.find(".modal-footer").html(btns);
      }
  
      const onCallback = (e, dialog, callback) => {
        e.stopPropagation();
        e.preventDefault();
        if ('function' !== typeof callback || false !== callback.call(dialog, e)) {
          dialog.modal("hide");
        }
      };
  
      dialog.on("hidden.bs.modal",                function(e) { if (e.target === this) { dialog.remove(); } });
      dialog.on("shown.bs.modal",                 function()  { dialog.find(".btn-primary:first").focus(); });
      dialog.on("click", ".modal-footer button",  function(e) { onCallback(e, dialog, callbacks[$(this).data("bbx")]); });
      dialog.on("click", ".bootbox-close-button", function(e) { onCallback(e, dialog, callbacks.cancel); });
      dialog.on("keyup",                          function(e) { if (e.which === 27 && callbacks.cancel) { onCallback(e, dialog, callbacks.cancel); } });
    
      $(options.container).append(dialog);
      dialog.modal({ backdrop: "static", keyboard: false, show: false });
    
      if (options.show) {
        dialog.modal("show");
      }
    
      return dialog;
    },
  
  };

  constructor(opts) {
    super(opts);

    this.setters = [
      'setContent',
      'getPermalink',
      'getPrintParams',
      'registerPlugin',
      'online',
      'offline',
      /** @since 4.1.0 */
      'showPanel',
      /** @since 4.1.0 */
      'setQueryResponse',
      /** @since 4.1.0 */
      'setLayersData',
      /** @since 4.1.0 */
      'addActionsForLayers',
      /** @since 4.1.0 */
      'postRender',
      /** @since 4.1.0 */
      'closeComponent',
      /** @since 4.1.0 */
      'changeLayerResult',
      /** @since 4.1.0 */
      'activeMapInteraction',
      /** @since 4.1.0 */
      'editFeature',
      /** @since 4.1.0 */
      'openCloseFeatureResult',
      /** @since 4.1.0 */
      'removeFeatureLayerFromResult',
    ];

    // BACKOMP v3.x
    this.outputDataPlace = this.showData.bind(this);

    // BACKCOMP: v3.x
    this.dialog.confirm = this.dialog.dialog;

    this.notify = {
      warning:(message, autoclose = false) => { this.showUserMessage({ type: 'warning', message, autoclose }) },
      error:  (message, autoclose = false) => { this.showUserMessage({ type: 'alert',   message, autoclose }) },
      info:   (message, autoclose = false) => { this.showUserMessage({ type: 'info',    message, autoclose }) },
      success:(message)                    => { this.showUserMessage({ type: 'success', message, autoclose: true }) }
    };

  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   */
  initQueryResultsService() {

    this.#layer_ids = (() => {
      const layersId = [];
      const traverse = tree => {
        (tree.nodes || [tree]).forEach(n => {
          if (n.id) { layersId.push(n.id) }
          else { traverse(n) }
        });
      };
      ApplicationState.project.state.layerstree.forEach(traverse);
      return layersId;
    })()

    /**
     * @FIXME add description
     */
    this.#relations = (ApplicationState.project.getRelations() || []).reduce((group, r) => {
      group[r.referencedLayer] = group[r.referencedLayer] || [];
      group[r.referencedLayer].push(r);
      return group;
    }, {});

    /**
     * @FIXME add description
     */
    this.#atlas = ApplicationState.project.getPrint().filter(p => p.atlas) || [];

    /**
     * @FIXME add description
     */
    this.onbefore('setContent', (options) => {
      if (100 === options.perc && this.isMobile()) {
        this.#asyncFnc.zoomToLayerFeaturesExtent.async = true;
        this.#asyncFnc.highLightLayerFeatures.async    = true;
        this.#asyncFnc.goToGeometry.async              = true;
      }
    });

    return this;
  }

  initMapService() {
    return new (require('services/map').default);
  }

  addComponent(component, placeholder, options={}) {
    let register = true;
    // add component to the sidebar and set position inside the sidebar
    if ('sidebar' === placeholder && (!isMobile.any || false !== component.mobile)) {
      ApplicationState.sidebar.components.push(component);
      (new (Vue.extend(require('components/SidebarItem.vue').default))({ component, opts: options })).$mount();
    } else if ('sidebar' !== placeholder && this.#SERVICES[placeholder]) {
      register = this.#SERVICES[placeholder].addComponents([component], options);
    }
    if (register) {
      this.setComponent(component);
    }
    return true;
  }

  /**
   * used by the following plugins: "billboards"
   */
  setPushContent(bool = false) {
    this.push_content = bool;
  }

  setComponent(component) {
    const id = component.getId();
    if (undefined === this.#COMPONENTS[id]) {
      this.#COMPONENTS[id] = component;
    }
  }

  getComponent(id) {
    return this.#COMPONENTS[id];
  }

  getComponents() {
    return this.#COMPONENTS;
  }

  ready() {
    // resize della window
    $(window).resize(() => { requestAnimationFrame(() => { this._layout(); }); });

     // resize on main siedemar open close sidebar
    $('.main-sidebar').on('transitionend', () => { requestAnimationFrame(() => { this._layout(); }); });

    this._layout();

    // remove "permalink_code" from URL
    const url = new URL(window.location);
    url.searchParams.delete('permalink_code');
    window.history.replaceState(null, null, url);

    const sidebarFix = () => {
      const contents = document.querySelector('#contents');
      const panel    = document.querySelector('#g3w-view-content');

      contents.style.height = panel.offsetHeight
        - (panel.querySelector('.close-panel-block')?.offsetHeight || 0)
        - (panel.querySelector('.content_breadcrumb')?.offsetHeight || 0)
        - (contents.children[0] ? 50 : 0) + 'px'; // vertical padding

        // workaround for qplotly?
      if (contents.children[0]) {
        contents.children[0].style.height = contents.style.height;
      }

      panel.style.padding = contents.children[0] ? '15px' : null;

      const viewH = $(window).height() - $(".navbar").height();
      $(".content-wrapper") .css('height', viewH);
      $(".main-sidebar")    .css('height', viewH);
      $('.g3w-sidebarpanel').css('height', viewH);

      requestAnimationFrame(sidebarFix);
    };
    requestAnimationFrame(sidebarFix);

    // initialize iframe services
    if (ApplicationState.iframe) {
      new IframeApp();
    }

    this.emit('ready');
    this.isready = true;
  }

  isReady() {
    return new Promise(resolve => this.isready ? resolve() : this.once('ready', resolve));
  };

  /**
   * Passing a component application ui id return service that belongs to component
   * @param componentId
   * @returns {*}
   */
  getService(componentId) {
    const component = this.getComponent(componentId);
    return component && component.getService();
  }

  /**
   * @returns plugin instance
   * 
   * @since 4.1.0
   */
  getPlugin(name) {
    return ApplicationState.plugins_registry[name];
  }

  /**
   * Store plugin instance into registry
   * 
   * @since 4.1.0
   */
  registerPlugin(plugin) {
    ApplicationState.plugins_registry[plugin.name] = ApplicationState.plugins_registry[plugin.name] || plugin;
  }

  /* end spinner */

  /**
   * Wrapper for download
   *
   * @param { Function } downloadFnc function to call
   * @param { Object }   options     Object parameters
   *
   * @since 3.9.0
   */
  async downloadWrapper(downloadFnc, options = {}) {
    this.setLoadingContent(true);

    ApplicationState.download = true;

    try {
      await downloadFnc(options);
    } catch(e) {
      this.showUserMessage({ type: 'alert', message: e || 'server_error', textMessage: !!e })
    }
    
    ApplicationState.download = false;

    this.setLoadingContent(false);
  }

  /** @since 3.10.0 remove _setUpTemplateDependencies method**/
  isMobile() {
    return isMobile.any;
  };
  
  getFontClass(type) {
    return Vue.prototype.g3wtemplate.getFontClass(type);
  }

  /* Metodos to define */
  getResourcesUrl() {
    return window.initConfig.staticurl + window.initConfig.client;
  }

  /**
   * Function called from DataRouterservice for gui output
   * 
   * @param { Promise | Object } promise request data or promise
   * @param { Object } output
   * @param { boolean | Function | Object } output.show set output condition (whether to show result or not)
   * @param { boolean } output.add
   * @param { String } output.title
   * 
   * @since 4.1.0
   */
  async showData(promise, output = {}) {

    // convert to promise
    if (!(promise instanceof Promise)) {
      promise = Promise.resolve(promise);
    }

    // unique id for request
    const rid = getUniqueDomId();

    /** @type { String[] } cached requests (by id) */
    this.showData.reqs = (this.showData.reqs || []).concat(rid);

    // in case of iframe
    if (this.showData.iframe) {
      try {
        let response = await promise;
        const json   = new ol.format.GeoJSON();
        window.parent?.postMessage?.({
          id: null,
          action: output.action ?? 'app:results',
          response: {
            data: (response.data || []).map(({ layer, features }) => ({ [layer.getId()]: { features: json.writeFeatures(features) } })),
            result: response.result
          }
        }, '*');
      } catch(e) {
        console.warn(e);
        window.parent?.postMessage?.({ id: null, action: output.action ?? 'app:results', response: { data: e, result: false } }, '*');
      }
      return;
    }

    //set loading state
    this.setLoadingContent(true);

    //check show attribute if is a valid type
    const condition = ['function', 'boolean'].includes(typeof output.show);

    Object.assign(output, {
      condition: condition ? output.show : true,
      add:       false,
      ...(condition ? {} : output.show)
    });

    // if request doesn't need to add to a current query result
    if (!output.add) {
      this.showQueryResults(output.title || '');
    }

    try {
      // Store data promise
      const data = (await promise) || {};

      //Check id we can show data
      const show = 'function' === typeof output.condition ? await output.condition(data) : false !== output.condition;
      const last = show && rid === this.showData.reqs.at(-1);

      // set request output ids empty
      if (last) {
        this.showData.reqs.splice(0);
      }

      //if set before call method and wait
      if (last && output.before) {
        await output.before(data)
      }

      // in case of usermessage show user message
      if (last && data.usermessage) {
        this.showUserMessage({
          type:      data.usermessage.type,
          message:   data.usermessage.message,
          autoclose: data.usermessage.autoclose
        });
      }

      // check if data can be shown on query result content
      if (last) {
        (this.showQueryResults(output.title || '')).setQueryResponse(data, { add: !!output.add });
      }

      // call after is set with data
      if (last && output.after) {
        output.after(data)
      }
    } catch(e) {
      console.warn(e);
      this.showUserMessage({
        type:        'alert',
        message:     this.#errorToMessage(e),
        textMessage: true
      });
      //@scince 3.11.0 emit error-output-data
      this.emit('error-output-data', e);
      await this.closeContent();
    }

    //set loading to false when no pending request
    this.setLoadingContent(this.showData.reqs.length > 0);
  }

  showForm(options = {}) {
    const { FormComponent } = require('components/g3w-form');
    // new instance every time
    const formComponent = options.formComponent ? new options.formComponent(options) : new FormComponent(options);
    this.setContent({
      perc:       options.perc,
      content:    formComponent,
      split:      undefined !== options.split ? options.split : 'h',
      crumb:      options.crumb,
      push:       !!options.push, //only one (if other deletes previous component)
      showgoback: !!options.showgoback,
      closable:   false
    });
    // return service
    return formComponent.getService();
  }

  /**
   *
   * @param pop remove or not content or pop
   */
  closeForm({ pop = false } = {}) {
    this.emit('closeform', false);

    const backonclose = !pop && ApplicationState.viewport.content.backonclose && ApplicationState.viewport.content.contentsdata.length > 1;

    // remove just last component
    if (pop || backonclose) {
      this.popContent();
    }

    // remove all content stacks
    if (!pop && !backonclose){
      this.closeContent();
      this.setModal(false);
    }
  }

  disableElement({element, disable}) {
    $(element)[disable ? 'addClass' : 'removeClass']('g3w-disabled');
  }

  disableContent(disable) {
    ApplicationState.viewport.content.disabled = disable;
  }

  disablePanel(disable=false) {
    this.disableElement({
      element: "#g3w-sidebarpanel-placeholder",
      disable
    })
  }

  /**
   * collapse any expanded sidebar component 
   */
  closeSideBar() {
    ApplicationState.sidebar.components.forEach(c => c.getOpen() && c.state.closewhenshowviewportcontent && c.collapsible && c.click({ open: false }));
  };

  // show results info/search
  showQueryResults(title, results) {
    this.clearState();

    if (results) {
      this.setQueryResponse(results);
    }

    // show contextual content
    this.setContent({
      content:    this,
      title:      "info.title",
      crumb:      { title: "info.title", trigger: null },
      push:       this.push_content,
      post_title: title,
      perc:       isMobile.any ? 100 : undefined,
    });

    return this;
  }

  async showPanel(content, opts = {}) {
    ApplicationState.sidebar.title  = content.title;
    ApplicationState.sidebar.parent = '#g3w-sidebarpanel-placeholder'

    const current = ApplicationState.sidebar.contentsdata.at(-1);

    if (current) {
      $(current.content.internalPanel.$el).hide();
    } 

    const options = { parent: '#g3w-sidebarpanel-placeholder', ...opts };
    const parent = ApplicationState.sidebar.parent;
    const data   = ApplicationState.sidebar.contentsdata;

    // check the type of content:

    // String or JQuery
    if (content instanceof jQuery || 'string' === typeof content) {
      let el = 'string' === typeof content ? ($(content).length ? $(`<div> ${content} </div>`) : $(content)) : content
      $(parent).append(el);
      data.push({ content: el, options });
      console.warn('[G3W-CLIENT] jQuery components will be discontinued, please update your code as soon as possible', data.at(-1));
    }

    // Vue element
    else if (content.mount && 'function' === typeof content.mount) {
      // Check a duplicate element by component id (if already exist)
      let id = data.findIndex(d => d.content.getId && (content.getId() === d.content.getId()));
      if (-1 !== id) {
        await data[id].content.unmount();
        data.splice(id, 1);
      }
      // Mount vue component
      await content.mount(parent, options.append || false);
      data.push({ content, options });
    }

    // DOM element
    else {
      parent.appendChild(content);
      data.push({ content, options });
    }

  }

  async closePanel() {
    const data = ApplicationState.sidebar.contentsdata;
    if (data.length <= 0) {
      return;
    }
    const panel = data.slice(-1)[0].content;
    if (panel instanceof Component || panel instanceof Panel) {
      await panel.unmount();
    } else {
      $(ApplicationState.sidebar.parent).empty();
    }
    let content = data.pop();
    content     = null;
    const current = ApplicationState.sidebar.contentsdata.at(-1);
    if (current) {
      $(current.content.internalPanel.$el).show();
      ApplicationState.sidebar.title = current.content.title;
    }
  }

  //showusermessage
  showUserMessage({
    title,
    subtitle,
    message,
    type,
    position,
    size,
    draggable,
    duration,
    textMessage = false,
    closable,
    autoclose,
    hooks = {},
    iconClass = null, //@since 3.11.0
  } = {}) {

    this.closeUserMessage();

    setTimeout(() => {
      Object.assign(ApplicationState.viewport.usermessage, {
        id: getUniqueDomId(),
        show: true,
        message,
        textMessage,
        title,
        subtitle,
        position,
        duration,
        type,
        size,
        autoclose,
        closable,
        draggable,
        hooks,
        iconClass,
      });
    });

    return ApplicationState.viewport.usermessage;
  }

  closeUserMessage() {
    Object.assign(ApplicationState.viewport.usermessage, {
      id:          null,
      show:        false,
      textMessage: false,
      message:     '',
    });
  }

  //modal dialog//
  showModalDialog(options = {}) {
    return this.dialog.dialog(options);
  }

  showSpinner(options = {}) {
    const container   = options.container                                      || 'body';
    const id          = options.id                                             || 'loadspinner';
    const where       = options.where                                          || 'prepend'; // append | prepend
    const style       = options.style                                          || '';
    const transparent = options.transparent && 'background-color: transparent' || '';
    const center      = options.center      && 'margin: auto'                  || '';
    if (!$(`#${id}`).length) {
      $(container)[where].call($(container),`<div id="${id}" class="spinner-wrapper ${style}" style="${transparent}"><div class="spinner ${style}" style="${center}"></div></div>`);
    }
  }

  hideSpinner(id = 'loadspinner') {
    $(`#${id}`).remove();
  }

  /** @since 3.11.0*/
  toggleSidebar() {
    if (document.body.classList.contains('sidebar-open')) {
      this.hideSidebar();
    } else if (document.body.classList.contains('sidebar-collapse') || window.innerWidth <= 767) {
      this.showSidebar();
    } else {
      this.hideSidebar();
    }
  }

  /**
   * Toggle set full screen modal
   */
  showFullModal({element = "#modal-fullscreen", show = true} = {}) {
    $(element).modal(show ? 'show' : 'hide')
  }

  disableSideBar(bool = true) {
    ApplicationState.gui.sidebar.disabled = bool;
  }

  //  (100%) content
  async showContent(options = {}) {
    this.setLoadingContent(false);
    options.perc = isMobile.any ? 100 : options.perc;
    await this.setContent(options);
    return true;
  }

  // add component to stack (append)
  // Differences between pushContent and setContent are:
  //  - push every component is added, set is refreshed
  //  - pushContent has a new parameter (backonclose) when is clicked x
  //  - the contentComponent is close all stacks are closed
  async pushContent(options = {}) {
    options.perc = isMobile.any ? 100 : options.perc;
    options.push = true;
    await this.setContent(options);
  }

  //return number of a component of stack
  getContentLength() {
    return ApplicationState.viewport.content.contentsdata.length;
  }

  /**
   * change current content options
   * @param opts: { title, crumb, text }
   */
  setCurrentContentOptions(opts = {}) {
    const content = ApplicationState.viewport.content.contentsdata.at(-1) || null;
    if (content && opts.title) {
      content.options.title = opts.title;
    }
    if (content && opts.crumb) {
      content.options.crumb = opts.crumb;
    }
  }

  getCurrentContent() {
    return ApplicationState.viewport.content.contentsdata.at(-1) || null;
  }

  /**
   * used by the following plugins: "archiweb"
   * 
   * ORIGINAL SOURCE: src/components/g3w-projectsmenu.js@v3.10.2
   */
  getProjectMenuDOM({ projects = [], host, cbk } = {}) {
    const opts = {
      projects: projects && Array.isArray(projects) && projects,
      cbk,
      host
    };
    return (new Component({
      ...opts,
      id: 'projectsmenu',
      title: opts.title || 'menu',
      internalComponent: new (Vue.extend(require('components/ProjectsMenu.vue').default))({
        host: opts.host,
        state: {
          menuitems: (opts.projects || getListableProjects()).map(p => ({
            title:       p.title,
            description: p.description,
            thumbnail:   p.thumbnail,
            gid:         p.gid,
            cbk:         opts.cbk || ((o = {}) => async () => {
              const url = await this.getService('map').addMapExtentUrlParameterToUrl(getProjectUrl(o.gid));
              try { history.replaceState(null, null, url); }
              catch (e) { console.warn(e); } location.replace(url);
            }),
          }))
        },
      }),
    })).getInternalComponent().$mount().$el;
  }

  toggleUserMessage(bool = true) {
    this.#closeUserMessage = bool;
  }

  setLoadingContent(loading = false) {
    ApplicationState.viewport.content.loading = loading;
    return loading && new Promise((resolve) => setTimeout(resolve, 200))
  }

  /**
   * @since 4.0.0 
   */
  async setContent(opts = {}) {
    this.emit('opencontent', true);

    // close user message before set content
    if (this.#closeUserMessage) {
      this.closeUserMessage();
    }

    const state    = ApplicationState.viewport;
    const panel    = ApplicationState.gui.layout[ApplicationState.gui.layout.__current].rightpanel;

    Object.assign(opts, {
      content:     opts.content || null,
      title:       opts.title || "",
      push:        !!opts.push,
      split:       opts.split || 'h',
      perc:        opts.perc ?? (isMobile.any ? 100 : ('h' === state.split ? panel.width: panel.height)),
      backonclose: !!opts.backonclose,
      showtitle:   opts.showtitle ?? true,
    });

    const contents = this.getComponent('contents');
    const content  = opts.content;

    // set all content parameters
    Object.assign(state.content, {
      title:        opts.title,
      split:        undefined === opts.split       ? null : opts.split,
      closable:     undefined === opts.closable    || opts.closable,
      backonclose:  undefined === opts.backonclose || opts.backonclose,
      style:        undefined === opts.style       ? {} : opts.style,
      headertools:  undefined === opts.headertools ? [] : opts.headertools,
      showgoback:   undefined === opts.showgoback  || opts.showgoback,
      contentsdata: ApplicationState.contentsdata,
    });

    state.split = opts.split;

    if (!opts.perc || !opts.push)  {
      await this.#clearContents();
    }
   
    Object.assign(opts, {
      parent: contents.internalComponent.$el,
      append: true
    });
    
    contents.parent = opts.parent;

    // check the type of content:

    // String or JQuery
    if (content instanceof jQuery || 'string' === typeof content) {
      let el = 'string' === typeof content ? ($(content).length ? $(`<div> ${content} </div>`) : $(content)) : content
      $(contents.parent).append(el);
      ApplicationState.contentsdata.push({ content: el, options: opts });
      console.warn('[G3W-CLIENT] jQuery components will be discontinued, please update your code as soon as possible', ApplicationState.contentsdata.at(-1));
    }

    // Vue element
    else if ('function' === typeof content?.mount) {
      // Check a duplicate element by component id (if already exist)
      let id = ApplicationState.contentsdata.findIndex(d => d.content.getId && (content.getId() === d.content.getId()));
      if (-1 !== id) {
        await ApplicationState.contentsdata[id].content.unmount();
        ApplicationState.contentsdata.splice(id, 1);
      }
      // Mount vue component
      await content.mount(contents.parent, opts.append || false);
      ApplicationState.contentsdata.push({ content, options: opts });
    }

    // DOM element
    else {
      contents.parent.appendChild(content);
      ApplicationState.contentsdata.push({ content, options: opts });
    }

    Array
      .from(contents.internalComponent.$el.children)  // hide other elements but not the last one
      .forEach((el, i, a) => el.style.display = (i === a.length - 1) ? 'block' : 'none');

    contents.setOpen(true);

    await this._layout(true);

    // automatically hide sidebar on mobile
    if (window.innerWidth < 767) {
      this.hideSidebar();
    }  
  }

  // hide content
  hideContent(bool) {
    const content_perc = ApplicationState.gui.layout[ApplicationState.gui.layout.__current].rightpanel['h' === ApplicationState.viewport.split ? 'width': 'height'];
    this._layout(!bool);
    // return previous percentage
    return content_perc;
  }

  async closeContent() {
    this.emit('closecontent', false);

    const state         = ApplicationState.viewport;
    const open          = state.content.contentsdata.length > 0;

    // content is open → remove content
    if (open) {
      this.getComponent('contents').setOpen(false);
      await this.#clearContents();
      this._layout(false);
      await Vue.nextTick();
    }

    return this.getComponent('map');
  }

  // remove last content from stack
  async popContent() {
    // skip when no content data
    if (0 === ApplicationState.viewport.content.contentsdata.length) {
      return Promise.reject();
    }

    const data  = ApplicationState.contentsdata.at(-2);
    const opts  = data.options;
    const state = ApplicationState.viewport;

    Object.assign(state.content, {
      title:        opts.title,
      split:        undefined !== opts.split       ? opts.split       : null,
      closable:     undefined !== opts.closable    ? opts.closable    : true,
      backonclose:  undefined !== opts.backonclose ? opts.backonclose : true,
      contentsdata: ApplicationState.contentsdata,
      style:        undefined !== opts.style       ? opts.style       : {},
      headertools:  undefined !== opts.headertools ? opts.headertools : [],
      showgoback:   undefined !== opts.showgoback  ? opts.showgoback  : true,
    });

    state.split = opts.split ?? state.split;

    if (!opts.perc)  {
      await this.#clearContents();
    }

    this._layout(!!opts.perc);

    await Vue.nextTick();

    if (ApplicationState.contentsdata.length <= 0) {
      return;
    }

    // component exists on stack → remove the last from stack
    const content = ApplicationState.contentsdata.slice(-1)[0].content;

    if (content instanceof Component || content instanceof Panel) {
      await content.unmount();
    } else {
      content.remove();
    }

    ApplicationState.contentsdata.pop();

    Array
      .from(this.getComponent('contents').internalComponent.$el.children)       // hide other elements but not the last one
      .forEach((el, i, a) => el.style.display = (i === a.length - 1) ? 'block' : 'none');

    this._layout();

    return ApplicationState.contentsdata.at(-1);
  }

  isSidebarVisible() {
    return !document.body.classList.contains('sidebar-collapse');
  }

  setModal(bool=false, message) {
    const map = this.getService('map');
    if (bool) { map.startDrawGreyCover(message) }
    else { map.stopDrawGreyCover() }
  }

  showSidebar() {
    document.body.classList.add('sidebar-open');
    document.body.classList.remove('sidebar-collapse');
    ApplicationState.gui.sidebar.open = true;
  }

  hideSidebar() {
    document.body.classList.remove('sidebar-open');
    document.body.classList.add('sidebar-collapse');
    ApplicationState.gui.sidebar.open = false;
  }

  getSize({ element, what }) {
    if (element && what) {
      return ApplicationState.sizes[element][what];
    }
  }

  getPrintParams(params = {}) {
    return params;
  }

  /**
   * Create permalink url
   * 
   * @param { URL }    url  "original_url" sent to server
   * @param { Object } data "permalink_data" sent to server
   *
   * @since 4.0.0
   */
  async getPermalink(url, data) {

    if (this.getPermalink.loading) {
      return;
    }

    this.getPermalink.loading = true;

    const project = ApplicationState.project;
    const uparams = Array.from(url.searchParams.entries());

    // get difference between start layersstree project with current
    const traverse = (nodes, onodes, tree = []) => {
      nodes.forEach((node, i) => {
        // get diff
        const diff = Object.keys(node).reduce((acc, attr) => Object.assign(acc,
          undefined !== onodes[i][attr] && node[attr] !== onodes[i][attr]
            ? { [attr]: node[attr] }
            : {}
        ), {});

        // handle recursion (group node)
        if (Array.isArray(node.nodes)) {
          diff.nodes = [];
          traverse(node.nodes, onodes[i].nodes, diff.nodes);
          diff.nodes = diff.nodes.filter(Boolean);
          if (!diff.nodes.length) {
            delete diff.nodes;
          }
        }

        // only if has changes
        if (Object.keys(diff).length) {
          diff[node.id ? 'id' : 'name'] = node.id || node.name;
          tree.push(diff);
        }
      });
      return tree;
    };

    const layers = project.state.layers.map(l => getCatalogLayerById(l.id).config.styles.some((s, i) => s.current !== l.styles[i].current) && ({
      id: l.id,
      styles: getCatalogLayerById(l.id).config.styles,
    })).filter(Boolean);

    const layersstree = traverse(
      project.getLayersStore().state.layerstree[0].nodes, // current state
      project.state.layerstree,                           // original state
    ).filter(Boolean);

    let response = await (await fetch('/api/embed/', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        url,
        data: {
          ...data,
          initextent:      this.getService('map').getMapExtent(),            // current map extent
          lng:             ApplicationState.language,                        // current launguage
          initbaselayer:   ApplicationState.baseLayerId || undefined,        // current base layer
          toc_tab_default: ['baselayers', 'layers', 'legend'].find(tab => tab === this.getComponent('catalog').getInternalComponent().activeTab), // take in account change tab
          layers:          layers.length      ? layers      : undefined,     // layers configuration: store changes of layers attribute (default style etc..)
          layerstree:      layersstree.length ? layersstree : undefined,     // layerstree on TOC: loop through child nodes and return structure layerstree diff only
        },
      }),
    })).json();

    const permalink_code = response?.data?.permalink_code;

    const dialog = Object.assign(document.createElement('template'), {
      innerHTML: /* html */`
        <dialog id="share_modal">
          <h4 style="margin: 0; padding: .5em; color: #FFF; position: sticky; top: 0; background-color: #212c31"><i class="fa fa-share-alt" style="margin-right: .5ch;"></i> ${_('Share via link')}</h4>
          <form method="dialog">
            <input readonly value = "${ url.toString() }" onfocus="event.target.select()" class="form-control mt-2" id="embed-link" />
            <label style="margin: 1em 0;" ${uparams.length ? '' : 'hidden' }>
              <input type="checkbox" data-key="permalink_code" checked>
              Generate permalink
            </label>
            <div id="embed-params" style="border-top: thin solid #ccc;padding: 1em 0;" hidden>
              <span>Choose params to share</span>
              <div style="display: flex;gap: 1em;padding: 1em 0;">
                ${uparams.map(([key, value]) => /* html */`<label title="${value}"><input type="checkbox" data-key="${key}" checked> ${key}</label>`).join('')}
              </div>
            </div>
            <menu style="display: flex; justify-content: end;">
              <button type="submit" onclick="document.querySelector('#embed-link').focus() || document.execCommand('copy')" class="form-control btn btn-success mt-2">${ _('Copy share URL') }</button>
            </menu>
          </form>
        </dialog>
      `.trim()
    }).content.firstChild;

    // generate permalink
    const generate = () => {
      let search;
      const eparams = dialog.querySelector('#embed-params');
      const elink   = dialog.querySelector('#embed-link');
      if (dialog.querySelector('input[type="checkbox"][data-key="permalink_code"]').checked) {
        eparams.hidden = true;
        elink.value = url.origin + '/api/embed/' + permalink_code + '/';
      } else {
        eparams.hidden = false;
        search = Array
          .from(eparams.querySelectorAll('input[type="checkbox"]:checked'))
          .map(c => `${encodeURIComponent(c.getAttribute('data-key'))}=${encodeURIComponent(url.searchParams.get(c.getAttribute('data-key')))}`)
          .join('&');
        elink.value = url.origin + url.pathname + (search ? `?${search}` : '');
      }
      
    };

    generate();

    dialog.addEventListener("click", e => {
      if (e.target === dialog) {
        dialog.close();
      }
    });

    dialog.querySelectorAll('input[type="checkbox"]').forEach(c => c.addEventListener('change', generate));
    dialog.addEventListener('close', () => {
      dialog.remove();
      this.getPermalink.loading = false;
    });
    document.body.appendChild(dialog);
    dialog.showModal();
  }

  /**
   * load components of viewport after right size setting
   * 
   * ORIGINAL SOURCE: src/services/viewport.js@v3.10.2
   */
  async _layout(param) {

    // whether to show secondary (content)
    if ('boolean' === typeof param) {
      this._layout.secondary = param;
    }

    const sec =  this._layout.secondary;

    const state  = ApplicationState.viewport;
    const layout = ApplicationState.gui.layout;

    const contents        = document.querySelector('#contents');
    const content_wrapper = document.querySelector('.content-wrapper');
    const viewW           = $('#app')[0].getBoundingClientRect().width - $(".main-sidebar")[0].getBoundingClientRect().width - $(".main-sidebar").offset().left;
    const viewH           = $(window).height() - $(".navbar").height();
    const panel           = layout[layout.__current].rightpanel;

    const opts = {
      split: state.split,
      ...(ApplicationState.contentsdata.at(-1)?.options || {}),
    };

    const h_split = 'h' === opts.split;
    const v_split = 'v' === opts.split;

    content_wrapper.style.flexDirection  = h_split ? 'row' : 'column';
    content_wrapper.style.justifyContent = 'space-between';

    const is_full = 100 === opts.perc || (h_split ? panel.width_100 : panel.height_100);

    // percentage of secondary view (content)
    const scale = is_full ? 1 : ((h_split ? panel.width: panel.height) /100);

    contents.parentElement.classList.toggle('full-size', is_full);
    

    // size "content"
    Object.assign(state.content.sizes, {
      width:  h_split ? (sec ? Math.max((viewW * scale), 200) : 0) : (sec ? viewW : 0),
      height: v_split ? (sec ? Math.max((viewH * scale), 200) : 0) : (sec ? viewH : 0),
    });

    // size "map"
    Object.assign(state.map.sizes, {
      width:  viewW - (h_split ? state.content.sizes.width : 0),
      height: viewH - (v_split ? state.content.sizes.height : 0),
    });

    // size full (when mobile menu is open) 
    if (document.body.classList.contains('sidebar-open') && window.innerWidth < 767) {
      Object.assign(state.map.sizes, {
        width:  window.innerWidth,
        height: window.innerHeight,
      });
    }

    // resize "content" (after vue state is updated)
    await Vue.nextTick();

    // resize "map"
    this.getService('map').layout({
      width:  state.map.sizes.width,
      height: state.map.sizes.height
    });

    ApplicationState.contentsdata.forEach(d => {                           // re-layout each component stored into the stack
      try {
        if ('function' == typeof d.content.layout) {
          d.content.layout(state.content.sizes.width, contents.style.height.replace('px',''));
        }
      } catch(e) {
        this.showUserMessage({ type: 'warning', message: e.toString(), autoclose: true });
        setTimeout(() => this._layout(), 1000);
      }
    });
    
    this.emit('resize');

    window.localStorage.setItem('SIDEBAR', JSON.stringify(panel));
  }

  /**
   * Convert error to user message showed
   * 
   * @param error
   * @returns {string}
   */
  #errorToMessage(error) {
    const type = toRawType(error);

    if ('Error' === type) {
      return `CLIENT - ${error.message}`;
    }

    if ('Object' === type && error.responseJSON && false === error.responseJSON.result) {
      const e = error.responseJSON.error;
      return `${(e.code || '').toUpperCase()} ${e.data || ''} ${e.message || '' }`;
    }

    if ('Object' === type && error.responseText) {
      return error.responseText;
    }

    if ('Array' === type) {
      return error.map(e => this.#errorToMessage(e)).join(' ');
    }

    return error || 'server_error';
  }

  /**
   * clear all stacks
   */
  async #clearContents() {
    await Promise.allSettled((ApplicationState.contentsdata || []).map(async d => {
      if (d.content instanceof Component || d.content instanceof Panel) {
        await d.content.unmount();
      } else {
        $(this.getComponent('contents').parent).empty();
      }
    }));
    ApplicationState.contentsdata.splice(0, ApplicationState.contentsdata.length);
  }

  /**
   * @since 4.1.0
   */
  online() {
    ApplicationState.online = true;
    this.emit('online');
  }

  /**
   * @since 4.1.0
   */
  offline() {
    ApplicationState.online = false;
    this.emit('offline');
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Hook method called when response is handled by Data Provider
   *
   * @param { Object }                             queryResponse
   * @param { Array }                              queryResponse.data
   * @param { 'coordinates' | 'bbox' | 'polygon' } queryResponse.type
   * @param { Object }                             queryResponse.query
   * @param { Object }                             queryResponse.query.external
   * @param { boolean }                            queryResponse.query.external.add       - whether add external layers to response
   * @param { Object }                             queryResponse.query.external.filter
   * @param { boolean }                            queryResponse.query.external.SELECTED
   * @param { Object }                             options
   * @param { boolean }                            options.add                            - whether is a new query request (add/remove query request)
   * 
   * @since 4.1.0
   */
  setQueryResponse(queryResponse, options = { add: false, update: false }) {
    // set mandatory queryResponse fields
    if (!queryResponse.data)           queryResponse.data           = [];
    if (!queryResponse.query)          queryResponse.query          = { external: { add: false, filter: { SELECTED: false } } };
    if (!queryResponse.query.external) queryResponse.query.external = { add: false, filter: { SELECTED: false }};


    if (false === options.add && !!options.update) {
      // in case of new request results reset the query otherwise maintain the previous request
      this.state.query      = queryResponse.query;
      this.state.type       = queryResponse.type;
    }
    // whether add response to current results using addLayerFeaturesToResultsAction
    if (false === options.add && !options.update) {
      // in case of new request results reset the query otherwise maintain the previous request
      this.clearState();
      this.state.query      = queryResponse.query;
      this.state.type       = queryResponse.type;
    }
    // whether add external layers to response
    if (true === queryResponse.query.external.add && false === options.add) {
      const catalog = this.getService('catalog');

      /** @type { boolean | undefined } */
      const FILTER_SELECTED = queryResponse.query.external.filter.SELECTED;
  
      // add visible layers to query response (vector layers)
      this.#vectorLayers.forEach(layer => {
        const id = layer.get('id');
        // TODO: extract this into `layer.isSomething()` ?
        if (
          layer.getVisible()
          && [undefined, !!(catalog.state.external.vector.find(l => l.id === id) || {}).selected].includes(FILTER_SELECTED)
        ) {
          queryResponse.data[
            '__g3w_marker' === id // keep geocoding control "marker" layer at the top
            ? 'unshift'
            : 'push'
          ](this.getVectorLayerFeaturesFromQueryRequest(layer, queryResponse.query));
        }
      });
    }

    const geom = false === options.add && ({
      'coordinates': 2 === (this.state.query.coordinates || []).length && new ol.geom.Point(this.state.query.coordinates),
      'bbox':        4 === (this.state.query.bbox || []).length        && ol.geom.Polygon.fromExtent(this.state.query.bbox),
      'polygon':     this.state.query.geometry,
      'drawpolygon': this.state.query.geometry,
      'circle':      this.state.query.geometry,
    })[this.state.query.type];

    // show a query result on map
    if (geom) {
      const feature = new ol.Feature(geom);
      feature.setId(undefined);
      this.#layer.getSource().clear();
      this.getService('map').getMap().removeLayer(this.#layer);
      this.#layer.getSource().addFeature(feature);
      this.getService('map').getMap().addLayer(this.#layer);
      this.#layer.setZIndex(this.getService('map').getMap().getLayers().getLength()); // ensure layer is on top of others
    }

    // Convert response from DataProvider into a QueryResult component data structure
    // Skip when the layer has no features or rawdata is undefined (external wms)
    const layers = queryResponse.data
      .flatMap(d => [].concat(d))
      .filter(d => d && (undefined !== d.rawdata || (Array.isArray(d.features) && d.features.length > 0)))
      .map(({
        layer,
        features,
        rawdata, // rawdata response
        error
      } = {}) => {

        const is_layer  = layer instanceof g3w.Layer;
        const is_vector = layer instanceof ol.layer.Vector;                     // instance of openlayers layer Vector Class
        const is_string = 'string' === typeof layer || layer instanceof String; // can be created by string

        let sourceType;

        if (is_string) {
          sourceType = 'vector';
        } else if (is_layer) {
          try {
            sourceType = layer.getSourceType();
          } catch (error) {
            console.warn('uknown source type for layer:', error, layer);
          }
        }
        
        const name = is_string && layer.split('_');

        const id = (is_layer ? layer.getId() : undefined) ||
          (is_vector ? layer.get('id') : undefined) ||
          (is_string ? layer : undefined);

        let attributes;
        let layerAttrs;

        // sanity check (eg. external layers ?)
        if (!features || !features.length) {
          attributes = [];
        }
    
        // Sanitize OWS Layer attributes
        if (!attributes && layer instanceof g3w.Layer) {
          layerAttrs = layer.getAttributes().map(attr => 'ows' === this.state.type ? ({ ...attr, name: attr.name.replace(/ /g, '_') }) : attr);
        }
    
        if (!attributes && layer instanceof ol.layer.Vector) {
          layerAttrs = layer.getProperties();
        }
    
        if (!attributes && 'string' === typeof layer || layer instanceof String) {
          layerAttrs = (features[0] ? features[0].getProperties() : [])
        }
    
        const specialAttrs = (!attributes && layer instanceof g3w.Layer && layerAttrs || []).filter(attr => {
            try {
              return ('_' === attr.name[0] || Number.isInteger(1 * attr.name[0]))
            } catch(e) {
              return false;
            }
          }).map(attr => ({ alias: attr.name.replace(/_/, ''), name: attr.name }));
    
        if (!attributes && specialAttrs.length) {
          features.forEach(f => {
            // get attributes special keys from feature properties received by server request
            const attrs = Object.keys(f.getProperties());
            specialAttrs.forEach(layerAttr => {
              attrs.find(attr => {
                if (attr === layerAttr.alias) {
                  f.set(layerAttr.name, f.get(attr));
                  return true
                }
              })
            });
          });
        }
    
        // Parse attributes to show on a result based on field
    
        let attrs = !attributes && getAlphanumericPropertiesFromFeature(
          Object.keys(features[0] instanceof ol.Feature ? features[0].getProperties() : features[0].properties)
        );
    
        if (!attributes) {
          attributes = (layerAttrs && layerAttrs.length > 0)
            ? layerAttrs.filter(attr => attrs.includes(attr.name))
            : attrs.map(featureAttr => ({
              name:  featureAttr,
              label: featureAttr,
              show:  G3W_FID !== featureAttr && [undefined, 'gdal', 'wms', 'wcs', 'wmst', 'postgresraster'].includes(sourceType),
              type:  'varchar'
            }));
        }

        const external   = (is_vector || is_string);
        const structure  = is_layer && layer.hasFormStructure() && layer.getLayerEditingFormStructure();

        if (structure && Array.isArray(this.#relations[layer.getId()]) && this.#relations[layer.getId()].length > 0) {
          for (const node of structure) {
            this.#setRelationField(node);
          }
        }
        // layerObj
        return {
          id,
          attributes,
          external,
          features: (!rawdata && features || []).map(f => ({
            id:         external ? f.getId() : (f instanceof ol.Feature ? f.getId() : f.id),
            attributes: f instanceof ol.Feature ? f.getProperties() : f.properties,
            geometry:   f instanceof ol.Feature ? f.getGeometry()   : f.geometry,
            selection:  { selected: !external && (!!queryResponse.query.autofilter || layer.state.selection.active)}, //@since 3.11.8 check if autofilter is set
            show:       true,
          })),
          hasgeometry:            Array.isArray(features) && !rawdata && features.some(f => f instanceof ol.Feature ? f.getGeometry() : f.geometry),
          hasImageField:          Array.isArray(features) && !rawdata && features.length && attributes.some(attr => 'image' === attr.type),
          loading:                false,
          show:                   true,
          expandable:             true,
          addfeaturesresults:     { active: false },
          downloadformats:        { active: false },
          editable:               is_layer   ? layer.isEditable() && layer.config.editing.visible : false,
          inediting:              is_layer   ? layer.isInEditing()                                : false,
          source:                 is_layer   ? layer.getSource()                                  : undefined,
          infoformat:             is_layer   ? layer.getInfoFormat()                              : undefined,
          infoformats:            is_layer   ? layer.getInfoFormats()                             : [],
          downloads:              is_layer   ? layer.getDownloadableFormats()                     : [],
          formStructure:          structure  ? {
            structure,
            // get field show
            fields: layer.getFields().filter(f => f.show).concat(
              (Array.isArray(features) && !rawdata && features.length > 0 && attributes || []).filter(attr => layer.getFields().some(f => f.name === attr.name))
            ),
          } : undefined,
          relationsattributes:       (is_layer || is_vector || is_string)                       ? []                     : undefined,
          hasdownloadablerelations:  !external && layer.hasDowloadableRelations(), //@since 3.11.7
          filter:                    (is_layer && !['wms', 'wcs', 'wmst'].includes(sourceType)) ? layer.state.filter     : {},
          selection:                 (is_layer && !['wms', 'wcs', 'wmst'].includes(sourceType) && layer.state.selection) || (is_vector && layer.selection) || { active: false },
          title:                     (is_layer && layer.getTitle()) || (is_vector && layer.get('name')) || (is_string && name && (name.length > 4 ? name.slice(0, name.length - 4).join(' ') : layer)) || undefined,
          atlas:                     this.#atlas.filter(a => a.atlas.qgs_layer_id === id),
          rawdata:                   rawdata  || null,
          error:                     error    || '',
          toc:                       external || layer.state.toc, //@since v3.10.0
          max_preview_fields:        layer.state?.max_preview_fields || 3, //@since 4.0.0 
        };
      });
    this.setLayersData(layers, options);
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Setter method called when adding layer and feature for response
   *
   * @param layers
   * @param options
   * 
   * @since 4.1.0
   */
  setLayersData(layers = [], options = { add: false, update: false }) {
    // sort layers as Catalog project layers (external layer always on bottom)
    if (false === options.add) {
      layers.sort((a, b) => a.external ? 0 : (this.#layer_ids.indexOf(a.id) > this.#layer_ids.indexOf(b.id) ? 1 : -1));
    }
    // get features from added pick layer in case of a new request query
    layers.forEach((l, index) => {
      // whether result comes from pagination
      l.filter.pagination = l.filter.active && this.state.query?.pagination?.paginate?.at(index);
      if (options.add || options.update) {
        this.updateLayerResultFeatures(l, options.update);
      } else {
        this.state.layers.push(l);
      }
    });
    this.setActionsForLayers(layers, { add: options.add, update: options.update });
    this.state.changed = true;
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   *
   * @param actions
   * @param layers
   * 
   * @since 4.1.0
   */
  addActionsForLayers(actions, layers) {}

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Used by the following plugins: "law", "innovapuglia"
   *
   * @param element
   * 
   * @since 4.1.0
   */
  postRender(element) {}

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * @since 4.1.0
   */
  closeComponent() {}

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Called when layer result features is changed
   *
   * @param layer
   * 
   * @since 4.1.0
   */
  changeLayerResult(layer) {
    this.state.layersactions[layer.id].forEach(action => action.change && action.change(layer));  // call if present change method to action
    // reset layer current actions tools
    (layer.features || []).forEach((_, idx) => {
        const tool = this.state.currentactiontools[layer.id];
        if (undefined === tool) {
          return;
        }
        if (undefined === tool[idx]) {
          Vue.set(tool, idx, null);
        }
        tool[idx] = null;
      });
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Used by the following plugins: "bforest"
   * 
   * @since 4.1.0
   */
  activeMapInteraction() {}

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Setter method related to relation table
   * 
   * @since 4.1.0
   */
  editFeature({ layer, feature } = {}) {}

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Setter method called when opening/closing feature info data content.
   *
   * @param opts.open
   * @param opts.layer
   * @param opts.feature
   * @param opts.container
   * 
   * @since 4.1.0
   */
  openCloseFeatureResult({ open, layer, feature, container } = {}) {}

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Remove a feature from current layer result
   *
   * @param layer
   * @param feature
   * 
   * @since 4.1.0
   */
  removeFeatureLayerFromResult(layer, feature) {
    this.updateLayerResultFeatures({ id: layer.id, external: layer.external, features: [feature] });
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * used by the following plugins: "qplotly"
   * 
   * @since 4.1.0
   */
  addLayersPlotIds(layerIds = []) {
    this.plotLayerIds = layerIds;
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * used by the following plugins: "br-service"
   * 
   * Register for plugin or other component of application to add
   * custom component on result for each layer feature or layer
   *
   * @param opts.id        unique id identification
   * @param opts.layerId   Layer id of layer
   * @param opts.component custom component
   * @param opts.type      feature or layer
   * @param opts.position
   * 
   * @since 4.1.0
   */
  registerCustomComponent({
    id       = getUniqueDomId(),
    layerId,
    component,
    type     = 'feature',
    position = 'after',
  } = {}) {
    if (undefined === this.state.layerscustomcomponents[layerId]) {
      this.state.layerscustomcomponents[layerId] = {
        layer:   { before: [], after: [] },
        feature: { before: [], after: [] }
      };
    }
    this.state.layerscustomcomponents[layerId][type][position].push({ id, component });
    return id;
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Loop over response features based on layer response and
   * check if features layer needs to be added or removed to
   * current `state.layers` results.
   *
   * @param responseLayer layer structure coming from request
   * @param replace    @since 3.11.0 mean replace current state layer features
   *
   * @since 4.1.0
   */
  updateLayerResultFeatures(responseLayer, replace = false) {
    const layer            = this.state.layers.find(l => l.id === responseLayer.id);                // get layer from current `state.layers` showed on a result
    const responseFeatures = responseLayer.features || [];                                            // extract features from responseLayer object
    const external         = (layer || {}).external; // get id of external layer or not (`external` is a layer added by mapcontrol addexternlayer)
    const has_features     = layer && (layer.features || []).length > 0;                              // check if the current layer has features on response
    if (has_features) {
      const features_ids = replace ? [] : layer.features.map(f => this._getFeatureId(f, external)) // get features id from current layer on a result
      //get action selection;
      const action = this.state.layersactions[layer.id].find(a => 'selection' === a.id);
      if (replace) {
        layer.features.forEach(f => delete this.state.layersFeaturesBoxes[this.getBoxId(layer, f)]);
        layer.features.splice(0);
      }
      responseFeatures.forEach((feat, index) => {
        const feature_id = this._getFeatureId(feat, external);
        // If true, remove the feature because is already loaded
        if (features_ids.some(id => id === feature_id)) {
          //@since 3.11.0
          if (action && feat.selection.selected) {
            (external ? layer : getCatalogLayerById(layer.id)).excludeSelectionFid(feature_id, layer.filter.active);
          }
          //filter feature
          layer.features = layer.features.filter(f => feature_id !== this._getFeatureId(f, external));
          delete this.state.layersFeaturesBoxes[this.getBoxId(layer, feat)]
          if (action) {
            delete action.state.toggled[index];
            //need to reset toggled state in reactive mode
            action.state.toggled = Vue.observable(layer.features.reduce((a,f,i) => { a[i] = f.selection.selected; return a }, {}));
          }
        } else {                                                              // add feature
          layer.features.push(feat);
        }
      });
      // toggle layer feature box
      (layer.features || []).forEach(f => {
        const collapsed = (layer.features || []).length > 1;
        const box       = this.state.layersFeaturesBoxes[this.getBoxId(layer, f)];
        if (box) {
          setTimeout(() => box.collapsed = collapsed); // due to vue reactivity, wait a little bit before update layers
        }
      });
    }

    // no more features on layer → remove interaction pickcoordinate to get a result from a map
    if (layer && 0 === (layer.features || []).length) {
      // due to vue reactivity, wait a little bit before update layers
      setTimeout(() => {
        this.state.layers = this.state.layers.filter(l => l.id !== layer.id);
        this.clearHighlightGeometry(layer);
        this.removeAddFeaturesLayerResultInteraction(true);
      })
    }

    // highlight new feature
    if (1 === this.state.layers.length) {
      this.getService('map').highlightFeatures(this.state.layers[0].features, { duration: Infinity });
    }

    this.changeLayerResult(layer);
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Generate a boxid identifier to query result html
   *
   * @param layer
   * @param feature
   * @param relation_index
   *
   * @returns {string}
   * 
   * @since 4.1.0
   */
  getBoxId(layer, feature, relation_index) {
    return (null !== relation_index && undefined !== relation_index)
      ? `${layer.id}_${feature.id}_${relation_index}`
      : `${layer.id}_${feature.id}`;
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   *
   * @param layers
   * @param options
   * 
   * @since 4.1.0
   */
  setActionsForLayers(layers, options = { add: false, update: false }) {
    if (options.add || options.update) {
      return;
    }

    // reset array
    this.#events = [];

    // loop results
    layers.forEach((layer, index) => {
      // eventually set layer action tool and need to be reactive
      this.state.layeractiontool[layer.id]           = Vue.observable({ component: null, config: null });
      this.state.currentactiontools[layer.id]        = Vue.observable({ ...Array((layer.features || []).length).fill(null) });
      this.state.currentactionfeaturelayer[layer.id] = Vue.observable({ ...Array((layer.features || []).length).fill(null) });
      this.state.layersactions[layer.id]             = this.state.layersactions[layer.id] || [];

      this.state.layersactions[layer.id].push(...([

        // zoom to geometry
        layer.hasgeometry && {
          id:        'gotogeometry',
          mouseover: true,
          class:     this.getFontClass('marker'),
          hint:      'Zoom to feature',
          cbk:       throttle(this.goToGeometry.bind(this))
        },

        // show relations (query)
        (this.#relations[layer.id] || []).some(r => 'MANY' === r.type) && {
          id:       'show-query-relations',
          class:    this.getFontClass('relation'),
          hint:     'Show Relations',
          cbk: (layer, feature, action) => {
            this.setCurrentContentOptions({ title: layer.title, crumb: { text: true, title: layer.title } });
            this.pushContent({
              content: new Component({
                internalComponent: new (Vue.extend(require('components/RelationsPage.vue').default))({
                  relations:        action.relations,
                  chartRelationIds: action.relations.map(r => this.plotLayerIds.find(id => id === r.referencingLayer)).filter(Boolean),
                  feature,
                  layer,
                })
              }),
              backonclose: true,
              title:      'info.list_of_relations',
              id:         '__G3W_LIST_OF_RELATIONS_ID__',
              crumb: {
                title: 'info.list_of_relations',
                trigger: null
              },
              closable: false
            });
          },
          relations: (this.#relations[layer.id] || []).filter(r => 'MANY' === r.type),
        },

        // print (atlas)
        this.#atlas.filter(a => a.atlas.qgs_layer_id === layer.id).length && {
          id:       'printatlas',
          download: true,
          class:    this.getFontClass('print'),
          hint:     'Print Atlas',
          cbk:      this.printAtlas.bind(this)
        },

        // remove feature
        ('__g3w_marker' === layer.id || (!layer.external && 'wms' !== (layer.source || {}).type)) && {
          id:        'removefeaturefromresult',
          mouseover: true,
          class:     this.getFontClass('minus-square'),
          style:     { color: 'red' },
          /** @since 3.11.0 hide element in case of pagination (show = false) */
          state:     Vue.observable({ show: !layer.filter.pagination }),
          hint:      'Remove feature from results',
          cbk:       this.removeFeatureLayerFromResult.bind(this),
          init() {
            this.unwatch = Vue.watch(() => layer.filter.pagination, bool => this.state.show = !bool ); // listen filter layer pagination change
          },
          clear() {
            this.unwatch && this.unwatch(); // remove action when destroy
          },
          change() {
            this.state.disabled = !layer.filter.pagination;
          }
        },

        // select feature
        (layer.toc && undefined !== layer.selection.active) && {
          id:       'selection',
          class:    this.getFontClass('success'),
          hint:     'Add/Remove Selection',
          state:    Vue.observable({
            toggled: layer.features.reduce((a, _ , i ) => { a[i] = false; return a; }, {}),
            show:    !layer.filter.pagination // show action when filter with pagination is not set
          }),
          init({ layer, feature, index, action } = {}) {
            if (!feature) {
              return console.trace('Invalid feature');
            }
            const _layer                = getCatalogLayerById(layer.id);
            const fid                   = feature.attributes[G3W_FID] || feature.id;
            const selected              = layer.external ? feature.selection.selected : (_layer.state.filter.active || _layer.hasSelectionFid(fid));
            action.state.toggled[index] = selected;
            layer.selection.active      = (0 === index || layer.selection.active) && selected;
            if (_layer && selected && !_layer.hasSelectionFid(fid)) {
              _layer.addOlSelectionFeature({ id: fid, feature }).selected = true;
              _layer.includeSelectionFid(fid, false);
            }
          },
          change({ features }) {
            // wait for pagination change request
            setTimeout(() => {
              this.state.show = !layer.filter.pagination; 
              features.forEach((_, index) => undefined === this.state.toggled[index] && Vue.set(this.state.toggled, index, false))
            })
          },
          cbk: throttle(this.toggleSelection.bind(this))
        },

        // permalink (click to copy)
        (layer.hasgeometry && !layer.external && 'wms' !== (layer.source || {}).type) && {
          id:          'link_zoom_to_fid',
          class:       this.getFontClass('share-alt'),
          hint:        'Share via link',
          cbk: (layer, feature, action) => {
            const url = new URL(location.href);
            url.searchParams.set('zoom_to_fid', `${layer.id}|${feature.attributes[G3W_FID]}`);
            this.getPermalink(url, {});
          }
        },

        // edit
        (layer.editable && false === layer.inediting) && {
          id:    'editing',
          class: this.getFontClass('pencil'),
          hint:  'Editing',
          cbk:   (layer, feature) => this.editFeature({ layer, feature })
        },

      ]).filter(Boolean));


      // In case of external layer don't listen to `selection` event
      if (layer.external && layer.toc && undefined !== layer.selection.active) {
        //in case 
        layer.selection.features = layer.selection.features || [];
        layer.features.forEach(f => f.selection = (layer.selection.features.find(s => f.id === s.getId()) || ({ selection: { selected: false }})).selection);
      } else if (!layer.external && layer.toc && undefined !== layer.selection.active) {
        const handler = () => layer.features.forEach((_, i) => this.state.layersactions[layer.id].find(a => a.id === 'selection').state.toggled[i] = false);
        getCatalogLayerById(layer.id).on('unselectionall', handler);
        this.#events.push({ layer: getCatalogLayerById(layer.id), event: 'unselectionall', handler });
      }

    });

    this.addActionsForLayers(this.state.layersactions, this.state.layers);

  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Get action referred to layer getting the action id
   *
   * @param opts.layer layer linked to action
   * @param opts.id    action id
   * 
   * @returns undefined when no action is found
   * 
   * @since 4.1.0
   */
  getActionLayerById({
    layer,
    id,
  } = {}) {
    if (this.state.layersactions[layer.id]) {
      return this.state.layersactions[layer.id].find(action => action.id === id);
    }
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Set current layer action tool in feature
   *
   * @param {Object } opts
   * @param opts.layer current layer
   * @param opts.index feature index
   * @param opts.action action
   * @param opts.component vue component
   * 
   * @since 4.1.0
   */
  setCurrentActionLayerFeatureTool({
    layer,
    action,
    index,
    component = null
  } = {}) {
    const tools   = this.state.currentactiontools[layer.id];        // get current action tools
    const feats   = this.state.currentactionfeaturelayer[layer.id];
    feats[index]  = component ? action : null;
    tools[index]  = component;                                      // set component

    // need to check if pass component and
    if (
      tools[index] &&                   // if component is set
      action.id !== feats[index].id &&  // same action
      feats[index].toggleable           // check if toggleable
    ) {
      feats[index].state.toggled[index] = false;
    }

  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * @param {Object } opts
   * @param opts.layer current layer
   * @param opts.component vue component
   * @param opts.config configuration Object
   * 
   * @since 4.1.0
   */
  setLayerActionTool({
    layer,
    component = null,
    config    = null,
  } = {}) {
    this.state.layeractiontool[layer.id].component = component;
    this.state.layeractiontool[layer.id].config    = config;
  };

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Clear all
   * 
   * @since 4.1.0
   */
  clear() {
    this.#asyncFnc.todo()
    // unlistener events actions
    this.#events.forEach(obj => obj.layer.off(obj.event, obj.handler));
    this.#events = [];
    this.getService('map').clearHighlightGeometry();
    this.#layer.getSource().clear();
    this.removeAddFeaturesLayerResultInteraction(true);
    this.#asyncFnc = {
      todo:                      () => {},
      zoomToLayerFeaturesExtent: { async: false },
      highLightLayerFeatures:    { async: false },
      goToGeometry:              { async: false },
    };
    //reset pagination
    this.clearState();
    this.closeComponent();
    this.#layer.getSource().clear();
    this.getService('map').getMap().removeLayer(this.#layer);
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Check if a one layer result
   *
   * @returns {boolean}
   * 
   * @since 4.1.0
   */
  isOneLayerResult() {
    return (1 === this.state.layers.length);
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   *
   * @param {boolean} toggle whether toggle mapcontrol
   * 
   * @since 4.1.0
   */
  removeAddFeaturesLayerResultInteraction(toggle) {
    if (null !== this.#interaction.toggleeventhandler) {
      this.getService('map').off('mapcontrol:toggled', this.#interaction.toggleeventhandler);
    }

    // remove current interaction to get features from layer
    if (null !== this.#interaction.interaction) {
      this.getService('map').removeInteraction(this.#interaction.interaction);
    }

    // check if query map control is toggled and registered
    if (null !== this.#interaction.mapcontrol) {
      this.#interaction.mapcontrol.toggle(toggle);
    }

    // reset values
    Object.assign(this.#interaction, {
      interaction:        null,
      id:                 null,
      toggleeventhandler: null,
      mapcontrol:         null,
    });

  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Adds feature to Features layer results
   *
   * @param layer
   * 
   * @since 4.1.0
   */
  addLayerFeaturesToResultsAction(layer) {
    const not_current = ![null, layer.id].includes(this.#interaction.id);
    const new_layer   = not_current && this.state.layers.find(l => l.id === this.#interaction.id);

    // disable previous layer
    if (not_current && new_layer) {
      new_layer.addfeaturesresults.active = false;
    }

    // remove previous interaction
    if (not_current && this.#interaction.interaction) {
      this.getService('map').removeInteraction(this.#interaction.interaction);
    }

    // set new layer
    this.#interaction.id = layer.id;

    layer.addfeaturesresults.active = !layer.addfeaturesresults.active;

    if (false === layer.addfeaturesresults.active) {
      this.removeAddFeaturesLayerResultInteraction(true);
    } else {

      this.activeMapInteraction(); // useful to send an event

      const external_layer = (this.state.layers.find(l => l.id === layer.id) || {}).external;

      this.#interaction.mapcontrol  = this.#interaction.mapcontrol || this.getService('map').getCurrentToggledMapControl() || null;
      this.#interaction.interaction = new PickCoordinatesInteraction();

      this.getService('map').addInteraction(this.#interaction.interaction, { close: false });

      this.#interaction.interaction
        .on('picked', async ({ coordinate: coordinates }) => {
          if (external_layer) {
            // call setQueryResponse setters method directly in case of external layer 
            this.setQueryResponse(
              {
                data:  [ this.getVectorLayerFeaturesFromQueryRequest(this.#vectorLayers.find(v => layer.id === v.get('id')), { coordinates }) ],
                query: { coordinates }
              },
              { add: true }
            );
          } else {
            await DataRouterService.getData(
              'query:coordinates',
              {
                inputs: {
                  coordinates,
                  query_point_tolerance: ApplicationState.project.getQueryPointTolerance(),
                  layerIds:              [layer.id],
                  multilayers:           false,
                },
                outputs: {
                  show: { add: true }
                }
              }
            );
          }
        });

      this.#interaction.toggleeventhandler = (evt) => {
        if (evt.target.isToggled() && evt.target.isClickMap()) {
          layer.addfeaturesresults.active = false;
        }
      };

      this.getService('map').once('mapcontrol:toggled', this.#interaction.toggleeventhandler);

    }
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * used by the following plugins: "bforest"
   * 
   * @since 4.1.0
   */
  deactiveQueryInteractions() {
    this.state.layers.forEach(l => {
      if (l.addfeaturesresults) { l.addfeaturesresults.active = false }
    })
    this.removeAddFeaturesLayerResultInteraction();
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   *
   * @param layer
   * @param options
   * 
   * @since 4.1.0
   */
  zoomToLayerFeaturesExtent(layer, options = {}) {
    options.highlight = !this.isOneLayerResult();
    const features = (layer.features || []).filter(f => this.showFeature(layer, f));
    if (this.#asyncFnc.zoomToLayerFeaturesExtent.async) {
      this.#asyncFnc.todo = this.getService('map').zoomToFeatures.bind(this.getService('map'), features, options);
    } else {
      this.getService('map').zoomToFeatures(features, options);
    }
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * @returns { boolean } whether show feature in results (show + active filter + selected)
   * 
   * @since 4.1.0
   */
  showFeature(layer, feature) {
    return feature.show && ((layer.filter || {}).active ? feature.selection.selected : true);
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   *
   * @param layer
   * @param options
   * 
   * @since 4.1.0
   */
  highLightLayerFeatures(layer, options = {}) {
    const features = (layer.features || []).filter(f => this.showFeature(layer, f));
    if (this.#asyncFnc.highLightLayerFeatures.async) {
      this.#asyncFnc.todo = this.getService('map').highlightFeatures.bind(this.getService('map'), features, options);
    } else {
      this.getService('map').highlightFeatures(features, options);
    }
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Reset internal state
   * 
   * @since 4.1.0
   */
  clearState() {
    this.state.layers.splice(0);
    this.state.query               = null;
    this.state.querytitle          = "";
    this.state.changed             = false;
    this.state.layersactions       = {};
    this.state.actiontools         = {};
    this.state.layeractiontool     = {};
    this.state.currentactiontools  = {};
    this.state.layersFeaturesBoxes = {};
    this.removeAddFeaturesLayerResultInteraction();
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * @since 4.1.0
   */
  getState() {
    return this.state;
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   *
   * @param state
   * 
   * @since 4.1.0
   */
  setState(state) {
    this.state = state;
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   *
   * @param querytitle
   * 
   * @since 4.1.0
   */
  setTitle(querytitle) {
    this.state.querytitle = querytitle || "";
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   *
   * @param actionId
   * @param layer
   * @param feature
   * @param index
   * @param container
   * 
   * @since 4.1.0
   */
  async triggerAction(actionId, layer, feature, index, container) {
    if ('highlightgeometry' === actionId) {
      this.highlightGeometry(layer, feature, index);
    }
    if ('clearHighlightGeometry' === actionId) {
      this.clearHighlightGeometry(layer, feature, index);
    }
    if (layer && this.state.layersactions[layer.id]) {
      const action = this.state.layersactions[layer.id].find(layerAction => layerAction.id === actionId);
      if (action && action.cbk) {
        await action.cbk(layer, feature, action, index, container);
      }
      if (action &&  action.route) {
        let url = action.route.replace(/{(\w*)}/g, (m, key) => feature.attributes.hasOwnProperty(key) ? feature.attributes[key] : "");
        if (url && '' !== url) {
          this.goto(url);
        }
      }
    }
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   *
   * @param vectorLayer
   * 
   * @since 4.1.0
   */
  registerVectorLayer(vectorLayer) {
    if (!this.#vectorLayers.includes(vectorLayer)) {
      this.#vectorLayers.push(vectorLayer);
    }
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   *
   * @param vectorLayer
   * 
   * @since 4.1.0
   */
  unregisterVectorLayer(vectorLayer) {
    this.#vectorLayers = this.#vectorLayers.filter(vl => {
      this.state.layers = this.state.layers.filter(l => l.id !== vectorLayer.get('id'));
      return vl !== vectorLayer;
    });
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   *
   * @param vectorLayer
   * @param query
   *
   * @returns {Object|Boolean}
   * 
   * @since 4.1.0
   */
  getVectorLayerFeaturesFromQueryRequest(vectorLayer, query = {}) {
    let {
      coordinates,
      bbox,
      geometry,
      filterConfig = {}
    } = query; // extract information about a query type

    let features = [];

    const has_coords = coordinates && Array.isArray(coordinates);
    const has_bbox   = bbox && Array.isArray(bbox);

    // case query coordinates
    if (has_coords) {
      this.getService('map').viewer.map.forEachFeatureAtPixel(
        this.getService('map').viewer.map.getPixelFromCoordinate(coordinates),
        f => { features.push(f); },
        { layerFilter: l => l === vectorLayer }
      );
    }

    // case query bbox
    if (has_bbox && !has_coords) {
      //set geometry has Polygon
      geometry = ol.geom.Polygon.fromExtent(bbox);
    }

    const is_poly    = geometry instanceof ol.geom.Polygon || geometry instanceof ol.geom.MultiPolygon;

    // check query geometry (Polygon or MultiPolygon)
    if (is_poly && !has_coords && 'vector' === vectorLayer?.getType?.()) {
      features = vectorLayer.getIntersectedFeatures(geometry);
    } else if (is_poly && !has_coords && ol.layer.Vector === vectorLayer.constructor) {
      vectorLayer.getSource().getFeatures().forEach(f => {
        let add;
        switch (filterConfig.spatialMethod) {
          case 'within':     add = within(geometry, f.getGeometry());                      break;
          case 'intersects':
          default:           add = intersects(geometry, f.getGeometry());                  break;
        }
        if (true === add) {
          features.push(f);
        }
      });
    }

    return {
      features,
      layer: vectorLayer
    };

  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * @since 4.1.0
   */
  async _printSingleAtlas({
    atlas    = {},
    features = [],
  } = {}) {
    let field = atlas.atlas?.field_name || '$id';

    ApplicationState.download = true;

    this.setLoadingContent(true);

    try {
      const { url } = await require('utils/printAtlas').printAtlas({
        field,
        values:   features.map(feat => feat.attributes['$id' === field ? G3W_FID : field]),
        template: atlas.name,
        download: true
      });
      const response = url && await fetch(url);

      if (!response?.ok) {
        throw (await response.json()).message;
      }

      saveBlob(await response.blob(), atlas.name || (response.headers.get('content-disposition') || 'filename=g3w_download_file').split('filename=').at(1));
    } catch(e) {
      this.showUserMessage({ type: 'alert', message: e || 'server_error', textMessage: !!e })
    }

    ApplicationState.download = false;

    this.setLoadingContent(false);
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   *
   * @param ids
   * @param container
   * @param relationData
   * 
   * @since 4.1.0
   */
  showChart(ids, container, relationData) {
    this.emit('show-chart', ids, container, relationData);
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * @param container DOM element
   * 
   * @since 4.1.0
   */
  hideChart(container) {
    this.emit('hide-chart', container);
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   *
   * @param layer
   * @param feature
   * 
   * @since 4.1.0
   */
  printAtlas(layer, feature) {
    const features   = feature ? [feature] : layer.features;
    const atlasLayer = this.#atlas.filter(a => a.atlas.qgs_layer_id === layer.id);

    /** @FIXME add description */
    if (atlasLayer.length <= 1) {
      this._printSingleAtlas({ features, atlas: atlasLayer[0] });
      return;
    }

    let inputs = '';

    atlasLayer.forEach((atlas, index) => {
      const id = getUniqueDomId();
      inputs += /* html */`<label for="${id}"><input id="${id}" g3w_atlas_index="${index}" type="radio" name="template" value="${atlas.name}" /> ${atlas.name}</label><br>`;
    });

    this.showModalDialog({
      title: _('Select Template'),
      message: inputs,
      buttons: {
        success: {
          label: "OK",
          className: "skin-button",
          callback: () => {
            const index = $('input[name="template"]:checked').attr('g3w_atlas_index');
            if (undefined === index) {
              return false; // prevent default
            }
            this._printSingleAtlas({ features, atlas: atlasLayer[index] });
          }
        }
      }
    });

  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   *
   * @param layer
   * @param feature
   * 
   * @since 4.1.0
   */
  goToGeometry(layer, feature) {
    if (!feature.geometry) {
      return;
    }
    if (this.#asyncFnc.goToGeometry.async) {
      this.#asyncFnc.todo = this.getService('map')[this.isOneLayerResult() ? 'zoomToFeatures' : 'highlightGeometry'].bind(
        this.getService('map'),
        this.isOneLayerResult() ? [feature] : feature.geometry,
        this.isOneLayerResult() ? {} : { layerId: layer.id, duration: 1500 }
      );
    } else {
      setTimeout(() => this.getService('map')[this.isOneLayerResult() ? 'zoomToFeatures' : 'highlightGeometry'](
        this.isOneLayerResult() ? [feature] : feature.geometry,
        this.isOneLayerResult() ? {} : { layerId: layer.id, duration: 1500 }
      ));
    }
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   *
   * @param layer
   * @param feature
   * 
   * @since 4.1.0
   */
  highlightGeometry(layer, feature) {
    if (feature.geometry) {
      this.getService('map').highlightGeometry(
        feature.geometry,
        { layerId: layer.id, zoom: false, duration: Infinity }
      );
    }
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   *
   * @param layer
   * 
   * @since 4.1.0
   */
  clearHighlightGeometry(layer) {
    this.getService('map').clearHighlightGeometry();
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Handle show Relation on result
   * 
   * @param { Object } opts
   * @param opts.relation
   * @param opts.layerId  current layer father id
   * @param opts.feature  current feature father id
   * 
   * @since 4.1.0
   */
  showRelation({
    relation,
    layerId,
    feature
  } = {}) {
    const projectRelation = ApplicationState.project.getRelationById(relation.name);
    this.pushContent({
      content: new Component({
        vueComponentObject: require('components/Relation.vue').default,
        propsData: {
          relation:         projectRelation,
          chartRelationIds: this.plotLayerIds.find(pid => pid == projectRelation.referencingLayer) ? [projectRelation.referencingLayer] : [],
          nmRelation:       ApplicationState.project.getRelationById(relation.nmRelationId),
          layer:            { id: layerId },
          feature,
        }
      }),
      crumb: {
        title: projectRelation.name,
        text:  true,
      },
      title:    projectRelation.name,
      text  :   true,
      closable: false
    })
  };

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Get id of the  feature
   *
   * @since 4.1.0
   */
  _getFeatureId(feature, external) {
    return external ? feature.id : (feature.attributes[G3W_FID] || feature.id); // in case of query by geometry, features are returned without G3W_FID. They have id 
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Add / Remove features from selection
   * 
   * ORIGINAL SOURCE: src/app/gui/queryresults/queryresultsservice.js@3.8.12::addToSelection
   * 
   * @param layer queried layer instance
   * @param feature when provided, the feature to be toggled (otherwise, toggle all features)
   * 
   * @since 4.1.0
   */
  async toggleSelection(layer, feature) {
    
    const query         = this; //get query service
    const action        = query.getActionLayerById({ layer, id: 'selection' }); //get selction action
    const index         = (layer.features || []).findIndex(f => f == feature); // find feature index when selection is set to single feature
    const toggled       = layer.selection.active; 
    const catalog_layer = layer.external ? layer : getCatalogLayerById(layer.id);
    const features      = [].concat(feature || layer.features || []);

    if (!features.length) {
      return console.warn('no features');
    }

    // toggle selection
    layer.features.forEach((f, i) => {
      if (!feature) {
        action.state.toggled[i] = !toggled;
      } else if (i === index) {
        action.state.toggled[i] = !action.state.toggled[i];
      }
      f.selection.selected = action.state.toggled[i];
    });

    // handle pagination
    if (!layer.external && !feature && toggled) {
      catalog_layer.clearSelectionFids();
      return;
    }

    // ensure "layer.selection.features" is defined
    layer.selection.features = layer.selection.features || [];

    // external layer (click on layer)
    if (layer.external && !feature) {
      // set selection to all features
      layer.selection.active = !toggled;
      layer.features.forEach(feature => {
        let feat       = layer.selection.features.find(f => feature.id === f.getId()); // check feature if has been already added to selection
        if (!feat) {
          feat = new ol.Feature(feature.geometry);
          feat.setId(feature.id);
          Object.keys(feature.attributes).forEach(attr => feat.set(attr, feature.attributes[attr]));
          layer.selection.features.push(
            Object.assign(feat, {
            __layerId: layer.id,
            selection: { selected: layer.selection.active },
          }));
        }
        // set current selection selected attribute
        feat.selection.selected = layer.selection.active;
        // add remove selection feature
        this.getService('map').setSelectionFeatures(
          layer.selection.active ? 'add' : 'remove',
          { feature: feat }
        );
      });
    
      return;
    }

    // external layer (click on feature)
    if (layer.external && feature) {
      let feat = catalog_layer.selection.features.find(f => feature.id === f.getId()); // check feature if has been already added to selection
      if (feat) {
        feat.selection.selected = action.state.toggled[index];
      }
      // create selection feature for external if not yet added
      if (!feat) {
        feat = new ol.Feature(feature.geometry);
        feat.setId(feature.id); 
        Object.keys(feature.attributes).forEach(attr => feat.set(attr, feature.attributes[attr]));
        // add feature to selection layer features
        catalog_layer.selection.features.push(
            Object.assign(feat, {
            __layerId: catalog_layer.id,
            selection: { selected: true }, // NB: default true because otherwise it means that is clicked on selection
          })
        );
      }

      // handle map selection layer adding or remove feature based on selection boolean value
      this.getService('map').setSelectionFeatures(
        feat.selection.selected ? 'add' : 'remove',
        { feature: feat }
      );

      // set selection property (external layer)
      catalog_layer.selection.active = Object.values(action.state.toggled).every(t => t);;
      
      return;
    }

    // get fids (unique id) of features
    const fids = (features || []).map(f => f.attributes[G3W_FID] || f.id);

    fids.forEach((fid, i) => {
      const is_selected = catalog_layer.state.filter.active || catalog_layer.hasSelectionFid(fid);

      // if not already selected and feature is not added to OL selection layer on map --> add as feature of selected layer
      if (!is_selected && features[i]?.geometry && !catalog_layer.getOlSelectionFeature(fid)) {
        catalog_layer.addOlSelectionFeature({ id: fid, feature: features[i] });
      }
    
      // exclude
      if (feature && is_selected) {
        catalog_layer.excludeSelectionFid(fid);
      }

      // include
      if (feature && !is_selected) {
        catalog_layer.includeSelectionFid(fid);
      }
  
      // add
      if (!feature && !toggled && !is_selected) {
        catalog_layer.includeSelectionFid(fid, false);
      }
  
      // remove
      if (!feature && toggled) {
        catalog_layer.excludeSelectionFid(fid, false);
      }

    });

    // set layer selection state

    // PROJECT LAYER
    if (catalog_layer.state.filter.active) {
      fids.forEach((_, idx) => {
        // index of feature to remove
        const i = feature ? index : idx;
        layer.features.splice(i, 1);
        // delete related action
        delete action.state.toggled[i];
        // reset toggled state 
        action.state.toggled = Object.entries(action.state.toggled).reduce((a, t, i) => Object.assign(a, { [i]: t }), {});
      });
    }

    catalog_layer.state.selection.active = Object.values(action.state.toggled).every(t => t);

    //remove Highlight geometry layer fetures
    this.getService('map').clearHighlightGeometry();
    
    // PROJECT LAYER - In case of single layer and no features, remove layer
    if (1 === query.getState().layers.length && !query.getState().layers[0].features.length) {
      query.getState().layers.splice(0);
    }

  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * @since 4.1.0 
   */
  #setRelationField(node) {
    if (node.nodes) {
      for (const _node of node.nodes) {
        this.#setRelationField(_node);
      }
    } else if (node.name) {
      node.relation = true;
    }
  }

});