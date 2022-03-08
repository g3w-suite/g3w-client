import WMSLayersPanel from './vue/panel/wmslayerspanel';
const ApplicationService = require('core/applicationservice');
const GUI = require('gui/gui');
const {XHR} = require('core/utils/utils');

function Service(options={}){
  const {wmsurls=['http://www502.regione.toscana.it/ows_catasto/com.rt.wms.RTmap/ows?map=owscatasto']} = options;
  this.state = {
    wmsurls
  };
  //get sidebar panel
  this.panel;
}

const proto = Service.prototype;

proto.addNewWmsUrl = function(wmsurl){
  const findwmsurl = this.state.wmsurls.find(url => url == wmsurl);
  !findwmsurl &&this.state.wmsurls.unshift(wmsurl);
  return findwmsurl;
};

proto.deleteWmsUrl = function(wmsurl){
  this.state.wmsurls = this.state.wmsurls.filter(url => url !== wmsurl);
};

proto.showWmsLayersPanel = function(wmsurl){
  this.panel = new WMSLayersPanel({
    wmsurl,
    service: this
  });
  this.panel.show();
  return this.panel;
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

proto.addWMSlayerToMap = async function({url, name, projection, position, layers=[]}={}){
  const mapService = GUI.getService('map');
  try {
    await mapService.addExternalWMSLayer({
      url,
      name,
      layers,
      projection,
      position
    });
  } catch(err){
    console.log(err)
  }
  this.panel.close();
};

proto.clear = function(){
  this.panel = null;
};


export default Service