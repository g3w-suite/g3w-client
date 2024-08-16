/**
 * @file Production entry point (app.min.js)
 * @since v3.8
 */

// include backward compatibilies
import './deprecated';

// expose global variables
import './globals';

//import core
import ApplicationState          from 'store/application-state';
import ProjectsRegistry          from 'store/projects';

//import services
import ApplicationService        from 'services/application';
import GUI                       from 'services/gui';
import FloatbarService           from "services/floatbar";
import NavbarItemsService        from 'services/navbaritems';
import SidebarService            from 'services/sidebar';
import ViewportService           from 'services/viewport';

// import store
import ComponentsRegistry        from 'store/components';

//components
import App                       from 'components/App.vue';
import ImageComponent            from 'components/GlobalImage.vue';
import GalleryImagesComponent    from 'components/GlobalGallery.vue';
import GeospatialComponet        from 'components/GlobalGeo.vue';
import Skeleton                  from 'components/GlobalSkeleton.vue';
import BarLoader                 from 'components/GlobalBarLoader.vue';
import Progressbar               from 'components/GlobalProgressBar.vue';
import HelpDiv                   from 'components/GlobalHelpDiv.vue';
import Resize                    from 'components/GlobalResize.vue'
import LayerPositions            from 'components/GlobalLayerPositions.vue';
import DateTime                  from 'components/GlobalDateTime.vue';
import Range                     from 'components/GlobalRange.vue';
import ResizeIcon                from 'components/GlobalResizeIcon.vue';
import Tabs                      from 'components/GlobalTabs.vue';
import Divider                   from 'components/GlobalDivider.vue';

//directives
import vDisabled                 from 'directives/v-disabled';
import vChecked                  from 'directives/v-checked';
import vSelectedFirst            from 'directives/v-selected-first';
import vSelect2                  from 'directives/v-select2';
import vTToltip                  from 'directives/v-t-tooltip';
import vTHtml                    from 'directives/v-t-html';
import vTPlaceholder             from 'directives/v-t-placeholder';
import vTTitle                   from 'directives/v-t-title';
import vT                        from "directives/v-t";
import vTPlugin                  from 'directives/v-t-plugin';
import vPlugins                  from 'directives/v-plugins';
import vOnline                   from 'directives/v-online';
import vDownload                 from 'directives/v-download';
import vClickOutside             from 'directives/v-click-outside'

// constants
import { FONT_AWESOME_ICONS }    from 'app/constant';

const { base, inherit, toRawType } = require('utils');
const { t, tPlugin }               = require('core/i18n/i18n.service');
const G3WObject                    = require('core/g3wobject');
const ProjectsMenuComponent        = require('gui/projectsmenu/projectsmenu');
const ChangeMapMenuComponent       = require('gui/changemapmenu/changemapmenu');


/**
 * Install global components
 *
 * ORIGINAL SOURCE: src/app/gui/vue/vue.globalcomponents.js@3.6
 */
Vue.component(ImageComponent.name, ImageComponent);
Vue.component(GalleryImagesComponent.name, GalleryImagesComponent);
Vue.component(GeospatialComponet.name, GeospatialComponet);
Vue.component(BarLoader.name, BarLoader);
Vue.component(Progressbar.name, Progressbar);
Vue.component(Skeleton.name, Skeleton);
Vue.component(HelpDiv.name, HelpDiv);
Vue.component(Resize.name, Resize);
Vue.component(LayerPositions.name, LayerPositions);
Vue.component(DateTime.name, DateTime);
Vue.component(Range.name, Range);
Vue.component(ResizeIcon.name, ResizeIcon);
Vue.component(Tabs.name, Tabs);
Vue.component(Divider.name, Divider);

/**
 * Install application filters
 *
 * ORIGINAL SOURCE: src/app/gui/vue/vue.filter.js@3.6
 */
