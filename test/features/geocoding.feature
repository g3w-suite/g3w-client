@offline @core-runtime @form-workflows @map-control-workflows @geocoding-workflows
@covers:src/static/map-controls/geocoding.js @covers:src/static/geocoding-providers/nominatim.js
Feature: Geocoding with local provider responses
  The original control loads providers and manages real map and query results.

  Scenario Outline: Coordinate searches use the requested projection and reset their marker
    Then geocoding coordinates "<query>" use "<projection>" coordinates and reset cleanly
    Examples:
      | query      | projection |
      | 100,200    | project    |
      | 12,45,4326 | geographic |

  Scenario: Provider results maintain map selection and query result identity
    Then geocoding selections visibility and query-result removal stay synchronized

  @lazy-geocoding
  Scenario: A provider loads polygon geometry only after selecting its result
    Then geocoding lazy geometry recovers from a failed request and skips missing geometry

  @lazy-geocoding @provider-rejection
  Scenario: A failed provider does not prevent another provider from reporting no matches
    Then geocoding empty results release loading state despite a rejected provider

  Scenario: Saved project searches are offered alongside provider results
    Then a saved search selected from geocoding runs its action and resets the search

  Scenario: Result popovers support dragging keyboard dismissal and modal dismissal
    Then the geocoding popover can be dragged and dismissed without selecting a place

  Scenario: Map changes do not silently enable the hidden automatic-update option
    Then moving the map leaves geocoding requests unchanged while automatic updates are disabled
