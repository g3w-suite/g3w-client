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

  @core-expansion @covers:src/g3w-emitter.js
  Scenario: Setter observers can be prioritized and removed by their registration key
    Then setter observers preserve priority one-shot delivery and keyed removal

  @core-expansion @covers:src/g3w-component.js
  Scenario: Component configuration remains consistent while its service and content change
    Then component configuration survives service replacement and mounting

  @core-expansion @covers:src/g3w-panel.js @covers:src/g3w-app.js
  Scenario: Stacked panels restore their predecessor and release services when closed
    Then sidebar panels restore their predecessor and release their services

  @core-expansion @covers:src/g3w-plugin.js
  Scenario: Plugin services share configuration translations and dependency APIs
    Then plugin services exchange events configuration translations and dependency APIs

  @core-expansion @covers:src/g3w-plugin.js
  Scenario: Failed plugin initialization stops displaying the loading indicator
    Then only the timed-out plugin loses its loading indicator and layout

  @core-expansion @covers:src/g3w-plugin.js
  Scenario: Lazy plugin translations follow the application language
    Then lazy plugin translations switch language using local responses

  @core-expansion @covers:src/g3w-control.js
  Scenario: Map controls coordinate interactions event handlers and button availability
    Then map controls coordinate interactions and restore their event handlers

  @core-expansion @covers:src/g3w-control.js @covers:src/g3w-app.js
  Scenario: Spatial control tools keep their selected method and dialog lifecycle in sync
    Then spatial tools synchronize their method and close their message dialog

  @core-expansion @covers:src/g3w-iframe.js
  Scenario: Iframe messages publish readiness and acknowledge successful and rejected commands
    Then iframe messages publish readiness and command outcomes

  @core-expansion @covers:src/g3w-app.js
  Scenario: Confirmation prompts and choice dialogs return the user selection
    Then application dialogs resolve accepted values and reject cancellation

  @core-expansion @covers:src/g3w-app.js
  Scenario: Galleries and loading indicators clean up their DOM elements
    Then galleries navigate images and loading indicators are removed

  @layer-model @iframe-feature-query @covers:src/g3w-iframe.js
  Scenario Outline: Iframe feature searches stop at the first matching geometry
    Then iframe feature searches try layers in order with highlight "<highlight>"
    Examples:
      | highlight |
      | true      |
      | false     |

  @layer-model @iframe-feature-query @covers:src/g3w-iframe.js
  Scenario: Iframe feature searches restore the project extent when nothing matches
    Then iframe feature searches fall back after empty and unknown layers
