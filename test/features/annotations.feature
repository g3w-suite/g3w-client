@core-runtime @application-bootstrap @annotation-workflows
Feature: Map annotations in the running application
  @covers:src/static/map-controls/annotation.js @covers:src/g3w-app.js @covers:src/components/App.vue
  Scenario: A drawn point can be labeled styled exported and removed
    Then native annotation controls draw edit export and remove a map point

  @covers:src/static/map-controls/annotation.js @covers:src/g3w-app.js
  Scenario: Imported annotations retain their shapes and print entries
    Then the annotation import dialog projects saved shapes and supplies print entries
