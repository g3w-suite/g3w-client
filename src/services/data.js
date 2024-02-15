/**
 * @file
 * @since v3.6
 */

import ExpressionService from 'services/data-expression';
import OWSService from 'services/data-ows';
import ProxyService from 'services/data-proxy';
import QueryService from 'services/data-query';
import SearchService from 'services/data-search';
import IFrameRouterService from 'services/iframe';
import GUI from 'services/gui';

const { splitContextAndMethod } = require('utils');

function DataService() {
  //set deafult outputplace
  this.defaultoutputplaces = ['gui'];
  // set current outputplaces
  this.currentoutputplaces =  [...this.defaultoutputplaces]; // array contains all

  /**
   * Object contain output function to show results
   * @type {{gui(*=, *=): void, iframe(*=, *=): void}}
   * dataPromise: is thre promise request for data,
   * options: {
   *   show: method or Boolean to set if show or not the result on output
   *   before : async function to handle data return from server
   *   after: method to handle or do some thisn after show data
   * }
   */
  this.ouputplaces = {
    async gui(dataPromise, options={}){
      GUI.setLoadingContent(true);
      try {
        GUI.outputDataPlace(dataPromise, options);
        await dataPromise;
      } catch(err){}
      GUI.setLoadingContent(false);
    },
    async iframe(dataPromise, options={}){
      IFrameRouterService.outputDataPlace(dataPromise, options);
    }
  };

  /**
   *
   * @returns {Promise<void>}
   */
  this.init = async function(){
    this.services = {
      query: QueryService,
      search: SearchService,
      expression: ExpressionService,
      proxy: ProxyService,
      ows: OWSService
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
    const {inputs={}, outputs={}} = options;
    //return a promise and not the data
    const dataPromise = service[method](inputs);
    outputs && this.currentoutputplaces.forEach(place =>{
      this.ouputplaces[place](dataPromise, outputs);
    });
    //return always data
    const data = await dataPromise;
    return await data;
  };

  /**
   *Force to show empty output data
   *
   * */
  this.showEmptyOutputs = function(){
    const dataPromise = Promise.resolve({
      data: []
    });
    this.currentoutputplaces.forEach(place =>{
      this.ouputplaces[place](dataPromise);
    });
  };

  /**
   * Set a costum datapromiseoutput to applicationa outputs settede
   * @param dataPromise
   */
  this.showCustomOutputDataPromise = function(dataPromise){
    this.currentoutputplaces.forEach(place =>{
      this.ouputplaces[place](dataPromise, {});
    });
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
    this.currentoutputplaces = places;
  };

  /**
   *
   * @param place
   */
  this.addCurrentOutputPlace = function(place){
    place && this.currentoutputplaces.indexOf(place) === -1 && this.currentoutputplaces.push(place);
  };

  /**
   *
   * @param place
   * @param method has to get two parameters data (promise) and options (Object)
   * ex {
   * place: <newplace>
   * method(dataPromise, options={}){}
   *   }
   */
  this.addNewOutputPlace = function({place, method=()=>{}}={}){
    let added = false;
    if (this.ouputplaces[place] === undefined) {
      this.ouputplaces[place] = method;
      added = true;
    }
    return added;
  };

  // reset default configuration
  this.resetDefaultOutput = function(){
    this.currentoutputplaces = [...this.defaultoutputplaces];
  };

}

export default new DataService();