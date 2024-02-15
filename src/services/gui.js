import ApplicationState                 from 'store/application-state';
import ApplicationService               from 'services/application';
import RouterService                    from 'services/router';
import ComponentsRegistry               from 'store/components';
import G3WObject                        from 'core/g3wobject';

const { noop, toRawType }                = require('utils');

const ProjectsMenuComponent              = require('gui/projectsmenu/projectsmenu');
const ChangeMapMenuComponent             = require('gui/changemapmenu/changemapmenu');
const FormComponent                      = require('gui/form/vue/form');

const ContentsComponent                  = require('gui/viewport/contentsviewer');
const CatalogComponent                   = require('gui/catalog/vue/catalog');
const SearchComponent                    = require('gui/search/vue/search');
const QueryBuilderUIFactory              = require('gui/querybuilder/querybuilderuifactory');
const PrintComponent                     = require('gui/print/vue/print');
const MetadataComponent                  = require('gui/metadata/vue/metadata');
const ToolsComponent                     = require('gui/tools/vue/tools');
const WMSComponent                       = require('gui/wms/vue/wms');
const MapComponent                       = require('gui/map/vue/map');
const QueryResultsComponent              = require('gui/queryresults/vue/queryresults');
const SpatialBookMarksComponent          = require('gui/spatialbookmarks/vue/spatialbookmarks');

console.assert(undefined !== ApplicationService,        'ApplicationService is undefined');

console.assert(undefined !== ProjectsMenuComponent,     'ProjectsMenuComponent is undefined');
console.assert(undefined !== ChangeMapMenuComponent,    'ChangeMapMenuComponent is undefined');
console.assert(undefined !== FormComponent,             'FormComponent is undefined');

console.assert(undefined !== ContentsComponent,         'ContentsComponent is undefined');
console.assert(undefined !== CatalogComponent,          'CatalogComponent is undefined');
console.assert(undefined !== SearchComponent,           'SearchComponent is undefined');
console.assert(undefined !== QueryBuilderUIFactory,     'QueryBuilderUIFactory is undefined');
console.assert(undefined !== PrintComponent,            'PrintComponent is undefined');
console.assert(undefined !== MetadataComponent,         'MetadataComponent is undefined');
console.assert(undefined !== ToolsComponent,            'ToolsComponent is undefined');
console.assert(undefined !== WMSComponent,              'WMSComponent is undefined');
console.assert(undefined !== MapComponent,              'MapComponent is undefined');
console.assert(undefined !== QueryResultsComponent,     'QueryResultsComponent is undefined');
console.assert(undefined !== SpatialBookMarksComponent, 'SpatialBookMarksComponent is undefined');

// Placeholder knowed by application
const PLACEHOLDERS = [
  'navbar',
  'sidebar',
  'viewport',
  'floatbar'
];


/**
 * GUI's API.
 * 
 * some methods are defined by the application,
 * app should call `GUI.ready()` when GUI is ready
 */
class GUI extends G3WObject {

