@offline @core-runtime @form-workflows @map-control-workflows
Feature: Map tools in the local browser
  Real OpenLayers controls update the map with local vendor-service fixtures.

  @measure-workflows @covers:src/static/map-controls/measure.js @covers:src/utils/createMeasureTooltip.js
  Scenario: Line drawing supports correcting points and completing a measurement
    Then a line measurement removes points and releases its overlays when disabled

  @measure-workflows @dual-measure @covers:src/static/map-controls/measure.js @covers:src/utils/createMeasureTooltip.js
  Scenario: The measure tool switches geometry type and resets to its first interaction
    Then switching measurement types clears the old drawing and restores the default tool

  @scale-workflows @covers:src/static/map-controls/scale.js
  Scenario: Custom scale entry accepts bounded integers and rejects invalid input
    Then custom scale input changes resolution and rejects invalid values

  @scale-workflows @covers:src/static/map-controls/scale.js
  Scenario: Scale options track map movement and replacement views
    Then map scale changes replace custom options and survive replacing the view

  @streetview-workflows @covers:src/static/map-controls/streetview.js
  Scenario: Street View without an API key opens a coordinate-based public URL
    Then picking a map position opens the public panorama URL without an API key

  @streetview-workflows @streetview-key @streetview-preflight-failure @covers:src/static/map-controls/streetview.js
  Scenario: A loaded panorama remains usable after the preliminary image request fails
    Then panorama position and heading update the map marker after a preflight failure

  @streetview-workflows @streetview-key @covers:src/static/map-controls/streetview.js
  Scenario: The vendor rejects a position with no panorama
    Then a rejected panorama request disables the tool and clears its marker
