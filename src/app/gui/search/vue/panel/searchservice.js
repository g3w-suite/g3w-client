import { ALLVALUE, RETURN_TYPES}  from '../../constants';
const { base, inherit, toRawType , getUniqueDomId, createFilterFormInputs, createSingleFieldParameter, isEmptyObject} = require('core/utils/utils');
const DataRouterService = require('core/data/routerservice');
const GUI = require('gui/gui');
const G3WObject = require('core/g3wobject');
const CatalogLayersStorRegistry = require('core/catalog/cataloglayersstoresregistry');
const ProjectsRegistry = require('core/project/projectsregistry');
const NONVALIDVALUES = [null, undefined, ALLVALUE];

function SearchService(config={}) {
  this.debounces =  {
    run: {
      fnc: (...args) => {
        if (GUI.isMobile()){
         const [width, heigth] = this.mapService.getMap().getSize();
         if  (width === 0 || heigth === 0) {
           GUI.hideSidebar();
           setTimeout(()=>{
             this._run(...args)
           }, 600)
         } else this._run(...args);
        } else this._run(...args)
      }
    }
  };
  base(this);
  // reactivity data
  this.state = {
    title: null,
    forminputs: [],
    loading: {},
    searching: false
  };
  const {options={}} = config;
  const layerid = options.querylayerid || options.layerid || null;
  const otherquerylayerids = options.otherquerylayerids || [];
  const filter = options.filter || [];
  this.inputdependance = {};
  this.inputdependencies = [];
  this.cachedependencies = {};
  this.project = ProjectsRegistry.getCurrentProject();
  this.mapService = GUI.getComponent('map').getService();
  this.searchLayer = null;
  this.filter = null;
  this.inputs = [];
  this.state.title = config.name;
  this.search_endpoint = config.search_endpoint;
  this.url = options.queryurl;
  this.filter = options.filter;
  this.return = options.return || 'data';
  this.show = this.return === 'data';
  this.searchLayer = CatalogLayersStorRegistry.getLayerById(layerid);
  this.searchLayers = [layerid, ...otherquerylayerids].map(layerid => CatalogLayersStorRegistry.getLayerById(layerid));
  this.createInputsFormFromFilter({filter});
}

inherit(SearchService, G3WObject);

const proto = SearchService.prototype;

/**
 * Get return type
 */

proto.getReturnType = function(){
  return this.return;
};

/**
 * Set return type
 */

proto.setReturnType = function(returnType='data'){
  this.return = returnType;
  //set show only in case return === 'data'
  this.show = this.return === 'data';
};

proto.createFieldsDependenciesAutocompleteParameter = function({fields=[], field, value}={}) {
  const dependendency = this.getCurrentFieldDependance(field);
  if (value !== void 0) {
    const fieldParam = createSingleFieldParameter({
      field,
      value,
      operator: this.getFilterInputFromField(field).op
    });
    fields.push(fieldParam);
  }
  if (dependendency) {
    const [field, value] = Object.entries(dependendency)[0];
    const operator = this.getFilterInputFromField(field).op;
    fields.unshift(`${field}|${operator}|${encodeURI(value)}`);
    return this.createFieldsDependenciesAutocompleteParameter({
      fields,
      field
    })
  }
  return fields.length && fields.join() || void 0;
};

proto.getUniqueValuesFromField = async function({field, value, unique}){
  let data = [];
  try {
    data = await this.searchLayers[0].getFilterData({
      field,
      suggest: value !== void 0 ? `${field}|${value}` : void 0,
      unique
    })
  } catch(err){}
  return data;
};

proto.autocompleteRequest = async function({field, value}={}){
  let data = [];
  try {
    data = await this.searchLayer.getFilterData({
      field: this.createFieldsDependenciesAutocompleteParameter({
        field
      }),
      suggest: `${field}|${value}`,
      unique: field
    })
  } catch(error) {}
  return data.map(value => ({
    id:value,
    text:value
  }))
};

