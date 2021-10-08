function Service(options={}){
  const {wmsurls=['http://www502.regione.toscana.it/wmsraster/com.rt.wms.RTmap/wms?map=wmscartoteca&']} = options;
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


export default Service