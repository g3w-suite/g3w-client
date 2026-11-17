@core-runtime @application-bootstrap
Feature: Offline production application
  The production entry initializes real project models, Vue and OpenLayers
  using local configuration, scripts and map responses.

  @covers:src/index.prod.js @covers:src/g3w-app.js @covers:src/components/App.vue
  Scenario: A configured project starts the complete application offline
    Then the production application displays its project catalog and a ready map

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
