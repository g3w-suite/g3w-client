# src/plugins

To develop custom plugins you need to place them in this folder, here are some examples:

- [base-template](https://github.com/g3w-suite/g3w-client-plugin-base-template)
- [editing](https://github.com/g3w-suite/g3w-client-plugin-editing)
- [eleprofile](https://github.com/g3w-suite/g3w-client-plugin-elevation-profile)
- [openrouteservice](https://github.com/g3w-suite/g3w-client-plugin-openrouteservice)
- [qplotly](https://github.com/g3w-suite/g3w-client-plugin-qplotly)
- [qtimeseries](https://github.com/g3w-suite/g3w-client-plugin-qtimeseries)
- [queryresult-template](https://github.com/g3w-suite/g3w-client-plugin-queryresult-template)
- [sidebar-template](https://github.com/g3w-suite/g3w-client-plugin-sidebar-template)

---

## Tips for plugin development (v3.4)

Assuming you have the following plugins under development:

```
.
└── src/
    └── plugins/
        ├── base
        ├── queryresult
        └── sidebar
```

****

You will need to override the "initConfig" plugin attribute to enable and develop custom plugins:

```js
  /* src/config/dev/index.js */ 

  plugins: {
    base: {               // "base" = your plugin folder name
      baseurl: '../dist',
      gid: 'qdjango:1',   // 1 = current project id
    },
    queryresult: {
      baseurl: '../dist',
      gid: 'qdjango:2',   // 2 = current project id
    },
    sidebar: {
      baseurl: '../dist',
      gid: 'qdjango:2',   // 2 = current project id
    },
  }

```

You can refer to [base-template](https://github.com/g3w-suite/g3w-client-plugin-base-template) plugin to get an idea of how to build and structure a custom plugin.

To develop them locally, you must first start `browsersync` (client's development server):

```sh
npm run dev
```

and then start the `watch` script of the specific plugin you intend to develop, so with the above example:
```sh
cd src/plugins/base

npm run watch
```

```sh
cd src/plugins/queryresult

npm run watch
```

```sh
cd src/plugins/sidebar

npm run watch
```

If everything went fine, you can now visit you local development server URL to see changes applied:

```
# project_group = "countries";
# project_type  = "qdjango";
# project_id    = "1"

http://localhost:8000/en/map/countries/qdjango/1   # g3w-admin  (production)
http://localhost:3000/?project=countries/qdjango/1 # g3w-client (development)
```

```
# project_group = "eleprofile";
# project_type  = "qdjango";
# project_id    = "2"

http://localhost:8000/en/map/eleprofile/qdjango/2   # g3w-admin  (production)
http://localhost:3000/?project=eleprofile/qdjango/2 # g3w-client (development)
```

As per [68da69f](https://github.com/g3w-suite/g3w-client/blob/68da69f23c7d4aa5d2d9f9446766d4eb38b268da/src/app/api.js), plugins can make use of these properties exposed by the `g3wsdk` global variable:

```js
/* src/app/api.js */

g3wsdk = {

  // APP CONSTANTS
  constant: G3W_CONSTANT,

  // CORE API METHODS AND OBJECTS
  core: {
    G3WObject,
    utils,
    geoutils,
    ApplicationService,
    ApplicationState,
    ApiService,
    Router,
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
      MapLayersStoreRegistry
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
        geom: Geom
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
        Body,
        Footer
      },
      Inputs: {
        G3wFormInputs,
        G3WInput,
        InputsComponents
      },
      Charts: {
        ChartsFactory,
        c3: {
          lineXY
        }
      },
      Fields,
      Mixins,
      services: {
        SearchPanel: SearchPanelService
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

};
```

Below an excerpt from [g3w-suite/g3w-client-plugin-base-template/index.js#L3-L4](https://github.com/g3w-suite/g3w-client-plugin-base-template/blob/bfb916cf34ca7efdd77e146da621b3b5ea25698f/index.js#L3-L4) showing how the `g3wsdk` variable can be used within a plugin:

```js
import pluginConfig from './config';
import Service from './service';

const { base, inherit }      = g3wsdk.core.utils;
const { Plugin: BasePlugin } = g3wsdk.core.plugin;

const Plugin = function() {
  const {name, i18n} = pluginConfig;
  base(this, {
    name,
    service: Service,
    i18n
  });
  // check if plugin is related to current project by gid
  if (this.registerPlugin(this.config.gid)) this.service.init(this.config);
  // need to be call to hide loading icon on map
  this.setReady(true);
};

inherit(Plugin, BasePlugin);

new Plugin();
```

The g3w-admin server exposes the following properties within the `initConfig` variable:

- [07ba465](https://github.com/g3w-suite/g3w-admin/blob/07ba465011bb0ef95393b4d31255996fbec55e11/g3w-admin/client/views.py#L161-L165) as inline window.initConfig
- [07ba465](https://github.com/g3w-suite/g3w-admin/blob/07ba465011bb0ef95393b4d31255996fbec55e11/g3w-admin/client/api/views.py#L78-L92) as Rest API endpoint

```py
# g3w-admin/client/api/views.py 

initconfig = {
    "staticurl": settings.STATIC_URL,
    "client": "client/",
    "mediaurl": settings.MEDIA_URL,
    "baseurl": baseurl,
    "vectorurl": settings.VECTOR_URL,
    "rasterurl": settings.RASTER_URL,
    "proxyurl": reverse('interface-proxy'),
    "interfaceowsurl": reverse('interface-ows'),
    "group": groupSerializer.data,
    "g3wsuite_logo_img": settings.CLIENT_G3WSUITE_LOGO,
    "credits": reverse('client-credits'),
    "main_map_title": generaldata.main_map_title,
    "i18n": settings.LANGUAGES
}
```

You can check the value of these variables within the console of your favorite browser (Chrome, Firefox, Opera, Safari, …):

```js
console.log(window.initConfig)
console.log(window.g3wsdk)
```

For further information, you can start by installing the following plugins (which do not require additional serverside configurations):

- [base-template](https://github.com/g3w-suite/g3w-client-plugin-base-template)
- [queryresult-template](https://github.com/g3w-suite/g3w-client-plugin-queryresult-template)
- [sidebar-template](https://github.com/g3w-suite/g3w-client-plugin-sidebar-template)

---

## Tips for plugin deployment (v3.4)

Within the **gulpfile.js** file is defined a `plugins` task which is used to select and copy all the plugins from the following folder into the g3w-admin folder, to execute it you can use the following command:


```sh
npm run plugins
```