proto.doSearch = async function({filter, search_endpoint=this.getSearchEndPoint(), queryUrl=this.url, feature_count=10000, show=this.show} ={}) {
  filter = filter || this.createFilter();
  // call a generic method of layer
  let data;
  this.state.searching = true;
  try {
    data = await DataRouterService.getData('search:features', {
      inputs:{
        layer: this.searchLayers,
        search_endpoint,
        filter,
        queryUrl,
        formatter: 1, // set formatter to 1
        feature_count,
        raw: this.return === 'search' // parameter to get raw response
      },
      outputs: show && {
        title: this.state.title
      }
    });
    if (show){
      // in case of autozoom_query
      if (this.project.state.autozoom_query && data && data.data.length === 1){
        this.mapService.zoomToFeatures(data.data[0].features)
      }
    } else {
      switch (this.return) {
        case 'search':
          GUI.closeContent();
          // in case of api get first response on array
          data = data.data[0].data;
          if (isEmptyObject(data)){
            const dataPromise = Promise.resolve({});
            DataRouterService.showCustomOutputDataPromise(dataPromise);
          } else {
            const SearchPanel = require('gui/search/vue/panel/searchpanel');
            const add_panel = new SearchPanel(data);
            add_panel.show();
          }
          break;
      }
    }
  } catch(err){
    console.log(err)
  }
  this.state.searching = false;
  return data;
};

proto.filterValidFormInputs = function(){
  return this.state.forminputs.filter(input => NONVALIDVALUES.indexOf(input.value) === -1 && input.value.toString().trim() !== '');
};

/**
 *
 * @returns {string|*|string}
 */
proto.getSearchEndPoint = function(){
  return this.search_endpoint || this.searchLayer.getSearchEndPoint()
};

/*
* type wms, vector (for vector api)
* */
proto.createFilter = function(search_endpoint=this.getSearchEndPoint()){
  const inputs = this.filterValidFormInputs();
  return createFilterFormInputs({
    layer: this.searchLayers,
    inputs,
    search_endpoint
  })
};

proto._run = function() {
  this.doSearch();
};

proto.changeInput = function({id, value} = {}) {
  const input = this.state.forminputs.find(input => id == input.id);
  input.value = value;
};

proto.createQueryFilterFromConfig = function({filter}) {
  let queryFilter;
  function createOperatorObject(inputObj) {
    for (const operator in inputObj) {
      const input = inputObj[operator];
      if (Array.isArray(input)) {
        createBooleanObject(operator, input);
        break;
      }
    }
    const field = inputObj.attribute;
    const operator = inputObj.op;
    const evalObject = {};
    evalObject[operator] = {};
    evalObject[operator][field] = null;
    return evalObject;
  }

  function createBooleanObject(booleanOperator, inputs = []) {
    const booleanObject = {};
    booleanObject[booleanOperator] = [];
    inputs.forEach((input) => {
      booleanObject[booleanOperator].push(createOperatorObject(input));
    });
    return booleanObject;
  }
  for (const operator in filter) {
    const inputs = filter[operator];
    queryFilter = createBooleanObject(operator, inputs);
  }
  return queryFilter;
};

proto.getFilterInputFromField = function(field){
  return this.filter.find(input =>  input.attribute === field);
};

proto._getExpressionOperatorFromInput = function(field) {
  const dependanceCascadeField = this.getFilterInputFromField(field);
  return dependanceCascadeField ? dependanceCascadeField.op : null;
};

proto._getCascadeDependanciesFilter = function(field, dependencies=[]) {
  const dependanceCascadeField = this.getFilterInputFromField(field);
  const dependance = dependanceCascadeField.input.options.dependance;
  if (dependance) {
    dependencies.unshift(dependance);
    this._getCascadeDependanciesFilter(dependance, dependencies)
  }
  return dependencies
};

proto.getCurrentFieldDependance = function(field) {
  const dependance = this.inputdependance[field];
  return dependance && this.cachedependencies[dependance] && this.cachedependencies[dependance]._currentValue !== ALLVALUE && {
   [dependance]: this.cachedependencies[dependance]._currentValue
  } || null;
};

