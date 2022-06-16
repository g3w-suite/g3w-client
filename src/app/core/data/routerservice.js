import GUI from 'gui/gui';
import IFrameRouterService from 'core/iframe/routerservice';
import utils from 'core/utils/utils';
import queryService from './query/service';
import searchService from './search/service';
import expressionService from './expression/service';
import proxyService from './proxy/service';
import owsService from './ows/service';

class Routerservice {
  constructor() {
    // set deafult outputplace
    this.defaultoutputplaces = ['gui'];
    // set current outputplaces
    this.currentoutputplaces = [...this.defaultoutputplaces]; // array contains all

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
      async gui(dataPromise, options = {}) {
        GUI.setLoadingContent(true);
        try {
          GUI.outputDataPlace(dataPromise, options);
          await dataPromise;
        } catch (err) {}
        GUI.setLoadingContent(false);
      },
      async iframe(dataPromise, options = {}) {
        IFrameRouterService.outputDataPlace(dataPromise, options);
      },
    };
  }

  /**
   *
   * @returns {Promise<void>}
   */
  async init() {
    this.services = {
      query: queryService,
      search: searchService,
      expression: expressionService,
      proxy: proxyService,
      ows: owsService,
    };
  }

  /**
   *
   * @param contextAndMethod 'String contain type of service(search or query): method'
   * @param options
   * @returns {Promise<void>}
   */
  async getData(contextAndMethod, options = {}) {
    const { context, method } = utils.splitContextAndMethod(contextAndMethod);
    const service = this.getService(context);
    const { inputs = {}, outputs = {} } = options;
    // return a promise and not the data
    const dataPromise = service[method](inputs);
    outputs && this.currentoutputplaces.forEach((place) => {
      this.ouputplaces[place](dataPromise, outputs);
    });
    // return always data
    const data = await dataPromise;
    return await data;
  }

  /**
   *Force to show empty output data
   *
   * */
  showEmptyOutputs() {
    const dataPromise = Promise.resolve({
      data: [],
    });
    this.currentoutputplaces.forEach((place) => {
      this.ouputplaces[place](dataPromise);
    });
  }

  /**
   * Set a costum datapromiseoutput to applicationa outputs settede
   * @param dataPromise
   */
  showCustomOutputDataPromise(dataPromise) {
    this.currentoutputplaces.forEach((place) => {
      this.ouputplaces[place](dataPromise, {});
    });
  }

  /**
   *
   * @param serviceName
   * @returns {*}
   */
  getService(serviceName) {
    return this.services[serviceName];
  }

  /*
  * */
  setOutputPlaces(places = []) {
    this.currentoutputplaces = places;
  }

  /**
   *
   * @param place
   */
  addCurrentOutputPlace(place) {
    place && this.currentoutputplaces.indexOf(place) === -1 && this.currentoutputplaces.push(place);
  }

  /**
   *
   * @param place
   * @param method has to get two parameters data (promise) and options (Object)
   * ex {
   * place: <newplace>
   * method(dataPromise, options={}) {}
   *   }
   */
  addNewOutputPlace({ place, method = () => {} } = {}) {
    const added = this.ouputplaces[place] === undefined;
    if (added) this.ouputplaces[place] = method;
    return added;
  }

  // reset default configuration
  resetDefaultOutput() {
    this.currentoutputplaces = [...this.defaultoutputplaces];
  }
}

export default new Routerservice();
