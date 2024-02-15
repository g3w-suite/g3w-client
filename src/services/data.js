/**
 * @file
 * @since v3.6
 */

import ExpressionService   from 'services/data-expression';
import OWSService          from 'services/data-ows';
import ProxyService        from 'services/data-proxy';
import QueryService        from 'services/data-query';
import SearchService       from 'services/data-search';
import IFrameRouterService from 'services/iframe';
import GUI                 from 'services/gui';

const { splitContextAndMethod } = require('utils');

class DataService {

  constructor () {

    /**
     * deafult outputplace 
     */
    this.defaultoutputplaces = ['gui'];

    /**
     * current outputplaces
     */
    this.currentoutputplaces =  [...this.defaultoutputplaces]; // array contains all

    /**
     * Object contain output function to show results
     * 
     * @type {{ gui(*=, *=): void, iframe(*=, *=): void}}
     * 
     * dataPromise: is the promise request for data,
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

  }

  /**
   * @returns {Promise<void>}
   */
  async init() {
    this.services = {
      query:      QueryService,
      search:     SearchService,
      expression: ExpressionService,
      proxy:      ProxyService,
      ows:        OWSService
    };
  }

  /**
   * @param contextAndMethod 'String contain type of service(search or query): method'
   * @param options
   * 
   * @returns {Promise<void>}
   */
  async getData(contextAndMethod, options = {}) {
    const data = splitContextAndMethod(contextAndMethod);
    const {
      inputs = {},
      outputs = {}
    } = options;
    const response = this.getService(data.context)[data.method](inputs);
    if (outputs) {
      this.currentoutputplaces.forEach(place => { this.ouputplaces[place](response, outputs); });
    }
    return await (await response);
  }

  /**
   * Force to show empty output data
   */
  showEmptyOutputs() {
    const data = Promise.resolve({ data: [] });
    this.currentoutputplaces.forEach(place => { this.ouputplaces[place](data); });
  }

  /**
   * Set a costum datapromiseoutput to applicationa outputs settede
   * 
   * @param dataPromise
   */
  showCustomOutputDataPromise(dataPromise) {
    this.currentoutputplaces.forEach(place => { this.ouputplaces[place](dataPromise, {}); });
  }

  getService(serviceName) {
    return this.services[serviceName]
  }

  setOutputPlaces(places = []) {
    this.currentoutputplaces = places;
  }

  /**
   * @param place
   */
  addCurrentOutputPlace(place) {
    if (place && -1 === this.currentoutputplaces.indexOf(place)) {
      this.currentoutputplaces.push(place);
    } 
  }

  /**
   * @param place <newplace>
   * @param method has to get two parameters data (promise) and options (Object)
   * 
   * @returns {boolean} whether <newplace> is added
   */
  addNewOutputPlace({
    place,
    method = (dataPromise, options = {}) => {}
  } = {}) {
    if (this.ouputplaces[place] === undefined) {
      this.ouputplaces[place] = method;
      return true;
    }
    return false;
  };

  /**
   * reset default configuration
   */
  resetDefaultOutput() {
    this.currentoutputplaces = [...this.defaultoutputplaces];
  }

}

export default new DataService();