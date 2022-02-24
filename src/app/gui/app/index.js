import ApplicationState from 'core/applicationstate';
const {base, inherit, toRawType} = require('core/utils/utils');
const {t} = require('core/i18n/i18n.service');
const G3WObject = require('core/g3wobject');
const ProjectsMenuComponent = require('gui/projectsmenu/projectsmenu');
const ComponentsRegistry = require('gui/componentsregistry');
const GUI = require('gui/gui');
const VueAppPlugin = require('gui/vue/vueappplugin');
const G3wApplicationFilterPlugin = require('gui/vue/vue.filter');
const GlobalComponents = require('gui/vue/vue.globalcomponents');
const GlobalDirective = require('gui/vue/vue.directives');

// install global components
Vue.use(GlobalComponents);
// install gloabl directive
Vue.use(GlobalDirective);

// install Application Filter Plugin
Vue.use(G3wApplicationFilterPlugin);

// install template information library (es. classes etc..)
Vue.use(VueAppPlugin, {});

// set mixins inheriAttrs to avoid tha unused props are setted as attrs
Vue.mixin({
  inheritAttrs: false
});

// get all items needed by application
const App = require('gui/app/app');
const sidebar = require('gui/sidebar/sidebar');
const floatbar = require('gui/floatbar/floatbar');
const viewport = require('gui/viewport/viewport');
const navbaritems = require('gui/navbar/navbaritems');
const layout = require('./layout');

// loading spinner at beginning
layout.loading(true);

