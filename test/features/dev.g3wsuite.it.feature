@smoke
Feature: Test the local client and plugins against remote projects
  The local client build should work with projects served by dev.g3wsuite.it.

  Background:
    Given local client assets are intercepted

  Scenario: Open a project without an additional plugin
    When I open project "/map/demo"
    Then the local client version is used
    And at least one client asset is served locally
    And no browser errors are reported

  Scenario Outline: Open a project with a plugin
    When I open project "<project>"
    Then the local client version is used
    And plugin "<plugin>" is loaded
    And at least one client asset is served locally
    And no browser errors are reported

    Examples:
      | project          | plugin      |
      | /map/expression  | editing     |
      | /map/statistic   | qplotly     |
      | /map/timeseries  | qtimeseries |
