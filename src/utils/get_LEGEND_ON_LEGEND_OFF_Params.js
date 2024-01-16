export function get_LEGEND_ON_LEGEND_OFF_Params(layer) {
  let LEGEND_ON, LEGEND_OFF;
  (layer.getCategories() || [])
    .forEach(({
      checked,  // new Value
      _checked, // old Value
      ruleKey,
    }) => {
      // skip when there's no difference from original `checked` status (_checked) and current changed by toc categories (checked)
      if (checked === _checked) {
        return;
      }
      if (checked) {
        LEGEND_ON  = (undefined === LEGEND_ON ? `${layer.getWMSLayerName()}:` : `${LEGEND_ON},`) + ruleKey;
      } else {
        LEGEND_OFF = (undefined === LEGEND_OFF ? `${layer.getWMSLayerName()}:` : `${LEGEND_OFF},`) + ruleKey;
      }
    });
  return {
    LEGEND_ON,
    LEGEND_OFF,
  }
}