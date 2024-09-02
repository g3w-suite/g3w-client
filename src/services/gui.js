import G3WObject                 from 'core/g3w-object';
import Component                 from 'core/g3w-component';

import ApplicationState          from 'store/application-state';
import ComponentsRegistry        from 'store/components';
import ProjectsRegistry          from 'store/projects';

import ApplicationService        from 'services/application';

import { noop }                  from 'utils/noop';
import { getUniqueDomId }        from 'utils/getUniqueDomId';
import { setViewSizes }          from 'utils/setViewSizes';
import { toRawType }             from 'utils/toRawType';
import { promisify, $promisify } from 'utils/promisify';

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

/**
 * Convert error to user message showed
 * @param error
 * @returns {string}
 */
function errorToMessage(error){
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

      setContent(options = {}) {
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

        // immediate layout false (to understand better)
        ApplicationState.viewport.immediate_layout = false;

        // call show view (in this case content (other is map)
        this._showView('content', opts);

        this.getComponent('contents').setContent(opts).then(() => {
          ApplicationState.viewport.immediate_layout = true;
          this._layoutComponents(event);
        });
      }
    };

    this.isready          = false;

    //property to how a result has to be adding or close all and show new
    // false mean create new and close all open
    this.push_content     = false;

    this._closeUserMessage = true;

    this.dialog = bootbox;

    this.notify = {
      warning(message, autoclose = false) { this.showUserMessage({ type: 'warning', message, autoclose }) },
      error  (message, autoclose = false) { this.showUserMessage({ type: 'alert',   message, autoclose }) },
      info   (message, autoclose = false) { this.showUserMessage({ type: 'info',    message, autoclose }) },
      success(message)                    { this.showUserMessage({ type: 'success', message, autoclose: true }) }
    };

  }

  /**
   * used by the following plugins: "billboards"
   */
  setPushContent(bool = false) {
    this.push_content = bool;
  }

  setComponent(component) {
    ComponentsRegistry.registerComponent(component);
  }

  getComponent(id) {
    return ComponentsRegistry.getComponent(id);
  }

  getComponents() {
    return ComponentsRegistry.getComponents();
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
    $('.main-sidebar').on('webkitTransitionEnd transitionend msTransitionEnd oTransitionEnd', function (event) {
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
    ApplicationService.setDownload(false, ApplicationService.setDownload(true));

    this.setLoadingContent(false);
  }

  /** @since 3.10.0 remove _setUpTemplateDependencies method**/
  isMobile() {
    return isMobile.any;
  };

  getTemplateInfo() {
    return Vue.prototype.g3wtemplate.getInfo();
  }
  
  getFontClass(type) {
    return Vue.prototype.g3wtemplate.getFontClass(type);
  }

  /* Metodos to define */
  getResourcesUrl() {
    return ApplicationService.getConfig().resourcesurl;
  }

  /**
   * Function called from DataRouterservice for gui output
   * @param dataPromise
   * @param options
   */
  async outputDataPlace(dataPromise, options = {}) {
    // show parameter it used to set condition to show result or not
    // loading parameter is used to show result content when we are wait the response. Default true otherwise we shoe result content at the end
    const defaultOutputConfig = { condition: true, add: false, loading: true };
    const { title = '', show = defaultOutputConfig, before, after } = options;
    // convert show in an object
    const outputConfig = (toRawType(show) !== 'Object') ?
      {
        condition: show, // can be Function or Boolean otherwise is set true
        add: false,
        loading: true
      } : {
        ...defaultOutputConfig,
        ...show
      };
    const { condition, add, loading } = outputConfig;
    //check if waiting output data
    // in case we stop and substitute with new request data
    if ( this.waitingoutputdataplace ) { await this.waitingoutputdataplace.stop() }
    let queryResultsService = add ? this.getService('queryresults'): loading && this.showContentFactory('query')(title);
    this.waitingoutputdataplace = (() => {
      let stop = false;
      (async () => {
        try {
          const data = await dataPromise;
          //if set before call method and wait
          before && await before(data);
          // in case of usermessage show user message
          if (data.usermessage) {
            this.showUserMessage({
              type:      data.usermessage.type,
              message:   data.usermessage.message,
              autoclose: data.usermessage.autoclose
            });
          }
          if (!stop) {
            // check condition
            const showResult = ('Function' === toRawType(condition)) ? condition(data) : ('Boolean' === toRawType(condition)) ? condition : true;
            if (showResult) {
              (queryResultsService ? queryResultsService: this.showContentFactory('query')(title)).setQueryResponse(data, {
                add
              });
            } else {
              //@since 3.11.0.
              // Need to async nature of this.closeContent (E.x of querybypolygon double call)
              this.waitingoutputdataplace = {
                stop: async () => await promisify(this.closeContent())
              }
            }
            // call after is set with data
            if (after) { after(data) }
          }
        } catch(e) {
          console.warn(e);
          this.showUserMessage({
            type:        'alert',
            message:     errorToMessage(e),
            textMessage: true
          });
          this.closeContent();
        } finally {
          if (!stop) { this.waitingoutputdataplace = null }
        }
      })();
      return {
        stop: async () => stop = true
      }
    })();
  };

  showContentFactory(type) {
    switch (type) {
      case 'query': return this.showQueryResults.bind(this);
      case 'form': return this.showForm.bind(this);
    }
  };

  showForm(options = {}) {
    const { perc, split = 'h', push, showgoback, crumb } = options;
    const FormComponent = require('gui/form/vue/form');
    // new isnstace every time
    const formComponent = options.formComponent ? new options.formComponent(options) : new FormComponent(options);
    //get service
    const formService = formComponent.getService();
    // parameters : [content, title, push, perc, split, closable, crumb]
    this.setContent({
      perc,
      content:    formComponent,
      split,
      crumb,
      push:       !!push, //only one (if other deletes previous component)
      showgoback: !!showgoback,
      closable:   false
    });
    // return service
    return formService;
  }

  /**
   *
   * @param pop remove or not content or pop
   */
  closeForm({ pop = false } = {}) {
    this.emit('closeform', false);
    if (pop) {
      this.popContent();
    } else {
      // check if backonclose proprerty is true or false
      // to remove all content stacks or just last component
      if (ApplicationState.viewport.content.backonclose && ApplicationState.viewport.content.contentsdata.length > 1) {
        this.popContent();
      } else {
        this.closeContent();
      }
    }
    // force set modal to false
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

  async showPanel(panel, opts = {}) {
    const { stack } = ApplicationState.sidebar;
    ApplicationState.sidebar.title = panel.title;
    const data      = stack.getCurrentContentData();
    if (data) {
      $(data.content.internalPanel.$el).hide();
    } 
    return await stack.push(panel, { parent: '#g3w-sidebarpanel-placeholder', ...opts });
  }

  closePanel() {
    const { stack } = ApplicationState.sidebar;
    stack.pop().then(content => {
      content = null;
      const data = stack.getCurrentContentData();
      if (data) {
        $(data.content.internalPanel.$el).show();
        ApplicationState.sidebar.title = data.content.title;
      }
    });
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
            cbk:         opts.cbk || ((o = {}) => ApplicationService.changeProject({ host: opts.host, gid: o.gid })),
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
    ApplicationService.getConfig().user = null;
  }

  /**
   * used by the following plugins: "stress"
   */
  hideChangeMaps() {
    ApplicationService.getConfig().projects = [];
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

  closeContent() {
    this.emit('closecontent', false);
    const state = ApplicationState.viewport;
    return $promisify(async () => {
      // content is open
      if (state.content.contentsdata.length > 0) {
        this.getComponent('contents').removeContent();
        // close secondary view
        const secondaryView = this.getComponent([state.primaryView === 'map' ? 'contents' : 'map']);
        if (secondaryView.clearContents) {
          await promisify(secondaryView.clearContents());
          state.secondaryPerc = 0;
        }
        state.secondaryVisible = false;
        this._layout('close-content');
        await Vue.nextTick();
      }
      return this.getComponent('map');
    });
  }

  // remove last content from stack
  popContent() {
    const state = ApplicationState.viewport;

    // skip when ..
    if (!state.content.contentsdata.length) {
      return $promisify(Promise.reject());
    }

    const data = this.getComponent('contents').getPreviousContentData();
    const opts = data.options;

    Object.assign(state.content, {
      title:        opts.title,
      split:        undefined !== opts.split       ? opts.split       : null,
      closable:     undefined !== opts.closable    ? opts.closable    : true,
      backonclose:  undefined !== opts.backonclose ? opts.backonclose : true,
      contentsdata: this.getComponent('contents').contentsdata,
      style:        undefined !== opts.style       ? opts.style       : {},
      headertools:  undefined !== opts.headertools ? opts.headertools : [],
      showgoback:   undefined !== opts.showgoback  ? opts.showgoback  : true,
    });

    state.immediate_layout = false;

    this._showView('content', data.options);

    // content exists on compontent Stack
    return $promisify(async () => {
      await promisify(this.getComponent('contents').popContent());
      state.secondaryPerc    = data.options.perc;
      state.immediate_layout = true;
      this._layout('pop-content');
      return this.getComponent('contents').getCurrentContentData;
    });
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
    const secondaryView = this.getComponent([state.primaryView === 'map' ? 'contents' : 'map']);

    if (secondaryView.clearContents) {
      await promisify(secondaryView.clearContents());
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
      this.getComponent('map')     .layout(ApplicationState.viewport.map    .sizes.width - reducedWidth, ApplicationState.viewport.map    .sizes.height - reducedHeight);
      this.getComponent('contents').layout(ApplicationState.viewport.content.sizes.width - reducedWidth, ApplicationState.viewport.content.sizes.height - reducedHeight);

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
    if (ApplicationState.viewport.immediate_layout) {
      this._layoutComponents(event);
    }
  }

});