Vue.filter('t', value => t(value));
Vue.filter('tPlugin', value => value !== null ? tPlugin(value) : '');

/**
 * Install global directives
 *
 * ORIGINAL SOURCE: src/app/gui/vue/vue.directives.js@v3.6
 */
Vue.directive("disabled", vDisabled);
Vue.directive("checked", vChecked);
Vue.directive("selected-first", vSelectedFirst);
Vue.directive('select2', vSelect2);
Vue.directive('t-tooltip', vTToltip);
Vue.directive('t-html', vTHtml);
Vue.directive('t-placeholder', vTPlaceholder);
Vue.directive('t-title', vTTitle);
Vue.directive("t", vT);
Vue.directive("t-plugin", vTPlugin);
Vue.directive("plugins", vPlugins);
Vue.directive("online", vOnline);
Vue.directive("download", vDownload);
Vue.directive("click-outside", vClickOutside);


/**
 * Install global plugins
 */
Vue.use(window.VueCookie);

/**
 * Vue 2 Plugin used to add global-level functionality to Vue
 *
 * @link https://v2.vuejs.org/v2/guide/plugins.html
 *
 * ORIGINAL SOURCE: src/app/gui/vue/vueappplugin.js@3.6
 */
Vue.use({
  install(Vue) {
    // hold a list of registered fontawsome classes for current project
    Vue.prototype.g3wtemplate = {
      font: FONT_AWESOME_ICONS,
      /**
       * @TODO check if deprecated
       */
      get() {},
      getInfo() {
        return {
          font: this.font
        }
      },
      addFontClass({ name, className } = {}) {
        const added = undefined === this.font[name];
        if (added) {
          this.font[name] = className;
        }
        return added;
      },
      /**
       * @TODO check if deprecated
       */
      getInfoString() {},
      getFontClass(type) {
        return undefined === this.font[type] ? '' : this.font[type];
      }
    };
    // include isMobile() method within all Vue instances
    Vue.mixin({
      methods: {
        isMobile () {
          return isMobile.any
        }
      }
    })

    /** @since 3.10.0 remove _setUpTemplateDependencies method**/
    GUI.isMobile = function() {
      return isMobile.any;
    };
    // method that returns Template Info
    GUI.getTemplateInfo = function() {
      return Vue.prototype.g3wtemplate.getInfo();
    };
    GUI.getTemplateInfo = function() {
      return Vue.prototype.g3wtemplate.getInfo();
    };
    GUI.getFontClass = function(type) {
      return Vue.prototype.g3wtemplate.getFontClass(type);
    };

  }
}, {});

Vue.mixin({ inheritAttrs: false });  // set mixins inheriAttrs to avoid tha unused props are setted as attrs

/**
 * @requires components/App.vue
 */
const layout = $.LayoutManager;

// loading spinner at beginning
layout.loading(true);

/**
 * ORIGINAL SOURCE: src/gui/app/index.js@3.4
 */
