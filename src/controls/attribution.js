/**
 * @file ORIGINAL SOURCE: src/map/controls/attribution.js@v4.0.0
 * @since 4.1.0
 */

import ApplicationState from 'g3w-state';
import GUI              from 'g3w-app';

// wait for map ready
GUI.isMapReady().then(() => {
  const {
    header_terms_of_use_text: text,
    header_terms_of_use_link: link
  } = GUI.config;

  // set layers attribution
  const attribution = text
    ? link
      ? `<a href="${link}">${text}</a>`
      : `<span class="skin-color" style="font-weight: bold">${text}</span>`
    : false;

  GUI.getMapLayers().forEach(l => l.getSource().setAttributions(attribution));

  const has_baselayer = attribution || Object.values(ApplicationState.layers)
    .flatMap(s => s.isQueryable() ? s.getLayers() : [])
    .filter(l => l.isGeoLayer() && l.isBaseLayer()).length;

  // check if a base layer is set. If true, add attribution control
  if (has_baselayer) {
    GUI.getMap().addControl(new ol.control.Attribution({ collapsible: false, target: 'map_footer_left' }));
  }
});