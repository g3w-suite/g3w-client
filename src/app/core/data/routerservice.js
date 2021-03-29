const queryService = require('./query/service');
const searchService = require('./search/service');

function Routerservice() {

  //
  this.default = {
    ouputplace: true
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
    const [serviceName, method] = serviceAndMethod.split(':')
    const service = this.getService(serviceName);
    const { inputs={}, outputs={}} = options;
    const data = await service[method](inputs);
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


  this.setOutputPromise = function(){
    this.default.ouputplace = false;
    console.log('qui')
  };

  // reset default configuration
  this.resetDefaultOutput = function(){
    this.deafult.ouputplace = true;
  };

}

module.exports = new Routerservice();