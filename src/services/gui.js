import { VIEWPORT }     from 'g3w-constants';
import G3WObject                 from 'g3w-object';
import Component                 from 'g3w-component';
import Panel                     from 'g3w-panel';

import ApplicationState          from 'store/application-state';
import ProjectsRegistry          from 'store/projects';

import IFrameRouterService       from 'services/iframe';

import { getUniqueDomId }        from 'utils/getUniqueDomId';
import { toRawType }             from 'utils/toRawType';
import { promisify, $promisify } from 'utils/promisify';

/** store legacy frontend components */
const COMPONENTS = {};

/* service know by the applications (standard) */
const SERVICES = {
  navbar:   null,
  sidebar:  null,
  viewport: null,
};

function setViewSizes() {
  const state = ApplicationState.viewport;

  const primaryView   = state.primaryView;
  const secondaryView = 'map' === state.primaryView ? 'content' : 'map';
  const main_sidebar  = $(".main-sidebar");
  const offset         = main_sidebar.length && main_sidebar.offset().left;
  const width = main_sidebar.length && main_sidebar[0].getBoundingClientRect().width;
  const sideBarSpace   = width + offset;
  const viewportWidth = $('#app')[0].getBoundingClientRect().width - sideBarSpace;
  const viewportHeight = $(document).innerHeight() - $('.navbar-header').innerHeight();
  // assign all width and height of the view to primary view (map)
  let primaryWidth;
  let primaryHeight;
  let secondaryWidth;
  let secondaryHeight;
  // percentage of secondary view (content)
  const is_fullview = ApplicationState.gui.layout[ApplicationState.gui.layout.__current].rightpanel[`${state.split === 'h'? 'width' : 'height'}_100`];
  const content_perc = ApplicationState.gui.layout[ApplicationState.gui.layout.__current].rightpanel['h' === state.split ? 'width': 'height'];
  const scale = (state.secondaryPerc !== 100 && !is_fullview ? content_perc : 100) / 100;
  if ('h' === state.split ) {
    secondaryWidth  = state.secondaryVisible ? Math.max((viewportWidth * scale), VIEWPORT.resize.content.min) : 0;
    secondaryHeight = viewportHeight;
    primaryWidth    = viewportWidth - secondaryWidth;
    primaryHeight   = viewportHeight;
  } else {
    secondaryWidth  = viewportWidth;
    secondaryHeight = state.secondaryVisible ? Math.max((viewportHeight * scale), VIEWPORT.resize.content.min) : 0;
    primaryWidth    = state.secondaryVisible && scale === 1 ? 0 : viewportWidth;
    primaryHeight   = viewportHeight - secondaryHeight;
  }
  state[primaryView].sizes.width    = primaryWidth;
  state[primaryView].sizes.height   = primaryHeight;
  state[secondaryView].sizes.width  = secondaryWidth;
  state[secondaryView].sizes.height = secondaryHeight;
}

/**
 * ORIGINAL SOURCE: src/services/viewport.js@v3.10.2
 */
function getReducedSizes() {
  const contentEl = $('.content');
  let reducedWidth  = 0;
  let reducedHeight = 0;
  const sideBarToggleEl = $('.sidebar-aside-toggle');
  const is_fullview = ApplicationState.gui.layout[ApplicationState.gui.layout.__current].rightpanel[`${ApplicationState.viewport.split === 'h' ? 'width' : 'height'}_100`];
  if (contentEl && ApplicationState.viewport.secondaryVisible && is_fullview) {
    if (sideBarToggleEl && sideBarToggleEl.is(':visible')) {
      const toggleWidth = sideBarToggleEl.outerWidth();
      contentEl.css('padding-left', toggleWidth + 5);
      reducedWidth = (toggleWidth - 5);
    }
  } else {
    const toggleWidth = sideBarToggleEl.outerWidth();
    contentEl.css('padding-left', ApplicationState.viewport.secondaryPerc === 100 ? toggleWidth + 5 : 15);
  }
  return {
    reducedWidth,
    reducedHeight
  }
}

/** clear all stacks */
async function _clearContents() {
  await Promise.allSettled((ApplicationState.contentsdata || []).map(async d => {
    if (d.content instanceof Component || d.content instanceof Panel) {
      await promisify(d.content.unmount());
    } else {
      $(GUI.getComponent('contents').parent).empty();
    }
  }));
  ApplicationState.contentsdata.splice(0, ApplicationState.contentsdata.length);
}

/**
 * Convert error to user message showed
 * @param error
 * @returns {string}
 */
function errorToMessage(error) {
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
    return error.map(e => errorToMessage(e)).join(' ');
  }

  return error || 'server_error';
}

