import WMSLayersPanel from './vue/panel/wmslayerspanel';
const GUI = require('gui/gui');
const {XHR} = require('core/utils/utils');

function Service(options={}){
  const {wmsurls=['http://www502.regione.toscana.it/ows_catasto/com.rt.wms.RTmap/ows?map=owscatasto']} = options;
  this.state = {
    wmsurls
  }
}

const proto = Service.prototype;

proto.addNewWmsUrl = function(wmsurl){
  const findwmsurl = this.state.wmsurls.find(url => url == wmsurl);
  !findwmsurl &&this.state.wmsurls.unshift(wmsurl);
  return findwmsurl;
};

proto.showWmsLayersPanel = function(wmsurl){
  const panel = new WMSLayersPanel({
    wmsurl,
    service: this
  });
  panel.show();
  return panel;
};

proto.getWMSLayers = async function(wmsurl){
  //XHR
  const promise = new Promise(resolve => setTimeout(resolve, 1000));
  await promise;
  return [
    {
      id: 'rt_cat.idcatpart.rt',
      name: 'Particelle'
    },
    {
      id: 'rt_cat.idcatpart.aree_demaniali.rt',
      name: 'Particelle demaniali'
    }
  ]
};

proto.addWMSlayerToMap = function({url, layers=[]}={}){
  const mapService = GUI.getService('map');
  mapService.addExternalWMSLayer({
    url,
    layers,
    position: 'top'
  })
};

proto.clear = function(){

};


export default Service