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

//import services
import ApplicationService        from 'services/application';
import viewport                  from 'services/viewport';
import GUI                       from 'services/gui';
import FloatbarService           from 'services/floatbar';
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
import BarLoader                 from 'components/GlobalBarLoader';
import Progressbar               from 'components/GlobalProgressBar';
import HelpDiv                   from 'components/GlobalHelpDiv.vue';
import Resize                    from 'components/GlobalResize.vue'
import LayerPositions            from 'components/GlobalLayerPositions.vue';
import DateTime                  from 'components/GlobalDateTime.vue';
import Range                     from 'components/GlobalRange.vue';
import ResizeIcon                from 'components/GlobalResizeIcon.vue';
import Tabs                      from 'components/GlobalTabs.vue';
import Divider                   from 'components/GlobalDivider.vue';
import FloatbarComponent         from 'components/Floatbar.vue';
import NavbaritemsLeftComponent  from 'components/NavbaritemsLeft.vue';
import NavbaritemsRightComponent from 'components/NavbaritemsRight.vue';
import SidebarComponent          from 'components/Sidebar.vue';
import ViewportComponent         from 'components/Viewport.vue';

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

// constants
import { FONT_AWESOME_ICONS }    from 'app/constant';

const { base, inherit }          = require('core/utils/utils');
const { t, tPlugin }             = require('core/i18n/i18n.service');
const G3WObject                  = require('core/g3wobject');

/**
 * Install global components
 *
 * ORIGINAL SOURCE: src/app/gui/vue/vue.globalcomponents.js@3.6
 */
Vue.component(ImageComponent.name,         ImageComponent);
Vue.component(GalleryImagesComponent.name, GalleryImagesComponent);
Vue.component(GeospatialComponet.name,     GeospatialComponet);
Vue.component(BarLoader.name,              BarLoader);
Vue.component(Progressbar.name,            Progressbar);
Vue.component(Skeleton.name,               Skeleton);
Vue.component(HelpDiv.name,                HelpDiv);
Vue.component(Resize.name,                 Resize);
Vue.component(LayerPositions.name,         LayerPositions);
Vue.component(DateTime.name,               DateTime);
Vue.component(Range.name,                  Range);
Vue.component(ResizeIcon.name,             ResizeIcon);
Vue.component(Tabs.name,                   Tabs);
Vue.component(Divider.name,                Divider);
Vue.component('sidebar',                   SidebarComponent);
Vue.component('navbarleftitems',           NavbaritemsLeftComponent);
Vue.component('navbarrightitems',          NavbaritemsRightComponent);
Vue.component('viewport',                  ViewportComponent);
Vue.component('floatbar',                  FloatbarComponent);
Vue.component('app',                       App);

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
Vue.directive("disabled",       vDisabled);
Vue.directive("checked",        vChecked);
Vue.directive("selected-first", vSelectedFirst);
Vue.directive('select2',        vSelect2);
Vue.directive('t-tooltip',      vTToltip);
Vue.directive('t-html',         vTHtml);
Vue.directive('t-placeholder',  vTPlaceholder);
Vue.directive('t-title',        vTTitle);
Vue.directive("t",              vT);
Vue.directive("t-plugin",       vTPlugin);
Vue.directive("plugins",        vPlugins);
Vue.directive("online",         vOnline);
Vue.directive("download",       vDownload);


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
      addFontClass({name, className}={}) {
        let added = this.font[name] === undefined;
        if (added) this.font[name] = className;
        return added;
      },
      /**
       * @TODO check if deprecated
       */
      getInfoString() {},
      getFontClass(type) {
        return typeof this.font[type] !== "undefined" ? this.font[type] : '';
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
  }
}, {});

Vue.mixin({ inheritAttrs: false });  // set mixins inheriAttrs to avoid tha unused props are setted as attrs

/**
 * @requires components/App.vue
 */
const layout = $.LayoutManager;

// loading spinner at beginning
layout.loading(true);

// dataTable Translations and custom extentions 
const setDataTableLanguage = function(dataTable = null) {
  const languageOptions = {
    "language": {
      "sSearch": '',
      "searchPlaceholder": t("dosearch"),
      "sLengthMenu":       t("dataTable.lengthMenu"),
      "paginate": {
        "previous":        t("dataTable.previous"),
        "next":            t("dataTable.next"),
      },
      "info":              t("dataTable.info"),
      "zeroRecords":       t("dataTable.nodatafilterd"),
      "infoFiltered":      '',
    }
  };
  // set form control class to filter
  $.extend( $.fn.dataTableExt.oStdClasses, { "sFilterInput": "form-control search" });
  if (dataTable) {
    dataTable.dataTable({ "oLanguage": languageOptions });
  } else {
    $.extend( true, $.fn.dataTable.defaults, languageOptions);
  }
};

