Feature: Utility functions - timing and async behavior
  Validate debounce, throttle, waitFor, and ID generation behavior.

  Scenario: debounce triggers only once after rapid repeated calls
    Given a debounced function with delay 30 milliseconds
    When I call the debounced function with "a"
    And I wait 10 milliseconds
    And I call the debounced function with "b"
    And I wait 10 milliseconds
    And I call the debounced function with "c"
    And I wait 40 milliseconds
    Then the wrapped function call count is 1
    And the last wrapped function arguments are:
      | c |

  Scenario: debounce uses default delay and does not fire before 500ms
    Given a debounced function with default delay
    When I call the debounced function with "x"
    And I wait 450 milliseconds
    Then the wrapped function call count is 0
    When I wait 80 milliseconds
    Then the wrapped function call count is 1

  Scenario: debounce can fire multiple times in separate periods
    Given a debounced function with delay 20 milliseconds
    When I call the debounced function with "first"
    And I wait 30 milliseconds
    And I call the debounced function with "second"
    And I wait 30 milliseconds
    Then the wrapped function call count is 2

  Scenario: throttle fires first call and suppresses quick subsequent calls
    Given a throttled function with delay 50 milliseconds
    When I call the throttled function with "first"
    And I wait 5 milliseconds
    And I call the throttled function with "second"
    And I wait 5 milliseconds
    And I call the throttled function with "third"
    Then the wrapped function call count is 1

  Scenario: throttle fires again after delay plus one millisecond with no intermediate calls
    Given a throttled function with delay 30 milliseconds
    When I call the throttled function with "first"
    And I wait 35 milliseconds
    And I call the throttled function with "second"
    Then the wrapped function call count is 2

  Scenario: throttle forwards function arguments
    Given a throttled function with delay 30 milliseconds
    When I call the throttled function with values:
      | x |
      | 42 |
    Then the last wrapped function arguments are:
      | x |
      | 42 |

  Scenario: waitFor resolves immediately when predicate is true
    Given the waitFor predicate is always true
    When I run waitFor without timeout
    Then waitFor resolves with value "predicate"

  Scenario: waitFor resolves when predicate eventually becomes true
    Given the waitFor predicate starts false and becomes true after 30 milliseconds
    When I run waitFor without timeout
    Then waitFor resolves with value "predicate"

  Scenario: waitFor rejects with timeout when predicate never becomes true
    Given the waitFor predicate is always false
    When I run waitFor with timeout 50 milliseconds
    Then waitFor rejects with message containing "timeout"

  Scenario: getUniqueDomId returns unique incrementing IDs with expected format
    When I generate 50 unique DOM ids
    Then every generated id matches the pattern "^[0-9]+_[0-9]+$"
    And all generated ids are unique
    And the counter in the second id is exactly 1 more than the first id
