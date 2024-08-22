/**
 * @file Production entry point (app.min.js)
 * @since v3.8
 */

// include backward compatibilies
import './deprecated';

// expose global variables
import './globals';

//import core
import ApplicationState        from 'store/application-state';
import ProjectsRegistry        from 'store/projects';
import { BarStack }            from 'core/g3w-barstack';

//import services
import ApplicationService      from 'services/application';
import GUI                     from 'services/gui';

// import store
import ComponentsRegistry      from 'store/components';

//components
import App                     from 'components/App.vue';
import ImageComponent          from 'components/GlobalImage.vue';
import GalleryImagesComponent  from 'components/GlobalGallery.vue';
import GeospatialComponet      from 'components/GlobalGeo.vue';
import Skeleton                from 'components/GlobalSkeleton.vue';
import BarLoader               from 'components/GlobalBarLoader.vue';
import Progressbar             from 'components/GlobalProgressBar.vue';
import HelpDiv                 from 'components/GlobalHelpDiv.vue';
import Resize                  from 'components/GlobalResize.vue'
import LayerPositions          from 'components/GlobalLayerPositions.vue';
import DateTime                from 'components/GlobalDateTime.vue';
import Range                   from 'components/GlobalRange.vue';
import ResizeIcon              from 'components/GlobalResizeIcon.vue';
import Tabs                    from 'components/GlobalTabs.vue';
import Divider                 from 'components/GlobalDivider.vue';

//directives
import vDisabled               from 'directives/v-disabled';
import vChecked                from 'directives/v-checked';
import vSelectedFirst          from 'directives/v-selected-first';
import vSelect2                from 'directives/v-select2';
import vTToltip                from 'directives/v-t-tooltip';
import vTHtml                  from 'directives/v-t-html';
import vTPlaceholder           from 'directives/v-t-placeholder';
import vTTitle                 from 'directives/v-t-title';
import vT                      from "directives/v-t";
import vTPlugin                from 'directives/v-t-plugin';
import vPlugins                from 'directives/v-plugins';
import vOnline                 from 'directives/v-online';
import vDownload               from 'directives/v-download';
import vClickOutside           from 'directives/v-click-outside'

// constants
import { FONT_AWESOME_ICONS }  from 'app/constant';

const { t, tPlugin }           = require('core/i18n/i18n.service');

/** @TODO make it simpler / move it into better place */
ApplicationState.sidebar.stack = new BarStack();

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

  }
}, {});

Vue.mixin({ inheritAttrs: false });  // set mixins inheriAttrs to avoid tha unused props are setted as attrs

// loading spinner at beginning
$('body').append(`<div id="startingspinner"><div class="double-bounce1"></div><div class="double-bounce2"></div></div>`)

ApplicationState.viewport.immediate_layout = true;

// service know by the applications (standard)
const SERVICES = {
  navbar:   null,
  sidebar:  null,
  viewport: null,
};

let templateConfig;

// dataTable Translations and custom extentions
function _setDataTableLanguage(dataTable=null) {
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
}

// add component to template
function _addComponent(component, placeholder, options={}) {
  _addComponents([component], placeholder, options);
  return true;
};

