@offline @core-runtime @layer-model
Feature: Layer configuration and relation behavior
  @covers:src/g3w-layer.js
  Scenario: Table metadata and download eligibility follow the configured fields and capabilities
    Then table metadata and downloads reflect the layer configuration

  @covers:src/g3w-layer.js
  Scenario: Related layers expose parent child and editable relation information
    Then related layers retain their relation identities fields and hierarchy

  @covers:src/g3w-layer.js
  Scenario: Visibility respects checked ancestors and configured scale limits
    Then layer visibility categories and style respect the current scale and ancestors

  @covers:src/g3w-layer.js
  Scenario: External WMS layers use source URLs without reserved request parameters
    Then external WMS metadata legends and cache URLs preserve their expected parameters

  @covers:src/g3w-layer.js
  Scenario: Table pagination and spatial filters send their requested parameters to local endpoints
    Then layer data requests preserve pagination fields feature IDs and spatial filters

  @covers:src/g3w-layer.js
  Scenario: Changing styles refreshes field structure feature counts and scale limits
    Then changing a layer style refreshes its server-provided metadata

  @covers:src/g3w-layer.js
  Scenario: GeoJSON and plain responses retain geometry attributes and layer ownership
    Then layer parsers preserve GeoJSON coordinates field labels and raw responses

  @covers:src/g3w-layer.js
  Scenario: QGIS GML sanitizes numeric column names and preserves geographic coordinate order
    Then the GML parser preserves numeric column names and geographic coordinates

  @covers:src/g3w-app.js
  Scenario: Share links preserve changed layer styles and selected URL parameters
    Then permalink creation preserves changed layer state and selectable URL parameters
