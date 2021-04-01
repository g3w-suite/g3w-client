const queryService = require('core/data/query/service');
const searchService = require('core/data/search/service');
const IFrameRouterService = require('core/iframe/routerservice');
const { splitContextAndMethod } =require('core/utils/utils');
const GUI = require('gui/gui');

function Routerservice() {
  //set deafult outputplace
  this.defaultoutputplaces = ['gui'];
  // set current outputplaces
  this.currentoutplutplaces =  [...this.defaultoutputplaces]; // array contains all

  /**
   * Object contain outplut function to show results
   * @type {{gui(*=, *=): void, iframe(*=, *=): void}}
   */
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
   * @param contextAndMethod 'String contain type of service(search or query): method'
   * @param options
   * @returns {Promise<void>}
   */
  this.getData = async function(contextAndMethod, options={}){
    const {context, method} = splitContextAndMethod(contextAndMethod);
    const service = this.getService(context);
    const { inputs={}, outputs={}} = options;
    //return a promise and not the data
    const dataPromise = service[method](inputs);
    outputs && this.currentoutplutplaces.forEach(place =>{
      this.ouputplaces[place](dataPromise, outputs);
    });
    //return always data
    const data = await dataPromise;
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