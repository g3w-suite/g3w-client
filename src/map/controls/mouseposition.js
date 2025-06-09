/**
 * @file ORIGINAL SOURCE: src/services/map.js@v3.11.10
 * @since 4.0.0
 */

import GUI from 'services/gui';

// wait for map ready
GUI.once('ready', async () => {
  if (isMobile.any) {
    return;
  }
  const map = GUI.getService('map');
  await (new Promise(res => map.once('setupcontrol:mouseposition', res)));
  const degrees = 'degrees' === map.getProjection().getUnits();
  const mapEpsg = map.getEpsg();
  const coordinateFormat = (epsg, coords) => 'EPSG:4326' === epsg
    ? ol.coordinate.format(ol.proj.transform(coords, mapEpsg, 'EPSG:4326'), `\u00A0Lng: {x}, Lat: {y}\u00A0\u00A0 [EPSG:4326]\u00A0`, 4)
    : ol.coordinate.format(coords, `\u00A0${degrees ? 'Lng' : 'X'}: {x}, ${degrees ? 'Lat' : 'Y'}: {y}\u00A0\u00A0 [${epsg}]\u00A0`, degrees ? 4 : 2);
  map.addControl('mouseposition', Object.assign((new ol.control.MousePosition({
    coordinateFormat: coordinateFormat.bind(null, mapEpsg),
    undefinedHTML:    false,
    projection:       map.getCrs(),
    target:           'mouse-position-control'})
  ), { offline: true }), false);
  if ('EPSG:4326' !== mapEpsg) {
    map.getMapControlByType('mouseposition').on('change:epsg',
      e => map.getMapControlByType('mouseposition').setCoordinateFormat(coordinateFormat.bind(null, e.epsg))
    );
  }
});