@core-runtime @application-bootstrap @sdk-compatibility
Feature: Plugin compatibility with the running application
  Legacy plugin APIs operate on the real application and real Vue widgets.

  @covers:src/g3w-globals.js
  Scenario: Editable feature copies retain identity and isolate geometry
    Then legacy feature copies preserve editing state without sharing cloned geometry

  @covers:src/g3w-globals.js
  Scenario: Legacy field helpers classify values and parse server errors
    Then legacy field helpers classify media and extract nested validation messages

  @covers:src/g3w-globals.js
  Scenario: Plugin map views release their geometry and resize listeners
    Then legacy map and resize mixins follow a mounted plugin view lifecycle

  @covers:src/g3w-globals.js
  Scenario: Legacy forms validate mutually exclusive inputs and numeric bounds
    Then legacy form validation restores mutually exclusive inputs and enforces bounds

  @covers:src/g3w-globals.js @covers:src/components/x-select.js
  Scenario: Legacy select inputs propagate values and validation state
    Then legacy input mixins synchronize a real select widget and plugin service

  @covers:src/index.prod.js @covers:src/shims/datetimepicker.js
  Scenario: Globally registered plugin widgets react to parent values
    Then production date and range widgets publish changes and react to parent updates
