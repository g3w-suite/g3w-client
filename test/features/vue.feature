@core-runtime @form-workflows @layer-model @vue-options
Feature: Shared Vue reactive options contract
  Data factories and computed properties run through Vue's reactivity engine.
  Lifecycle, watchers and rendering are exercised separately by mounted workflows.

  @covers:src/components/App.vue
  @covers:src/components/CatalogTree.vue
  @covers:src/components/ContextMenu.vue
  @covers:src/components/G3WField.vue
  @covers:src/components/G3WTabs.vue
  @covers:src/components/ModalAccessibility.vue
  @covers:src/components/ModalAddLayer.vue
  @covers:src/components/ModalChangeMap.vue
  @covers:src/components/ModalLogin.vue
  @covers:src/components/ModalMetadata.vue
  @covers:src/components/QueryBuilder.vue
  @covers:src/components/QueryResults.vue
  @covers:src/components/Relations.vue
  @covers:src/components/Search.vue
  @covers:src/components/SearchPanel.vue
  @covers:src/components/SpatialBookMarks.vue
  @covers:src/components/Table.vue
  Scenario: Every Vue file provides independent data and consistent computed values
    Then all Vue files satisfy the shared data and computed contract
