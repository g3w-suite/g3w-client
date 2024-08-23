import G3WObject            from 'core/g3w-object';
import Component            from 'core/g3w-component';

import ApplicationState     from 'store/application-state';
import ComponentsRegistry   from 'store/components';
import ProjectsRegistry     from 'store/projects';

import ApplicationService   from 'services/application';

import { noop }             from 'utils/noop';
import { getUniqueDomId }   from 'utils/getUniqueDomId';
import { setViewSizes }     from 'utils/setViewSizes';
import { toRawType }        from 'utils/toRawType';

/**
 * ORIGINAL SOURCE: src/services/viewport.js@v3.10.2
 */
function getReducedSizes() {
  const contentEl = $('.content');
  let reducedWidth  = 0;
  let reducedHeight = 0;
  const sideBarToggleEl = $('.sidebar-aside-toggle');
  const is_fullview = ApplicationState.gui.layout[ApplicationState.gui.layout.__current].rightpanel[`${ApplicationState.viewport.split === 'h'? 'width' : 'height'}_100`];
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
 * ORIGINAL SOURCE: src/components/g3w-projectsmenu.js@v3.10.2
 */
function ProjectsMenuComponent(opts={}) {
  return new Component({
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
  });
}

// API della GUI.
// methods have been defined by application
// app should call GUI.ready() when GUI is ready
export default new (class GUI extends G3WObject {

  constructor(opts) {
    super(opts);

    this.setters = {
      setContent(opts = {}) {
        this.emit('opencontent', true);
        this._setContent(opts)
      }
    };

    this.isready          = false;

    this.hideQueryResults = noop;

    this.hidePanel        = noop;

    //property to how a result has to be adding or close all and show new
    // false mean create new and close all open
    this.push_content     = false;

    this._closeUserMessageBeforeSetContent = true;

    this.dialog = bootbox;

    this.notify = {
      warning(message, autoclose=false){
        this.showUserMessage({
          type: 'warning',
          message,
          autoclose
        })
      },
      error(message, autoclose=false){
        this.showUserMessage({
          type: 'alert',
          message,
          autoclose
        })
      },
      info(message, autoclose=false){
        this.showUserMessage(({
          type: 'info',
          message,
          autoclose
        }))
      },
      success(message){
        this.showUserMessage({
          type: 'success',
          message,
          autoclose: true
        })
      }
    };

  }

  setPushContent(bool = false) {
    this.push_content = bool;
  }

  getPushContent() {
    return this.push_content;
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
    this.on('guiresized',() => triggerResize());
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

  guiResized() {
    this.emit('guiresized');
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

  showSpinner(opts ={}) {}

  hideSpinner(id) {}

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
  // method that returns Template Info
  getTemplateInfo() {
    return Vue.prototype.g3wtemplate.getInfo();
  }

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

  // TABLE
  showTable() {}

  closeTable() {}

  /**
   * Function called from DataRouterservice for gui output
   * @param dataPromise
   * @param options
   */
  async outputDataPlace(dataPromise, options = {}) {
    // show parameter it used to set condition to show result or not
    // loading parameter is used to show result content when we are wait the response. Default true otherwise we shoe result content at the end
    const defaultOutputConfig = { condition:true, add:false, loading:true };
    const { title='', show=defaultOutputConfig, before, after } = options;
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
    const {condition, add, loading} = outputConfig;
    //check if waiting output data
    // in case we stop and substiute with new request data
    if (this.waitingoutputdataplace) { await this.waitingoutputdataplace.stop() }
    let queryResultsService = add ? this.getService('queryresults'): loading && this.showContentFactory('query')(title);
    this.waitingoutputdataplace = (() => {
      let stop = false;
      (async () =>{
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
            const showResult = (toRawType(condition) === 'Function') ? condition(data) : (toRawType(condition) === 'Boolean') ? condition : true;
            if (showResult) {
              (queryResultsService ? queryResultsService: this.showContentFactory('query')(title)).setQueryResponse(data, {
                add
              });
            }
            else  {
              this.closeContent();
            }
            // call after is set with data
            if (after) { after(data) }
          }
        } catch(e) {
          this.showUserMessage({
            type:        'alert',
            message:     this.errorToMessage(e),
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
    };
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

  closeOpenSideBarComponent() {
    ApplicationState.sidebar.components.forEach(c => c.getOpen() && c.state.closewhenshowviewportcontent && c.collapsible && c.click({ open: false }));
  };

  // show results info/search
  showQueryResults(title, results) {
    const queryResultsComponent = this.getComponent('queryresults');
    const queryResultService    = queryResultsComponent.getService();
    queryResultService.reset();
    if (results) {
      queryResultService.setQueryResponse(results);
    }
    this.showContextualContent({
      content:    queryResultsComponent,
      title:      "info.title",
      crumb:      { title: "info.title", trigger: null },
      push:       this.getPushContent(),
      post_title: title
    });

    return queryResultService;
  }

  addNavbarItem(item) {
    ApplicationState.navbaritems.push(item);
  }

  removeNavBarItem() {}

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

  disableApplication(bool = false) {
    ApplicationService.disableApplication(bool);
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

  /* spinner */
  showSpinner(options = {}) {
    const container   = options.container || 'body';
    const id          = options.id || 'loadspinner';
    const where       = options.where || 'prepend'; // append | prepend
    const style       = options.style || '';
    const transparent = options.transparent ? 'background-color: transparent' : '';
    const center      = options.center ? 'margin: auto' : '';
    if (!$(`#${id}`).length) {
      $(container)[where].call($(container),`<div id="${id}" class="spinner-wrapper ${style}" style="${transparent}"><div class="spinner ${style}" style="${center}"></div></div>`);
    }
  }

  //hide spinner
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

  showContextualContent(options = {}) {
    options.perc = isMobile.any ? 100 : options.perc;
    this.setContent(options);
    return true;
  };

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

  // add content to stack
  pushContextualContent(options={}) {
    options.perc = isMobile.any ? 100 : options.perc;
    this.pushContent(options);
  }

  //return number of a component of stack
  getContentLength() {
    return ApplicationState.viewport.content.contentsdata.length;
  }

  getCurrentContentTitle() {
    const currentContent = ApplicationState.viewport.content.contentsdata.at(-1) || null;
    return currentContent && currentContent.options.title;
  }

  getCurrentContentId() {
    const currentContent = ApplicationState.viewport.content.contentsdata.at(-1) || null;
    return currentContent && currentContent.options.id;
  }

  /**
   * change current content title
   * @param title
   */
  changeCurrentContentTitle(title = '') {
    const currentContent = ApplicationState.viewport.content.contentsdata.at(-1) || null;
    if (currentContent) {
      currentContent.options.title = title;
    }
  }

  /**
   * change current content options
   * @param options: {title, crumb}
   */
  changeCurrentContentOptions(options={}) {
    const currentContent = ApplicationState.viewport.content.contentsdata.at(-1) || null;
    if (currentContent && options.title) {
      currentContent.options.title = options.title;
    }
    if (currentContent && options.crumb) {
      currentContent.options.crumb = options.crumb;
    }
  }

  getCurrentContent() {
    return ApplicationState.viewport.content.contentsdata.at(-1) || null;
  }

  getProjectMenuDOM({ projects = [], host, cbk } = {}) {
    const projectVueMenuComponent = new ProjectsMenuComponent({
      projects: projects && Array.isArray(projects) && projects,
      cbk,
      host
    }).getInternalComponent();
    return projectVueMenuComponent.$mount().$el;
  }

  setCloseUserMessageBeforeSetContent(bool = true) {
    this._closeUserMessageBeforeSetContent = bool;
  }

  hideClientMenu() {
    ApplicationService.getConfig().user = null;
  }

  hideChangeMaps() {
    ApplicationService.getConfig().projects = [];
  }

  setLoadingContent(loading = false) {
    ApplicationState.viewport.content.loading = loading;
    return loading && new Promise((resolve) => setTimeout(resolve, 200))
  }

  openProjectsMenu() {
    if (this.getComponent('contents').getComponentById('projectsmenu')) {
      this.closeContent();
      return;
    }
    if (isMobile.any) {
      this.hideSidebar();
      $('#main-navbar.navbar-collapse').removeClass('in');
    }
    this.closeOpenSideBarComponent();
    this.setContent({
      content: new ProjectsMenuComponent(),
      title:   '',
      perc:    100
    });
  }

  toggleFullViewContent() {
    const state = ApplicationState.viewport;
    ApplicationState.gui.layout[ApplicationState.gui.layout.__current]
    .rightpanel[`${state.split === 'h' ? 'width' : 'height'}_100`] = !ApplicationState.gui.layout[ApplicationState.gui.layout.__current]
    .rightpanel[`${state.split === 'h' ? 'width' : 'height'}_100`];
    this._layoutComponents();
  }

  resetToDefaultContentPercentage() {
    const state = ApplicationState.viewport;
    const currentRightPanel = ApplicationState.gui.layout[ApplicationState.gui.layout.__current].rightpanel;
    currentRightPanel[`${state.split === 'h' ? 'width' : 'height'}`] = currentRightPanel[`${state.split === 'h' ? 'width' : 'height'}_default`];
    currentRightPanel[`${state.split === 'h' ? 'width' : 'height'}_100`] = false;
    this._layoutComponents();
  }

  /**
   * Convert error to user message showed
   * @param error
   * @returns {string}
   */
  errorToMessage(error){
    let message = 'server_error';
    switch (toRawType(error)) {
      case 'Error':
        message = `CLIENT - ${error.message}`;
        break;
      case 'Object':
        if (error.responseJSON) {
          error = error.responseJSON;
          if (error.result === false) {
            const { code='', data='', message:msg='' } = error.error;
            message = `${code.toUpperCase()} ${data} ${msg}`;
          }
        } else if (error.responseText) {
          message = error.responseText;
        }
        break;
      case 'Array':
        message = error.map(error => this.errorToMessage(error)).join(' ');
        break;
      case 'String':
      default:
        message = error;
    }
    return message;
  }

  // hide content
  hideContent(bool, perc) {
    const content_perc = ApplicationState.gui.layout[ApplicationState.gui.layout.__current].rightpanel['h' === ApplicationState.viewport.split.state.split ? 'width': 'height'];
    ApplicationState.viewport.secondaryVisible = !bool;
    this._layout('hide-content');
    // return previous percentage
    return content_perc;
  }

  closeContent() {
    this.emit('closecontent', false);
    const state = ApplicationState.viewport;
    const d = $.Deferred();
    // content is open
    if (state.content.contentsdata.length > 0) {
      state.components.content.removeContent();
      // close secondary view( return a promise)
      this._closeSecondaryView('close-content').then(() => d.resolve(this.getComponent('map')));
    } else {
      d.resolve(this.getComponent('map'));
    }
    return d.promise()
  }

  // VIEWPORT //
  setPrimaryView(viewName) {
    const state = ApplicationState.viewport;
    if (viewName !== state.primaryView ) {
      state.primaryView = viewName;
    }
    this._layout();
  }

  // only map
  showMap() {
    const state = ApplicationState.viewport;
    state.components.map.internalComponent.$el.style.display = 'block';
    this._showView('map');
  }

  // remove last content from stack
  popContent() {
    const state = ApplicationState.viewport;
    const d = $.Deferred();
    // check if content exists compontent Stack
    if (state.content.contentsdata.length) {
      const data = state.components.content.getPreviousContentData();
      const opts = data.options;
      Object.assign(state.content, {
        title:        opts.title,
        split:        undefined !== opts.split       ? opts.split : null,
        closable:     undefined !== opts.closable    ? opts.closable : true,
        backonclose:  undefined !== opts.backonclose ? opts.backonclose : true,
        contentsdata: state.components.content.contentsdata,
        style:        undefined !== opts.style ? opts.style : {},
        headertools:  undefined !== opts.headertools ? opts.headertools : [],
        showgoback:   undefined !== opts.showgoback ? opts.showgoback : true,
      });
      state.immediate_layout = false;
      this._showView('content', data.options);
      state.components.content.popContent()
        .then(() => {
          state.secondaryPerc        = data.options.perc;
          state.immediate_layout = true;
          this._layout('pop-content');
          d.resolve(state.components.contentgetCurrentContentData)
        })
    } else {
      d.reject();
    }
    return d.promise();
  }

  _setContent(options={}) {
    if (this._closeUserMessageBeforeSetContent) { this.closeUserMessage() }
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
    const evenContentName = opts.perc === 100 ? 'show-content-full' : 'show-content';
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
    this.getComponent('contents').content.setContent(opts).then(() => {
      ApplicationState.viewport.immediate_layout = true;
      this._layoutComponents(evenContentName);
    });
  }

  isSidebarVisible(){
    return !$('body').hasClass('sidebar-collapse');
  }

  setModal(bool=false, message) {
    const mapService = this.getService('map');
    if (bool) { mapService.startDrawGreyCover(message) }
    else { mapService.stopDrawGreyCover() }
  }

  showSidebar() {
    $('body').addClass('sidebar-open');
    $('body').removeClass('sidebar-collapse')
  }

  hideSidebar() {
    $('body').removeClass('sidebar-open');
    $('body').addClass('sidebar-collapse')
  }

  getSize ({ element, what }) {
    if (element && what) {
      return ApplicationState.sizes[element][what];
    }
  }

  // close secondary view
  _closeSecondaryView(event = null) {
    const state = ApplicationState.viewport;
    const d = $.Deferred();
    const secondaryViewComponent = state.components[state.primaryView === 'map' ? 'content' : 'map'];
    if (secondaryViewComponent.clearContents) {
      secondaryViewComponent.clearContents().then(() => {
        state.secondaryVisible = false;
        state.secondaryPerc = 0;
        this._layout(event);
        Vue.nextTick(() => d.resolve());
      });
    } else {
      state.secondaryVisible = false;
      this._layout(event);
      Vue.nextTick(() => d.resolve());
    }
    return d.promise();
  }

  // manage all layout logic
  // viewName: map or content
  //options.  percentage , splitting title etc ..
  _showView(viewName, options = {}) {
    const state = ApplicationState.viewport;
    const { perc = viewName == state.primaryView ? 100 : 50, split = 'h' } = options;
    let aside;
    if (viewName == state.primaryView) {
      aside = (typeof(options.aside) == 'undefined') ? false : options.aside;
    } else {
      aside = true;
    }
    state[viewName].aside = aside;
    //calculate the content
    const secondaryPerc = viewName == state.primaryView ? 100 - perc : perc;
    //show Secondary View content only if more than 0
    if (secondaryPerc > 0)  {
      state.secondaryVisible = true;
      state.split = undefined !== split ? split : state.split;
      state.secondaryPerc = undefined !== perc ? perc : state.perc;
      this._layout();
    } else {
      return this._closeSecondaryView();
    }
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
      this.getComponent('map').layout(ApplicationState.viewport.map.sizes.width - reducedWidth, ApplicationState.viewport.map.sizes.height - reducedHeight);
      this.getComponent('contents').layout(ApplicationState.viewport.content.sizes.width - reducedWidth, ApplicationState.viewport.content.sizes.height - reducedHeight);

      if (event) {
        setTimeout(() => { /*this.emit(event);*/ GUI.emit(event); })
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