  constructor() {

    super();

     const self = this;

    /**
     * common services known by application
     */ 
    this.Services = {
      navbar: null,
      sidebar: null,
      viewport: null,
      floatbar: null
    };

    this.isready = false;

    // show a Vue form
    this.showListing      = noop;
    this.closeListing     = noop;
    this.hideListing      = noop;

    // modal
    this.hideQueryResults = noop;
    this.hidePanel        = noop;

    // TABLE
    this.showTable        = noop;
    this.closeTable       = noop;

    this.removeNavBarItem = noop;

    /**
     * usefull to show onaly last waiting request output
     * at moment will be an object
     * {
     * stop: method to sot to show result
     * }
     */
    this.waitingoutputdataplace = null;

    // ussefult ot not close user message when set content is called
    this.sizes = {
      sidebar: {
        width:0
      }
    };

    /**
     * How new content has to be add
     * 
     * false = create new and close all open
     */
    this.push_content = false;

    this._closeUserMessageBeforeSetContent = true;

    this.notify = {

      warning(message, autoclose=false) {
        self.showUserMessage({
          type: 'warning',
          message,
          autoclose
        })
      },
  
      error(message, autoclose=false) {
        self.showUserMessage({
          type: 'alert',
          message,
          autoclose
        })
      },
  
      info(message, autoclose=false) {
        self.showUserMessage(({
          type: 'info',
          message,
          autoclose
        }))
      },
  
      success(message) {
        self.showUserMessage({
          type: 'success',
          message,
          autoclose: true
        })
      },
  
    };

    /**
     * @TODO double check which of these bindings are strictly necessary
     */
    this.outputDataPlace                     = this.outputDataPlace.bind(this); 
    this.showContentFactory                  = this.showContentFactory.bind(this);
    this.showForm                            = this.showForm.bind(this);
    this.disablePanel                        = this.disablePanel.bind(this);
    this.showQueryResults                    = this.showQueryResults.bind(this);
    this.showModalDialog                     = this.showModalDialog.bind(this);
    this.setCloseUserMessageBeforeSetContent = this.setCloseUserMessageBeforeSetContent.bind(this);
    this.showContent                         = this.showContent.bind(this);
    this.showContextualContent               = this.showContextualContent.bind(this);
    this.pushContent                         = this.pushContent.bind(this);
    this.pushContextualContent               = this.pushContextualContent.bind(this);
    this.setModal                            = this.setModal.bind(this);
    this._addComponents                      = this._addComponents.bind(this);
    this.addComponent                        = this.addComponent.bind(this);
    this.removeComponent                     = this.removeComponent.bind(this);
    this.getSize                             = this.getSize.bind(this);
    this.closeOpenSideBarComponent           = this.closeOpenSideBarComponent.bind(this);
    this.reloadComponents                    = this.reloadComponents.bind(this);
    this.setLoadingContent                   = this.setLoadingContent.bind(this);
    this.openProjectsMenu                    = this.openProjectsMenu.bind(this);
    this.openChangeMapMenu                   = this.openChangeMapMenu.bind(this);

    this.setters = {
      setContent(options={}) {
        this.emit('opencontent', true);
        this._setContent(options)
      },
    };

  }

