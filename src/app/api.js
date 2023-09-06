/**
 * @file api file interface for external plugins
 */

import G3W_CONSTANT                from 'constant';

import ApplicationState            from 'store/application-state';
import ApplicationService          from 'services/application';

/**
 * Single File Components
 */
import G3WInput                    from 'components/G3WInput.vue';
import G3WField                    from 'components/G3WField.vue';
import FormBody                    from 'components/FormBody.vue';
import FormFooter                  from 'components/FormFooter.vue';
import C3XYLine                    from 'components/C3XYLine.vue';

/**
 * CORE modules
 */
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import DataRouterService           from 'services/data';
import ChangesManager              from 'services/editing';
import SessionsRegistry            from 'store/sessions';
import IFrameRouterService         from 'services/iframe-plugin';
import MapLayersStoresRegistry     from 'store/map-layers';
import PluginsRegistry             from 'store/plugins';
import ProjectsRegistry            from 'store/projects';
import RelationsService            from 'services/relations';
import TaskService                 from 'services/tasks';
import WorkflowsStack              from 'services/workflows';
import ApiService                  from 'services/api';
import RouterService               from 'services/router';

import GUI                         from 'services/gui';
import Mixins                      from 'mixins';

const G3WObject                    = require('core/g3wobject');
const utils                        = require('core/utils/utils');
const geoutils                     = require('core/utils/geo');
const i18n                         = require('core/i18n/i18n.service');
const Server                       = require('core/errors/parser/servererrorparser');
const Session                      = require('core/editing/session');
const Editor                       = require('core/editing/editor');
const Geom                         = require('core/utils/geo');
const { Geometry }                 = require('core/utils/geo');
const Project                      = require('core/project/project');
const LayersStoreRegistry          = require('core/layers/layersstoresregistry');
const LayersStore                  = require('core/layers/layersstore');
const Layer                        = require('core/layers/layer');
const LayerFactory                 = require('core/layers/layerfactory');
const TableLayer                   = require('core/layers/tablelayer');
const VectorLayer                  = require('core/layers/vectorlayer');
const ImageLayer                   = require('core/layers/imagelayer');
const WmsLayer                     = require('core/layers/map/wmslayer');
const XYZLayer                     = require('core/layers/map/xyzlayer');
const MapLayer                     = require('core/layers/map/maplayer');
const Feature                      = require('core/layers/features/feature');
const FeaturesStore                = require('core/layers/features/featuresstore');
const OlFeaturesStore              = require('core/layers/features/olfeaturesstore');
const Filter                       = require('core/layers/filter/filter');
const Expression                   = require('core/layers/filter/expression');
const Plugin                       = require('core/plugin/plugin');
const PluginService                = require('core/plugin/pluginservice');
const Task                         = require('core/workflow/task');
const Step                         = require('core/workflow/step');
const Flow                         = require('core/workflow/flow');
const Workflow                     = require('core/workflow/workflow');

/**
 * GUI modules
 */
const Panel                        = require('gui/panel');
const ControlFactory               = require('gui/map/control/factory');
const ComponentsFactory            = require('gui/component/componentsfactory');
const FieldsService                = G3WField.methods.getFieldService();
const Component                    = require('gui/component/component');
const MetadataComponent            = require('gui/metadata/vue/metadata');
const SearchComponent              = require('gui/search/vue/search');
const SearchPanel                  = require('gui/search/vue/panel/searchpanel');
const PrintComponent               = require('gui/print/vue/print');
const CatalogComponent             = require('gui/catalog/vue/catalog');
const MapComponent                 = require('gui/map/vue/map');
const ToolsComponent               = require('gui/tools/vue/tools');
const QueryResultsComponent        = require('gui/queryresults/vue/queryresults');
const FormComponent                = require('gui/form/vue/form');
const FormService                  = require('gui/form/formservice');
const ChartsFactory                = require('gui/charts/chartsfactory');
const Fields                       = G3WField.components;
const InputsComponents             = G3WInput.components;
const SearchPanelService           = require('gui/search/vue/panel/searchservice');

/**
 * G3W-OL modules
 */
const PickFeatureInteraction       = require('g3w-ol/interactions/pickfeatureinteraction');
const PickCoordinatesInteraction   = require('g3w-ol/interactions/pickcoordinatesinteraction');
const DeleteFeatureInteraction     = require('g3w-ol/interactions/deletefeatureinteraction');
const AreaInteraction              = require('g3w-ol/interactions/areainteraction');
const LengthInteraction            = require('g3w-ol/interactions/lengthinteraction');
const g3wolutils                   = require('core/utils/ol');

const deprecate                    = require('util-deprecate');

