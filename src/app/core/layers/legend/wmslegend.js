import ProjectsRegistry from 'store/projects';
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
   categories: <Boolean> if layer has categories or not
   all: <Boolean> all categories. No filter by BBOX of map
   format: <mime_type> it used to set format of legend.
      if request from layers categories (icon and label) is in application/json
      else if request from legend tab is on image/png
   */
  const {categories=false, all=false, format='image/png'} = options;
  bbox = all ? null : bbox; // all=true meas no filter parameters as BBOX
  let url = layer.getWmsUrl({type: 'legend'});
  let STYLES;
  const FORMAT = format ;
  const currentProject = ProjectsRegistry.getCurrentProject();
  if (categories && FORMAT === 'application/json') {
    //set 16 for symbol of chart or other legend symbol
    symbolwidth = symbolheight = 16;
    STYLES = encodeURIComponent(layer.getCurrentStyle().name);
  }
  const dynamicLegend = currentProject.getContextBaseLegend();
  // in case of GetLegendGraphic of format application/json LEGEND_ON and LEGEND_OFF need to be undefined
  // because it create some strange behaviour on wms getMap when switch between style of layer
  const {LEGEND_ON, LEGEND_OFF} = (dynamicLegend || FORMAT=== 'image/png') && categories ? get_LEGEND_ON_LEGEND_OFF_Params(layer) : {};
  const sep = (url.indexOf('?') > -1) ? '&' : '?';
  return [`${url}${sep}SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&SLD_VERSION=${sld_version}`,
    `${width ? '&WIDTH=' + width: ''}`,
    `${height ? '&HEIGHT=' + height: ''}`,
    `&FORMAT=${FORMAT}`,
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
