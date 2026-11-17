@utility-behaviors
Feature: Utility module behavior
  @unit @covers:src/utils/addZValue.js @covers:src/utils/cloneDeep.js @covers:src/utils/colorFromHsv.js @covers:src/utils/colorToHsv.js @covers:src/utils/convertQGISDateTimeFormatToMoment.js @covers:src/utils/distance.js @covers:src/utils/deprecate.js @covers:src/utils/getAlphanumericProps.js @covers:src/utils/normalizeEpsg.js @covers:src/utils/noop.js @covers:src/utils/sanitizeFidFeature.js @covers:src/utils/sameOrigin.js @covers:src/utils/toRawType.js @covers:src/utils/base.js @covers:src/utils/inherit.js
  Scenario: Core utility functions preserve and transform values
    When I exercise core value utilities
    Then their values and inheritance behavior are preserved

  @unit @covers:src/utils/convertSingleMultiGeometry.js @covers:src/utils/dissolve.js @covers:src/utils/intersects.js @covers:src/utils/is3DGeometry.js @covers:src/utils/isLineGeometryType.js @covers:src/utils/isMultiGeometry.js @covers:src/utils/isPointGeometryType.js @covers:src/utils/isPolygonGeometryType.js @covers:src/utils/removeZValue.js @covers:src/utils/splitFeature.js @covers:src/utils/within.js
  Scenario: Geometry helpers operate on OpenLayers geometries
    When I exercise geometry utilities
    Then the geometry results preserve their expected coordinates and types

  @unit @covers:src/utils/createFilterFromString.js @covers:src/utils/createRelationsUrl.js @covers:src/utils/getCatalogLayerById.js @covers:src/utils/getCatalogLayers.js @covers:src/utils/getDataForSearchInput.js @covers:src/utils/getListableProjects.js @covers:src/utils/getProjectUrl.js @covers:src/utils/getRelationLayerById.js @covers:src/utils/getResolutionFromScale.js @covers:src/utils/getScaleFromResolution.js
  Scenario: Project and search utilities use configured state
    When I exercise project and search utilities
    Then configured layers projects and search values are returned

  @offline @covers:src/utils/copyUrl.js @covers:src/utils/createMeasureTooltip.js @covers:src/utils/createVectorLayerFromFile.js @covers:src/utils/downloadFeatures.js @covers:src/utils/getUniqueDomId.js @covers:src/utils/saveBlob.js
  Scenario: Browser-facing utilities use local fixtures
    When I exercise browser utilities
    Then local browser interactions produce the expected results

  @offline @covers:src/utils/debounce.js @covers:src/utils/idb.js @covers:src/utils/throttle.js @covers:src/utils/toGeoJSON.js @covers:src/utils/toShapefile.js @covers:src/utils/waitFor.js @covers:src/utils/XHR.js
  Scenario: Timers storage requests and conversions run offline
    When I exercise asynchronous utilities
    Then timers storage requests and file conversions return expected results
