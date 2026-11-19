@offline @core-runtime @form-workflows @layer-model @search-workflows
@covers:src/components/SearchPanel.vue @covers:src/components/g3w-search.js
Feature: Configured searches in the local browser
  Real search panels and layer requests use local HTTP responses.

  Scenario: Search initialization loads choices and reports missing configured layers
    Then configured search inputs load their choices and warn about missing layers

  Scenario: Cascading choices cache responses and disable strict descendants
    Then dependent search choices follow their parent and reuse cached responses

  Scenario: Multiple choices exclude the all-values sentinel from a concrete selection
    Then multiple search selections produce an encoded filter and restore all values

  Scenario Outline: Submitting a search preserves its pagination policy
    Then a "<pagination>" search submits the form and presents local features
    Examples:
      | pagination    |
      | paginated     |
      | unpaginated   |

  Scenario: Autocomplete keeps selected options and explains empty results
    Then search autocomplete enforces its minimum and retains selected options

  Scenario: Late autocomplete responses cannot overwrite the latest results
    Then search autocomplete ignores stale responses and cancels pending work on close

  Scenario: Removing a layer filter reloads its choices and resets the search
    Then removing a search filter clears its token and unsubscribes on close

  Scenario: Mobile date searches store server dates and bring text inputs into view
    Then mobile search dates and focus use the configured display and storage formats

  Scenario Outline: Related searches resolve the parent layer
    Then a "<key>" related search filters its parent layer using child results
    Examples:
      | key       |
      | single    |
      | composite |

  Scenario: An empty related search presents an empty result
    Then a related search with no child features presents an empty result

  Scenario Outline: Server-defined follow-up searches handle both response shapes
    Then a follow-up search response "<response>" is presented correctly
    Examples:
      | response |
      | form     |
      | empty    |