  setPushContent(bool=false) {
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

  goto(url) {
    RouterService.goto(url);
  }

  ready() {
    this.emit('ready');
    this.isready = true;
  }

  guiResized() {
    this.emit('guiresized');
  }

  /**
   * Wait until GUI is ready 
   */
  isReady() {
    return new Promise(resolve => this.isready ? resolve() : this.once('ready', resolve));
  }

  /**
   * Passing a component application ui id return service that belong to component
   * 
   * @param componentId
   * @returns {*}
   */
  getService(componentId) {
    const component = this.getComponent(componentId);
    if (component) {
      return component.getService();
    }
  }

  disableElement({element, disable}) {
    disable && $(element).addClass('g3w-disabled') || $(element).removeClass('g3w-disabled');
  }

  /**
   * Convert error to user message showed
   * 
   * @param error
   * 
   * @returns {string}
   */
  errorToMessage(error) {
    let message = 'server_error';
    switch (toRawType(error)) {
      case 'Error':
        message = `CLIENT - ${error.message}`;
        break;
      case 'Object':
        if (error.responseJSON) {
          error = error.responseJSON;
          if (error.result === false) {
            const {code='', data='', message:msg=''} = error.error;
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

  //Function called from DataRouterservice for gui output

  /**
   * @param data
   * @param options
   */
  async outputDataPlace(dataPromise, options={}) {

    // show parameter it used to set condition to show result or not
    // loading parameter is used to show result content when we are wait the response. Default true otherwise we shoe result content at the end
    const default_output = {
      condition: true,
      add:       false,
      loading:   true
    };

    const {
      title = '',
      show  = default_output,
      before,
      after
    } = options;

    // extract output config
    const {
      condition,
      add,
      loading
    } = ('Object' !== toRawType(show)) ?
    {
      condition: show, // can be Function or Boolean otherwise is set true
      add: false,
      loading: true
    } : {
      ...default_output,
      ...show
    };

    //check if waiting output data
    // in case we stop and substiute with new request data
    if (this.waitingoutputdataplace) {
      await this.waitingoutputdataplace.stop();
    }
    
    let queryResultsService = add
      ? this.getService('queryresults')
      : loading && this.showContentFactory('query')(title);

      this.waitingoutputdataplace = (() => {
      let stop = false;
      (async () => {
        try {
          const data = await dataPromise;
          // if set before call method and wait
          if (before) {
            await before(data);
          }
          
          // in case of usermessage show user message
          if (data.usermessage) {
            this.showUserMessage({
              type:      data.usermessage.type,
              message:   data.usermessage.message,
              autoclose: data.usermessage.autoclose
            });
          }

          if (!stop) {
            const showResult = ('Function' === toRawType(condition))
              ? condition(data)
              : ('Boolean' === toRawType(condition))
                ? condition
                : true;
            if (showResult) {
              (
                queryResultsService
                  ? queryResultsService
                  : this.showContentFactory('query')(title)).setQueryResponse(data, { add }
              );
            } else {
              this.closeContent();
            }
            // call after is set with data
            if (after) {
              after(data);
            }
          }
        } catch(error) {
          this.showUserMessage({
            type:        'alert',
            message:     this.errorToMessage(error),
            textMessage: true,
          });
          this.closeContent();
        } finally {
          if (!stop) {
            this.waitingoutputdataplace = null;
          }
        }
      })();
      return {
        stop: async () => { stop = true; }
      };
    })();

  }

  /**
   * panel content
   */
  showContentFactory(type) {
    switch (type) {
      case 'query': return this.showQueryResults; 
      case 'form':  return this.showForm;
    }
  }

  showForm(options={}) {
    const {
      perc,
      split = 'h',
      push,
      showgoback,
      crumb
    } = options;
    // new instance every time
    const formComponent = options.formComponent ? new options.formComponent(options) : new FormComponent(options);
    //get service
    const formService = formComponent.getService();
    // parameters : [content, title, push, perc, split, closable, crumb]
    this.setContent({
      perc,
      content: formComponent,
      split,
      crumb,
      push: !!push, //only one( if other delete previous component)
      showgoback: !!showgoback,
      closable: false
    });
    // return service
    return formService;
  }

  disablePanel(disable=false) {
    this.disableElement({ disable, element: "#g3w-sidebarpanel-placeholder" });
  }

  // show results info/search
  showQueryResults(title, results) {
    const queryResultsComponent = this.getComponent('queryresults');
    const queryResultService = queryResultsComponent.getService();
    queryResultService.reset();
    if (results) {
      queryResultService.setQueryResponse(results);
    } 
    this.showContextualContent({
      content: queryResultsComponent,
      title: "info.title",
      crumb: {
        title: "info.title",
        trigger: null
      },
      push: this.getPushContent(),
      post_title: title
    });
    return queryResultService;
  }

  showModalDialog(options={}) {
    console.assert(undefined !== this.dialog, 'dialog is undefined');
    return this.dialog.dialog(options);
  }

  /**
   * @param opts.id
   * @param opts.container
   * @param opts.where
   * @param opts.style
   * @param opts.transparent
   * @param opts.center
   */
  showSpinner(opts={}) {
    if ($("#" + opts.id).length) {
      return;
    }
    $(opts.container || 'body')[opts.where || 'prepend']
      .call(
        $(opts.container || 'body'),
        `<div
            id="${opts.id || 'loadspinner'}"
            class="spinner-wrapper ${opts.style || ''}"
            style="${opts.transparent ? 'background-color: transparent' : ''}"
          >
            <div
              class="spinner ${opts.style || ''}"
              style="${opts.center ? 'margin: auto' : ''}"
            ></div>
          </div>`
      );
  }

  hideSpinner(id='loadspinner') {
    $("#" + id).remove();
  }

  /**
   * Toggle full screen modal 
   */
  showFullModal({ element = "#full-screen-modal", show = true } = {}) {
    $(element).modal(show ? 'show' : 'hide')
  };

  setCloseUserMessageBeforeSetContent(bool = true) {
    this._closeUserMessageBeforeSetContent = bool;
  }

  // return specific classes
  getTemplateClasses() {
    console.assert(undefined !== BootstrapVersionClasses, 'BootstrapVersionClasses is undefined');
    return BootstrapVersionClasses
  }

  getTemplateClass({element, type}) {
    console.assert(undefined !== BootstrapVersionClasses, 'BootstrapVersionClasses is undefined');
    return BootstrapVersionClasses[element][type];
  };

  // useful to build a difference layout/component based on mobile or not
  isMobile() {
    console.assert(undefined !== isMobile, 'isMobile is undefined');
    return isMobile.any;
  }

  // (100%) content
  showContent(options={}) {
    this.setLoadingContent(false);
    options.perc = this.isMobile() ? 100 : options.perc;
    this.setContent(options);
    return true;
  }

  showContextualContent(options = {}) {
    options.perc = this.isMobile() ? 100 : options.perc;
    this.setContent(options);
    return true;
  }

  /**
   * Append component to stack
   * 
   * Differences between pushContent and setContent are:
   * - push every component is added, set is refreshed
   * - pushContent has a new parameter (backonclose) when is clicked x
   * - the contentComponet is close all stack is closed
   */
  pushContent(options = {}) {
    options.perc = this.isMobile() ? 100 : options.perc;
    options.push = true;
    this.setContent(options);
  }

  /**
   * add content to stack
   */
  pushContextualContent(options = {}) {
    options.perc = this.isMobile() ? 100 : options.perc;
    this.pushContent(options);
  }

  // MODAL
  setModal(bool = false, message) {
    const mapService = this.getService('map');
    if (bool) mapService.startDrawGreyCover(message);
    else      mapService.stopDrawGreyCover();
  }

  // SIDEBAR
  showSidebar() {
    $('body').addClass('sidebar-open');
    $('body').removeClass('sidebar-collapse')
  }

  hideSidebar() {
    $('body').removeClass('sidebar-open');
    $('body').addClass('sidebar-collapse')
  }

  isSidebarVisible() {
    return !$('body').hasClass('sidebar-collapse');
  }

  getProjectMenuDOM({projects, host, cbk}={}) {
    const projectVueMenuComponent = new ProjectsMenuComponent({
      projects: projects && Array.isArray(projects) && projects,
      cbk,
      host
    }).getInternalComponent();
    return projectVueMenuComponent.$mount().$el;
  }

  // registry component
  _addComponents(components, placeholder, options) {
    let register = true;
    if (
      placeholder &&
      PLACEHOLDERS.indexOf(placeholder) > -1 &&
      this.Services[placeholder]
    ) {
      register = this.Services[placeholder].addComponents(components, options);
    }

    Object
      .entries(components)
      .forEach(([ key, component ]) => {
        if (register) {
          ComponentsRegistry.registerComponent(component);
          ApplicationService.registerService(component.id, component.getService())
        }
      });
  }

  /**
   * add component to template
   */
  addComponent(component, placeholder, options={}) {
    this._addComponents([component], placeholder, options);
    return true;
  }

  removeComponent(id, placeholder, options) {
    const component = ComponentsRegistry.unregisterComponent(id);
    if (placeholder && this.Services[placeholder]) {
      this.Services[placeholder].removeComponent(component, options);
    }
  }

  getSize({element, what}) {
    if (element && what) {
      return this.sizes[element][what];
    }
  }

  closeOpenSideBarComponent() {
    this.Services.sidebar.closeOpenComponents();
  }

  // RELOAD COMPONENTS
  reloadComponents() {
    this.Services.sidebar.reloadComponents();
  }

  setLoadingContent(loading = false) {
    this.Services.viewport.setLoadingContent(loading);
    if (loading) {
      return new Promise((resolve)=> { setTimeout(resolve, 200) });
    }
  }

  openProjectsMenu() {
    const isProjectMenuComponent = this.getComponent('contents').getComponentById('projectsmenu');
    if (isProjectMenuComponent) {
      this.closeContent();
      return;
    }
    if (this.isMobile()) {
      this.hideSidebar();
      $('#main-navbar.navbar-collapse').removeClass('in');
    }
    this.Services.sidebar.closeOpenComponents();
    this.setContent({
      content: new ProjectsMenuComponent(),
      title: '',
      perc: 100
    });
  }

  /**
   * @since 3.8.0
   */
  openChangeMapMenu() {
    const isChangeMapMenuComponent = this.getComponent('contents').getComponentById('changemapmenu');
    if (isChangeMapMenuComponent) {
      this.closeContent();
      return;
    }
    if (this.isMobile()) {
      this.hideSidebar();
      $('#main-navbar.navbar-collapse').removeClass('in');
    }
    this.Services.sidebar.closeOpenComponents();
    this.setContent({
      content: new ChangeMapMenuComponent(),
      title: '',
      perc: 100
    });
  }

  /**
   * images urls
   */
  getResourcesUrl() {
    return ApplicationService.getConfig().resourcesurl;
  }

  disableApplication(bool=false) {
    ApplicationService.disableApplication(bool);
  }

  hideClientMenu() {
    ApplicationService.getConfig().user = null;
  }

  hideChangeMaps() {
    ApplicationService.getConfig().projects = [];
  }

  disableSideBar(bool=true) {
    ApplicationState.gui.sidebar.disabled = bool;
  };

  init({
    floatbar,
    viewport,
    navbar,
    sidebar,
  }) {

    const self = this;

    /**
     * Loading spinner
     * 
     * @requires components/App.vue
     */
    this.layout                          = $.LayoutManager;

    // proxy  bootbox library
    this.dialog                          = bootbox;

    this.Services.viewport               = viewport;
    this.Services.sidebar                = sidebar;

    this.disableContent                  = viewport.disableContent.bind(viewport);
    this.hideContent                     = viewport.hideContent.bind(viewport);
    this.showUserMessage                 = viewport.showUserMessage.bind(viewport);
    this.closeUserMessage                = viewport.closeUserMessage.bind(viewport);
    this.setPrimaryView                  = viewport.setPrimaryView.bind(viewport);
    this.showMap                         = viewport.showMap.bind(viewport);
    this.setContextualMapComponent       = viewport.setContextualMapComponent.bind(viewport);
    this.resetContextualMapComponent     = viewport.resetContextualMapComponent.bind(viewport);
    this.popContent                      = viewport.popContent.bind(viewport);
    this.getContentLength                = viewport.contentLength.bind(viewport);
    this.getCurrentContentTitle          = viewport.getCurrentContentTitle.bind(viewport);
    this.getCurrentContentId             = viewport.getCurrentContentId.bind(viewport);
    this.changeCurrentContentTitle       = viewport.changeCurrentContentTitle.bind(viewport);
    this.changeCurrentContentOptions     = viewport.changeCurrentContentOptions.bind(viewport);
    this.getCurrentContent               = viewport.getCurrentContent.bind(viewport);
    this.toggleFullViewContent           = viewport.toggleFullViewContent.bind(viewport);
    this.resetToDefaultContentPercentage = viewport.resetToDefaultContentPercentage.bind(viewport);

    this.showPanel                       = sidebar.showPanel.bind(sidebar);
    this.closePanel                      = sidebar.closePanel.bind(sidebar);

    this.showList                        = floatbar.showPanel.bind(floatbar);
    this.closeList                       = floatbar.closePanel.bind(floatbar);
    this.hideList                        = floatbar.hidePanel.bind(floatbar);
    this.showFloatbar                    = floatbar.open.bind(floatbar);
    this.hideFloatbar                    = floatbar.close.bind(floatbar);

    this.addNavbarItem                   = navbar.addItem.bind(navbar);

    /**
     * @param pop whether to remove content or pop
     */
    this.closeForm = function({ pop = false } = {}) {
      self.emit('closeform', false);
      if (pop) {
        self.popContent();
      } else {
        viewport.removeContent();
      }
      // force set modal to false
      self.setModal(false);
    };


    this.closeContent = function() {
      self.emit('closecontent', false);
      return viewport.closeContent();
    };


    this.showContextualMap = function(perc=30, split) {
      viewport.showContextualMap({ perc, split });
    };

    this._setContent = function(options={}) {
      if(self._closeUserMessageBeforeSetContent) {
        self.closeUserMessage();
      }
      options.content     = options.content || null;
      options.title       = options.title || "";
      options.push        = _.isBoolean(options.push) ? options.push : false;
      options.perc        = self.isMobile() ? 100 : options.perc;
      options.split       = options.split || 'h';
      options.backonclose = _.isBoolean(options.backonclose) ? options.backonclose : false;
      options.showtitle   = _.isBoolean(options.showtitle) ? options.showtitle : true;
      viewport.showContent(options);
    };

    // setup layout
    if (!self.isMobile()) {
      $("<style type='text/css'> .ol-control-tl { top: 7px; left:43px; } </style>").appendTo("head");
    }

    // register services
    Object
    .keys(this.Services)
    .forEach(element => {
      ApplicationService.registerService(element, this.Services[element]);
    });

    Object
      .values(this.getComponents())
      .forEach(component => {
        ApplicationService.registerService(component.id, component.getService());
      });

    viewport.on('resize', () => this.emit('resize'));

  };

  setup_deps({ floatbar, VueApp }) {

    // build template
    floatbar.init(this.layout);

    Object
      .entries({
        navbar:   {
            components: [],
        },
        sidebar:  {
          components: [
            new MetadataComponent({
              id:          'metadata',
              open:        false,
              collapsible: false,
              icon:        Vue.prototype.g3wtemplate.getFontClass('file'),
              mobile:      true,
            }),
            new SpatialBookMarksComponent({
              id:          'spatialbookmarks',
              open:        false,
              collapsible: true,
              icon:        Vue.prototype.g3wtemplate.getFontClass('bookmark'),
              mobile:      true,
            }),
            new PrintComponent({
              id:          'print',
              open:        false,
              collapsible: true, // manage click event if can run setOpen component method
              icon:        Vue.prototype.g3wtemplate.getFontClass('print'),
              mobile:      false,
            }),
            new SearchComponent({
              id:          'search',
              open:        false,
              collapsible: true,
              icon:        Vue.prototype.g3wtemplate.getFontClass('search'),
              actions: [{
                id:        "querybuilder",
                class:     `${Vue.prototype.g3wtemplate.getFontClass('calculator')} sidebar-button sidebar-button-icon`,
                tooltip:   'Query Builder',
                fnc:       () => {
                  this.closeContent();
                  this.Services.sidebar.closeOpenComponents();
                  QueryBuilderUIFactory.show({ type: 'sidebar' }); // sidebar or modal
                },
                style: {
                  color:        '#8DC3E3',
                  padding:      '6px',
                  fontSize:     '1.2em',
                  borderRadius: '3px',
                  marginRight:  '5px',
                },
              }],
              mobile: true
            }),
            // Component that store plugins
            new ToolsComponent({
              id:          'tools',
              open:        false,
              collapsible: true,
              icon:        Vue.prototype.g3wtemplate.getFontClass('tools'),
              mobile:      true
            }),
            new WMSComponent({
              id:          'wms',
              open:        false,
              collapsible: true,
              icon:        Vue.prototype.g3wtemplate.getFontClass('layers'),
              mobile:      true,
            }),
            new CatalogComponent({
              id:          'catalog',
              open:        false,
              collapsible: false,
              isolate:     true,
              icon:        Vue.prototype.g3wtemplate.getFontClass('map'),
              mobile:      true,
              config:      { legend: { config: (ApplicationService.getConfig().layout || {}).legend } },
            }),
          ],
        },
        floatbar: {
          components: []
        },
      })
      .forEach(([ placeholder, options ]) => {
        this._addComponents(options.components, placeholder);
    });

    // other components not related to placeholder
    this._addComponents([
      new QueryResultsComponent({ id: 'queryresults' }),
    ]);

    // method that return Template Info
    this.getTemplateInfo = function() {
      return VueApp.g3wtemplate.getInfo();
    };

    this.getTemplateInfo = function() {
      return VueApp.g3wtemplate.getInfo();
    };

    this.getFontClass = function(type) {
      return VueApp.g3wtemplate.getFontClass(type);
    };

    $(document).localize();

    // placeholder of the content (view content). Secondary view (hidden)
    const map     = new MapComponent({ id: 'map' });
    const content = new ContentsComponent({ id: 'contents' });

    // viewport settings
    this.Services.viewport.init({ components: { map, content } });
    this._addComponents({ map, content });

    const skinColor = $('.navbar').css('background-color');
    this.skinColor = skinColor && `#${skinColor.substr(4, skinColor.indexOf(')') - 4).split(',').map((color) => parseInt(color).toString(16)).join('')}`;

  };

  /**
   * Wrapper for download
   * 
   * @param { Function } downloadFnc function to call
   * @param { Object }   options     Object parameters
   * 
   * @since 3.9.0
   */
  async downloadWrapper(downloadFnc, options = {}) {
    const download_caller_id = ApplicationService.setDownload(true);
    this.setLoadingContent(true);
    try {
      await downloadFnc(options);
    } catch(err) {
      this.showUserMessage({ type: 'alert', message: err || 'server_error', textMessage: !!err })
    }
    ApplicationService.setDownload(false, download_caller_id);
    this.setLoadingContent(false);
  }

}

export default new GUI();