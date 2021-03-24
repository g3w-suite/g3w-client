function AppService(){
  this.init = function(options={}){
    this.project = options.project;
    this.mapService = options.mapService;
    console.log(this.mapService)
  };

  this.zoomtofeature = function(params={}){
    const {qgis_layer_id, field} = params;
    const layer = this.project.getLayerById(qgis_layer_id);
    layer.getFeatures({
      field: 'id|eq|17'
    }).then(({data}) =>{
      this.mapService.zoomToFeatures(data.features);
    })
  }
}

export default new AppService;