// API della GUI.
// methods have been defined by application
// app should call GUI.ready() when GUI is ready
export default new (class GUI extends G3WObject {

  constructor(opts) {
    super(opts);

    this.setters = {

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
          split:        undefined !== opts.split       ? opts.split : null,
          closable:     undefined !== opts.closable    ? opts.closable : true,
          backonclose:  undefined !== opts.backonclose ? opts.backonclose : true,
          contentsdata: this.getComponent('contents').contentsdata,
          style:        undefined !== opts.style ? opts.style : {},
          headertools:  undefined !== opts.headertools ? opts.headertools : [],
          showgoback:   undefined !== opts.showgoback ? opts.showgoback : true,
        });

        // call show view (in this case content (other is map)
        this._showView('content', opts);

        const contents = this.getComponent('contents');
        
        // whether to clean the stack every time, sure to have just one component.
        if (!opts.push) {
          await _clearContents();
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
          $(contents.parent).localize();
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

        this._layoutComponents(event);
      }
    };

    this.isready          = false;

    //property to how a result has to be adding or close all and show new
    // false mean create new and close all open
    this.push_content     = false;

    this._closeUserMessage = true;

    this.dialog = bootbox;

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
    if (placeholder && Object.keys(SERVICES).indexOf(placeholder) > -1) {
      // add component to the sidebar and set position inside the sidebar
      if ('sidebar' === placeholder) {
        if (!isMobile.any || false !== component.mobile) {
          ApplicationState.sidebar.components.push(component);
          (new (Vue.extend(require('components/SidebarItem.vue')))({ component, opts: options })).$mount();
        }
        register = true;
      } else if (SERVICES[placeholder]) {
        register = SERVICES[placeholder].addComponents([component], options);
      }
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
    if (undefined === COMPONENTS[id]) {
      COMPONENTS[id] = component;
    }
  }

  getComponent(id) {
    return COMPONENTS[id];
  }

  getComponents() {
    return COMPONENTS;
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

    // abort any previous request
    if (this.pending_output) {
      await this.pending_output();
    }

    // if request doesn't need to add to a current query result
    if (!output.add) {
      this.showQueryResults(output.title || '');
    }

    // Store data promise
    let data = {};
    // stop
    let stop = false;

    //set current pending out
    this.pending_output = async () => stop = true;

    //set current request id
    this.crid = rid;

    try {

      if (!stop) {
        data = await promise;
      }

      //if set before call method and wait
      if (!stop && output.before) {
        await output.before(data)
      }

      // in case of usermessage show user message
      if (!stop && data.usermessage) {
        this.showUserMessage({
          type:      data.usermessage.type,
          message:   data.usermessage.message,
          autoclose: data.usermessage.autoclose
        });
      }

      const show = !stop && 'function' === typeof output.condition ? output.condition(data) : false !== output.condition;

      // check if data can be shown on query result content
      if (!stop && show) {
        (this.getService('queryresults') || this.showQueryResults(output.title || '')).setQueryResponse(data, { add: output.add });
      }

      if (!stop && !show) {
        this.pending_output = this.closeContent.bind(this);
      }

      // call after is set with data
      if (!stop && output.after) {
        output.after(data)
      }

    } catch(e) {
      console.warn(e);
      this.showUserMessage({
        type:        'alert',
        message:     errorToMessage(e),
        textMessage: true
      });
      await this.closeContent();
    }

    this.pending_output = null;
    //set loading to false when done current request id
    this.setLoadingContent(rid !== this.crid);
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
    }

    this.setModal(false);
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

    queryresults.reset();

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
      $(parent).localize();
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
    content = null;
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
  showFullModal({element = "#full-screen-modal", show = true} = {}) {
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
  };

  //return number of a component of stack
  getContentLength() {
    return ApplicationState.viewport.content.contentsdata.length;
  }

  /**
   * change current content options
   * @param options: {title, crumb}
   */
  setCurrentContentOptions(options={}) {
    const content = ApplicationState.viewport.content.contentsdata.at(-1) || null;
    if (content && options.title) {
      content.options.title = options.title;
    }
    if (content && options.crumb) {
      content.options.crumb = options.crumb;
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
      internalComponent: new (Vue.extend(require('components/ProjectsMenu.vue')))({
        host: opts.host,
        state: {
          menuitems: (opts.projects || ProjectsRegistry.getListableProjects()).map(p => ({
            title:       p.title,
            description: p.description,
            thumbnail:   p.thumbnail,
            gid:         p.gid,
            cbk:         opts.cbk || ((o = {}) => $promisify(async () => {
              const url = GUI.getService('map').addMapExtentUrlParameterToUrl(ProjectsRegistry.getProjectUrl(o.gid));
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
    this._layoutComponents();
  }

  resetToDefaultContentPercentage() {
    const state = ApplicationState.viewport;
    const { rightpanel } = ApplicationState.gui.layout[ApplicationState.gui.layout.__current];
    rightpanel[`${state.split === 'h' ? 'width' : 'height'}`]     = rightpanel[`${state.split === 'h' ? 'width' : 'height'}_default`];
    rightpanel[`${state.split === 'h' ? 'width' : 'height'}_100`] = false;
    this._layoutComponents();
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
      _clearContents();
    }

    // close secondary view
    if (open && 'map' === state.primaryView) {
      await _clearContents();
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
    // skip when ..
    if (!ApplicationState.viewport.content.contentsdata.length) {
      return Promise.reject();
    }

    const data = this.getComponent('contents').contentsdata.at(-2);
    const opts = data.options;

    Object.assign(ApplicationState.viewport.content, {
      title:        opts.title,
      split:        undefined !== opts.split       ? opts.split       : null,
      closable:     undefined !== opts.closable    ? opts.closable    : true,
      backonclose:  undefined !== opts.backonclose ? opts.backonclose : true,
      contentsdata: this.getComponent('contents').contentsdata,
      style:        undefined !== opts.style       ? opts.style       : {},
      headertools:  undefined !== opts.headertools ? opts.headertools : [],
      showgoback:   undefined !== opts.showgoback  ? opts.showgoback  : true,
    });

    this._showView('content', data.options);

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

    return this.getComponent('contents').contentsdata.at(-1);
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
  }

  hideSidebar() {
    document.body.classList.remove('sidebar-open');
    document.body.classList.add('sidebar-collapse');
  }

  getSize ({ element, what }) {
    if (element && what) {
      return ApplicationState.sizes[element][what];
    }
  }

  // manage all layout logic
  // viewName: map or content
  //options.  percentage , splitting title etc ..
  async _showView(viewName, options = {}) {
    const state = ApplicationState.viewport;

    const {
      perc = viewName == state.primaryView ? 100 : 50,
      split = 'h'
    } = options;

    state[viewName].aside = viewName == state.primaryView ? (undefined === options.aside ? false : options.aside) : true;

    //calculate the content
    const secondaryPerc = viewName == state.primaryView ? 100 - perc : perc;

    //show Secondary View content only if more than 0
    if (secondaryPerc > 0)  {
      state.secondaryVisible = true;
      state.split            = undefined !== split ? split : state.split;
      state.secondaryPerc    = undefined !== perc  ? perc  : state.perc;
      this._layout();
      return;
    }

    // close secondary view
    if ('map' === state.primaryView) {
      await _clearContents();
      state.secondaryPerc = 0;
    }

    state.secondaryVisible = false;

    this._layout();

    await Vue.nextTick();
  }

  /**
   * load components of viewport after right size setting
   * 
   * ORIGINAL SOURCE: src/services/viewport.js@v3.10.2
   */
  _layoutComponents(event = null) {
    requestAnimationFrame(() => {
      const reducesdSizes = getReducedSizes();
      const reducedWidth  = reducesdSizes.reducedWidth || 0;
      const reducedHeight = reducesdSizes.reducedHeight || 0;

      // for each component
      setViewSizes();
      this.getService('map').layout({
        width:  ApplicationState.viewport.map.sizes.width - reducedWidth,
        height: ApplicationState.viewport.map.sizes.height - reducedHeight
      });

      const parentWidth = ApplicationState.viewport.content.sizes.width - reducedWidth;

      // Set layout of the content each time
      Vue.nextTick(() => {                                                     // run only after that vue state is updated
        const el = this.getComponent('contents').internalComponent.$el;
        const height = el.parentElement.clientHeight                           // parent element is "g3w-view-content"
          - ((el.parentElement.querySelector('.close-panel-block') || {}).offsetHeight || 0)
          - ((el.parentElement.querySelector('.content_breadcrumb') || {}).offsetHeight || 0)
          - 10;                                                                // margin 10 from bottom
        el.style.height = height + 'px';
        if (el.firstChild) {
          el.firstChild.style.height = height + 'px';
        }
        ApplicationState.contentsdata.forEach(d => {                                // re-layout each component stored into the stack
          if ('function' == typeof d.content.layout) {  
            d.content.layout(parentWidth + 0.5, height);
          }
        })
      });

      if (event) {
        setTimeout(() => { this.emit(event); })
      }
    });
  }

  /**
   * main layout function
   */
  _layout(event = null) {
    const reducesdSizes = getReducedSizes();
    setViewSizes(reducesdSizes.reducedWidth, reducesdSizes.reducedHeight);
    this._layoutComponents(event);
  }

});