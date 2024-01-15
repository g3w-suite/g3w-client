/**
 * @param tooltip 
 */
export function setMeasureTooltipStatic(tooltip) {
  const element = tooltip.getElement();
  element.className = 'mtooltip mtooltip-static';
  tooltip.setOffset([0, -7]);
};