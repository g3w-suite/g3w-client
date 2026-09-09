Feature: Utility functions - pure behavior
  Validate deterministic utility helpers derived from unit tests.

  Scenario: areCoordinatesEqual returns true for matching XY values
    Given coordinates one is "[10,20]"
    And coordinates two is "[10,20]"
    When I run areCoordinatesEqual
    Then the boolean result is true

  Scenario: areCoordinatesEqual returns false when X differs
    Given coordinates one is "[10,20]"
    And coordinates two is "[99,20]"
    When I run areCoordinatesEqual
    Then the boolean result is false

  Scenario: areCoordinatesEqual ignores Z values
    Given coordinates one is "[1,2,3]"
    And coordinates two is "[1,2,99]"
    When I run areCoordinatesEqual
    Then the boolean result is true

  Scenario: distance computes a 3-4-5 triangle
    Given distance point one is "[0,0]"
    And distance point two is "[3,4]"
    When I run distance
    Then the numeric result equals 5

  Scenario: distance is symmetric
    Given distance point one is "[1,2]"
    And distance point two is "[4,6]"
    When I run distance in both directions
    Then both distances are equal

  Scenario: distance returns a floating result for diagonal unit square
    Given distance point one is "[0,0]"
    And distance point two is "[1,1]"
    When I run distance
    Then the numeric result is approximately 1.41421356237 with tolerance 0.0000000001

  Scenario: flattenObject flattens nested keys with underscore
    Given the object to flatten is:
      """
      {"address":{"city":"Rome","zip":"00100"}}
      """
    When I flatten the object with default separator
    Then the flat object equals:
      """
      {"address_city":"Rome","address_zip":"00100"}
      """

  Scenario: flattenObject supports custom separator
    Given the object to flatten is:
      """
      {"a":{"b":1}}
      """
    When I flatten the object with separator "."
    Then the flat object equals:
      """
      {"a.b":1}
      """

  Scenario: flattenObject current bug drops null values
    Given the object to flatten is:
      """
      {"a":null,"b":1}
      """
    When I flatten the object with default separator
    Then the flat object equals:
      """
      {"b":1}
      """

  Scenario: flattenObject current bug expands arrays by numeric index
    Given the object to flatten is:
      """
      {"items":["x","y"]}
      """
    When I flatten the object with default separator
    Then the flat object equals:
      """
      {"items_0":"x","items_1":"y"}
      """

  Scenario: groupBy groups objects by string key
    Given the array to group is:
      """
      [{"type":"fruit","name":"apple"},{"type":"veggie","name":"carrot"},{"type":"fruit","name":"banana"}]
      """
    And the grouping mode is "item.type"
    When I run groupBy
    Then the grouped object equals:
      """
      {"fruit":[{"type":"fruit","name":"apple"},{"type":"fruit","name":"banana"}],"veggie":[{"type":"veggie","name":"carrot"}]}
      """

  Scenario: groupBy groups numbers by odd/even
    Given the array to group is:
      """
      [1,2,3,4,5]
      """
    And the grouping mode is "odd-even"
    When I run groupBy
    Then the grouped object equals:
      """
      {"odd":[1,3,5],"even":[2,4]}
      """

  Scenario: groupBy returns empty object for empty input
    Given the array to group is:
      """
      []
      """
    And the grouping mode is "identity"
    When I run groupBy
    Then the grouped object equals:
      """
      {}
      """

  Scenario Outline: toRawType returns the correct raw type
    Given the value kind is "<kind>"
    When I run toRawType
    Then the string result equals "<expected>"

    Examples:
      | kind       | expected  |
      | string     | String    |
      | number     | Number    |
      | boolean    | Boolean   |
      | null       | Null      |
      | undefined  | Undefined |
      | array      | Array     |
      | object     | Object    |
      | function   | Function  |
      | regexp     | RegExp    |
      | date       | Date      |
      | map        | Map       |
      | set        | Set       |

  Scenario: normalizeEpsg converts number to EPSG string
    Given normalizeEpsg input is number 4326
    And normalizeEpsg toString mode is true
    When I run normalizeEpsg
    Then the string result equals "EPSG:4326"

  Scenario: normalizeEpsg normalizes formatted strings
    Given normalizeEpsg input is string "epsg:4326"
    And normalizeEpsg toString mode is true
    When I run normalizeEpsg
    Then the string result equals "EPSG:4326"

  Scenario: normalizeEpsg strips non numeric characters
    Given normalizeEpsg input is string "urn:ogc:def:crs:EPSG::4326"
    And normalizeEpsg toString mode is true
    When I run normalizeEpsg
    Then the string result equals "EPSG:4326"

  Scenario: normalizeEpsg returns undefined for string without digits
    Given normalizeEpsg input is string "abc"
    And normalizeEpsg toString mode is true
    When I run normalizeEpsg
    Then the result is undefined

  Scenario: normalizeEpsg returns null for undefined in CRS mode
    Given normalizeEpsg input is undefined
    And normalizeEpsg toString mode is false
    When I run normalizeEpsg
    Then the result is null

  Scenario: normalizeEpsg enriches a CRS object in object mode
    Given normalizeEpsg CRS object is:
      """
      {"epsg":4326,"proj4":"+proj=longlat","axisinverted":true,"geographic":true}
      """
    And normalizeEpsg toString mode is false
    When I run normalizeEpsg
    Then normalizeEpsg result has epsg "EPSG:4326"
    And normalizeEpsg result has proj4 "+proj=longlat"

  Scenario: normalizeEpsg current bug returns null for bare string in object mode
    Given normalizeEpsg input is string "4326"
    And normalizeEpsg toString mode is false
    When I run normalizeEpsg
    Then the result is null

  Scenario Outline: is3DGeometry reports known and unknown types
    Given geometry type is "<geometryType>"
    When I run is3DGeometry
    Then the result match mode is "<mode>"

    Examples:
      | geometryType      | mode                    |
      | PointZ            | equals-input-string     |
      | PolygonZM         | equals-input-string     |
      | MultiPolygon25D   | equals-input-string     |
      | LineStringM       | equals-input-string     |
      | Point             | undefined               |
      | Polygon           | undefined               |
      | MultiLineString   | undefined               |
      | Unknown           | undefined               |

  Scenario: noop returns undefined and does not throw
    When I run noop with sample arguments
    Then the result is undefined