const ApplicationTemplate = function({ ApplicationService }) {
  const appLayoutConfig = ApplicationService.getConfig().layout || {};
  // useful to build a difference layout/component based on mobile or not
  this._isMobile = isMobile.any;
  this._isIframe = appLayoutConfig.iframe;
  //ussefult ot not close user message when set content is called
  this.sizes = {
    sidebar: {
      width:0
    }
  };
  /*
    usefully to show only last waiting request output
    at a moment will be an object
    {
      stop: method to sot to show a result
    }
   */
  this.waitingoutputdataplace = null;
  this.init = function() {
    // create Vue App
    this._createApp();
  };
  // create application config
  this._createTemplateConfig = function() {
    const appTitle                  = ApplicationService.getConfig().apptitle || 'G3W Suite';
    const ContentsComponent         = require('gui/viewport/contentsviewer');
    const CatalogComponent          = require('gui/catalog/vue/catalog');
    const SearchComponent           = require('gui/search/vue/search');
    const QueryBuilderUIFactory     = require('gui/querybuilder/querybuilderuifactory');
    const PrintComponent            = require('gui/print/vue/print');
    const MetadataComponent         = require('gui/metadata/vue/metadata');
    const ToolsComponent            = require('gui/tools/vue/tools');
    const WMSComponent              = require('gui/wms/vue/wms');
    const MapComponent              = require('gui/map/vue/map');
    const QueryResultsComponent     = require('gui/queryresults/vue/queryresults');
    const SpatialBookMarksComponent = require('gui/spatialbookmarks/vue/spatialbookmarks');
    return {
      title: appTitle,
      placeholders: {
        navbar: {
          components: []
        },
        sidebar: {
          components: [
            new MetadataComponent({
              id:          'metadata',
              open:        false,
              collapsible: false,
              icon:        GUI.getFontClass('file'),
              mobile:      true,
            }),
            new SpatialBookMarksComponent({
              id:          'spatialbookmarks',
              open:        false,
              collapsible: true,
              icon:        GUI.getFontClass('bookmark'),
              mobile:      true,
            }),
            new PrintComponent({
              id:          'print',
              open:        false,
              visible:     ApplicationService.getConfig().user.is_staff || (ProjectsRegistry.getCurrentProject().getPrint() || []).length > 0, /** @since 3.10.0 Check if the project has print layout*/
              collapsible: true, //  it used to manage click event if you can run setOpen component method
              icon:        GUI.getFontClass('print'),
              mobile:      false,
            }),
            new SearchComponent({
              id:         'search',
              open:        false,
              collapsible: true,
              icon:        GUI.getFontClass('search'),
              actions:     [
                {
                  id:      "querybuilder",
                  class:   `${GUI.getFontClass('calculator')} sidebar-button sidebar-button-icon`,
                  tooltip: t('sdk.querybuilder.title'),
                  fnc:     () => {
                    GUI.closeContent();
                    ApplicationTemplate.Services.sidebar.closeOpenComponents();
                    QueryBuilderUIFactory.show({ type: 'sidebar' });  // sidebar or modal
                  },
                  style: {
                    color:        '#8DC3E3',
                    padding:      '6px',
                    fontSize:     '1.2em',
                    borderRadius: '3px',
                    marginRight:  '5px'
                  }
              }],
              mobile: true,
            }),
            // Component that store plugins
            new ToolsComponent({
              id:          'tools',
              open:        false,
              collapsible: true,
              icon:        GUI.getFontClass('tools'),
              mobile:      true,
            }),
            new WMSComponent({
              id:          'wms',
              open:        false,
              collapsible: true,
              icon:        GUI.getFontClass('layers'),
              mobile:      true,
            }),
            new CatalogComponent({
              id: 'catalog',
              open: false,
              collapsible: false,
              isolate:     true,
              icon:        GUI.getFontClass('map'),
              mobile:      true,
              config:      { legend: { config: appLayoutConfig.legend } },
            }),
          ]
        },
        floatbar: { components: [] }
      },
      othercomponents: [
        new QueryResultsComponent({ id: 'queryresults' })
      ],
      viewport: {
        // placeholder of the content (view content). Secondary view (hidden)
        components: {
          map:     new MapComponent({ id: 'map' }),
          content: new ContentsComponent({ id: 'contents' })
        }
      }
    }
  };

  //Vue app
  this._createApp = function() {
    this._setDataTableLanguage();
    const self = this;
    if (isMobile.any || this._isIframe) {
      $('body').addClass('sidebar-collapse');
    }
    return new Vue({
      el: '#app',
      created() {
        // set general methods for the application as GUI.showForm etc ..
        self._setupInterface();
        // setup layout
        self._setupLayout();
        //register all services for the application
        self._setUpServices();
        // create templateConfig
        self.templateConfig = self._createTemplateConfig();
        // listen lng change and reset datatable language
        this.$watch(() => ApplicationState.language, () => self._setDataTableLanguage());
      },
      async mounted() {
        await this.$nextTick();
        self._buildTemplate();
        // setup Font, Css class methods
        $(document).localize();
        self._setViewport(self.templateConfig.viewport);
        const skinColor = $('.navbar').css('background-color');
        GUI.skinColor = skinColor && `#${skinColor.substr(4, skinColor.indexOf(')') - 4).split(',').map((color) => parseInt(color).toString(16)).join('')}`;
        await this.$nextTick();
        self.emit('ready');
        self.sizes.sidebar.width = $('.main-sidebar').width();
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
    Vue.component('app', App);
  };

  // dataTable Translations and custom extentions
  this._setDataTableLanguage = function(dataTable=null) {
    const languageOptions = {
      "language": {
        "sSearch": '',
        "searchPlaceholder": t("dosearch"),
        "sLengthMenu": t("dataTable.lengthMenu"),
        "paginate": {
          "previous": '«',
          "next": '»',
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
    !dataTable ? $.extend( true, $.fn.dataTable.defaults, languageOptions) : dataTable.dataTable( {"oLanguage": languageOptions});
  };

  // route setting at the beginning (is an example)
  this._addRoutes = function() {
    ApplicationService.getRouterService().addRoute('map/zoomto/{coordinate}/:zoom:', function(coordinate, zoom) {
      coordinate = _.map(coordinate.split(','), function(xy) {
        return Number(xy)
      });
      zoom = zoom ? Number(zoom): null;
      if (coordinate.length) {
        GUI.getService('map').on('ready', function() {
          this.zoomTo(coordinate, zoom);
        })
      }
    })
  };

  //register all services
  this._setUpServices = function() {
    Object
      .keys(ApplicationTemplate.Services)
      .forEach(element => ApplicationService.registerService(element, ApplicationTemplate.Services[element]));

    Object
      .values(GUI.getComponents())
      .forEach(component => ApplicationService.registerService(component.id, component.getService()));

    ApplicationTemplate.Services.viewport.on('resize', () => GUI.emit('resize'));
  };
  // build template function
  this._buildTemplate = function() {
    FloatbarService.init(layout);
    Object
      .entries(this.templateConfig.placeholders)
      .forEach(([placeholder, options]) => this._addComponents(options.components, placeholder));
    //register other components
    this._addOtherComponents();
  };

  //add component not related to placeholder
  this._addOtherComponents = function() {
    if (this.templateConfig.othercomponents) { this._addComponents(this.templateConfig.othercomponents) }
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
      if (placeholderService) {
        register = placeholderService.addComponents(components, options);
      }
    }
    Object.entries(components).forEach(([key, component])=> {
      if (register) {
        ComponentsRegistry.registerComponent(component);
        ApplicationService.registerService(component.id, component.getService())
      }
    })
  };

  this._removeComponent = function(componentId, placeholder, options) {
    if (placeholder && ApplicationTemplate.Services[placeholder]) {
      ApplicationTemplate.Services[placeholder].removeComponent(ComponentsRegistry.unregisterComponent(componentId), options);
    }
  };

  this._showModalOverlay = function(bool=false, message) {
    const mapService = GUI.getService('map');
    if (bool) { mapService.startDrawGreyCover(message) }
    else { mapService.stopDrawGreyCover() }
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
          if (error.result === false) {
            const { code='', data='', message:msg='' } = error.error;
            message = `${code.toUpperCase()} ${data} ${msg}`;
          }
        } else if (error.responseText) {
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
    /* PUBLIC INTERFACE */

    /* Common methods */
    GUI.layout = layout;
    GUI.getSize = ({ element, what }) => {
      if (element && what)
        return this.sizes[element][what];
    };

    GUI.addComponent    = this._addComponent.bind(this);
    GUI.removeComponent = this._removeComponent.bind(this);

    /* Metodos to define */
    GUI.getResourcesUrl = () => ApplicationService.getConfig().resourcesurl;

    //LIST
    GUI.showList        = FloatbarService.showPanel.bind(FloatbarService);
    GUI.closeList       = FloatbarService.closePanel.bind(FloatbarService);
    GUI.hideList        = FloatbarService.hidePanel.bind(FloatbarService);

    // TABLE
    GUI.showTable       = function() {};
    GUI.closeTable      = function() {};

    /**
     * Function called from DataRouterservice for gui output
     * @param dataPromise
     * @param options
     */
    GUI.outputDataPlace = async function(dataPromise, options = {}) {
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
      let queryResultsService = add ? GUI.getService('queryresults'): loading && this.showContentFactory('query')(title);
      this.waitingoutputdataplace = (() => {
        let stop = false;
        (async () =>{
          try {
            const data = await dataPromise;
            //if set before call method and wait
            before && await before(data);
            // in case of usermessage show user message
            if (data.usermessage) {
              GUI.showUserMessage({
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
              else  { GUI.closeContent() }
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

    GUI.showForm = function(options = {}) {
      const { perc, split = 'h', push, showgoback, crumb } = options;
      const FormComponent = require('gui/form/vue/form');
      // new isnstace every time
      const formComponent = options.formComponent ? new options.formComponent(options) : new FormComponent(options);
      //get service
      const formService = formComponent.getService();
      // parameters : [content, title, push, perc, split, closable, crumb]
      GUI.setContent({
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
    };

    /**
     *
     * @param pop remove or not content or pop
     */
    GUI.closeForm = function({ pop = false } = {}) {
      this.emit('closeform', false);
      if (pop) { GUI.popContent()}
      else { ViewportService.removeContent() }
      // force set modal to false
      GUI.setModal(false);
    };

    GUI.disableElement = function({element, disable}) {
      $(element)[disable ? 'addClass' : 'removeClass']('g3w-disabled');
    };

    GUI.disableContent = function(disable) {
      ViewportService.disableContent(disable);
    };

    GUI.disablePanel = function(disable=false) {
      GUI.disableElement({
        element: "#g3w-sidebarpanel-placeholder",
        disable
      })
    };

    // hide content
    GUI.hideContent = function(bool, perc) {
      return ViewportService.hideContent(bool, perc);
    };

    GUI.closeContent = function() {
      this.emit('closecontent', false);
      return ViewportService.closeContent();
    };

    GUI.closeOpenSideBarComponent = function() {
      ApplicationTemplate.Services.sidebar.closeOpenComponents();
    };

    // show results info/search
    GUI.showQueryResults = function(title, results) {
      const queryResultsComponent = GUI.getComponent('queryresults');
      const queryResultService    = queryResultsComponent.getService();
      queryResultService.reset();
      if (results) {
        queryResultService.setQueryResponse(results);
      }
      GUI.showContextualContent({
        content:    queryResultsComponent,
        title:      "info.title",
        crumb:      { title: "info.title", trigger: null },
        push:       GUI.getPushContent(),
        post_title: title
      });

      return queryResultService;
    };

    GUI.addNavbarItem = function(item) {
      NavbarItemsService.addItem(item)
    };

    GUI.removeNavBarItem = function() {};

    GUI.showPanel  = SidebarService.showPanel.bind(SidebarService);

    GUI.closePanel = SidebarService.closePanel.bind(SidebarService);

    ///
    GUI.disableApplication = function(bool = false) {
      ApplicationService.disableApplication(bool);
    };

    //showusermessage
    GUI.showUserMessage = function(options = {}) {
      return ViewportService.showUserMessage(options);
    };

    GUI.closeUserMessage = function() {
      ViewportService.closeUserMessage();
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

    // proxy bootbox library
    GUI.dialog = bootbox;

    //modal dialog//
    GUI.showModalDialog = function(options = {}) {
      return GUI.dialog.dialog(options);
    };

    /* spinner */
    GUI.showSpinner = function(options = {}) {
      const container   = options.container || 'body';
      const id          = options.id || 'loadspinner';
      const where       = options.where || 'prepend'; // append | prepend
      const style       = options.style || '';
      const transparent = options.transparent ? 'background-color: transparent' : '';
      const center      = options.center ? 'margin: auto' : '';
      if (!$(`#${id}`).length) {
        $(container)[where].call($(container),`<div id="${id}" class="spinner-wrapper ${style}" style="${transparent}"><div class="spinner ${style}" style="${center}"></div></div>`);
      }
    };

    //hide spinner
    GUI.hideSpinner = function(id = 'loadspinner') {
      $(`#${id}`).remove();
    };

    /* end spinner*/
    /* end common methods */

    /*  */

    // FLOATBAR //
    GUI.showFloatbar = function() {
      FloatbarService.open();
    };

    GUI.hideFloatbar = function() {
      FloatbarService.close();
    };

    // SIDEBAR //
    GUI.showSidebar      = this._showSidebar.bind(this);
    GUI.hideSidebar      = this._hideSidebar.bind(this);
    GUI.isSidebarVisible = this._isSidebarVisible.bind(this);

    // RELOAD COMPONENTS
    GUI.reloadComponents = function() {
      ApplicationTemplate.Services.sidebar.reloadComponents();
    };

    // MODAL
    GUI.setModal = this._showModalOverlay.bind(this);

    /**
     * Toggle set full screen modal
     */
    GUI.showFullModal = function({element = "#full-screen-modal", show = true} = {}) {
      $(element).modal(show ? 'show' : 'hide')
    };

    GUI.disableSideBar = function(bool = true) {
      ApplicationState.gui.sidebar.disabled = bool;
    };

    // VIEWPORT //
    GUI.setPrimaryView = function(viewName) {
      ViewportService.setPrimaryView(viewName);
    };

    // only map
    GUI.showMap = function() {
      ViewportService.showMap();
    };

    GUI.showContextualMap = function(perc = 30, split) {
      ViewportService.showContextualMap({ perc, split });
    };

    GUI.setContextualMapComponent = function(mapComponent) {
      ViewportService.setContextualMapComponent(mapComponent);
    };

    GUI.resetContextualMapComponent = function() {
      ViewportService.resetContextualMapComponent();
    };

    //  (100%) content
    GUI.showContent = (options = {}) => {
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
    // Differences between pushContent and setContent are:
    //  - push every component is added, set is refreshed
    //  - pushContent has a new parameter (backonclose) when is clicked x
    //  - the contentComponent is close all stacks are closed
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
      ViewportService.popContent();
    };
    //return number of a component of stack
    GUI.getContentLength = function() {
      return ViewportService.contentLength();
    };

    GUI.getCurrentContentTitle = function() {
      return ViewportService.getCurrentContentTitle();
    };

    GUI.getCurrentContentId = function() {
      return ViewportService.getCurrentContentId();
    };

    /**
     * change current content title
     * @param title
     */
    GUI.changeCurrentContentTitle = function(title) {
      ViewportService.changeCurrentContentTitle(title);
    };

    /**
     * change current content options
     * @param options: {title, crumb}
     */
    GUI.changeCurrentContentOptions= function(options={}) {
      ViewportService.changeCurrentContentOptions(options);
    };

    /**
     * Method to get current content
     */
    GUI.getCurrentContent = function() {
      return ViewportService.getCurrentContent();
    };

    GUI.toggleFullViewContent = function() {
      ViewportService.toggleFullViewContent();
    };

    GUI.resetToDefaultContentPercentage = function() {
      ViewportService.resetToDefaultContentPercentage();
    };

    GUI.getProjectMenuDOM = function({ projects = [], host, cbk } = {}) {
      const projectVueMenuComponent = new ProjectsMenuComponent({
        projects: projects && Array.isArray(projects) && projects,
        cbk,
        host
      }).getInternalComponent();
      return projectVueMenuComponent.$mount().$el;
    };

    GUI.setCloseUserMessageBeforeSetContent = function(bool = true) {
      this._closeUserMessageBeforeSetContent = bool;
    };

    GUI._setContent = (options={}) => {
      if (this._closeUserMessageBeforeSetContent) { GUI.closeUserMessage() }
      options.content     = options.content || null;
      options.title       = options.title || "";
      options.push        = _.isBoolean(options.push) ? options.push : false;
      options.perc        = this._isMobile ? 100 : options.perc;
      options.split       = options.split || 'h';
      options.backonclose = _.isBoolean(options.backonclose) ? options.backonclose : false;
      options.showtitle   = _.isBoolean(options.showtitle) ? options.showtitle : true;
      ViewportService.showContent(options);
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

    GUI.getTemplateClass = function({ element, type } = {}) {
      return BootstrapVersionClasses[element][type];
    };

    GUI.setLoadingContent = function(loading = false) {
      ApplicationTemplate.Services.viewport.setLoadingContent(loading);
      return loading && new Promise((resolve) => setTimeout(resolve, 200))
    };

    GUI.openProjectsMenu = function() {
      if (GUI.getComponent('contents').getComponentById('projectsmenu')) {
        GUI.closeContent();
        return;
      }
      if (this.isMobile()) {
        GUI.hideSidebar();
        $('#main-navbar.navbar-collapse').removeClass('in');
      }
      ApplicationTemplate.Services.sidebar.closeOpenComponents();
      GUI.setContent({
        content: new ProjectsMenuComponent(),
        title:   '',
        perc:    100
      });
    };

    /**
     * @since 3.8.0
     */
    GUI.openChangeMapMenu = function() {
      if (GUI.getComponent('contents').getComponentById('changemapmenu')) {
        GUI.closeContent();
        return;
      }
      if (this.isMobile()) {
        GUI.hideSidebar();
        $('#main-navbar.navbar-collapse').removeClass('in');
      }
      ApplicationTemplate.Services.sidebar.closeOpenComponents();
      GUI.setContent({
        content: new ChangeMapMenuComponent(),
        title: '',
        perc: 100
      });
    };

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
  navbar:   null,
  sidebar:  SidebarService,
  viewport: ViewportService,
  floatbar: null
};

ApplicationTemplate.fail = function({ error }) {
  layout.loading(false);
  new Vue({
    el: '#app',
    ...Vue.compile(
      `<div class="error-initial-page skin-background-color">
        <template v-if="isMobile()">
          <h3 class="oops">Oops!</h3>
          <h5 class="cause">${ error || t('error_page.error') }</h5>
          <h6 class="at-moment">${ t('error_page.at_moment') }</h6>
          <h4 class="f5">${ t('error_page.f5') }</h4>
        </template>
        <template v-else>
          <h1 class="oops">Oops!</h1>
          <h1 class="cause">${ error || t('error_page.error') }</h1>
          <h3 class="at-moment">${ t('error_page.at_moment') }</h3>
          <h2 class="f5">${ t('error_page.error') }</h2>
        </template>
      </div>`
    )
  });
};

/**
 * Application starting point
 *
 * create the ApplicationTemplate instance passing template interface configuration
 * and the applicationService instance that is useful to work with project API
 */
ApplicationService.init()
  .then(() => {
    const app = new ApplicationTemplate({ ApplicationService });
    app.on('ready', () => ApplicationService.postBootstrap());
    app.init();
  })
  .catch(({ error = null, language }) => {
    if (error) {
      if (error.responseJSON && error.responseJSON.error.data) { error = error.responseJSON.error.data }
      else if (error.statusText) { error = error.statusText }
    }
    console.error(error);
    ApplicationTemplate.fail({ error });
  });
