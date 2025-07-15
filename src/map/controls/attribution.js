/**
 * @file ORIGINAL SOURCE: src/services/map.js@v3.11.10
 * @since 4.0.0
 */

import GUI                      from 'services/gui';
import { getMapLayersByFilter } from 'utils/getMapLayersByFilter';

// wait for map ready
GUI.once('ready', () => GUI.getService('map').once('ready', function () {
  const { header_terms_of_use_text, header_terms_of_use_link } = this.config;

  // set layers attribution
  const attribution = header_terms_of_use_text
    ? header_terms_of_use_link
      ? `<a href="${header_terms_of_use_link}">${header_terms_of_use_text}</a>`
      : `<span class="skin-color" style="font-weight: bold">${header_terms_of_use_text}</span>`
    : false;

  this.getMapLayers().forEach(l => l.getSource().setAttributions(attribution));

  // check if a base layer is set. If true, add attribution control
  if (attribution || getMapLayersByFilter({ BASELAYER: true }).length) {
    this.getMap().addControl(new ol.control.Attribution({ collapsible: false, target: 'map_footer_left' }));
  }
}));