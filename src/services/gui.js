import RouterService from 'services/router';
import ComponentsRegistry from 'store/components';

const { base, inherit, noop, toRawType } = require('core/utils/utils');
const G3WObject                          = require('core/g3wobject');

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

console.assert(undefined !== ProjectsMenuComponent,  'ProjectsMenuComponent is undefined');
console.assert(undefined !== ChangeMapMenuComponent, 'ChangeMapMenuComponent is undefined');
console.assert(undefined !== FormComponent,          'FormComponent is undefined');

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


// API della GUI.
// methods have be defined by application
// app should call GUI.ready() when GUI is ready
function GUI() {

  const self = this;

  this.setters = {

    setContent(options={}) {
      this.emit('opencontent', true);
      this._setContent(options)
    },

  };

  this.isready = false;

  // images urls
  this.getResourcesUrl  = noop;

  // show a Vue form
  this.showForm         = noop;
  this.closeForm        = noop;
  this.showListing      = noop;
  this.closeListing     = noop;
  this.hideListing      = noop;

  // modal
  this.setModal         = noop;
  this.showFullModal    = noop;

  // modal
  this.showQueryResults = noop;
  this.hideQueryResults = noop;
  this.showPanel        = noop;
  this.hidePanel        = noop;
  this.reloadComponents = noop;
  this.showUserMessage  = noop;
  this.closeUserMessage = noop;
  this.showModalDialog  = noop;

  // TABLE
  this.showTable        = noop;
  this.closeTable       = noop;

  this.notify           = noop;
  this.dialog           = noop;
  this.isMobile         = noop;

  this.removeNavBarItem = noop;

  /**
   * How new content has to be add
   * 
   * false = create new and close all open
   */
  this.push_content = false;

  this.setPushContent = function (bool=false) {
    this.push_content = bool;
  };

  this.getPushContent = function() {
    return this.push_content;
  };

  this._closeUserMessageBeforeSetContent = true;

  this.setComponent = function(component) {
    ComponentsRegistry.registerComponent(component);
  };

  this.getComponent = function(id) {
    return ComponentsRegistry.getComponent(id);
  };

  this.getComponents = function() {
    return ComponentsRegistry.getComponents();
  };

  this.goto = function(url) {
    RouterService.goto(url);
  };

  this.ready = function() {
    this.emit('ready');
    this.isready = true;
  };

  this.guiResized = function() {
    this.emit('guiresized');
  };

  // ready GUI
  this.isReady = function() {
    return new Promise(resolve => this.isready ? resolve() : this.once('ready', resolve));
  };

  /**
   * Passing a component application ui id return service that belong to component
   * 
   * @param componentId
   * @returns {*}
   */
  this.getService = function(componentId) {
    const component = this.getComponent(componentId);
    if (component) {
      return component.getService();
    }
  };

  // spinner
  this.showSpinner = function(options={}) {};
  this.hideSpinner = function(id) {};

  this.disableElement = function({element, disable}) {
    disable && $(element).addClass('g3w-disabled') || $(element).removeClass('g3w-disabled');
  };

  /**
   * Convert error to user message showed
   * 
   * @param error
   * @returns {string}
   */
  this.errorToMessage = function(error) {
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
  };

  //Function called from DataRouterservice for gui output

  /**
   * @param data
   * @param options
   */
  this.outputDataPlace = async function(dataPromise, options={}) {

    // show parameter it used to set condition to show result or not
    // loading parameter is used to show result content when we are wait the response. Default true otherwise we shoe result content at the end
    const defaultOutputConfig = {
      condition: true,
      add:       false,
      loading:   true
    };

    const {
      title = '',
      show  = defaultOutputConfig,
      before,
      after
    } = options;

    // convert show in an object
    const outputConfig = ('Object' !== toRawType(show)) ?
      {
        condition: show, // can be Function or Boolean otherwise is set true
        add: false,
        loading: true
      } : {
        ...defaultOutputConfig,
        ...show
      };

    const {
      condition,
      add,
      loading
    } = outputConfig;

    //check if waiting output data
    // in case we stop and substiute with new request data
    if (self.waitingoutputdataplace) {
      await self.waitingoutputdataplace.stop();
    }
    
    let queryResultsService = add
      ? self.getService('queryresults')
      : loading && self.showContentFactory('query')(title);

      self.waitingoutputdataplace = (() => {
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
            self.showUserMessage({
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
                  : self.showContentFactory('query')(title)).setQueryResponse(data, { add }
              );
            } else {
              self.closeContent();
            }
            // call after is set with data
            if (after) {
              after(data);
            }
          }
        } catch(error) {
          const message = self.errorToMessage(error);
          self.showUserMessage({
            type: 'alert',
            message,
            textMessage: true
          });
          self.closeContent();
        } finally {
          if (!stop) {
            self.waitingoutputdataplace = null;
          }
        }
      })();
      return {
        stop: async () => { stop = true; }
      };
    })();

  };

  this.showContentFactory = function(type) {
    let showPanelContent;
    switch (type) {
      case 'query':
        showPanelContent = self.showQueryResults;
        break;
      case 'form':
        showPanelContent = self.showForm;
        break;
    }
    return showPanelContent;
  };

  this.showForm = function(options={}) {
    const {
      perc,
      split = 'h',
      push,
      showgoback,
      crumb
    } = options;
    // new isnstace every time
    const formComponent = options.formComponent ? new options.formComponent(options) :  new FormComponent(options);
    //get service
    const formService = formComponent.getService();
    // parameters : [content, title, push, perc, split, closable, crumb]
    self.setContent({
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
  };

  this.disablePanel = function(disable=false) {
    self.disableElement({
      element: "#g3w-sidebarpanel-placeholder",
      disable
    })
  };

  // show results info/search
  this.showQueryResults = function(title, results) {
    const queryResultsComponent = self.getComponent('queryresults');
    const queryResultService = queryResultsComponent.getService();
    queryResultService.reset();
    if (results) {
      queryResultService.setQueryResponse(results);
    } 
    self.showContextualContent({
      content: queryResultsComponent,
      title: "info.title",
      crumb: {
        title: "info.title",
        trigger: null
      },
      push: self.getPushContent(),
      post_title: title
    });
    return queryResultService;
  };

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

  this.showModalDialog = function(options={}) {
    console.assert(undefined !== self.dialog, 'dialog is undefined');
    return self.dialog.dialog(options);
  };

  this.showSpinner = function(options={}) {
    const container   = options.container || 'body';
    const id          = options.id || 'loadspinner';
    const where       = options.where || 'prepend'; // append | prepend
    const style       = options.style || '';
    const transparent = options.transparent ? 'background-color: transparent' : '';
    const center      = options.center ? 'margin: auto' : '';
    if (!$("#"+id).length) {
      $(container)[where].call($(container),'<div id="'+id+'" class="spinner-wrapper '+style+'" style="'+transparent+'"><div class="spinner '+style+'" style="'+ center+'"></div></div>');
    }
  };

  this.hideSpinner = function(id='loadspinner') {
    $("#" + id).remove();
  };

  /**
   * Toggle full screen modal 
   */
  this.showFullModal = function({ element = "#full-screen-modal", show = true } = {}) {
    $(element).modal(show ? 'show' : 'hide')
  };

  this.setCloseUserMessageBeforeSetContent = function(bool = true) {
    self._closeUserMessageBeforeSetContent = bool;
  };

  // return specific classes
  this.getTemplateClasses = function() {
    console.assert(undefined !== BootstrapVersionClasses, 'BootstrapVersionClasses is undefined');
    return BootstrapVersionClasses
  };

  this.getTemplateClass = function({element, type}) {
    console.assert(undefined !== BootstrapVersionClasses, 'BootstrapVersionClasses is undefined');
    return BootstrapVersionClasses[element][type];
  };

  this.isMobile = function() {
    console.assert(undefined !== isMobile, 'isMobile is undefined');
    return isMobile.any;
  };

  this.init = function({
    layout,
    app,
    service,
    floatbar,
    viewport,
    navbar,
    sidebar,
    state,
  }) {

    this.layout = layout;

    // proxy  bootbox library
    this.dialog           = bootbox;

    this.addComponent     = app._addComponent.bind(app);
    this.removeComponent  = app._removeComponent.bind(app);

    // MODAL
    this.setModal         = app._showModalOverlay.bind(app);

    // SIDEBAR
    this.showSidebar      = app._showSidebar.bind(app);
    this.hideSidebar      = app._hideSidebar.bind(app);
    this.isSidebarVisible = app._isSidebarVisible.bind(app);

    //LIST
    this.showList         = floatbar.showPanel.bind(floatbar);
    this.closeList        = floatbar.closePanel.bind(floatbar);
    this.hideList         = floatbar.hidePanel.bind(floatbar);

    this.showPanel        = sidebar.showPanel.bind(sidebar);
    this.closePanel       = sidebar.closePanel.bind(sidebar);

    this.getResourcesUrl  = () => service.getConfig().resourcesurl;

    this.getSize = ({element, what}) => {
      if (element && what)
        return app.sizes[element][what];
    };

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

    this.disableContent = function(disable) {
      viewport.disableContent(disable);
    };

    this.hideContent = function(bool, perc) {
      return viewport.hideContent(bool, perc);
    };

    this.closeContent = function() {
      self.emit('closecontent', false);
      return viewport.closeContent();
    };

    this.closeOpenSideBarComponent = function() {
      app.constructor.Services.sidebar.closeOpenComponents();
    };

    this.addNavbarItem = function(item) {
      navbar.addItem(item)
    };

    this.disableApplication = function(bool=false) {
      service.disableApplication(bool);
    };

    this.showUserMessage = function(options={}) {
      return viewport.showUserMessage(options);
    };

    this.closeUserMessage = function() {
      viewport.closeUserMessage();
    };

    // FLOATBAR //
    this.showFloatbar = function() {
      floatbar.open();
    };

    this.hideFloatbar = function() {
      floatbar.close();
    };

    // RELOAD COMPONENTS
    this.reloadComponents = function() {
      app.constructor.Services.sidebar.reloadComponents();
    };

    this.disableSideBar = function(bool=true) {
      state.gui.sidebar.disabled = bool;
    };

    // VIEWPORT //
    this.setPrimaryView = function(viewName) {
      viewport.setPrimaryView(viewName);
    };

    // only map
    this.showMap = function() {
      viewport.showMap();
    };

    this.showContextualMap = function(perc=30, split) {
      viewport.showContextualMap({ perc, split });
    };

    this.setContextualMapComponent = function(mapComponent) {
      viewport.setContextualMapComponent(mapComponent);
    };

    this.resetContextualMapComponent = function() {
      viewport.resetContextualMapComponent();
    };

    // (100%) content
    this.showContent = (options={}) => {
      self.setLoadingContent(false);
      options.perc = app._isMobile ? 100 : options.perc;
      self.setContent(options);
      return true;
    };

    this.showContextualContent = (options = {}) => {
      options.perc = app._isMobile ? 100 : options.perc;
      self.setContent(options);
      return true;
    };

    // add component to stack (append)
    // Differences between pushContent and setContent are :
    //  - push every componet is added, set is refreshed
    //  - pushContent has a new parameter (backonclose) when is clicked x
    //  - the contentComponet is close all stack is closed
    this.pushContent = (options = {}) => {
      options.perc = app._isMobile ? 100 : options.perc;
      options.push = true;
      self.setContent(options);
    };

    // add content to stack
    this.pushContextualContent = (options={}) => {
      options.perc = app._isMobile ? 100 : options.perc;
      self.pushContent(options);
    };

    // remove last content from stack
    this.popContent = function() {
      viewport.popContent();
    };

    //return number of component of stack
    this.getContentLength = function() {
      return viewport.contentLength();
    };

    this.getCurrentContentTitle = function() {
      return viewport.getCurrentContentTitle();
    };

    this.getCurrentContentId = function() {
      return viewport.getCurrentContentId();
    };

    /**
     * change current content title
     * @param title
     */
    this.changeCurrentContentTitle = function(title) {
      viewport.changeCurrentContentTitle(title);
    };

    /**
     * Change current content options
     * 
     * @param options.title
     * @param options.crumb
     */
    this.changeCurrentContentOptions= function(options={}) {
      viewport.changeCurrentContentOptions(options);
    };

    this.getCurrentContent = function() {
      return viewport.getCurrentContent();
    };

    this.toggleFullViewContent = function() {
      viewport.toggleFullViewContent();
    };

    this.resetToDefaultContentPercentage = function() {
      viewport.resetToDefaultContentPercentage();
    };

    this.getProjectMenuDOM = function({projects, host, cbk}={}) {
      const projectVueMenuComponent = new ProjectsMenuComponent({
        projects: projects && Array.isArray(projects) && projects,
        cbk,
        host
      }).getInternalComponent();
      return projectVueMenuComponent.$mount().$el;
    };

    this._setContent = (options={}) => {
      if(self._closeUserMessageBeforeSetContent) {
        self.closeUserMessage();
      }
      options.content     = options.content || null;
      options.title       = options.title || "";
      options.push        = _.isBoolean(options.push) ? options.push : false;
      options.perc        = app._isMobile ? 100 : options.perc;
      options.split       = options.split || 'h';
      options.backonclose = _.isBoolean(options.backonclose) ? options.backonclose : false;
      options.showtitle   = _.isBoolean(options.showtitle) ? options.showtitle : true;
      viewport.showContent(options);
    };

    this.hideClientMenu = function() {
      service.getConfig().user = null;
    };

    this.hideChangeMaps = function() {
      service.getConfig().projects = [];
    };

    this.setLoadingContent = function(loading = false) {
      app.constructor.Services.viewport.setLoadingContent(loading);
      if (loading) {
        return new Promise((resolve)=> { setTimeout(resolve, 200) });
      }
    };

    this.openProjectsMenu = function() {
      const isProjectMenuComponent = self.getComponent('contents').getComponentById('projectsmenu');
      if (isProjectMenuComponent) {
        self.closeContent();
        return;
      }
      if (self.isMobile()) {
        self.hideSidebar();
        $('#main-navbar.navbar-collapse').removeClass('in');
      }
      app.constructor.Services.sidebar.closeOpenComponents();
      self.setContent({
        content: new ProjectsMenuComponent(),
        title: '',
        perc: 100
      });
    };

    /**
     * @since 3.8.0
     */
    this.openChangeMapMenu = function() {
      const isChangeMapMenuComponent = self.getComponent('contents').getComponentById('changemapmenu');
      if (isChangeMapMenuComponent) {
        self.closeContent();
        return;
      }
      if (self.isMobile()) {
        self.hideSidebar();
        $('#main-navbar.navbar-collapse').removeClass('in');
      }
      app.constructor.Services.sidebar.closeOpenComponents();
      self.setContent({
        content: new ChangeMapMenuComponent(),
        title: '',
        perc: 100
      });
    }

    // setup layout
    if (!isMobile.any) {
      $("<style type='text/css'> .ol-control-tl { top: 7px; left:43px; } </style>").appendTo("head");
    }

    // register services
    Object
    .keys(app.constructor.Services)
    .forEach(element => {
      service.registerService(element, app.constructor.Services[element]);
    });

    Object
      .values(this.getComponents())
      .forEach(component => {
        service.registerService(component.id, component.getService());
      });

    app.constructor
      .Services
      .viewport
      .on('resize', () => this.emit('resize'));

    const G3WTemplate               = Vue.prototype.g3wtemplate;

    return {
      title: service.getConfig().apptitle || 'G3W Suite',
      placeholders: {
        navbar:   {
            components: [],
        },
        sidebar:  {
          components: [
            new MetadataComponent({
              id:          'metadata',
              open:        false,
              collapsible: false,
              icon:        G3WTemplate.getFontClass('file'),
              mobile:      true,
            }),
            new SpatialBookMarksComponent({
              id:          'spatialbookmarks',
              open:        false,
              collapsible: true,
              icon:        G3WTemplate.getFontClass('bookmark'),
              mobile:      true,
            }),
            new PrintComponent({
              id:          'print',
              open:        false,
              collapsible: true, // manage click event if can run setOpen component method
              icon:        G3WTemplate.getFontClass('print'),
              mobile:      false,
            }),
            new SearchComponent({
              id:          'search',
              open:        false,
              collapsible: true,
              icon:        G3WTemplate.getFontClass('search'),
              actions: [{
                id:        "querybuilder",
                class:     `${G3WTemplate.getFontClass('calculator')} sidebar-button sidebar-button-icon`,
                tooltip:   'Query Builder',
                fnc:       () => {
                  self.closeContent();
                  app.constructor.Services.sidebar.closeOpenComponents();
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
              icon:        G3WTemplate.getFontClass('tools'),
              mobile:      true
            }),
            new WMSComponent({
              id:          'wms',
              open:        false,
              collapsible: true,
              icon:        G3WTemplate.getFontClass('layers'),
              mobile:      true,
            }),
            new CatalogComponent({
              id:          'catalog',
              open:        false,
              collapsible: false,
              isolate:     true,
              icon:        G3WTemplate.getFontClass('map'),
              mobile:      true,
              config:      { legend: { config: (service.getConfig().layout || {}).legend } },
            }),
          ],
        },
        floatbar: {
          components: []
        },
      },
      othercomponents: [
        new QueryResultsComponent({ id: 'queryresults' }),
      ],
      // placeholder of the content (view content). Secondary view (hidden)
      viewport: {
        components: {
          map:     new MapComponent({ id: 'map' }),
          content: new ContentsComponent({ id: 'contents' }),
        },
      },
    };

  };

  this.setup_deps = function({ app, floatbar, VueApp }) {

    // build template
    floatbar.init(layout);

    Object
      .entries(app.templateConfig.placeholders)
      .forEach(([ placeholder, options ]) => {
        app._addComponents(options.components, placeholder);
    });

    // other components not related to placeholder
    if (app.templateConfig.othercomponents) {
      app._addComponents(app.templateConfig.othercomponents);
    }

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

    // viewport settings
    if (app.templateConfig.viewport) {
      app.constructor.Services.viewport.init(app.templateConfig.viewport);
      app._addComponents(app.templateConfig.viewport.components);
    }

    const skinColor = $('.navbar').css('background-color');
    this.skinColor = skinColor && `#${skinColor.substr(4, skinColor.indexOf(')') - 4).split(',').map((color) => parseInt(color).toString(16)).join('')}`;

  };

  // register setters
  base(this);

}

inherit(GUI, G3WObject);

export default new GUI();
