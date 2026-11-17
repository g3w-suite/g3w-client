@unit
Feature: Source tree integrity
  Scenario: Runtime counters measure functions rather than module loading
    Then runtime coverage distinguishes uncalled functions from executed callbacks and private methods

  Scenario: Instrumentation preserves JavaScript function semantics
    Then instrumented functions preserve inheritance accessors generators and asynchronous results

  Scenario: Instrumentation preserves calls through circular imports
    Then instrumented circular imports can call a function before its module initializes

  Scenario: Dynamically loaded scripts keep independent function counters
    Then loading another classic script does not redirect existing function counters

  Scenario: Coverage is derived from actual Gherkin scenario tags
    Then coverage tags in comments and descriptions do not count as scenarios

  Scenario: Every source file outside plugins passes its type-specific check
    When I validate all source files except plugins
    Then each discovered source file passes its check

  @coverage @file-coverage
  Scenario: Every source file is associated with a behavioral Cucumber scenario
    When I compare source files with Cucumber coverage tags
    Then no source files are missing a Cucumber test

  @coverage @function-coverage
  Scenario: Every source function outside plugins is exercised
    Then all source functions must be executed by the end of the suite
