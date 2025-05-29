import { VIEWPORT }              from 'g3w-constants';
import G3WObject                 from 'g3w-object';
import Component                 from 'g3w-component';
import Panel                     from 'g3w-panel';
import { t }                     from 'g3w-i18n';

import ApplicationState          from 'store/application';

import IFrameRouterService       from 'services/iframe';

import { getUniqueDomId }        from 'utils/getUniqueDomId';
import { toRawType }             from 'utils/toRawType';
import { promisify, $promisify } from 'utils/promisify';
import { getListableProjects }   from 'utils/getListableProjects';
import { getProjectUrl }         from 'utils/getProjectUrl';

export default new (class GUI extends G3WObject {

  /** store legacy frontend components */
  #COMPONENTS = {}

  /* service know by the applications (standard) */
  #SERVICES = {
    navbar:   null,
    sidebar:  null,
    viewport: null,
  }

  constructor(opts) {
    super(opts);

    this.setters = [
      'setContent',
      'getPermalink'
    ];

    this.isready           = false;

    //property to how a result has to be adding or close all and show new
    // false mean create new and close all open
    this.push_content      = false;

    this._closeUserMessage = true;

    /*
     * Based on bootbox.js v4.4.0
     * Copyright 2011-2020 Nick Payne
     * Licensed under MIT (https://github.com/bootboxjs/bootbox/blob/v4.x/LICENSE.md)
     */
    this.dialog            = {
   
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

   // BACKCOMP: v3.x
   this.dialog.confirm = this.dialog.dialog;

    this.notify = {
      warning:(message, autoclose = false) => { this.showUserMessage({ type: 'warning', message, autoclose }) },
      error:  (message, autoclose = false) => { this.showUserMessage({ type: 'alert',   message, autoclose }) },
      info:   (message, autoclose = false) => { this.showUserMessage({ type: 'info',    message, autoclose }) },
      success:(message)                    => { this.showUserMessage({ type: 'success', message, autoclose: true }) }
    };

    /** @since 3.11.0 */
    this.currentoutputplace = 'gui';
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
    let drawing     = false;
    let resizeFired = false;
    function triggerResize() {
      resizeFired = true;
      drawResize();
    }
    /**
     * function called from resize of browser windows (also open dev tool)
     */
    const drawResize = () => {
      if (true === resizeFired ) {
        resizeFired = false;
        drawing = true;
        this._layout('resize');
        requestAnimationFrame(drawResize);
      } else {
        drawing = false;
      }
    };

    // SetSidebar width (used by components/Viewport.vue single file component)
    ApplicationState.viewport.SIDEBARWIDTH = this.getSize({element:'sidebar', what:'width'});

    this._layout();

    // resize della window
    $(window).resize(() => {
      // set resizedFired to true and execute drawResize if it's not already running
      if (false === drawing) {
        triggerResize();
      }
    });

    // resize on main siedemar open close sidebar
    $('.main-sidebar').on('transitionend', function (event) {
      //be sure that is the main sidebar that is transitioned non his child
      if (event.target === this) {
        $(this).trigger('trans-end');
        triggerResize();
      }
    });

    // remove "permalink_code" from URL
    const url = new URL(window.location);
    url.searchParams.delete('permalink_code');
    window.history.replaceState(null, null, url);

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

    try {
      await downloadFnc(options);
    } catch(e) {
      this.showUserMessage({ type: 'alert', message: e || 'server_error', textMessage: !!e })
    }
    ApplicationState.download = true;
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
   * @param promise // is request data promise
   * @param { Object } output
   * @param { boolean | Function | Object } output.show set output condition (whether to show result or not)
   * @param { boolean } output.add
   * @param { String } output.title
   */
  async outputDataPlace(promise, output = {}) {

    //set current unique request id of request
    const rid = getUniqueDomId();

    /** @type { String[] } cached requests (by id) */
    this.outputDataPlace.reqs = (this.outputDataPlace.reqs || []).concat(rid);
    /** In the case of a current output result is iframe, send to IFrameRouterService.outputDataPlace*/
    if ('iframe' === this.currentoutputplace) {
      return IFrameRouterService.outputDataPlace(promise, output);
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
      const last = show && rid === this.outputDataPlace.reqs.at(-1);

      // set request output ids empty
      if (last) {
        this.outputDataPlace.reqs.splice(0);
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
        (this.getService('queryresults') || this.showQueryResults(output.title || '')).setQueryResponse(data, { add: !!output.add });
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
    this.setLoadingContent(this.outputDataPlace.reqs.length > 0);
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
    const queryresults = this.getComponent('queryresults').getService();

    queryresults.clearState();

    if (results) {
      queryresults.setQueryResponse(results);
    }

    // show contextual content
    this.setContent({
      content:    this.getComponent('queryresults'),
      title:      "info.title",
      crumb:      { title: "info.title", trigger: null },
      push:       this.push_content,
      post_title: title,
      perc:       isMobile.any ? 100 : undefined,
    });

    return queryresults;
  }

  /**
   * used by the following plugins: "stress" 
   */
  addNavbarItem(item) {
    ApplicationState.navbaritems.push(item);
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
        await promisify(data[id].content.unmount());
        data.splice(id, 1);
      }
      // Mount vue component
      await promisify(content.mount(parent, options.append || false));
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
      await promisify(panel.unmount());
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
  showContent(options = {}) {
    this.setLoadingContent(false);
    options.perc = isMobile.any ? 100 : options.perc;
    this.setContent(options);
    return true;
  }

  // add component to stack (append)
  // Differences between pushContent and setContent are:
  //  - push every component is added, set is refreshed
  //  - pushContent has a new parameter (backonclose) when is clicked x
  //  - the contentComponent is close all stacks are closed
  pushContent(options = {}) {
    options.perc = isMobile.any ? 100 : options.perc;
    options.push = true;
    this.setContent(options);
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
            cbk:         opts.cbk || ((o = {}) => $promisify(async () => {
              const url = await GUI.getService('map').addMapExtentUrlParameterToUrl(getProjectUrl(o.gid));
              try { history.replaceState(null, null, url); }
              catch (e) { console.warn(e); } location.replace(url);}
            )),
          }))
        },
      }),
    })).getInternalComponent().$mount().$el;
  }

  toggleUserMessage(bool = true) {
    this._closeUserMessage = bool;
  }

  /**
   * used by the following plugins: "stress"
   */
  hideClientMenu() {
    window.initConfig.user = null;
  }

  /**
   * used by the following plugins: "stress"
   */
  hideChangeMaps() {
    window.initConfig.projects = [];
  }

  setLoadingContent(loading = false) {
    ApplicationState.viewport.content.loading = loading;
    return loading && new Promise((resolve) => setTimeout(resolve, 200))
  }

  toggleFullViewContent() {
    const state = ApplicationState.viewport;
    const { rightpanel } = ApplicationState.gui.layout[ApplicationState.gui.layout.__current];
    rightpanel[`${state.split === 'h' ? 'width' : 'height'}_100`] = !rightpanel[`${state.split === 'h' ? 'width' : 'height'}_100`];
    this._layout();
  }

  /**
   * @since 4.0.0 
   */
  async setContent(options = {}) {
    this.emit('opencontent', true);

    // close user message before set content
    if (this._closeUserMessage) {
      this.closeUserMessage();
    }

    options.content     = options.content || null;
    options.title       = options.title || "";
    options.push        = (true === options.push || false === options.push) ? options.push : false;
    options.perc        = isMobile.any ? 100 : options.perc;
    options.split       = options.split || 'h';
    options.backonclose = (true === options.backonclose || false === options.backonclose) ? options.backonclose : false;
    options.showtitle   = (true === options.showtitle || false === options.showtitle) ? options.showtitle : true;

    const opts = options;

    const content_perc = ApplicationState.gui.layout[ApplicationState.gui.layout.__current].rightpanel['h' === ApplicationState.viewport.split ? 'width': 'height'];
    opts.perc = opts.perc !== undefined ? opts.perc : content_perc;

    // check if push is set
    opts.push = opts.push || false;
    const event = opts.perc === 100 ? 'show-content-full' : 'show-content';

    // set all content parameters
    Object.assign(ApplicationState.viewport.content, {
      title:        opts.title,
      split:        undefined === opts.split       ? null : opts.split,
      closable:     undefined === opts.closable    || opts.closable,
      backonclose:  undefined === opts.backonclose || opts.backonclose,
      style:        undefined === opts.style ? {} : opts.style,
      headertools:  undefined === opts.headertools ? [] : opts.headertools,
      showgoback:   undefined === opts.showgoback  || opts.showgoback,
      contentsdata: ApplicationState.contentsdata,
    });

    // call show view (in this case content (other is map)
    this.#showView('content', opts);

    const contents = this.getComponent('contents');
    
    // whether to clean the stack every time, sure to have just one component.
    if (!opts.push) {
      await this.#clearContents();
    }

    const content = opts.content;
    const _options = Object.assign(opts, { parent: contents.internalComponent.$el, append: true });
    contents.parent = _options.parent;

    // check the type of content:

    // String or JQuery
    if (content instanceof jQuery || 'string' === typeof content) {
      let el = 'string' === typeof content ? ($(content).length ? $(`<div> ${content} </div>`) : $(content)) : content
      $(contents.parent).append(el);
      ApplicationState.contentsdata.push({ content: el, options: _options });
      console.warn('[G3W-CLIENT] jQuery components will be discontinued, please update your code as soon as possible', ApplicationState.contentsdata.at(-1));
    }

    // Vue element
    else if (content.mount && 'function' === typeof content.mount) {
      // Check a duplicate element by component id (if already exist)
      let id = ApplicationState.contentsdata.findIndex(d => d.content.getId && (content.getId() === d.content.getId()));
      if (-1 !== id) {
        await promisify(ApplicationState.contentsdata[id].content.unmount());
        ApplicationState.contentsdata.splice(id, 1);
      }
      // Mount vue component
      await promisify(content.mount(contents.parent, _options.append || false));
      ApplicationState.contentsdata.push({ content, options: _options });
    }

    // DOM element
    else {
      contents.parent.appendChild(content);
      ApplicationState.contentsdata.push({ content, options: _options });
    }

    Array
      .from(contents.internalComponent.$el.children)  // hide other elements but not the last one
      .forEach((el, i, a) => el.style.display = (i === a.length - 1) ? 'block' : 'none');

    contents.setOpen(true);

    this._layout(event);
  }

  // hide content
  hideContent(bool) {
    const content_perc = ApplicationState.gui.layout[ApplicationState.gui.layout.__current].rightpanel['h' === ApplicationState.viewport.split ? 'width': 'height'];
    ApplicationState.viewport.secondaryVisible = !bool;
    this._layout('hide-content');
    // return previous percentage
    return content_perc;
  }

  async closeContent() {
    this.emit('closecontent', false);

    const state         = ApplicationState.viewport;
    const open          = state.content.contentsdata.length > 0;

    // content is open → remove content
    if (open) {
      const contents = this.getComponent('contents');
      contents.setOpen(false);
      this.#clearContents();
    }

    // close secondary view
    if (open) {
      await this.#clearContents();
      state.secondaryPerc = 0;
    }

    if (open) {
      state.secondaryVisible = false;
      this._layout('close-content');
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

    const data = ApplicationState.contentsdata.at(-2);
    const opts = data.options;

    Object.assign(ApplicationState.viewport.content, {
      title:        opts.title,
      split:        undefined !== opts.split       ? opts.split       : null,
      closable:     undefined !== opts.closable    ? opts.closable    : true,
      backonclose:  undefined !== opts.backonclose ? opts.backonclose : true,
      contentsdata: ApplicationState.contentsdata,
      style:        undefined !== opts.style       ? opts.style       : {},
      headertools:  undefined !== opts.headertools ? opts.headertools : [],
      showgoback:   undefined !== opts.showgoback  ? opts.showgoback  : true,
    });

    this.#showView('content', data.options);

    if (ApplicationState.contentsdata.length <= 0) {
      return;
    }

    // component exists on stack → remove the last from stack
    const content = ApplicationState.contentsdata.slice(-1)[0].content;

    if (content instanceof Component || content instanceof Panel) {
      await promisify(content.unmount());
    } else {
      $(this.getComponent('contents').parent).empty();
    }

    ApplicationState.contentsdata.pop();

    Array
      .from(this.getComponent('contents').internalComponent.$el.children)       // hide other elements but not the last one
      .forEach((el, i, a) => el.style.display = (i === a.length - 1) ? 'block' : 'none');

    ApplicationState.viewport.secondaryPerc    = data.options.perc;

    this._layout('pop-content');

    return ApplicationState.contentsdata.at(-1);
  }

  isSidebarVisible() {
    return !document.body.classList.contains('sidebar-collapse');
  }

  setModal(bool=false, message) {
    const mapService = this.getService('map');
    if (bool) { mapService.startDrawGreyCover(message) }
    else { mapService.stopDrawGreyCover() }
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

  getSize ({ element, what }) {
    if (element && what) {
      return ApplicationState.sizes[element][what];
    }
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

    // get difference between start layersstree project with current
    let layerstrees = [];

    const traverse = (nodes, onodes, tree) => {
      nodes.forEach((node, i) => {
        let diff;

        const id   = node.id;
        const name = node.name;

        let obj = undefined !== node.id
          ? {                                           // a layer node
            id:       node.id,
            name:     node.name,
            expanded: node.expanded,
            visible:  node.visible
          }
          : {                                           // a group node
            name:                 node.name,
            checked:              node.checked,
            expanded:             node.expanded,
            'mutually-exclusive': node['mutually-exclusive']
          };

        // get diff
        if (undefined !== node.id || Array.isArray(node.nodes)) {
          // exclude id and name attribute, add only some attributes are chenged
          diff = Object.keys(obj).reduce((acc, attr) => Object.assign(acc,
            undefined !== onodes[i][attr] && obj[attr] !== onodes[i][attr]
              ? { [attr]: obj[attr] }
              : {}
          ), {});
        }

        if (Object.keys(diff || {}).length  > 0) {
          diff[id ? 'id' : 'name'] = id || name;
        }

        // handle recursion (group node)
        if (Array.isArray(node.nodes)) {
          diff.nodes = [];
          traverse(node.nodes, onodes[i].nodes, diff.nodes);
          diff.nodes = diff.nodes.filter(n => Object.keys(n).length > 0 && (!n.nodes || n.node.length > 0));
        }

        if (Array.isArray(node.nodes) && 0 === diff.nodes.length) {
          delete diff.nodes;
        }

        // set name of group
        if (Array.isArray(node.nodes) && Object.keys(diff || {}).length > 0) {
          diff.name = node.name;
        }

        // only if has changes
        if (diff && Object.keys(diff || {}).length  > 0) {
          tree.push(diff);
        }
      });
      return layerstrees;
    };

    // loop through child nodes and return structure layerstree diff only
    layerstrees = traverse(
      ApplicationState.project.getLayersStore().state.layerstree[0].nodes, //current state of layerstrees
      ApplicationState.project.state.layerstree,                           //original project layerstree
      layerstrees
    );

    const uparams = Array.from(url.searchParams.entries());

    let response = await (await fetch('/api/embed/', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        url,
        data: {
          ...data,
          layerstree:     layerstrees.length > 0 ? layerstrees : undefined,
          initextent:      this.getService('map').getMapExtent(),
          lng:             ApplicationState.language,
          initbaselayer:   ApplicationState.baseLayerId || undefined,                     // current base layer
          toc_tab_default: this.getComponent('catalog').getInternalComponent().activeTab, // take in account change tab
        },
      }),
    })).json();

    const permalink_code = response?.data?.permalink_code;

    const dialog = Object.assign(document.createElement('template'), {
      innerHTML: /* html */`
        <dialog id="share_modal">
          <h4 style="margin: 0; padding: .5em; color: #FFF; position: sticky; top: 0; background-color: #212c31"><i class="fa fa-share-alt" style="margin-right: .5ch;"></i> ${t('sdk.mapcontrols.query.actions.copy_zoom_to_fid_url.hint')}</h4>
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
              <button type="submit" onclick="document.querySelector('#embed-link').focus() || document.execCommand('copy')" class="form-control btn btn-success mt-2">${ t('sdk.tooltips.copy_map_extent_url') }</button>
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

  // manage all layout logic
  // viewName: map or content
  //options.  percentage , splitting title etc ..
  async #showView(viewName, options = {}) {
    const state = ApplicationState.viewport;

    const {
      perc = viewName == 'map' ? 100 : 50,
      split = 'h'
    } = options;

    state[viewName].aside = viewName == 'map' ? (undefined === options.aside ? false : options.aside) : true;

    //calculate the content
    const secondaryPerc = viewName == 'map' ? 100 - perc : perc;

    //show Secondary View content only if more than 0
    if (secondaryPerc > 0)  {
      state.secondaryVisible = true;
      state.split            = undefined !== split ? split : state.split;
      state.secondaryPerc    = undefined !== perc  ? perc  : state.perc;
      this._layout();
      return;
    }

    // close secondary view
    await this.#clearContents();
    state.secondaryPerc = 0;
    state.secondaryVisible = false;

    this._layout();

    await Vue.nextTick();
  }

  /**
   * load components of viewport after right size setting
   * 
   * ORIGINAL SOURCE: src/services/viewport.js@v3.10.2
   */
  _layout(event = null) {
    requestAnimationFrame(() => {

      const state  = ApplicationState.viewport;
      const layout = ApplicationState.gui.layout;

      const content = $('.content');
      const toggler = $('.sidebar-aside-toggle');
      const viewW   = $('#app')[0].getBoundingClientRect().width - $(".main-sidebar")[0].getBoundingClientRect().width - $(".main-sidebar").offset().left;
      const viewH   = $(document).innerHeight() - $('.navbar').innerHeight();

      const h_split = 'h' === state.split;
      const v_split = 'v' === state.split;
      const is_full = layout[layout.__current].rightpanel[h_split ? 'width_100' : 'height_100'];

      content?.css('padding-left', is_full
        ? (toggler?.is(':visible') ? ((toggler?.outerWidth() ?? 5) - 5 + 10) : toggler?.css('padding-left'))
        : (state.secondaryPerc === 100 ? toggler.outerWidth() + 5 : 15)
      );

      // percentage of secondary view (content)
      const scale = state.secondaryPerc !== 100 && !is_full
        ? (layout[layout.__current].rightpanel[h_split ? 'width': 'height'] / 100)
        : 1;

      // resize "map"
      Object.assign(state.map.sizes, {
        width:  h_split ? (viewW - (state.secondaryVisible ? Math.max((viewW * scale), VIEWPORT.resize.content.min) : 0)) : (state.secondaryVisible && scale === 1 ? 0 : viewW),
        height: v_split ? (viewH - (state.secondaryVisible ? Math.max((viewH * scale), VIEWPORT.resize.content.min) : 0)) : viewH,
      });

      // resize "content"
      Object.assign(state.content.sizes, {
        width:  h_split ? (state.secondaryVisible ? Math.max((viewW * scale), VIEWPORT.resize.content.min) : 0) : viewW,
        height: v_split ? (state.secondaryVisible ? Math.max((viewH * scale), VIEWPORT.resize.content.min) : 0) : viewH,
      });

      const reduce_w = (is_full && state.secondaryVisible && toggler?.is(':visible') && toggler?.outerWidth() || 5) - 5;

      this.getService('map').layout({
        width:  state.map.sizes.width - reduce_w,
        height: state.map.sizes.height
      });

      // Set layout of the content each time

      const contents = $('#contents')[0];

      contents.style.height = contents.parentElement.clientHeight        // parent element is "g3w-view-content"
        - (contents.parentElement.querySelector('.close-panel-block')?.offsetHeight || 0)
        - (contents.parentElement.querySelector('.content_breadcrumb')?.offsetHeight || 0)
        - 10 + 'px';

      if (contents.children[0]) {
        contents.children[0].style.height = contents.style.height;
      }

      ApplicationState.contentsdata.forEach(d => {                           // re-layout each component stored into the stack
        if ('function' == typeof d.content.layout) {  
          d.content.layout(state.content.sizes.width - reduce_w + 0.5, contents.style.height.replace('px',''));
        }
      });

      if (event) {
        this.emit(event);
      }

    });
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
        await promisify(d.content.unmount());
      } else {
        $(g3wsdk.gui.GUI.getComponent('contents').parent).empty();
      }
    }));
    ApplicationState.contentsdata.splice(0, ApplicationState.contentsdata.length);
  }

});