function ARGISMAPSERVERLegend({layer, params}) {
  const {url, layer:layername} = layer.getConfig().source;
  const serviceUrl = url.replace('/rest/','/');
  return `${serviceUrl}/WMSServer?request=GetLegendGraphic&version=1.3.0&format=image/png&LAYER=${layername}`
};

module.exports = ARGISMAPSERVERLegend;