/**
 * Test assertions
 */
Object
  .entries({
    G3WInput,
    G3WField,
    InputsComponents,
    FieldsService,
    Fields,
  })
  .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

const g3wsdk = {

  // APP CONSTANTS
  constant: G3W_CONSTANT, // TODO: rename to "constants" which is more appropriate (in version 4.0)

  // CORE API METHODS AND OBJECTS
  core: {
    G3WObject,
    utils,
    geoutils,
    ApplicationService,
    ApplicationState,
    ApiService,
    Router: RouterService,
    i18n,
    task: {
      TaskService
    },
    data: {
      DataRouterService
    },
    iframe: {
      IFrameRouterService
    },
    errors: {
      parsers: {
        Server
      }
    },
    editing: {
      Session,
      SessionsRegistry,
      Editor,
      ChangesManager
    },
    geometry: {
      Geom,
      Geometry
    },
    project: {
      ProjectsRegistry,
      Project
    },
    map: {
      MapLayersStoreRegistry: MapLayersStoresRegistry
    },
    catalog: {
      CatalogLayersStoresRegistry
    },
    layer: {
      LayersStoreRegistry,
      LayersStore,
      Layer,
      LayerFactory,
      TableLayer,
      VectorLayer,
      ImageLayer,
      WmsLayer,
      XYZLayer,
      MapLayer,
      geometry: {
        Geometry,
        geom: Geom /** @FIXME capitalize first letter (ie. "Geom") */
      },
      features: {
        Feature,
        FeaturesStore,
        OlFeaturesStore
      },
      filter: {
        Filter,
        Expression
      }
    },
    relations: {
      RelationsService
    },
    interaction: {
      PickCoordinatesInteraction,
      PickFeatureInteraction
    },
    plugin: {
      Plugin,
      PluginsRegistry,
      PluginService
    },
    workflow: {
      Task,
      Step,
      Flow,
      Workflow,
      WorkflowsStack
    },
    input: {
      inputService: {
        handleFilterExpressionFormInput: FormService._getFilterExpression,
        handleDefaultExpressionFormInput: FormService._getDefaultExpression,
      }
    }
  },

  // APPLICATION INTERFACE (vue)
  gui: {
    GUI,
    Panel,
    ControlFactory,
    ComponentsFactory,
    FieldsService,
    vue: {
      Component,
      Panel,
      MetadataComponent,
      SearchComponent,
      SearchPanel,
      PrintComponent,
      CatalogComponent,
      MapComponent,
      ToolsComponent,
      QueryResultsComponent,
      FormComponent,
      FormComponents: {
        Body: FormBody,
        Footer: FormFooter
      },
      Inputs: {
        // G3wFormInputs,
        // G3WInput,
        // InputsComponents,
      },
      Charts: {
        ChartsFactory,
        c3: {
          lineXY: C3XYLine
        }
      },
      Fields,
      Mixins,
      services: {
        SearchPanel: SearchPanelService,
        FormService
      }
    }
  },

  // OPEN LAYERS COMPONENTS (g3w-ol)
  ol: {
    interactions : {
      PickFeatureInteraction,
      PickCoordinatesInteraction,
      DeleteFeatureInteraction,
      measure: {
        AreaInteraction,
        LengthInteraction
      }
    },
    controls: {},
    utils: g3wolutils
  },

  // G3W-SUITE debug info
  info: () => {
    $script(
      'https://unpkg.com/platform@1.3.6/platform.js',
      () => {
        window.console.info(`
[g3wsdk.info]\n
- g3w-admin: __${initConfig.version}__
- g3w-client: __${G3W_CONSTANT.APP_VERSION}__
- browser: __${platform.name} ${platform.version}__
- operating system: __${platform.os.toString()}__
`.trim());
      });
  },

  // G3W-CLIENT version
  version: G3W_CONSTANT.APP_VERSION
};

console.log(G3WInput);

/**
 * BACKCOMP (v3.x)
 * 
 * ref: g3w-client/src/components/InputG3W.vue@3.8
 */
g3wsdk.gui.vue.Inputs.G3WInput = {
  functional: true,
  render(h, { data, children }) {
    return h(
      G3WInput,
      {
        ...data,
        props: {
          ...data.props,
          _legacy: { type: String, default: "g3w-input" },
        },
      },
      children
    );
  },
};

/**
 * BACKCOMP (v3.x)
 * 
 * ref: g3w-client/src/components/G3WFormInputs.vue@3.8
 * ref: g3w-client-plugin-billboards/components/panel.vue
 */
