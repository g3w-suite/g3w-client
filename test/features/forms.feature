@offline @core-runtime @form-workflows
Feature: Local form and dialog workflows
  Real Vue components render in Chromium using local project data and HTTP responses.

  @covers:src/components/G3WField.vue
  Scenario: Required fields validate edits and notify their parent form
    Then editing a required field updates validation and parent notifications

  @covers:src/components/G3WField.vue
  Scenario: Numeric and coordinate controls enforce their configured bounds
    Then numeric and coordinate form inputs enforce schema constraints

  @covers:src/components/G3WField.vue
  Scenario: Checkbox and select controls preserve their stored representations
    Then choice controls synchronize their values with the field schema

  @layer-model @covers:src/components/G3WField.vue
  Scenario: Autocomplete loads saved labels and retains selections while searching
    Then autocomplete preserves selected IDs while refreshing remote suggestions

  @layer-model @covers:src/components/G3WField.vue
  Scenario Outline: Relation filters restore and update their available choices
    Then "<mode>" relation filters load a "<record>" record and refresh dependent choices

    Examples:
      | mode        | record |
      | chained     | saved  |
      | independent | saved  |
      | chained     | new    |
      | independent | new    |

  @covers:src/components/G3WField.vue
  Scenario: Uploaded files update media only after a successful server response
    Then media uploads preserve the last valid file when the server rejects an upload

  @covers:src/components/G3WField.vue
  Scenario: Map picking fills an autocomplete field with the selected feature
    Then feature picking updates the field and releases its interaction

  @covers:src/components/G3WField.vue
  Scenario: Coordinate capture transforms map positions and stops for another tool
    Then coordinate capture transforms picked positions and releases its map listeners

  @covers:src/components/G3WField.vue
  Scenario: Formatted values render media and temporary map geometries
    Then read-only fields render their values and release temporary map layers

  @covers:src/components/G3WField.vue
  Scenario: Rich text keeps supported formatting and removes unsafe markup
    Then rich text editing preserves formatting without retaining unsafe markup

  @covers:src/components/G3WField.vue
  Scenario: Rich text links can be created edited and removed
    Then the rich text link dialog validates URLs and applies link edits

  @covers:src/components/G3WField.vue
  Scenario: Rich text tables support row and column editing
    Then the rich text table tools update the selected table

  @covers:src/components/ModalAccessibility.vue
  Scenario: Accessibility preferences persist and reset their visual effects
    Then accessibility preferences update styles storage and motion settings

  @covers:src/components/QueryBuilder.vue
  Scenario: Query builder loads cached values runs a filter and saves a search
    Then query builder searches use local data and persist named filters

  @covers:src/components/SpatialBookMarks.vue
  Scenario: Spatial bookmarks save navigate share and remove a user extent
    Then spatial bookmarks persist and restore the selected map extent

  @covers:src/components/G3WTabs.vue
  Scenario: Hidden expression tabs stop validating their nested fields
    Then expression-driven tabs update visibility and validation membership

  @layer-model @covers:src/components/ModalMetadata.vue
  Scenario: Project metadata derives service URLs and loads legends once
    Then metadata dialogs derive service links and restore legend configuration

  @covers:src/components/ModalChangeMap.vue
  Scenario: Map chooser navigates groups and caches local project responses
    Then map chooser navigation preserves its history and cached responses
