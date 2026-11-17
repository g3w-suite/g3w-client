@offline @core-runtime
Feature: Core client behavior without a server
  @covers:src/g3w-emitter.js
  Scenario: Event listeners and setter hooks have a predictable lifecycle
    Then core event listeners run once and setters notify their observers

  @covers:src/g3w-component.js @covers:src/g3w-panel.js
  Scenario: Components and panels clean up their mounted content
    Then core components and panels mount and release their Vue instances

  @covers:src/g3w-i18n.js
  Scenario: Translations honor overrides and fall back to English
    Then core translations resolve overrides and nested registered strings

  @covers:src/g3w-state.js
  Scenario: Known projections can be reused without a server
    Then application state returns registered map projections

  @covers:src/g3w-plugin.js
  Scenario: Compatible plugins leave the loading queue when ready
    Then a compatible plugin registers and announces readiness

  @covers:src/g3w-layer.js
  Scenario: Layer selections support inclusion and inversion
    Then a layer selection tracks included and excluded feature IDs

  @covers:src/g3w-control.js
  Scenario: Disabling a map control deactivates its interaction
    Then a map control disables interaction and restores its click handler

  @covers:src/g3w-globals.js @covers:src/g3w-app.js
  Scenario: Modern and legacy APIs share client state and feature data
    Then the SDK bridge shares storage and converts fetched features

  @covers:src/g3w-constants.js
  Scenario: Printed scales are converted using the client map units
    Then the map scale constants produce the expected metre resolution

  @covers:src/g3w-iframe.js
  Scenario: Iframe commands reject malformed coordinates
    Then iframe commands apply valid centers and reject invalid centers

  @covers:src/g3w-vendors.js @covers:src/shims/jquery.js
  Scenario: Legacy DOM events can be removed by namespace
    Then the DOM facade delegates events and removes namespaced listeners

  @covers:src/shims/moment.js
  Scenario: Date arithmetic preserves valid calendar dates
    Then the date facade handles leap days and invalid strict dates

  @covers:src/shims/select2.js
  Scenario: Select widgets keep the native select as their source of truth
    Then the select facade synchronizes values and restores the original field

  @covers:src/shims/datetimepicker.js
  Scenario: Date-time fields publish updates and release their widgets
    Then the date-time facade formats values and emits change events

  @covers:src/index.prod.js
  Scenario: Startup explains a missing project instead of leaving a spinner
    When the production entry starts with an unknown project
    Then startup shows the missing project error and registers global directives

  @covers:src/index.dev.js
  Scenario: Development startup applies local overrides before bootstrapping
    When the development entry delegates to the production bootstrap
    Then development overrides and diagnostics are enabled
