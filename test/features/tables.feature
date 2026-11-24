@offline @core-runtime @form-workflows @layer-model @attribute-tables
@covers:src/components/Table.vue
Feature: Layer attribute tables in the local browser
  Real table components and layer methods use local HTTP responses.

  Scenario: Tables load rows and move their controls into the content header
    Then an attribute table presents its fields totals and metadata control

  Scenario: Sorting and global search request the corresponding server data
    Then attribute table sorting and text search update their requests and rows

  Scenario: Column searches combine filters and pagination follows the selected page size
    Then attribute table column filters and pagination preserve their request parameters

  Scenario: Changing pages preserves the selected sorting field and direction
    Then attribute table pagination keeps the selected sorting

  Scenario: Selection includes unloaded records and supports inversion and clearing
    Then attribute table selection updates real layer selections across pages

  Scenario: Feature actions open forms and relation views through the application
    Then attribute table actions preserve feature identity and plugin conditions

  Scenario: Nonspatial tables retain their parent-layer relation context
    Then related nonspatial table actions open their configured relation

  Scenario: Map movement refreshes spatially constrained rows
    Then attribute tables follow the map only while their bounding box control is enabled

  Scenario Outline: Closing a full-size table releases its UI and deferred map work
    Then a full-size attribute table closes with "<pending>" highlight work
    Examples:
      | pending |
      | none    |
      | pending |

  Scenario: A server error preserves rows and releases loading controls before retry
    Then attribute table failures notify the user and permit a successful retry
