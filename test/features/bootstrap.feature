@core-runtime @application-bootstrap
Feature: Offline production application
  The production entry initializes real project models, Vue and OpenLayers
  using local configuration, scripts and map responses.

  @covers:src/index.prod.js @covers:src/g3w-app.js @covers:src/components/App.vue
  Scenario: A configured project starts the complete application offline
    Then the production application displays its project catalog and a ready map

  @header-workflows @logout-workflows @covers:src/components/App.vue
  Scenario Outline: Account logout uses its rendered Vue click handler
    Then the account logout sends a CSRF-protected POST and handles a "<response>" response

    Examples:
      | response   |
      | successful |
      | rejected   |

  @header-workflows @covers:src/components/App.vue @covers:src/components/ModalAccessibility.vue
  Scenario: Account preferences use the mounted accessibility dialog
    Then the account accessibility action updates preferences through native controls

  @header-workflows @covers:src/components/App.vue
  Scenario: Custom header modals clean up after mouse dismissal
    Then a custom header link opens its modal and removes it on native dismissal

  @header-workflows @covers:src/components/App.vue @covers:src/static/locales/it.js
  Scenario: Native language selection triggers Vue model and translation watchers
    Then the language picker updates Vue state and translations through its radio input

  @vue-state-workflows @map-theme-workflows @covers:src/components/App.vue
  Scenario: Project theme configuration activates the Vue radio watcher
    Then a project theme radio lazily applies nested visibility and layer styles

  @vue-state-workflows @map-theme-workflows @covers:src/components/App.vue
  Scenario: Authenticated state enables custom map theme management
    Then an authenticated user creates updates and deletes a map theme through Vue controls

  @vue-state-workflows @covers:src/components/App.vue @covers:src/g3w-app.js
  Scenario: Sidebar panel state activates ownership watchers and stack controls
    Then sidebar panel ownership reacts to nested panels and native back and close actions

  @legend-panel-workflow @covers:src/g3w-app.js @covers:src/g3w-layer.js
  Scenario: Legend panel omits layers excluded by project configuration
    Then the legend panel shows only layers allowed by project configuration

  @vue-state-workflows @external-layer-workflows @covers:src/components/App.vue
  Scenario: Imported layers enable external group actions
    Then external catalog group controls react to imported layers and remove them together

  @covers:src/index.prod.js @covers:src/g3w-layer.js
  Scenario: Project queries combine layer filters and selection
    Then the production registry filters real spatial and nonspatial layers

  @covers:src/index.prod.js @covers:src/g3w-layer.js
  Scenario: Project consumers read metadata and update the layer registry
    Then the production project exposes its configuration and removes registered layers

  @covers:src/components/CatalogTree.vue @covers:src/g3w-app.js
  Scenario: Catalog controls synchronize group and layer visibility
    Then native catalog actions update layer visibility selection and map bounds

  @covers:src/g3w-app.js @covers:src/components/App.vue
  Scenario: Content breadcrumbs navigate an actual stack
    Then native content controls navigate back and close the production content stack

  @covers:src/g3w-app.js @covers:src/components/App.vue
  Scenario: Content panels can be docked enlarged and resized
    Then native content controls dock enlarge and drag the production panel

  @covers:src/index.prod.js @covers:src/g3w-app.js
  Scenario: Network events update the running application
    Then the production application reacts to browser offline and online events

  @startup-plugin @covers:src/index.prod.js @covers:src/g3w-plugin.js
  Scenario: Plugin dependencies execute before the plugin starts
    Then the production loader initializes a local plugin after its dependency

  @external-layer-workflows @covers:src/components/ModalAddLayer.vue @covers:src/g3w-app.js
  Scenario: A local GeoJSON file becomes a styled catalog layer
    Then the production add-layer dialog imports styles and removes a GeoJSON layer

  @external-layer-workflows @covers:src/components/ModalAddLayer.vue @covers:src/g3w-app.js
  Scenario: CSV imports report invalid rows and retain valid points
    Then the production add-layer dialog imports valid CSV rows and reports invalid coordinates

  @external-layer-workflows @covers:src/components/ModalAddLayer.vue @covers:src/g3w-app.js
  Scenario: A compressed KML file is unpacked before import
    Then the production add-layer dialog imports a local KMZ archive

  @external-layer-workflows @covers:src/components/ModalAddLayer.vue @covers:src/g3w-app.js
  Scenario: WMS connections support filtered selections and persistence
    Then the production add-layer dialog selects WMS layers and remembers its connection

  @external-layer-workflows @covers:src/components/ModalAddLayer.vue @covers:src/g3w-app.js
  Scenario: A TMS connection loads tiles and persists display changes
    Then the production add-layer dialog loads a TMS layer and persists its opacity
