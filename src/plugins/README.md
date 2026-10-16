# src/plugins

Since [g3w-client@v4.0.0](https://github.com/g3w-suite/g3w-client/releases/tag/v4.0.0) we usually develop custom plugins inside a [g3w-suite-docker](https://github.com/g3w-suite/g3w-suite-docker) instance.

Here are some examples:

- [g3w-admin-panoramax](https://github.com/g3w-suite/g3w-admin-panoramax)
- [g3w-admin-ps-timeseries](https://github.com/g3w-suite/g3w-admin-ps-timeseries)

To develop them locally, place them into your docker `/shared-volume/plugins` folder: 

```
.
└── g3w-suite-docker/
    └── shared-volume/
        └── plugins/
            ├── g3w-admin-panoramax
            └── g3w-admin-ps-timeseries
```

And then start the built-in development servers:

```sh
npm run docker:up # backend server (g3w-admin)
npm run dev       # frontend server (g3w-client)
```

If everything went fine, you should see the same folders symlinked also in here:

```
.
└── g3w-client/
    └── src/
        └── plugins/
            ├── g3w-admin-panoramax
            └── g3w-admin-ps-timeseries
```


Local development URLs are available at:

```
http://localhost:8000 # local docker instance
http://localhost:3000 # local proxy to dev.g3wsuite.it
```

### Enabling a plugin

Add its name to `plugins` array within your local [`config.js`](../../config.template.js):

```js
plugins: ['panoramax'],
```

Add its name to `G3WADMIN_LOCAL_MORE_APPS` within your server [`settings_docker.py`](https://github.com/g3w-suite/g3w-suite-docker/blob/01ee8f0a8fbf4e64deb3abfeefcea23fe3755094/config/g3w-suite/settings_docker.py#L19-L26).

```py
G3WADMIN_LOCAL_MORE_APPS = [
    'caching',
    'editing',
    'filemanager',
    'qplotly',
    'qtimeseries',
    'frontend',
    'panoramax'
]
```

## Writing a minimal Plugin

Modern plugins are defined as ES6 classes extending `g3w.Plugin`.

Every plugin automatically waits for the GUI and registers when ready.
Define an optional `init()` method for plugin-specific initialization:

```js
/* plugin.js */

(async function () {
  class Plugin extends g3w.Plugin {
    constructor() {
      super({ name: 'my-plugin' });
    }

    async init() {
      // ... plugin initialization logic here ...
    }
  }

  const plugin = await new Plugin();
  // The plugin is initialized, ready, and registered here.
  console.log(plugin.getName());
})().catch(console.error);
```

The base class waits for `g3w.app.isReady()`, checks the configured project `gid`
and registers the plugin through `registerPlugin()`, awaits `init()`, and calls `setReady(true)`.
Initialization errors are logged and also clear the loading indicator.
Define `init()` as a class method, not a class field. Instance fields and the
constructor body are initialized before `init()` runs. Do not return or await the
plugin instance inside `init()`: it would wait for its own initialization.
Subclasses without `init()` use the same lifecycle, skipping only initialization.
When migrating existing plugins, remove manual GUI readiness, registration, and
`setReady()` calls; move plugin-specific startup code into `init()` when needed.

All plugin instances support `await new Plugin()` through a temporary `then()` method,
without replacing the instance with a Promise during subclass construction.
The await resolves to the instance itself; incompatible projects and initialization
failures reject. After success, the instance is no longer thenable, so repeated or
concurrent awaits safely return the same instance.
Direct `new g3w.Plugin({ name: 'my-plugin' })` instances use the same lifecycle,
without an `init()` step.
`await plugin.isReady()` remains available and resolves to `true` on success,
or rejects on incompatibility or initialization failure.
To wait for another registered plugin, use `await this.waitForPlugin('editing')`.

For more info refer to [src/g3w-plugin.js](https://github.com/g3w-suite/g3w-client/blob/5a94440de592f40fa9a206ecf9066f643ba217ad/src/g3w-plugin.js)

## Global variables

Within [src/g3w-globals.js](https://github.com/g3w-suite/g3w-client/blob/5a94440de592f40fa9a206ecf9066f643ba217ad/src/g3w-globals.js) you can find all the variables exposed by the app.

Here are some of properties exposed by the [`g3w`](https://github.com/g3w-suite/g3w-client/blob/5a94440de592f40fa9a206ecf9066f643ba217ad/src/g3w-globals.js#L148-L182) global variable:

```js
/* src/g3w-globals.js */

g3w = {
  version: '...',

  Emitter,    // base event emitter class
  Component,  // base component class
  Panel,      // base panel class
  Plugin,     // base plugin class
  Layer,      // base map layer class
  Control,    // base map control class

  app:   GUI,              // application entrypoint
  state: ApplicationState, // reactive application state
  idb,                     // IndexedDB helper

  gettext: _, // i18n translation function
  constants: G3W_CONSTANT,

  utils: {
    createMeasureTooltip,
    get_formatted_area,
    get_formatted_length,
    get_formatted_radius,
    get_formatted_angle,
    saveBlob,
    getUniqueDomId,
    flattenObject,
    addZValue,
    convertSingleMultiGeometry,
    getCatalogLayerById,
    debounce,
    throttle,
    XHR,
    normalizeEpsg,
    PickCoordinatesInteraction,
    getResolutionFromScale,
    getScaleFromResolution,
    sameOrigin,
  },
};
```

> ℹ️ The legacy `g3wsdk` global variable is still exposed for backward compatibility, but it's deprecated since 4.0.0: whenever applicable, please prefer `g3w` instead (ie. within your plugins).


The g3w-admin server also exposes the following properties within the [`initConfig`](https://github.com/g3w-suite/g3w-admin/blob/424070b3a649187ff6da4a134f804eae374c3a24/g3w-admin/client/views.py#L138-L174) variable:

```py
# g3w-admin/client/api/views.py 

initconfig = {
    "i18n": settings.LANGUAGES,
    "staticurl": settings.STATIC_URL,
    "client": "{}/".format(settings.CLIENT_DEFAULT),
    "mediaurl": settings.MEDIA_URL,
    "user": {
        'i18n': get_language(),
        'login_url': login_url,
        # logged user
        **({
            'id': u.pk,
            'username': u.username,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'is_superuser': u.is_superuser,
            'is_staff': u.is_staff,
            'groups': [g.name for g in u.groups.all()],
            'logout_url': logout_url
        } if not u.is_anonymous else {}),
        # admin user
        **({
            'admin_url': reverse('home')
        } if (u in get_users_for_object(self.project, "change_project", with_group_users=True) or u.is_superuser) and reverse('home') else {})
    },
    "baseurl": baseurl,
    "vectorurl": settings.VECTOR_URL,
    "proxyurl": reverse('interface-proxy'),
    "rasterurl": settings.RASTER_URL,
    "interfaceowsurl": reverse('interface-ows'),
    "main_map_title": getattr(GeneralSuiteData.objects.get(), 'main_map_title', None),
    "g3wsuite_logo_img": settings.CLIENT_G3WSUITE_LOGO,
    "credits": reverse('client-credits'),
    "version": get_version(),
    "frontendurl": baseurl if settings.FRONTEND else '',
    # project data
    **deepcopy(groupSerializer.data)
}
```

You can check the value of these variables within the console of your favorite browser (Chrome, Firefox, Opera, Safari, …):

```js
console.log(window.initConfig)
console.log(window.g3w)
```

## Legacy plugins

All the repos named `g3w-client-*` are legacy plugins and will be archived soon:

- [base-template](https://github.com/g3w-suite/g3w-client-plugin-base-template)
- [editing](https://github.com/g3w-suite/g3w-client-plugin-editing)
- [eleprofile](https://github.com/g3w-suite/g3w-client-plugin-elevation-profile)
- [openrouteservice](https://github.com/g3w-suite/g3w-client-plugin-openrouteservice)
- [qplotly](https://github.com/g3w-suite/g3w-client-plugin-qplotly)
- [qtimeseries](https://github.com/g3w-suite/g3w-client-plugin-qtimeseries)
- [queryresult-template](https://github.com/g3w-suite/g3w-client-plugin-queryresult-template)
- [sidebar-template](https://github.com/g3w-suite/g3w-client-plugin-sidebar-template)


## Chatbot

*Still confused? Please ask Devin about g3w-client before reaching out or creating an issue!*

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/g3w-suite/g3w-client)