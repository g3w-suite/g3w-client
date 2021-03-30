const queryService = require('./query/service');
const searchService = require('./search/service');
const IFrameRouterService = require('core/iframe/routerservice');
const GUI = require('gui/gui');

function Routerservice() {
  //set deafult outputplace
  this.defaultoutputplaces = ['gui'];
  // set current outputplaces
  this.currentoutplutplaces =  [...this.defaultoutputplaces]; // array contains all
  //
  this.ouputplaces = {
    gui(data, options={}){
      GUI.outputDataPlace(data, options);
      // queryResultsService.onceafter('postRender', () => {
      //   this.state.searching = false;
      //   const {data=[]} = results;
      //   if (this.project.state.autozoom_query && data.length){
      //     queryResultsService.zoomToLayerFeaturesExtent({features: data[0].features}, {
      //       highlight: true
      //     })
      //   }
      // });
    },
    iframe(data, options={}){
      IFrameRouterService.outputDataPlace(data, options);
    }
  };

  /**
   *
   * @returns {Promise<void>}
   */
  this.init = async function(){
    this.services = {
      query: queryService,
      search: searchService
    };
  };

  /**
   *
   * @param serviceAndMethod 'String contain type of service(search or query): method'
   * @param options
   * @returns {Promise<void>}
   */
  this.getData = async function(serviceAndMethod, options={}){
    const [serviceName, method] = serviceAndMethod.split(':');
    const service = this.getService(serviceName);
    const { inputs={}, outputs={}} = options;
    // set if we want to output data to places: default true
    const {show=true} = outputs;
    const data = await service[method](inputs);
    show && this.currentoutplutplaces.forEach(place =>{
      this.ouputplaces[place](data, outputs);
    });
    //return always data
    return data;

  };

  /**
   *
   * @param serviceName
   * @returns {*}
   */
  this.getService = function(serviceName){
    return this.services[serviceName]
  };

  /*
  * */
  this.setOutputPlaces = function(places=[]){
    this.currentoutplutplaces = places;
  };

  this.addOutputPlace = function(place){
    place && this.currentoutplutplaces.idexOf(place) === -1 && this.currentoutplutplaces.push(place);
  };

  // reset default configuration
  this.resetDefaultOutput = function(){
    this.currentoutplutplaces = [...this.defaultoutputplaces];
  };

}

module.exports = new Routerservice();