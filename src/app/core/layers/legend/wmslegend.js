const { get_LEGEND_ON_LEGEND_OFF_Params } = require('core/utils/geo');

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

  const {

    /**
     * If layer has categories or not.
     *
     * @type {Boolean}
     */
    categories=false,

    /**
     * All categories. No filter by BBOX of map.
     *
     * @type {Boolean}
     */
    all=false,

    /**
     * Mime Type used to set format of legend.
     *
     * `application/json` = if request from layers categories (icon and label)
     * `image/png`        = if request from legend tab
     *
     * @type {String}
     */
    format='image/png',

  } = options;

  const LAYER = layer.getWMSLayerName({ type: 'legend' });
  const FORMAT = format;
  let STYLES,
      LEGEND_ON,
      LEGEND_OFF,
      url = layer.getWmsUrl({type: 'legend'});

  if (all) {                                                  // all=true means no filter parameters as BBOX
    bbox = null;
  }

  if (categories && 'application/json' === FORMAT) {
    symbolwidth = symbolheight = 16;                          //set 16 for symbol of chart or other legend symbol
    STYLES = encodeURIComponent(layer.getCurrentStyle().name);
  }
  const ProjectsRegistry = require('core/project/projectsregistry');
  // in case of GetLegendGraphic of format `application/json`
  // LEGEND_ON and LEGEND_OFF need to be undefined because
  // it create some strange behaviour on WMS `getMap` when
  // switching between layer styles
  if (categories && (ProjectsRegistry.getCurrentProject().getContextBaseLegend() || 'image/png' === FORMAT)) {
    ({ LEGEND_ON, LEGEND_OFF } = get_LEGEND_ON_LEGEND_OFF_Params(layer));
  }

  return [
    `${url}${(url.indexOf('?') > -1) ? '&' : '?'}SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&SLD_VERSION=${sld_version}`,
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
