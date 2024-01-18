/**
 * Remove mesure tootltip
 * 
 * @param { Object } opts
 * @param opts.map
 * @param opts.tooltip
 * @param opts.unByKey 
 */
export function removeMeasureTooltip({
  map,
  tooltip,
  unbyKey,
}) {
  map.removeOverlay(tooltip);
  ol.Observable.unByKey(unbyKey);
}