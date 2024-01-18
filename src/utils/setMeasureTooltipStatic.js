/**
 * @param tooltip 
 */
export function setMeasureTooltipStatic(tooltip) {
  tooltip.getElement().className = 'mtooltip mtooltip-static';
  tooltip.setOffset([0, -7]);
}