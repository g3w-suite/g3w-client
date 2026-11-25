@core-runtime @form-workflows @layer-model @map-control-workflows @context-menu-workflows
Feature: Map and catalog context menus
  Context menus use the selected map location or catalog entry without
  modifying unrelated layers or interfering with active map tools.

  @covers:src/components/ContextMenu.vue @covers:src/utils/copyUrl.js
  Scenario: Map coordinates can be copied queried and used for navigation
    Then the map context menu copies and queries its location and navigates the real view

  @covers:src/components/ContextMenu.vue
  Scenario: Map tools receive the selected context location
    Then context actions delegate to their map tools and close the menu

  @covers:src/components/ContextMenu.vue
  Scenario: Map controls suppress conflicting context menus
    Then measuring and disabled map contexts do not open a menu

  @covers:src/components/ContextMenu.vue
  Scenario: Plugin entries remain interactive in movable and mobile menus
    Then custom context entries can be selected dragged and dismissed

  @covers:src/components/ContextMenu.vue @covers:src/g3w-layer.js
  Scenario: Catalog styles and saved filters update the real layer
    Then catalog context actions change styles apply toggle and delete saved filters

  @legend-action @covers:src/components/ContextMenu.vue
  Scenario: Context menu legend action respects layer exclusion
    Then excluded layers hide the legend action in the catalog context menu

  @covers:src/components/ContextMenu.vue
  Scenario: External image layers expose opacity ordering and projected extents
    Then external image context actions update their map layer and fit its extent

  @covers:src/components/ContextMenu.vue @covers:src/utils/colorFromHsv.js @covers:src/utils/colorToHsv.js
  Scenario: External vector colors respond to pointer keyboard and slider input
    Then the context color picker updates the actual vector style and preserves alpha

  @covers:src/components/ContextMenu.vue @covers:src/g3w-app.js @covers:src/utils/saveBlob.js
  Scenario: External layer exports download the selected local resource
    Then exporting an external layer opens the real download dialog and saves its response

  @covers:src/components/ContextMenu.vue
  Scenario: Project and layer metadata open the appropriate tab
    Then catalog metadata opens and expands the selected layer and handles missing entries

  @attribute-tables
  @covers:src/components/ContextMenu.vue @covers:src/components/Table.vue
  Scenario: A catalog entry opens the actual attribute table
    Then the catalog context menu opens and mounts its layer attribute table
