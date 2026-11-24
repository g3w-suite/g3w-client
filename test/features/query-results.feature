@offline @core-runtime @form-workflows @layer-model @query-results
@covers:src/components/QueryResults.vue
Feature: Query results in the local browser
  Real query responses are normalized by the application and rendered by the Vue component.

  Scenario: Query summaries describe the selected spatial filter
    Then query summaries format coordinates extents and polygon identities

  Scenario: Layer and feature details can be filtered and expanded
    Then rendered query layers preserve field values and feature expansion state

  Scenario: Form-based results preserve original field names and cloned layouts
    Then query result forms render nested fields without changing their source layout

  Scenario: Related feature details keep independent expansion state
    Then related result boxes expand independently and reset for a new response

  Scenario: Feature actions evaluate visibility once and release their resources
    Then result actions respect conditions disabled states and cleanup callbacks

  Scenario: Pagination updates selected features and releases the loading state
    Then query pagination requests the selected page and updates its selection state

  Scenario Outline: Raw responses render without navigating unconfirmed links
    Then "<format>" query responses render safely inside their result iframe

    Examples:
      | format     |
      | text/plain |
      | text/html  |

  Scenario: Switching WMS info formats refreshes data and clears cached requests
    Then result info formats switch between local text and GML responses

  Scenario: Result toolbar actions delegate the selected layer
    Then query result toolbar actions use the selected layer and current filter
