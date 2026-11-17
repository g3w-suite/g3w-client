@ui-behaviors @offline @unit
Feature: Offline UI behavior
  Component logic, directives, and pointer interactions run against local compiled code and narrow test doubles.

  @covers:src/components/G3WField.vue
  Scenario: Field renderer maps photo fields to image display
    When I exercise UI behavior "field-renderer"
    Then the observed UI effect matches the expected result

  @covers:src/components/G3WTabs.vue
  Scenario: Tabs lay out visible fields into configured columns
    When I exercise UI behavior "tabs-layout"
    Then the observed UI effect matches the expected result

  @covers:src/components/ModalChangeMap.vue
  Scenario: Returning to the map chooser root clears navigation history
    When I exercise UI behavior "change-map-root"
    Then the observed UI effect matches the expected result

  @covers:src/components/ModalMetadata.vue
  Scenario: Metadata sanitizer omits empty values
    When I exercise UI behavior "metadata-empty-value"
    Then the observed UI effect matches the expected result

  @covers:src/components/QueryBuilder.vue
  Scenario: Query builder quotes fields and values around operators
    When I exercise UI behavior "query-expression"
    Then the observed UI effect matches the expected result

  @covers:src/components/Search.vue
  Scenario: Advanced search closes the current panels before opening
    When I exercise UI behavior "search-query-builder-panel"
    Then the observed UI effect matches the expected result

  @covers:src/components/SearchPanel.vue
  Scenario: Search operator label uses the configured symbol
    When I exercise UI behavior "search-operator-label"
    Then the observed UI effect matches the expected result

  @covers:src/components/SpatialBookMarks.vue
  Scenario: Removing a bookmark persists the remaining list
    When I exercise UI behavior "bookmark-removal"
    Then the observed UI effect matches the expected result

  @covers:src/components/Table.vue
  Scenario: Table classifies image links as photo fields
    When I exercise UI behavior "table-field-type"
    Then the observed UI effect matches the expected result

  @covers:src/components/g3w-alerts.js
  Scenario: Alert manager registers a navbar item when project messages exist
    When I exercise UI behavior "alerts-navbar-item"
    Then the observed UI effect matches the expected result

  @covers:src/components/g3w-search.js
  Scenario: Search service initializes its query input state
    When I exercise UI behavior "search-service-state"
    Then the observed UI effect matches the expected result

  @covers:src/components/x-select.js
  Scenario: Custom option initializes accessible selection attributes
    When I exercise UI behavior "x-option-accessibility"
    Then the observed UI effect matches the expected result

  @covers:src/directives/v-disabled.js
  Scenario: Disabled directive toggles its disabled class
    When I exercise UI behavior "disabled-class"
    Then the observed UI effect matches the expected result

  @covers:src/directives/v-t.js
  Scenario: Translation directive prefixes translated text
    When I exercise UI behavior "translated-prefix"
    Then the observed UI effect matches the expected result

  @covers:src/directives/v-t-tooltip.js
  Scenario: Tooltip directive stores title presentation attributes
    When I exercise UI behavior "tooltip-title-attributes"
    Then the observed UI effect matches the expected result

  @covers:src/directives/v-select2.js
  Scenario: Select2 multiple selection updates its bound array
    When I exercise UI behavior "select2-multiple-selection"
    Then the observed UI effect matches the expected result

  @covers:src/interactions/pick-coordinates.js
  Scenario: Coordinate picker emits the selected map coordinate
    When I exercise UI behavior "pick-coordinate-event"
    Then the observed UI effect matches the expected result

  @covers:src/interactions/pick-feature.js
  Scenario: Feature picker emits only an allowed feature with its layer
    When I exercise UI behavior "pick-filtered-feature"
    Then the observed UI effect matches the expected result

  @covers:src/static/map-controls/addlayer.js
  Scenario: Add-layer control opens the layer modal after attachment
    When I exercise UI behavior "add-layer-control"
    Then the observed UI effect matches the expected result

  @covers:src/static/map-controls/annotation.js
  Scenario: Annotation setup registers its map control
    When I exercise UI behavior "annotation-control-load"
    Then the observed UI effect matches the expected result

  @covers:src/static/map-controls/attribution.js
  Scenario: Attribution setup applies configured terms to map layers
    When I exercise UI behavior "attribution-assignment"
    Then the observed UI effect matches the expected result

  @covers:src/static/map-controls/baselayer.js
  Scenario: Basemap setup skips projects without base layers
    When I exercise UI behavior "baselayer-empty-project"
    Then the observed UI effect matches the expected result

  @covers:src/static/map-controls/geocoding.js
  Scenario: Geocoding setup registers its map control
    When I exercise UI behavior "geocoding-control-load"
    Then the observed UI effect matches the expected result

  @covers:src/static/map-controls/geolocation.js
  Scenario: Geolocation setup registers its map control
    When I exercise UI behavior "geolocation-control-load"
    Then the observed UI effect matches the expected result

  @covers:src/static/map-controls/measure.js
  Scenario: Measure setup adds a new measure type to the existing control
    When I exercise UI behavior "measure-add-type"
    Then the observed UI effect matches the expected result

  @covers:src/static/map-controls/mouseposition.js
  Scenario: Mouse position control formats projected coordinates
    When I exercise UI behavior "mouse-position-format"
    Then the observed UI effect matches the expected result

  @covers:src/static/map-controls/overview.js
  Scenario: Overview map is omitted on mobile
    When I exercise UI behavior "overview-mobile-omission"
    Then the observed UI effect matches the expected result

  @covers:src/static/map-controls/query.js
  Scenario: Query control relays picked coordinates
    When I exercise UI behavior "query-coordinate-event"
    Then the observed UI effect matches the expected result

  @covers:src/static/map-controls/queryby.js
  Scenario: Query-by setup adds a geometry type to the existing control
    When I exercise UI behavior "query-by-add-type"
    Then the observed UI effect matches the expected result

  @covers:src/static/map-controls/scale.js
  Scenario: Scale control is registered for the map
    When I exercise UI behavior "scale-control-load"
    Then the observed UI effect matches the expected result

  @covers:src/static/map-controls/scaleline.js
  Scenario: Scale-line control is registered with its map position
    When I exercise UI behavior "scale-line-load"
    Then the observed UI effect matches the expected result

  @covers:src/static/map-controls/screenshot.js
  Scenario: Screenshot setup adds a print layout and map control
    When I exercise UI behavior "screenshot-control-load"
    Then the observed UI effect matches the expected result

  @covers:src/static/map-controls/streetview.js
  Scenario: Street-view setup registers its map control
    When I exercise UI behavior "streetview-control-load"
    Then the observed UI effect matches the expected result

  @covers:src/static/map-controls/toggler.js
  Scenario: Tool control toggles its grouped-control presentation
    When I exercise UI behavior "toggler-control-click"
    Then the observed UI effect matches the expected result

  @covers:src/static/map-controls/zoom.js
  Scenario: Zoom control is registered on setup
    When I exercise UI behavior "zoom-control-load"
    Then the observed UI effect matches the expected result

  @covers:src/static/map-controls/zoombox.js
  Scenario: Zoom-box setup registers the drag-box control
    When I exercise UI behavior "zoom-box-control-load"
    Then the observed UI effect matches the expected result

  @covers:src/static/map-controls/zoomhistory.js
  Scenario: Zoom history control attaches its navigation control
    When I exercise UI behavior "zoom-history-control-load"
    Then the observed UI effect matches the expected result

  @covers:src/static/map-controls/zoomtoextent.js
  Scenario: Zoom-to-extent setup registers the extent control
    When I exercise UI behavior "zoom-to-extent-load"
    Then the observed UI effect matches the expected result
