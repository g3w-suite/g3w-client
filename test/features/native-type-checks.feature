@native-type-checks
Feature: Native type checks preserve existing behavior
  @unit @covers:src/components/QueryResults.vue @covers:src/components/Relations.vue @covers:src/components/Table.vue @covers:src/g3w-globals.js
  Scenario: Field classification preserves wrapped and special values
    Given the field type handlers are loaded
    When I classify empty, wrapped, geometry, Vue and array values
    Then each field type is preserved

  @unit @covers:src/components/QueryResults.vue @covers:src/g3w-plugin.js
  Scenario: JSON detection and plugin configuration accept only plain objects
    Given the JSON detector and plugin configuration handler are loaded
    When I check JSON values and plugin configurations
    Then only plain objects are accepted

  @unit @covers:src/components/g3w-search.js
  Scenario: Search values preserve options and wrap scalars
    Given the search value normalizer is loaded
    When I normalize options and scalar values
    Then existing options are preserved and scalars are wrapped

  @unit @covers:src/components/G3WField.vue
  Scenario: Media updates compare wrapped values
    Given the media input watcher is loaded
    When I compare media values with their originals
    Then only changed media values are marked updated

  @unit @covers:src/g3w-app.js
  Scenario: Error formatting handles native and cross-realm errors
    Given the error formatter is loaded
    When I format native, cross-realm and response errors
    Then each error is converted to the expected message

  @unit @covers:src/utils/toRawType.js @covers:src/g3w-globals.js
  Scenario: The deprecated utility remains available
    Given the deprecated type utility is loaded
    When I inspect its SDK export
    Then it remains documented and callable