// check the current value of dependance
proto.getDependanceCurrentValue = function(field) {
  const dependance = this.inputdependance[field];
  return dependance ? this.cachedependencies[dependance]._currentValue : this.state.forminputs.find(forminput => forminput.attribute === field).value;
};

// fill all dependencies inputs based on value
proto.fillDependencyInputs = function({field, subscribers=[], value=ALLVALUE}={}) {
  const isRoot = this.inputdependance[field] === undefined;
  //check id inpute father is valid to search on subscribers
  const invalidValue = value===ALLVALUE || value === null || value === undefined || value.toString().trim() === '';
  return new Promise((resolve, reject) => {
    subscribers.forEach(subscribe => {
      // in case of atuocomplete reset values to empty array
      if (subscribe.type === 'autocompletefield') subscribe.options.values.splice(0);
      else {
        //set starting all values
        if (subscribe.options._allvalues === undefined)
          subscribe.options._allvalues = [...subscribe.options.values];
        //case of father is set an empty invalid value (all value exmaple)
        if (invalidValue) {
          //subscribe has to set all valaues
          subscribe.options.values.splice(0);
          setTimeout(()=>{
            subscribe.options.values = [...subscribe.options._allvalues]
          });
        } else subscribe.options.values.splice(1); //otherwise has to get first __ALL_VALUE
      }
      subscribe.value =  subscribe.type !== 'selectfield' ? ALLVALUE : null;
    });
    this.cachedependencies[field] = this.cachedependencies[field] || {};
    this.cachedependencies[field]._currentValue = value;
    if (value && value !== ALLVALUE) {
      let isCached;
      let rootValues;
      if (isRoot) {
        const cachedValue = this.cachedependencies[field] && this.cachedependencies[field][value];
        isCached = cachedValue !== void 0;
        rootValues = isCached && cachedValue;
      } else {
        const dependenceCurrentValue = this.getDependanceCurrentValue(field);
        const cachedValue = this.cachedependencies[field]
          && this.cachedependencies[field][dependenceCurrentValue]
          && this.cachedependencies[field][dependenceCurrentValue][value];
        isCached = cachedValue !== undefined;
        rootValues = isCached && cachedValue;
      }
      if (isCached) {
        for (let i = 0; i < subscribers.length; i++) {
          const subscribe = subscribers[i];
          const values = rootValues[subscribe.attribute];
          if (values && values.length) {
            for (let i = 0; i < values.length; i++) {
              subscribe.options.values.push(values[i]);
            }
          }
          resolve()
        }
      } else {
        this.state.loading[field] = true;
        if (isRoot) this.cachedependencies[field][value] = this.cachedependencies[field][value] || {};
        else {
          const dependenceValue =  this.getDependanceCurrentValue(field);
          this.cachedependencies[field][dependenceValue] = this.cachedependencies[field][dependenceValue] || {};
          this.cachedependencies[field][dependenceValue][value] = this.cachedependencies[field][dependenceValue][value] || {}
        }
        // exclude autocomplete subscribers
        const notAutocompleteSubscribers = subscribers.filter( subscribe => subscribe.type !== 'autocompletefield');
        if (notAutocompleteSubscribers.length) {
          const fieldParams = this.createFieldsDependenciesAutocompleteParameter({
            field,
            value
          });
          const uniqueParams = notAutocompleteSubscribers.length && notAutocompleteSubscribers.length=== 1 ? notAutocompleteSubscribers[0].attribute : undefined;
          this.searchLayer.getFilterData({
            field: fieldParams,
            unique: uniqueParams
          }).then(data => {
            data = uniqueParams ? data : data.data[0].features || [];
            data = this.valuesToKeysValues(data);
            for (let i = 0; i < notAutocompleteSubscribers.length; i++) {
              const subscribe = notAutocompleteSubscribers[i];
              if (uniqueParams) data.forEach(value => subscribe.options.values.push(value));
              else {
                const { attribute } = subscribe;
                const uniqueValues = new Set();
                data.forEach(feature => {
                  const value = feature.get(attribute);
                  value && uniqueValues.add(value);
                });
                [...uniqueValues].sort().forEach(value => subscribe.options.values.push(value));
              }
              if (isRoot) this.cachedependencies[field][value][subscribe.attribute] = subscribe.options.values.slice(1);
              else {
                const dependenceValue =  this.getDependanceCurrentValue(field);
                this.cachedependencies[field][dependenceValue][value][subscribe.attribute] = subscribe.options.values.slice(1);
              }
            }
          }).catch(error => reject(error))
            .finally(() => {
            this.state.loading[field] = false;
            resolve();
          })
        } else {
          this.state.loading[field] = false;
          resolve();
        }
      }
    } else resolve();
  })
};

