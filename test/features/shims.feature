@offline @core-runtime @shim-coverage
Feature: Browser shims preserve the legacy client behavior

  @covers:src/shims/jquery.js
  Scenario: DOM collections traverse, update, and measure real elements
    Then the DOM shim composes collection, traversal, styling, and utility operations

  @covers:src/shims/jquery.js
  Scenario: Event and deferred lifecycles preserve ordering and context
    Then the DOM shim dispatches namespaced events and settles deferred work

  @covers:src/shims/jquery.js
  Scenario: Ajax callbacks reflect real request outcomes
    Then the DOM shim serializes requests and reports success, failure, and cancellation

  @covers:src/shims/moment.js
  Scenario: Date parsing and formatting retain Moment-compatible semantics
    Then the date shim round-trips tokens, inputs, locale formats, and calendar operations

  @covers:src/shims/moment.js
  Scenario: Date comparisons and static helpers handle valid and invalid values
    Then the date shim compares, reduces, and serializes date values

  @covers:src/shims/select2.js
  Scenario: Select widgets synchronize native and custom selections
    Then the select shim handles templates, user changes, tags, and teardown

  @covers:src/shims/datetimepicker.js
  Scenario: Date-time widgets navigate and select valid dates
    Then the date-time shim publishes navigation, selection, and keyboard events

  @covers:src/shims/datetimepicker.js
  Scenario: Date-time widgets enforce constraints and dismiss on outside input
    Then the date-time shim rejects invalid dates and honors its lifecycle options