/**
 * ORIGINAL SOURCE: src/gui/app/index.js@3.4
 * 
 * @deprecated since 3.9.0. Will be removed in 4.0.0. (create your own vue app instead..) 
 */
const ApplicationTemplate = function({ApplicationService}) {

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

  /**
   * usefull to show onaly last waiting request output
   * at moment will be an object
   * {
   * stop: method to sot to show result
   * }
   */
  this.waitingoutputdataplace = null;

  /**
   * @deprecated since 3.9.0. Will be removed in 4.0.0. 
   */
  this.init = function() {
    console.warn('ApplicationTemplate class will be removed in v4.0.0, please create your own vue app instead..');
  };

  /**
   * route setting at beginning (is an example)
   */
  this._addRoutes = function() {
    ApplicationService
      .getRouterService()
      .addRoute(
        'map/zoomto/{coordinate}/:zoom:',
        function(coordinate, zoom) {
          coordinate = _.map(coordinate.split(','), (xy) => Number(xy));
          zoom       = zoom ? Number(zoom): null;
          if (coordinate.length) {
            GUI.getComponent('map').getService().on('ready', function() {
              this.zoomTo(coordinate, zoom);
            })
          }
        }
      );
  };

  /**
   * add component to template
   */
  this._addComponent = function(component, placeholder, options={}) {
    this._addComponents([component], placeholder, options);
    return true;
  };

  // registry component
  this._addComponents = function(components, placeholder, options) {
    let register = true;
    if (
      placeholder &&
      ApplicationTemplate.PLACEHOLDERS.indexOf(placeholder) > -1 &&
      ApplicationTemplate.Services[placeholder]
    ) {
      register = ApplicationTemplate.Services[placeholder].addComponents(components, options);
    }

    Object
      .entries(components)
      .forEach(([ key, component ]) => {
        if (register) {
          ComponentsRegistry.registerComponent(component);
          ApplicationService.registerService(component.id, component.getService())
        }
      });
  };

  this._removeComponent = function(id, placeholder, options) {
    const component = ComponentsRegistry.unregisterComponent(id);
    if (placeholder && ApplicationTemplate.Services[placeholder]) {
     ApplicationTemplate.Services[placeholder].removeComponent(component, options);
    }
  };

  this._showModalOverlay = function(bool = false, message) {
    const mapService = GUI.getService('map');
    if (bool) mapService.startDrawGreyCover(message);
    else      mapService.stopDrawGreyCover();
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
  sidebar: SidebarService,
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
 * Application starting point (Create Vue App)
 *
 * create the ApplicationTemplate instance passing template interface configuration
 * and the applicationService instance that is useful to work with project API
 */
ApplicationService.init()
  .then(() => {
    const app = new ApplicationTemplate({ ApplicationService });

    setDataTableLanguage();

    if (isMobile.any || app._isIframe) {
      $('body').addClass('sidebar-collapse');
    }
    
    return new Vue({

      el: '#app',

      /**
       * 1. setup Interaces: general metods for the application as GUI.showForm etc ..
       * 2. setup layout: setup map controls and inizialize the components of the application (eg. navbar custom items)
       * 3. register all services for the application
       * 4. create templateConfig
       * 5. listen lng change and reset datatable language
       */
      created() {

        // setup interfaces and create application config
        app.templateConfig = GUI.init({
          app,
          layout,
          service:  ApplicationService,
          floatbar: FloatbarService,
          viewport: ViewportService,
          navbar:   NavbarItemsService,
          sidebar:  SidebarService,
          state:    ApplicationState,
        });
    
        this.$watch( () => ApplicationState.language, () => { setDataTableLanguage(); } );
      },

      /**
       * 1. build template
       * 2. register other components
       * 3. setup Fonts Css class methods
       */
      async mounted() {

        await this.$nextTick();

        // build template, register other components, setup Fonts Css class methods (vendor dependencies ?)
        GUI.setup_deps({
          app,
          floatbar: FloatbarService,
          VueApp: this,
        }); 

        await this.$nextTick();

        app.sizes.sidebar.width = $('#g3w-sidebar').width();
        GUI.ready(); // getSkinColor
        ApplicationService.postBootstrap()
      },

    });
  })
  .catch(({ error=null, language }) => {
    if (error) {
      if (error.responseJSON && error.responseJSON.error.data) error = error.responseJSON.error.data;
      else if (error.statusText) error = error.statusText;
    }
    console.error(error);
    ApplicationTemplate.fail({ error });
  });