proto.getDependencies = function(field){
  return this.inputdependencies[field] || [];
};

proto.setInputDependencies = function({master, slave}={}) {
  this.inputdependencies[master] = this.inputdependencies[master] !== void 0 ? this.inputdependencies[master] : [];
  this.inputdependencies[master].push(slave);
};

proto.valuesToKeysValues = function(values=[]){
  if (values.length) {
    const type = toRawType(values[0]);
    values = type !== 'Object' ? values.map(value =>({
      key:value,
      value
    })): values
  }
  return values;
};

proto.createInputsFormFromFilter = async function({filter=[]}={}) {
  const filterLenght = filter.length - 1;
  for (let index = 0; index <= filterLenght; index ++) {
    const input = filter[index];
    const forminput = {
      label: input.label,
      attribute: input.attribute,
      type: input.input.type || 'textfield',
      options: {...input.input.options},
      value: null,
      operator: input.op,
      logicop: index === filterLenght ? null : input.logicop,
      id: input.id || getUniqueDomId(),
      loading: false
    };
    if (forminput.type === 'selectfield' || forminput.type === 'autocompletefield') {
      if (forminput.options.values === void 0) forminput.options.values = [];
      else if (forminput.options.dependance){
        forminput.loading = true;
        this.getUniqueValuesFromField({unique: forminput.attribute})
          .then(values => {
            values = this.valuesToKeysValues(values);
            values.splice(0,0,forminput.options.values[0]);
            forminput.options.values = values;
          })
          .catch(()=> forminput.options.values = [])
          .finally(()=> forminput.loading = false)
      } else forminput.options.values = this.valuesToKeysValues(forminput.options.values);
      //check if has a dependance
      const { options:{ dependance } } = forminput;
      if (dependance) {
        //set dependance of input
        this.inputdependance[forminput.attribute] = dependance;
        this.state.loading[dependance] = false;
        // set disabled false for back compatibility
        forminput.options.disabled = false;
        this.setInputDependencies({
          master: dependance,
          slave: forminput
        });
      }
      if (forminput.type !== 'autocompletefield') {
        if (forminput.options.values.length) forminput.options.values[0].value !== ALLVALUE && forminput.options.values.unshift({value:ALLVALUE});
        else forminput.options.values.push({value:ALLVALUE});
        forminput.value = ALLVALUE;
      }
    }
    this.state.forminputs.push(forminput);
  }
};

proto.createQueryFilterObject = function({ogcService='wms', filter={}}={}) {
  const info = this.getInfoFromLayer(ogcService);
  Object.assign(info, {
    ogcService,
    filter
  });
  return info;
};

proto.getInfoFromLayer = function(ogcService) {
  const queryUrl = ogcService === 'wfs' ? this.searchLayer.getProject().getWmsUrl() : this.searchLayer.getQueryUrl();
  return {
    url: queryUrl,
    layers: [],
    infoFormat: this.searchLayer.getInfoFormat(ogcService),
    crs: this.searchLayer.getCrs(),
    serverType: this.searchLayer.getServerType()
  };
};

proto.setSearchLayer = function(layer) {
  this.searchLayer = layer;
};

proto.getSearchLayer = function() {
  return this.searchLayer
};

proto.clear = function() {
  this.state = null;
};

module.exports = SearchService;