g3wsdk.gui.vue.Inputs.G3wFormInputs = {
  functional: true,
  render(h, { data, children }) {
    return h(
      g3wsdk.gui.vue.Inputs.G3WInput,
      {
        ...data,
        props: {
          ...data.props,
          _legacy: { type: String, default: "g3w-form" },
        },
      },
      children
    );
  },
};

/**
 * BACKCOMP (v3.x)
 * 
 * ref: src/components/G3WFormInputs.vue@3.8
 */
g3wsdk.gui.vue.Inputs.InputsComponents = Object.entries(InputsComponents).reduce((a, [k, v]) => (a[k] = Vue.extend(v), a), {});

/**
 * BACKCOMP (v3.x)
 * 
 * ref: src/mixins/base-input.vue@3.8
 */
g3wsdk.gui.vue.Mixins.baseInputMixin = {

  props: ['state'],

  computed: {
    tabIndex:           deprecate(G3WInput.computed.tabIndex,           '[G3W-SDK] baseInputMixin::tabIndex is deprecated'),
    notvalid:           deprecate(G3WInput.computed.notvalid,           '[G3W-SDK] baseInputMixin::notvalid is deprecated'),
    editable:           deprecate(G3WInput.computed.editable,           '[G3W-SDK] baseInputMixin::editable is deprecated'),
    showhelpicon:       deprecate(G3WInput.computed.showhelpicon,       '[G3W-SDK] baseInputMixin::showhelpicon is deprecated'),
    disabled:           deprecate(G3WInput.computed.disabled,           '[G3W-SDK] baseInputMixin::disabled is deprecated'),
    loadingState:       deprecate(G3WInput.computed.loadingState,       '[G3W-SDK] baseInputMixin::loadingState is deprecated'),
  },

  watch: {
    'notvalid':         deprecate(G3WInput.watch['notvalid'],           '[G3W-SDK] baseInputMixin::watch[\'notvalid\'] is deprecated'),
    'state.value':      deprecate(G3WInput.watch['state.value'],        '[G3W-SDK] baseInputMixin::watch[\'state.value\'] is deprecated'),
  },

  methods: {
    showHideHelp:       deprecate(G3WInput.methods.showHideHelp,        '[G3W-SDK] baseInputMixin::showHideHelp. is deprecated'),
    mobileChange:       deprecate(G3WInput.methods.mobileChange,        '[G3W-SDK] baseInputMixin::mobileChange is deprecated'),
    change:             deprecate(G3WInput.methods.change,              '[G3W-SDK] baseInputMixin::change is deprecated'),
    isVisible:          deprecate(G3WInput.methods.isVisible,           '[G3W-SDK] baseInputMixin::isVisible is deprecated'),
    createInputService: deprecate(G3WInput.methods.createInputService,  '[G3W-SDK] baseInputMixin::createInputService is deprecated'),
    getInputService:    deprecate(G3WInput.methods.getInputService,     '[G3W-SDK] baseInputMixin::getInputService is deprecated'),
  },

  created:              deprecate(G3WInput.created,                     '[G3W-SDK] baseInputMixin is deprecated'),
  destroyed:            deprecate(G3WInput.destroyed,                   '[G3W-SDK] baseInputMixin is deprecated'),
};

/**
 * BACKCOMP (v3.x)
 * 
 * ref: src/mixins/fields.vue@3.8
 */
g3wsdk.gui.vue.Mixins.fieldsMixin = {

  components: G3WField.components,

  methods: {
    getType:            deprecate(G3WField.methods.getType,            '[G3W-SDK] fieldsMixin::getType is deprecated'),
    getFieldService:    deprecate(G3WField.methods.getFieldService,    '[G3W-SDK] fieldsMixin::getFieldService is deprecated'),
    getFieldType:       deprecate(G3WField.methods.getFieldType,       '[G3W-SDK] fieldsMixin::getFieldService is deprecated'),
    isSimple:           deprecate(G3WField.methods.isSimple,           '[G3W-SDK] fieldsMixin::isSimple is deprecated'),
    isLink:             deprecate(G3WField.methods.isLink,             '[G3W-SDK] fieldsMixin::isLink is deprecated'),
    isImage:            deprecate(G3WField.methods.isImage,            '[G3W-SDK] fieldsMixin::isImage is deprecated'),
    isPhoto:            deprecate(G3WField.methods.isPhoto,            '[G3W-SDK] fieldsMixin::isPhoto is deprecated'),
    isVue:              deprecate(G3WField.methods.isVue,              '[G3W-SDK] fieldsMixin::isVue is deprecated'),
    sanitizeFieldValue: deprecate(G3WField.methods.sanitizeFieldValue, '[G3W-SDK] fieldsMixin::sanitizeFieldValue is deprecated'),
  },

}

module.exports = g3wsdk;