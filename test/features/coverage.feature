@unit
Feature: Source tree integrity
  Scenario: Coverage is derived from actual Gherkin scenario tags
    Then coverage tags in comments and descriptions do not count as scenarios

  Scenario: Every source file outside plugins passes its type-specific check
    When I validate all source files except plugins
    Then each discovered source file passes its check

  @coverage
  Scenario: Every source file is associated with a behavioral Cucumber scenario
    When I compare source files with Cucumber coverage tags
    Then no source files are missing a Cucumber test
