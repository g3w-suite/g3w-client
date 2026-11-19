@offline @static-resources
Feature: Static client resources work offline

  @covers:src/static/locales/index.js @covers:src/static/locales/bg.js @covers:src/static/locales/de.js @covers:src/static/locales/en.js @covers:src/static/locales/es.js @covers:src/static/locales/fi.js @covers:src/static/locales/fr.js @covers:src/static/locales/it.js @covers:src/static/locales/pl.js @covers:src/static/locales/pt.js @covers:src/static/locales/ro.js @covers:src/static/locales/se.js @covers:src/static/locales/uk.js
  Scenario: Locale registry supplies translated interface labels
    Then each registered locale provides its expected sign-in and confirmation labels

  @covers:src/static/geocoding-providers/nominatim.js
  Scenario: Nominatim searches within the map extent
    Then the "nominatim" provider handles an offline search

  @covers:src/static/geocoding-providers/bing_places.js
  Scenario: Bing Places searches within the map extent
    Then the "bing_places" provider handles an offline search

  @covers:src/static/geocoding-providers/bing_streets.js
  Scenario: Bing Streets searches within the map extent
    Then the "bing_streets" provider handles an offline search

  @covers:src/static/geocoding-providers/google.js
  Scenario: Google searches within the map extent and disables denied keys
    Then the "google" provider handles an offline search

  @covers:src/static/geocoding-providers/qes.js
  Scenario: QES searches project features and zooms to a result
    Then the "qes" provider handles an offline search

  @static-browser @covers:src/static/cursors/mCapturePoint.svg @covers:src/static/cursors/mIdentify.svg @covers:src/static/cursors/mZoomIn.svg @covers:src/static/cursors/mZoomOut.svg @covers:src/static/images/addlayer.svg @covers:src/static/images/camera.svg @covers:src/static/images/compass.svg @covers:src/static/images/loader.svg @covers:src/static/images/mActionAddBasicCircle.svg @covers:src/static/images/mActionAddBasicRectangle.svg @covers:src/static/images/mActionAddPoint.svg @covers:src/static/images/mActionAddPolygon.svg @covers:src/static/images/mActionAddPolyline.svg @covers:src/static/images/mActionCreateAnnotationLayer.svg @covers:src/static/images/mActionIdentify.svg @covers:src/static/images/mActionIdentifyByFreehand.svg @covers:src/static/images/mActionIdentifyByPolygon.svg @covers:src/static/images/mActionIdentifyByRadius.svg @covers:src/static/images/mActionIdentifyByRectangle.svg @covers:src/static/images/mActionMeasure.svg @covers:src/static/images/mActionText.svg @covers:src/static/images/mActionTextAnnotation.svg @covers:src/static/images/mActionZoomFullExtent.svg @covers:src/static/images/mActionZoomIn.svg @covers:src/static/images/mActionZoomOut.svg @covers:src/static/images/mActionZoomToArea.svg @covers:src/static/images/mapcentermarker.svg @covers:src/static/images/my_location.svg @covers:src/static/images/no-image.svg @covers:src/static/images/pushpin.svg @covers:src/static/images/streetview.svg
  Scenario: Cursor and interface SVGs render as visible images
    Then all assigned SVGs decode and paint visible pixels

  @static-browser @covers:src/static/images/bingaerial.png @covers:src/static/images/bingaerialwithlabels.png @covers:src/static/images/bingstreets.png @covers:src/static/images/FakeProjectThumb.png @covers:src/static/images/g3wsuite_logo.png @covers:src/static/images/logo_gis3w_156_85.png @covers:src/static/images/nobaselayer.png @covers:src/static/images/osm.png @covers:src/static/images/streetviewarrow.png
  Scenario: Basemap thumbnails and logos decode and paint
    Then all assigned PNGs decode and paint visible pixels

  @static-browser @covers:src/static/fonts/titillium-web-latin-400-italic.woff2 @covers:src/static/fonts/titillium-web-latin-400-normal.woff2 @covers:src/static/fonts/titillium-web-latin-700-italic.woff2 @covers:src/static/fonts/titillium-web-latin-700-normal.woff2 @covers:src/static/fonts/titillium-web-latin-ext-400-italic.woff2 @covers:src/static/fonts/titillium-web-latin-ext-400-normal.woff2 @covers:src/static/fonts/titillium-web-latin-ext-700-italic.woff2 @covers:src/static/fonts/titillium-web-latin-ext-700-normal.woff2
  Scenario: Titillium font variants load and render their glyphs
    Then each assigned font loads and changes the rendered text metrics

  @static-browser @covers:src/static/app.css
  Scenario: The application stylesheet controls layout and interactive states
    Then the actual application stylesheet styles a sample interface

  @covers:src/static/README.md
  Scenario: Static resource maintenance instructions point to the upstream folder and local scripts
    Then the static resource documentation identifies its upstream folder and available build commands
