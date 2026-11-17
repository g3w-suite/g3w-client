@unit
Feature: Core data utilities
  @covers:src/utils/flattenObject.js
  Scenario: Flatten nested object properties
    When I flatten nested profile data
    Then nested property paths are preserved

  @covers:src/utils/groupBy.js
  Scenario: Group records by a derived key
    When I group map layers by geometry type
    Then layers with the same geometry type are grouped together
