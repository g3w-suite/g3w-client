@offline @core-runtime @form-workflows @layer-model @relation-workflows
@covers:src/components/Relations.vue
Feature: Browsing related records
  Real relation components, layer models and requests use a local content host.

  Scenario: The relation menu sorts available relations and previews parent attributes
    Then the relation menu opens its selected relation through the real application

  Scenario: Related rows support sorting filtering pagination and plugin actions
    Then relation table controls preserve server parameters and feature identities

  Scenario: Related geometry and forms retain their originating layer and feature
    Then relation row actions zoom to geometry and mount the real attribute form

  Scenario: Charts resize and release their host when the relation is closed
    Then relation charts toggle resize and clean up their mounted container

  Scenario: Relation exports recover from errors and download the requested data
    Then relation export failures release download state and allow a successful retry

  Scenario: Malformed relation responses do not replace the last successful rows
    Then relation data parsing failures release loading state and permit retry
