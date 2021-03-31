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
    gui(dataPromise, options={}){
      GUI.outputDataPlace(dataPromise, options);
    },
    iframe(dataPromise, options={}){
      IFrameRouterService.outputDataPlace(dataPromise, options);
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
    //retur a promise and not the data
    const data =  service[method](inputs);
    outputs && this.currentoutplutplaces.forEach(place =>{
      this.ouputplaces[place](data, outputs);
    });
    //return always data
    return await data;
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