/**
 * @file Production entry point (app.min.js)
 * @since v3.8
 */

// include backward compatibilies
import './deprecated';

// expose global variables
import './globals';

// core
import ApplicationState          from 'store/application-state';

// services
import ApplicationService        from 'services/application';
import GUI                       from 'services/gui';
import FloatbarService           from 'services/floatbar';
import NavbarItemsService        from 'services/navbaritems';
import SidebarService            from 'services/sidebar';
import ViewportService           from 'services/viewport';

// components
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
import FloatbarComponent         from 'components/Floatbar.vue';
import NavbaritemsLeftComponent  from 'components/NavbaritemsLeft.vue';
import NavbaritemsRightComponent from 'components/NavbaritemsRight.vue';
import SidebarComponent          from 'components/Sidebar.vue';
import ViewportComponent         from 'components/Viewport.vue';

// directives
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

const { t, tPlugin }             = require('core/i18n/i18n.service');

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
Vue.filter('t',                            value => t(value));
Vue.filter('tPlugin',                      value => value !== null ? tPlugin(value) : '');

/**
 * Install global directives
 *
 * ORIGINAL SOURCE: src/app/gui/vue/vue.directives.js@v3.6
 */
Vue.directive("disabled",                  vDisabled);
Vue.directive("checked",                   vChecked);
Vue.directive("selected-first",            vSelectedFirst);
Vue.directive('select2',                   vSelect2);
Vue.directive('t-tooltip',                 vTToltip);
Vue.directive('t-html',                    vTHtml);
Vue.directive('t-placeholder',             vTPlaceholder);
Vue.directive('t-title',                   vTTitle);
Vue.directive("t",                         vT);
Vue.directive("t-plugin",                  vTPlugin);
Vue.directive("plugins",                   vPlugins);
Vue.directive("online",                    vOnline);
Vue.directive("download",                  vDownload);


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
 * Loading spinner start
 * 
 * @requires components/App.vue
 */
$.LayoutManager.loading(true);

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
 * Application starting point (Create Vue App)
 *
 * create the ApplicationTemplate instance passing template interface configuration
 * and the applicationService instance that is useful to work with project API
 */
ApplicationService.init()
  .then(() => {

    setDataTableLanguage();

    if (ApplicationService.ismobile || (ApplicationService.getConfig().layout || {}).iframe) {
      $('body').addClass('sidebar-collapse');
    }
    
    return new Vue({

      el: '#app',

      /**
       * 1. setup Interaces: general methods for the application as GUI.showForm etc ..
       * 2. setup layout: setup map controls and inizialize the components of the application (eg. navbar custom items)
       * 3. register all services for the application
       * 4. create templateConfig
       * 5. listen lng change and reset datatable language
       */
      created() {

        // setup interfaces and create application config
        GUI.init({
          app:      ApplicationService,
          floatbar: FloatbarService,
          viewport: ViewportService,
          navbar:   NavbarItemsService,
          sidebar:  SidebarService,
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
          floatbar: FloatbarService,
          VueApp: this,
        }); 

        await this.$nextTick();

        GUI.sizes.sidebar.width = $('#g3w-sidebar').width();
        GUI.ready(); // getSkinColor

        ApplicationService.postBootstrap()
      },

    });
  })
  .catch((e) => {
    let { error=null, language } = e;

    if (error && error.responseJSON && error.responseJSON.error.data) {
      error = error.responseJSON.error.data;
    } else if (error && error.statusText) {
      error = error.statusText;
    }

    console.error(e || error);

    /**
     * Loading spinner end
     * 
     * @requires components/App.vue
     */
    $.LayoutManager.loading(false);

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

  });