const ApplicationTemplate = function({ApplicationService}) {
  const appLayoutConfig = ApplicationService.getConfig().layout || {};
  // useful to build a difference layout/compoìnent based on mobile or not
  this._isMobile = isMobile.any;
  this._isIframe = appLayoutConfig.iframe;
  //ussefult ot not close user message when set content is called
  this.sizes = {
    sidebar: {
      width:0
    }
  };
  /*
    usefull to show onaly last waiting request output
    at moment will be an object
    {
      stop: method to sot to show result
    }
   */
  this.waitingoutputdataplace = null;
  this.init = function() {
    // create Vue App
    this._createApp();
  };
  // create application config
  this._createTemplateConfig = function() {
    const G3WTemplate = Vue.prototype.g3wtemplate;
    const appTitle = ApplicationService.getConfig().apptitle || 'G3W Suite';
    const ContentsComponent = require('gui/viewport/contentsviewer');
    const CatalogComponent = require('gui/catalog/vue/catalog');
    const SearchComponent = require('gui/search/vue/search');
    const QueryBuilderUIFactory = require('gui/querybuilder/querybuilderuifactory');
    const PrintComponent = require('gui/print/vue/print');
    const MetadataComponent = require('gui/metadata/vue/metadata');
    const ToolsComponent = require('gui/tools/vue/tools');
    const MapComponent = require('gui/map/vue/map');
    const QueryResultsComponent = require('gui/queryresults/vue/queryresults');
    return {
      title: appTitle,
      placeholders: {
        navbar: {
          components: []
        },
        sidebar: {
          components: [
            new MetadataComponent({
              id: 'metadata',
              open: false,
              collapsible: false,
              icon: G3WTemplate.getFontClass('file'),
              mobile: true
            }),
            new PrintComponent({
              id: 'print',
              open: false,
              collapsible: true, //  it used to manage click event if can run setOpen component method
              icon: G3WTemplate.getFontClass('print'),
              mobile: false
            }),
            new SearchComponent({
              id: 'search',
              open: false,
              collapsible: true,
              icon: G3WTemplate.getFontClass('search'),
              actions: [{
                id:"querybuilder",
                class: `${G3WTemplate.getFontClass('calculator')} sidebar-button sidebar-button-icon`,
                tooltip: 'Query Builder',
                fnc:() => {
                  GUI.closeContent();
                  ApplicationTemplate.Services.sidebar.closeOpenComponents();
                  QueryBuilderUIFactory.show({
                    type: 'sidebar' // sidebar or modal
                  });
                },
                style: {
                  color: '#8DC3E3',
                  padding: '6px',
                  fontSize: '1.2em',
                  borderRadius: '3px',
                  marginRight: '5px'
                }
              }],
              mobile: true
            }),
            // Component that store plugins
            new ToolsComponent({
              id: 'tools',
              open: false,
              collapsible: true,
              icon: G3WTemplate.getFontClass('tools'),
              mobile: true
            }),
            new CatalogComponent({
              id: 'catalog',
              open: false,
              collapsible: false,
              isolate: true,
              icon: G3WTemplate.getFontClass('map'),
              mobile: true,
              config: {
                legend: {
                  config: appLayoutConfig.legend
                },
              }
            }),
          ]
        },
        floatbar:{
          components: []
        }
      },
      othercomponents: [
        new QueryResultsComponent({
          id: 'queryresults'
        })
      ],
      viewport: {
        // placeholder of the content (view content). Secondary view (hidden)
        components: {
          map: new MapComponent({
            id: 'map'
          }),
          content: new ContentsComponent({
            id: 'contents'
          })
        }
      }
    }
  };

  //Vue app
  this._createApp = function() {
    this._setDataTableLanguage();
    const self = this;
    if (isMobile.any || this._isIframe) $('body').addClass('sidebar-collapse');
    return new Vue({
      el: '#app',
      created() {
        // set general metods for the application as  GUI.showForm etc ..
        self._setupInterface();
        // setup layout
        self._setupLayout();
        //register all services fro the application
        self._setUpServices();
        // create templateConfig
        self.templateConfig = self._createTemplateConfig();
        // listen lng change and reset datatable lng
        this.$watch(()=> ApplicationState.lng, ()=>{
          self._setDataTableLanguage();
        });
      },
      async mounted() {
        await this.$nextTick();
        self._buildTemplate();
        // setup Font, Css class methods
        self._setUpTemplateDependencies(this);
        $(document).localize();
        self._setViewport(self.templateConfig.viewport);
        const skinColor = $('.navbar').css('background-color');
        GUI.skinColor = skinColor && `#${skinColor.substr(4, skinColor.indexOf(')') - 4).split(',').map((color) => parseInt(color).toString(16)).join('')}`;
        await this.$nextTick();
        self.emit('ready');
        self.sizes.sidebar.width = $('#g3w-sidebar').width();
        //getSkinColor
        GUI.ready();
      }
    })
  };

  this._setupLayout = function(){
    if (!isMobile.any) {
      // setup map controls
      $("<style type='text/css'> .ol-control-tl {" +
        "top: 7px;" +
        "left:43px;" +
      "}</style>").appendTo("head");
    }
    // Inizialization of the components of the application
    Vue.component('sidebar', sidebar.SidebarComponent);
    //Navbar custom items
    Vue.component('navbarleftitems', navbaritems.components.left);
    Vue.component('navbarrightitems', navbaritems.components.right);
    Vue.component('viewport', viewport.ViewportComponent);
    Vue.component('floatbar', floatbar.FloatbarComponent);
    Vue.component('app', App);
  };

  // dataTable Translations and custom extentions
  this._setDataTableLanguage = function(dataTable=null) {
    const lngOptions = {
      "language": {
        "sSearch": '',
        "searchPlaceholder": t("dosearch"),
        "sLengthMenu": t("dataTable.lengthMenu"),
        "paginate": {
          "previous": t("dataTable.previous"),
          "next": t("dataTable.next"),
        },
        "info": t("dataTable.info"),
        "zeroRecords": t("dataTable.nodatafilterd"),
        "infoFiltered": ''
      }
    };
    //set form control class to filter
    $.extend( $.fn.dataTableExt.oStdClasses, {
      "sFilterInput": "form-control search"
    });
    !dataTable ? $.extend( true, $.fn.dataTable.defaults, lngOptions) : dataTable.dataTable( {"oLanguage": lngOptions});
  };

  // route setting att beginning (is an example)
  this._addRoutes = function() {
    const RouterService = ApplicationService.getRouterService();
    const mapService = GUI.getComponent('map').getService();
    RouterService.addRoute('map/zoomto/{coordinate}/:zoom:', function(coordinate, zoom) {
      coordinate = _.map(coordinate.split(','), function(xy) {
        return Number(xy)
      });
      zoom = zoom ? Number(zoom): null;
      if (coordinate.length) {
        mapService.on('ready', function() {
          this.zoomTo(coordinate, zoom);
        })
      }
    })
  };

  //register all services
  this._setUpServices = function() {
    Object.keys(ApplicationTemplate.Services).forEach(element => {
      const service = ApplicationTemplate.Services[element];
      ApplicationService.registerService(element, service);
    });
    Object.values(GUI.getComponents()).forEach(component => {
      ApplicationService.registerService(component.id, component.getService());
    });
    ApplicationTemplate.Services.viewport.on('resize', ()=>GUI.emit('resize'));
  };
  // build template function
  this._buildTemplate = function() {
    floatbar.FloatbarService.init(layout);
    const placeholdersConfig = this.templateConfig.placeholders;
    Object.entries(placeholdersConfig).forEach(([placeholder, options]) => {
      this._addComponents(options.components, placeholder);
    });
    //register other compoents
    this._addOtherComponents();
  };

  //add component not related to placeholder
  this._addOtherComponents = function() {
    if (this.templateConfig.othercomponents) this._addComponents(this.templateConfig.othercomponents);
  };
  // viewport setting
  this._setViewport = function(viewportOptions) {
    // viewport components
    // es.: map e content
    /*

    components: {
      map: new MapComponent({
        id: 'map'
      }),
      content: new ContentsComponent({
        id: 'content',
      })
     }

     */
    if (viewportOptions) {
      ApplicationTemplate.Services.viewport.init(viewportOptions);
      this._addComponents(viewportOptions.components);
    }
  };

  // add component to template
  this._addComponent = function(component, placeholder, options={}) {
    this._addComponents([component], placeholder, options);
    return true;
  };

  // registry component
  this._addComponents = function(components, placeholder, options) {
    let register = true;
    if (placeholder && ApplicationTemplate.PLACEHOLDERS.indexOf(placeholder) > -1) {
      const placeholderService = ApplicationTemplate.Services[placeholder];
      if (placeholderService) register = placeholderService.addComponents(components, options);
    }
    Object.entries(components).forEach(([key, component])=> {
      if (register) {
        ComponentsRegistry.registerComponent(component);
        ApplicationService.registerService(component.id, component.getService())
      }
    })
  };

  this._removeComponent = function(componentId, placeholder, options) {
    const component = ComponentsRegistry.unregisterComponent(componentId);
    placeholder && ApplicationTemplate.Services[placeholder] && ApplicationTemplate.Services[placeholder].removeComponent(component, options);
  };

  this._showModalOverlay = function(bool=false, message) {
    const mapService = GUI.getComponent('map').getService();
    if (bool) mapService.startDrawGreyCover(message);
    else mapService.stopDrawGreyCover();
  };

  this._isSidebarVisible = function() {
    return !$('body').hasClass('sidebar-collapse');
  };

  this._showSidebar = function() {
    $('body').addClass('sidebar-open');
    $('body').removeClass('sidebar-collapse')
  };

  this._hideSidebar = function() {
    $('body').removeClass('sidebar-open');
    $('body').addClass('sidebar-collapse')
  };

  // setup Fonts Css dependencies methods
  this._setUpTemplateDependencies = function(VueApp) {
    GUI.isMobile = function() {
      return isMobile.any;
    };
    // method that return Template Info
    GUI.getTemplateInfo = function() {
      return VueApp.g3wtemplate.getInfo();
    };
    GUI.getTemplateInfo = function() {
      return VueApp.g3wtemplate.getInfo();
    };
    GUI.getFontClass = function(type) {
      return VueApp.g3wtemplate.getFontClass(type);
    };
  };

  /**
   * Convert error to user message showed
   * @param error
   * @returns {string}
   */
  GUI.errorToMessage = function(error){
    let message = 'server_error';
    switch (toRawType(error)) {
      case 'Error':
        message = `CLIENT - ${error.message}`;
        break;
      case 'Object':
        if (error.responseJSON) {
          error = error.responseJSON;
          if (error.result === false){
            const {code='', data='', message:msg=''} = error.error;
            message = `${code.toUpperCase()} ${data} ${msg}`;
          }
        } else if (error.responseText){
          message = error.responseText;
        }
        break;
      case 'Array':
        message = error.map(error => GUI.errorToMessage(error)).join(' ');
        break;
      case 'String':
      default:
        message = error;
    }
    return message;
  };

  // setup Interaces
  this._setupInterface = function() {
    /* PLUBLIC INTERFACE */
    /* Common methods */
    GUI.layout = layout;
    GUI.getSize = ({element, what}) => {
      if (element && what)
        return this.sizes[element][what];
    };
    GUI.addComponent = this._addComponent.bind(this);
    GUI.removeComponent = this._removeComponent.bind(this);
    /* Metodos to define */
    GUI.getResourcesUrl = ()=>ApplicationService.getConfig().resourcesurl;
    //LIST
    GUI.showList = floatbar.FloatbarService.showPanel.bind(floatbar.FloatbarService);
    GUI.closeList = floatbar.FloatbarService.closePanel.bind(floatbar.FloatbarService);
    GUI.hideList = floatbar.FloatbarService.hidePanel.bind(floatbar.FloatbarService);
    // TABLE
    GUI.showTable = function() {};
    GUI.closeTable = function() {};

    //Function called from DataRouterservice for gui output
    /**
     *
     * @param data
     * @param options
     */
    GUI.outputDataPlace = async function(dataPromise, options={}){
      // show parameter it used to set condition to show result or not
      // loading parameter is used to show result content when we are wait the response. Default true otherwise we shoe result content at the end
      const defaultOutputConfig = {condition:true, add:false, loading:true};
      const {title='', show=defaultOutputConfig, before, after} = options;
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
      this.waitingoutputdataplace && await this.waitingoutputdataplace.stop();
      let queryResultsService = add ? GUI.getComponent('queryresults').getService() : loading && this.showContentFactory('query')(title);
      this.waitingoutputdataplace = (() => {
        let stop = false;
        (async () =>{
          try {
            const data = await dataPromise;
            //if set before call method and wait
            before && await before(data);
            // in case of usermessage show user message
            data.usermessage && GUI.showUserMessage({
              type: data.usermessage.type,
              message: data.usermessage.message,
              autoclose: data.usermessage.autoclose
            });
            if (!stop) {
              // check condition
              const showResult = (toRawType(condition) === 'Function') ? condition(data) : (toRawType(condition) === 'Boolean') ? condition : true;
              if (showResult) {
                (queryResultsService ? queryResultsService: this.showContentFactory('query')(title)).setQueryResponse(data, {
                  add
                });
              }
              else GUI.closeContent();
              // call after is set with data
              after && after(data);
            }
          } catch(error) {
            const message = this.errorToMessage(error);
            this.showUserMessage({
              type: 'alert',
              message,
              textMessage: true
            });
            this.closeContent();
          } finally {
            if (!stop) this.waitingoutputdataplace = null;
          }
        })();
        return {
          stop: async ()=> {
            stop = true;
          }
        }
      })();
    };

    GUI.showContentFactory = function(type) {
      let showPanelContent;
      switch (type) {
        case 'query':
          showPanelContent = GUI.showQueryResults;
          break;
        case 'form':
          showPanelContent = GUI.showForm;
          break;
      }
      return showPanelContent;
    };


    GUI.showForm = function(options={}) {
      const {perc, split='h', push, showgoback} = options;
      const FormComponent = require('gui/form/vue/form');
      // new isnstace every time
      const formComponent = options.formComponent ? new options.formComponent(options) :  new FormComponent(options);
      //get service
      const formService = formComponent.getService();
      // parameters : [content, title, push, perc, split, closable]
      GUI.setContent({
        perc,
        content: formComponent,
        split,
        push: !!push, //only one( if other delete previous component)
        showgoback: !!showgoback,
        closable: false
      });
      // return service
      return formService;
    };
    GUI.closeForm = function() {
      this.emit('closeform', false);
      viewport.ViewportService.removeContent();
      // force set modal to false
      GUI.setModal(false);
    };

    GUI.disableElement = function({element, disable}) {
      disable && $(element).addClass('g3w-disabled') || $(element).removeClass('g3w-disabled');
    };

    GUI.disableContent = function(disable) {
      GUI.disableElement({
        element: "#g3w-view-content #contents",
        disable
      })
    };

    GUI.disablePanel = function(disable=false) {
      GUI.disableElement({
        element: "#g3w-sidebarpanel-placeholder",
        disable
      })
    };

    // hide content
    GUI.hideContent = function(bool, perc) {
      return viewport.ViewportService.hideContent(bool, perc);
    };

    GUI.closeContent = function() {
      this.emit('closecontent', false);
      return viewport.ViewportService.closeContent();
    };

    GUI.closeOpenSideBarComponent = function(){
      ApplicationTemplate.Services.sidebar.closeOpenComponents();
    };

    // show results info/search
    GUI.showQueryResults = function(title, results) {
      const queryResultsComponent = GUI.getComponent('queryresults');
      const queryResultService = queryResultsComponent.getService();
      queryResultService.reset();
      results && queryResultService.setQueryResponse(results);
      GUI.showContextualContent({
        content: queryResultsComponent,
        title: "info.title",
        post_title: title
      });
      return queryResultService;
    };
    GUI.addNavbarItem = function(item) {
      navbaritems.NavbarItemsService.addItem(item)
    };
    GUI.removeNavBarItem = function() {};
    GUI.showPanel = sidebar.SidebarService.showPanel.bind(sidebar.SidebarService);
    GUI.closePanel = sidebar.SidebarService.closePanel.bind(sidebar.SidebarService);
    ///
    GUI.disableApplication = function(bool=false){
      ApplicationService.disableApplication(bool);
    };

    //showusermessage
    GUI.showUserMessage = function(options={}) {
      return viewport.ViewportService.showUserMessage(options);
    };

    GUI.closeUserMessage = function() {
      viewport.ViewportService.closeUserMessage();
    };
    /* ------------------ */
    GUI.notify = {
      warning(message, autoclose=false){
        GUI.showUserMessage({
          type: 'warning',
          message,
          autoclose
        })
      },
      error(message, autoclose=false){
        GUI.showUserMessage({
          type: 'alert',
          message,
          autoclose
        })
      },
      info(message, autoclose=false){
        GUI.showUserMessage(({
          type: 'info',
          message,
          autoclose
        }))
      },
      success(message){
        GUI.showUserMessage({
          type: 'success',
          message,
          autoclose: true
        })
      }
    };
    // proxy  bootbox library
    GUI.dialog = bootbox;
    //modal dialog//
    GUI.showModalDialog = function(options={}) {
      return GUI.dialog.dialog(options);
    };
    /* spinner */
    GUI.showSpinner = function(options={}){
      const container = options.container || 'body';
      const id = options.id || 'loadspinner';
      const where = options.where || 'prepend'; // append | prepend
      const style = options.style || '';
      const transparent = options.transparent ? 'background-color: transparent' : '';
      const center = options.center ? 'margin: auto' : '';
      if (!$("#"+id).length) {
        $(container)[where].call($(container),'<div id="'+id+'" class="spinner-wrapper '+style+'" style="'+transparent+'"><div class="spinner '+style+'" style="'+ center+'"></div></div>');
      }
    };
    //hide spinner
    GUI.hideSpinner = function(id='loadspinner'){
      $("#"+id).remove();
    };
    /* end spinner*/
    /* end common methods */

    /*  */
    // FLOATBAR //
    GUI.showFloatbar = function() {
      floatbar.FloatbarService.open();
    };
    GUI.hideFloatbar = function() {
      floatbar.FloatbarService.close();
    };
    // SIDEBAR //
    GUI.showSidebar = this._showSidebar.bind(this);
    GUI.hideSidebar = this._hideSidebar.bind(this);
    GUI.isSidebarVisible = this._isSidebarVisible.bind(this);

    // RELOAD COMPONENTS
    GUI.reloadComponents = function(){
      ApplicationTemplate.Services.sidebar.reloadComponents();
    };
    // MODAL
    GUI.setModal = this._showModalOverlay.bind(this);
    GUI.showFullModal = function({element="#full-screen-modal", show=true} = {}) {
      show ? $(element).modal('show') : $(element).modal('hide')
    };

    GUI.disableSideBar = function(bool=true) {
      ApplicationState.gui.sidebar.disabled = bool;
    };

    // VIEWPORT //
    GUI.setPrimaryView = function(viewName) {
      viewport.ViewportService.setPrimaryView(viewName);
    };
    // only map
    GUI.showMap = function() {
      viewport.ViewportService.showMap();
    };

    GUI.showContextualMap = function(perc=30, split) {
      viewport.ViewportService.showContextualMap({
        perc,
        split
      })
    };

    GUI.setContextualMapComponent = function(mapComponent) {
      viewport.ViewportService.setContextualMapComponent(mapComponent);
    };

    GUI.resetContextualMapComponent = function() {
      viewport.ViewportService.resetContextualMapComponent();
    };

    //  (100%) content
    GUI.showContent = (options={}) => {
      GUI.setLoadingContent(false);
      options.perc = this._isMobile ? 100 : options.perc;
      GUI.setContent(options);
      return true;
    };

    GUI.showContextualContent = (options = {}) => {
      options.perc = this._isMobile ? 100 : options.perc;
      GUI.setContent(options);
      return true;
    };
    // add component to stack (append)
    // Differences between pushContent and setContent are :
    //  - push every componet is added, set is refreshed
    //  - pushContent has a new parameter (backonclose) when is clicked x
    //  - the contentComponet is close all stack is closed
    GUI.pushContent = (options = {}) => {
      options.perc = this._isMobile ? 100 : options.perc;
      options.push = true;
      GUI.setContent(options);
    };
    // add content to stack
    GUI.pushContextualContent = (options={}) => {
      options.perc = this._isMobile ? 100 : options.perc;
      GUI.pushContent(options);
    };
    // remove last content from stack
    GUI.popContent = function() {
      viewport.ViewportService.popContent();
    };
    //return number of component of stack
    GUI.getContentLength = function() {
      return viewport.ViewportService.contentLength();
    };

    GUI.getCurrentContentTitle = function(){
      return viewport.ViewportService.getCurrentContentTitle();
    };

    /**
     * change current content title
     * @param title
     */
    GUI.changeCurrentContentTitle = function(title){
      viewport.ViewportService.changeCurrentContentTitle(title);
    };

    /**
     * Method to get current content
     */
    GUI.getCurrentContent = function(){
      return viewport.ViewportService.getCurrentContent();
    };

    GUI.toggleFullViewContent = function(){
      viewport.ViewportService.toggleFullViewContent();
    };

    GUI.resetToDefaultContentPercentage = function(){
      viewport.ViewportService.resetToDefaultContentPercentage();
    };

    GUI.getProjectMenuDOM = function({projects, host, cbk}={}) {
      const options = {
        projects: projects && Array.isArray(projects) && projects,
        cbk,
        host
      };
      const projectVueMenuComponent = new ProjectsMenuComponent(options).getInternalComponent();
      return projectVueMenuComponent.$mount().$el;
    };

    GUI.setCloseUserMessageBeforeSetContent = function(bool=true){
      this._closeUserMessageBeforeSetContent = bool;
    };

    GUI._setContent = (options={}) => {
      this._closeUserMessageBeforeSetContent && GUI.closeUserMessage();
      options.content = options.content || null;
      options.title = options.title || "";
      options.push = _.isBoolean(options.push) ? options.push : false;
      options.perc = this._isMobile ? 100 : options.perc;
      options.split = options.split || 'h';
      options.backonclose = _.isBoolean(options.backonclose) ? options.backonclose : false;
      options.showtitle = _.isBoolean(options.showtitle) ? options.showtitle : true;
      viewport.ViewportService.showContent(options);
    };

    GUI.hideClientMenu = function() {
      ApplicationService.getConfig().user = null;
    };

    GUI.hideChangeMaps = function() {
      ApplicationService.getConfig().projects = [];
    };

    // return specific classes
    GUI.getTemplateClasses = function() {
      return BootstrapVersionClasses
    };

    GUI.getTemplateClass = function({element, type}) {
      return BootstrapVersionClasses[element][type];
    };

    GUI.setLoadingContent = function(loading = false) {
      ApplicationTemplate.Services.viewport.setLoadingContent(loading);
      return loading && new Promise((resolve)=>{
        setTimeout(resolve, 200)
      })
    };

    GUI.openProjectsMenu = function() {
      const contentsComponent = GUI.getComponent('contents');
      // check if is projectmenucomponent
      if (contentsComponent.getComponentById('projectsmenu')) GUI.closeContent();
      else {
        if (this.isMobile()) {
          GUI.hideSidebar();
          $('#main-navbar.navbar-collapse').removeClass('in');
        }
        ApplicationTemplate.Services.sidebar.closeOpenComponents();
        GUI.setContent({
          content: new ProjectsMenuComponent(),
          title: '',
          perc: 100
        });
      }
    }
  };
  base(this);
};

inherit(ApplicationTemplate, G3WObject);

// Placeholder knowed by application
ApplicationTemplate.PLACEHOLDERS = [
  'navbar',
  'sidebar',
  'viewport',
  'floatbar'
];

// service know by the applications (standard)
ApplicationTemplate.Services = {
  navbar: null,
  sidebar: sidebar.SidebarService,
  viewport: viewport.ViewportService,
  floatbar: sidebar.FloatbarService
};

ApplicationTemplate.fail = function({language='en', error }) {
  layout.loading(false);
  const error_page =  {
    it: {
      error: error || "Errore di connessione",
      at_moment: "Al momento non è possibile caricare la mappa",
      f5: "Premi Ctrl+F5"
    },
    en: {
      error: error || "Connection error",
      at_moment: "At the moment is not possible show map",
      f5: "Press Ctrl+F5"
    }
  };
  const compiledTemplate = Vue.compile(require('gui/templates/500.html'));
  const app = new Vue({
    el: '#app',
    ...compiledTemplate,
    data: {
      messages: error_page[language]
    }
  });
};

module.exports =  ApplicationTemplate;