// registry component
function _addComponents(components, placeholder, options = {}) {
  let register = true;
  if (placeholder && Object.keys(SERVICES).indexOf(placeholder) > -1) {
    const placeholderService = SERVICES[placeholder];
    // add component to the sidebar and set position inside the sidebar
    if ('sidebar' === placeholder) {
      components.forEach(comp => {
        if (!isMobile.any || false !== comp.mobile) {
          ApplicationState.sidebar.components.push(comp);
          (new (Vue.extend(require('components/SidebarItem.vue')))({ component: comp, opts: options })).$mount();
        }
      });
      register = true;
    } else if (placeholderService) {
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

/**
 * Application starting point
 *
 * create the ApplicationTemplate instance passing template interface configuration
 * and the applicationService instance that is useful to work with project API
 */
ApplicationService.init()
  .then(() => {
    const appLayoutConfig = ApplicationService.getConfig().layout || {};

    // create Vue App
    _setDataTableLanguage();

    if (isMobile.any || appLayoutConfig.iframe) {
      $('body').addClass('sidebar-collapse');
    }

    new Vue({
      el: '#app',
      created() {

        GUI.addComponent = _addComponent;

        Vue.component('app', App);

        //register all services for the application
        Object.keys(SERVICES)             .forEach(element   => ApplicationService.registerService(element, SERVICES[element]));   
        Object.values(GUI.getComponents()).forEach(component => ApplicationService.registerService(component.id, component.getService()));
          
        // create templateConfig
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
        templateConfig = {
          title: ApplicationService.getConfig().apptitle || 'G3W Suite',
          placeholders: {
            navbar: {
              components: []
            },
            sidebar: {
              components: [
                new MetadataComponent({
                  id:          'metadata',
                  collapsible: false,
                  icon:        GUI.getFontClass('file'),
                  iconColor:   '#fff',
                }),
                new SpatialBookMarksComponent({
                  id:          'spatialbookmarks',
                  icon:        GUI.getFontClass('bookmark'),
                  iconColor:   '#00bcd4',
                }),
                new PrintComponent({
                  id:          'print',
                  visible:     ApplicationService.getConfig().user.is_staff || (ProjectsRegistry.getCurrentProject().getPrint() || []).length > 0, /** @since 3.10.0 Check if the project has print layout*/
                  icon:        GUI.getFontClass('print'),
                  iconColor:   '#FF9B21',
                }),
                new SearchComponent({
                  id:         'search',
                  icon:        GUI.getFontClass('search'),
                  iconColor:   '#8dc3e3',
                  actions:     [
                    {
                      id:      "querybuilder",
                      class:   `${GUI.getFontClass('calculator')} sidebar-button sidebar-button-icon`,
                      tooltip: t('sdk.querybuilder.title'),
                      fnc:     () => {
                        GUI.closeContent();
                        GUI.closeOpenSideBarComponent();
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
                }),
                // Component that store plugins
                new ToolsComponent({
                  id:          'tools',
                  icon:        GUI.getFontClass('tools'),
                  iconColor:   '#FFE721',
                }),
                new WMSComponent({
                  id:          'wms',
                  icon:        GUI.getFontClass('layers'),
                }),
                new CatalogComponent({
                  id:          'catalog',
                  icon:        GUI.getFontClass('map'),
                  iconColor:   '#019A4C',
                  config:      { legend: { config: appLayoutConfig.legend } },
                }),
              ]
            },
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
        // listen lng change and reset datatable language
        this.$watch(() => ApplicationState.language, () => _setDataTableLanguage());
      },
      async mounted() {
        await this.$nextTick();

        // build template
        Object
          .entries(templateConfig.placeholders)
          .forEach(([placeholder, options]) => _addComponents(options.components, placeholder));

          //register other components
        if (templateConfig.othercomponents) {
          _addComponents(templateConfig.othercomponents);
        }

        // setup Font, Css class methods
        $(document).localize();

        // set viewport
        // add component (map and content)
        Object
        .entries(templateConfig.viewport.components)
        .forEach(([viewName, component]) => {
          // check if component are map or content
          if (Object.keys(ApplicationState.viewport.components).indexOf(viewName) > -1) {
            component.mount(`#g3w-view-${viewName}`, true)
              .then(() => {
                ApplicationState.viewport.components[viewName] = component;
                // check if view name is map
                if ('map' === viewName) {
                  ApplicationState.viewport.map_component = component;
                } // set de default component to map
              })
              .fail(e => console.warn(e));
          }
        })
        _addComponents(templateConfig.viewport.components);

        const skinColor = $('.navbar').css('background-color');
        GUI.skinColor = skinColor && `#${skinColor.substr(4, skinColor.indexOf(')') - 4).split(',').map((color) => parseInt(color).toString(16)).join('')}`;
        await this.$nextTick();
        ApplicationService.postBootstrap()
        ApplicationState.sizes.sidebar.width = $('.main-sidebar').width();
        //getSkinColor
        GUI.ready();
      }
    });
  })
  .catch(({ error = null, language }) => {
    if (error) {
      if (error.responseJSON && error.responseJSON.error.data) { error = error.responseJSON.error.data }
      else if (error.statusText) { error = error.statusText }
    }
    console.error(error);
    $('#startingspinner').remove();
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
