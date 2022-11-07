const {get_LEGEND_ON_LEGEND_OFF_Params} = require('core/utils/geo');

function WMSLegend({layer, params, options={}}) {
  let {
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
  /*
   to check if used or passed
   */
  const {categories=false, all=false} = options;
  bbox = all ? null : bbox;
  let url = layer.getWmsUrl({type: 'legend'});
  const STYLES = categories && encodeURIComponent(layer.getCurrentStyle().name);
  if (categories) {
    //set 16 for symbol of chart or other legend symbol
    symbolwidth = symbolheight = 16;
  }
  const ProjectsRegistry = require('core/project/projectsregistry');
  const dynamicLegend = ProjectsRegistry.getCurrentProject().getContextBaseLegend();
  const {LEGEND_ON, LEGEND_OFF} = dynamicLegend ? get_LEGEND_ON_LEGEND_OFF_Params(layer) : {};
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
    `${STYLES ? '&STYLES=' + STYLES : ''}`,
    `&LAYER=${LAYER}`
  ].join('');
}

module.exports = WMSLegend;
