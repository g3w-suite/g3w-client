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
  const {categories=false} = options;
  let url = layer.getWmsUrl({type: 'legend'});
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
    `&LAYER=${LAYER}`,
  ].join('');
}

module.exports = WMSLegend;
