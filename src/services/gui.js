import G3WObject                 from 'g3w-object';
import Component                 from 'g3w-component';
import Panel                     from 'g3w-panel';
import { gettext as _ }          from 'g3w-i18n';

import ApplicationState          from 'store/application';

import IFrameRouterService       from 'services/iframe';

import { getUniqueDomId }        from 'utils/getUniqueDomId';
import { toRawType }             from 'utils/toRawType';
import { promisify, $promisify } from 'utils/promisify';
import { getListableProjects }   from 'utils/getListableProjects';
import { getProjectUrl }         from 'utils/getProjectUrl';
import { getCatalogLayerById }   from 'utils/getCatalogLayerById';

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
      'getPermalink',
      'getPrintParams',
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
      const last = rid === this.outputDataPlace.reqs.at(-1);

      // set request output ids empty
      if (last) {
        this.outputDataPlace.reqs.splice(0);
      }

      //if set before call method and wait
      if (last && output.before) {
        await output.before(data);
      }

      // in case of usermessage show user message
      if (last && data.usermessage) {
        await this.showUserMessage({
          type:      data.usermessage.type,
          message:   data.usermessage.message,
          autoclose: data.usermessage.autoclose
        });  
      }

      // check if data can be shown on query result content
      if (last && show) {
        (this.getService('queryresults') || this.showQueryResults(output.title || '')).setQueryResponse(data, { add: !!output.add });
      }
      //@since 4.0.3 in case of show false, need to close content
      if (last && !show) {
        await this.closeContent();
      }

      // call after is set with data
      if (last && output.after) {
        output.after(data);
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
    this.getService('queryresults').clearState();

    if (results) {
      this.getService('queryresults').setQueryResponse(results);
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

    return this.getService('queryresults');
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
  async showUserMessage({
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
    //@since 4.0.3
    await new Promise((res) => setTimeout(() => {
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
      res();
    }));

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

  /**
   * @since 4.0.0 
   */
  async setContent(opts = {}) {
    this.emit('opencontent', true);

    // close user message before set content
    if (this._closeUserMessage) {
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
        await promisify(ApplicationState.contentsdata[id].content.unmount());
        ApplicationState.contentsdata.splice(id, 1);
      }
      // Mount vue component
      await promisify(content.mount(contents.parent, opts.append || false));
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
      await promisify(content.unmount());
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
        await promisify(d.content.unmount());
      } else {
        $(g3wsdk.gui.GUI.getComponent('contents').parent).empty();
      }
    }));
    ApplicationState.contentsdata.splice(0, ApplicationState.contentsdata.length);
  }

});