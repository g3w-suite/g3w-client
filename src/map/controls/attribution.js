/**
 * @file ORIGINAL SOURCE: src/services/map.js@v3.11.10
 * @since 4.0.0
 */
import ApplicationState from 'g3w-state';
import GUI              from 'services/gui';

// wait for map ready
GUI.once('ready', () => GUI.getService('map').once('ready', function () {
  const {
    header_terms_of_use_text: text,
    header_terms_of_use_link: link
  } = this.config;

  // set layers attribution
  const attribution = text
    ? link
      ? `<a href="${link}">${text}</a>`
      : `<span class="skin-color" style="font-weight: bold">${text}</span>`
    : false;

  this.getMapLayers().forEach(l => l.getSource().setAttributions(attribution));

  const has_baselayer = attribution || Object.values(ApplicationState.layers)
    .filter(s => s.isQueryable())
    .flatMap(s => s.getLayers())
    .filter(l => l.isGeoLayer() && l.isBaseLayer()).length;

  // check if a base layer is set. If true, add attribution control
  if (has_baselayer) {
    this.getMap().addControl(new ol.control.Attribution({ collapsible: false, target: 'map_footer_left' }));
  }
}));