function WMSLegend({layer, params, options={}}) {
  const {
    width,
    height,
    color="white",
    fontsize=10,
    transparent=true,
    boxspace,
    layerspace,
    layertitle=true,
    layertitlespace,
    symbolspace,
    iconlabelspace,
    symbolwidth,
    symbolheight,
    itemfontfamily,
    layerfontfamily,
    layerfontbold,
    itemfontbold,
    layerfontitalic,
    itemfontitalic,
    rulelabel,
    crs,
    bbox,
    sld_version='1.1.0'
  } = params;
  const LAYER = layer.getWMSLayerName({
    type: 'legend'
  });
  const ProjectsRegistry = require('core/project/projectsregistry');
  const dynamicLegend = ProjectsRegistry.getCurrentProject().getContextBaseLegend();
  const {categories=false} = options;
  let url = layer.getWmsUrl({type: 'legend'});
  let LEGEND_ON;
  let LEGEND_OFF;
  /*
  * add and check legend categories parameter only if set dynamic legend
   */
  if (dynamicLegend && layer.getCategories()) {
    /**
     * checked: current status
     * _checked: original status
     * handle only difference (diff) from original checked status and current chenge by toc categories
     */
    layer.getCategories().forEach(({checked, _checked, ruleKey}) => {
      if (checked !== _checked) {
        if (checked) {
          if (typeof LEGEND_ON === 'undefined') LEGEND_ON = `${layer.getWMSLayerName()}:`;
          else LEGEND_ON = `${LEGEND_ON},`;
          LEGEND_ON = `${LEGEND_ON}${ruleKey}`
        } else {
          if (typeof LEGEND_OFF === 'undefined') LEGEND_OFF = `${layer.getWMSLayerName()}:`;
          else  LEGEND_OFF = `${LEGEND_OFF},`;
          LEGEND_OFF = `${LEGEND_OFF}${ruleKey}`;
        }
      }
    });
  }
  const sep = (url.indexOf('?') > -1) ? '&' : '?';
  return [`${url}${sep}SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&SLD_VERSION=${sld_version}`,
    `${width ? '&WIDTH=' + width: ''}`,
    `${height ? '&HEIGHT=' + height: ''}`,
    `&FORMAT=${categories ? 'application/json' : 'image/png'}`,
    `&TRANSPARENT=${transparent}`,
    `&ITEMFONTCOLOR=${color}`,
    `&LAYERFONTCOLOR=${color}`,
    `&LAYERTITLE=${layertitle}`,
    `&ITEMFONTSIZE=${fontsize}`,
    `${crs ? '&CRS=' + crs: ''}`,
    `${bbox ? '&BBOX=' + bbox.join(','): ''}`,
    `${boxspace ? '&BOXSPACE=' + boxspace: ''}`,
    `${layerspace ? '&LAYERSPACE=' + layerspace: ''}`,
    `${layertitlespace ? '&LAYERTITLESPACE=' + layertitlespace: ''}`,
    `${symbolspace ? '&SYMBOLSPACE=' + symbolspace: ''}`,
    `${iconlabelspace ? '&ICONLABELSPACE=' + iconlabelspace: ''}`,
    `${symbolwidth ? '&SYMBOLWIDTH=' + symbolwidth : ''}`,
    `${symbolheight ? '&SYMBOLHEIGHT=' + symbolheight : ''}`,
    `${layerfontfamily ? '&LAYERFONTFAMILY=' + layerfontfamily : ''}`,
    `${itemfontfamily ? '&ITEMFONTFAMILY=' + itemfontfamily : ''}`,
    `${layerfontbold ? '&LAYERFONTBOLD=' + layerfontbold : ''}`,
    `${itemfontbold ? '&ITEMFONTBOLD=' + itemfontbold : ''}`,
    `${layerfontitalic ? '&LAYERFONTITALIC=' + layerfontitalic : ''}`,
    `${itemfontitalic ? '&ITEMFONTITALIC=' + itemfontitalic : ''}`,
    `${rulelabel ? '&RULELABEL=' + rulelabel : ''}`,
    `${LEGEND_ON ? '&LEGEND_ON=' + LEGEND_ON : ''}`,
    `${LEGEND_OFF ? '&LEGEND_OFF='+ LEGEND_OFF : ''}`,
    `&LAYER=${LAYER}`
  ].join('');
}

module.exports = WMSLegend;
