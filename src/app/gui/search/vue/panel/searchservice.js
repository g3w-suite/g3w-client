import { ALLVALUE }  from '../../constants';
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
  this.config = config;
  const {type, options={}} = this.config;
  const layerid = options.querylayerid || options.layerid || null;
  const otherquerylayerids = options.otherquerylayerids || [];
  const filter = options.filter || [];
  this.inputdependance = {};
  this.inputdependencies = {};
  this.cachedependencies = {};
  this.project = ProjectsRegistry.getCurrentProject();
  this.mapService = GUI.getService('map');
  this.searchLayer = null;
  this.filter = null;
  this.inputs = [];
  this.state.title = config.name;
  this.search_endpoint = config.search_endpoint;
  this.url = options.queryurl;
  this.filter = options.filter;
  /*
   type:
     search: search default ,
     search_1n in case of 1:N
 */
  this.type = type || 'search';
  this.return = options.return || 'data';
  this.show = this.return === 'data' && this.type === 'search';
  this.searchLayer = CatalogLayersStorRegistry.getLayerById(layerid);
  // store layers that will be searchable for that form search. First one is layer owner of the search setted on admin
  this.searchLayers = [layerid, ...otherquerylayerids].map(layerid => CatalogLayersStorRegistry.getLayerById(layerid));
  // stat to create the form search structure
  this.createInputsFormFromFilter({filter});
}

inherit(SearchService, G3WObject);

const proto = SearchService.prototype;

/**
 * Start Method to create right search structure for search form
 * @param filter
 * @returns {Promise<void>}
 */
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
      loading: false,
      widget: null
    };
    //check if has a dependance
    const {options:{ dependance, dependance_strict } } = forminput;
    if (forminput.type === 'selectfield' || forminput.type === 'autocompletefield') {
      // to be sure set values options to empty array if undefined
      forminput.loading = forminput.type !== 'autocompletefield';
      const promise = new Promise((resolve, reject) =>{
        if (forminput.options.values === undefined) forminput.options.values = [];
        else if (dependance){ // in case of dependence load rigth now
          if (!dependance_strict) this.getValuesFromField(forminput).then(values => { // return array of values
            values = this.valuesToKeysValues(values); // set values for select
            forminput.options.values = values;
          })
            .catch(()=> forminput.options.values = [])// in case of error
            .finally(()=> {
              forminput.loading = false;
              resolve();
            });
          else {
            forminput.loading = false;
            resolve();
          }
        } else {
          // no dependance
          this.getValuesFromField(forminput).then(values => { // return array of values
            values = this.valuesToKeysValues(values); // set values for select
            forminput.options.values = values;
          })
            .catch(()=> forminput.options.values = [])// in case of error
            .finally(()=> {
              forminput.loading = false;
              resolve();
            })
        }
      });
      if (dependance) {
        //set dependance of input
        this.inputdependance[forminput.attribute] = dependance;
        this.state.loading[dependance] = false;
        // set disabled false for back compatibility
        forminput.options.disabled = dependance_strict;
        /**
         * Set dependance between input
         */
        this.setInputDependencies({
          master: dependance,
          slave: forminput
        });
        /**
         * Set widget type for fill dependency
         */
        if (forminput.options.values.length) {
          forminput.widget = 'valuemap';
          forminput.options._values = [...forminput.options.values];
        } else if (forminput.options.layer_id){
          forminput.widget = 'valuerelation';
        }
      }
      promise.then(()=>{
        if (forminput.type !== 'autocompletefield') {
          if (forminput.options.values.length) forminput.options.values[0].value !== ALLVALUE && forminput.options.values.unshift({value:ALLVALUE});
          else forminput.options.values.push({value:ALLVALUE});
          forminput.value = ALLVALUE;
        }
      });
    }
    // ad form inputs to list of search input
    this.state.forminputs.push(forminput);
  }
};

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
  if (value !== undefined) {
    const fieldParam = createSingleFieldParameter({
      field,
      value,
      operator: this.getFilterInputFromField(field).op
    });
    fields.push(fieldParam);
  }

  if (dependendency) {
    const [field, value] = Object.entries(dependendency)[0];
    // need to set to lower case for api purpose
    const operator = this.getFilterInputFromField(field).op.toLowerCase();
    fields.unshift(`${field}|${operator}|${encodeURI(value)}`);
    return this.createFieldsDependenciesAutocompleteParameter({
      fields,
      field
    })
  }
  return fields.length && fields.join() || undefined;
};

/**
 * Request to server value for a specific select select field
 * @param field (form input)
 * @returns {Promise<*[]>}
 */
proto.getValuesFromField = async function(field){
  if (field.options.layer_id) {
    const uniqueValues = await this.getUniqueValuesFromField({
      field,
      unique: field.attribute
    });
    const layer = CatalogLayersStorRegistry.getLayerById(field.options.layer_id);
    const filter = createFilterFormInputs({
      layer,
      search_endpoint: this.getSearchEndPoint(),
      inputs: uniqueValues.map( value => ({
        attribute: field.options.value,
        logicop: "OR",
        operator: "eq",
        value
      }))
    });
    return this.getValueRelationValues(field, filter);
  }
  else if (field.options.values.length) return this.getValueMapValues(field);
  else return this.getUniqueValuesFromField({
      field,
      unique: field.attribute
    })
};

proto.getValueRelationValues = async function(field, filter){
  const {layer_id, key, value} =  field.options;
  const layer = CatalogLayersStorRegistry.getLayerById(layer_id);
  try {
    const {data=[]} = await DataRouterService.getData('search:features', {
      inputs:{
        layer,
        search_endpoint: this.getSearchEndPoint(),
        filter,
        ordering: key
      },
      outputs: false
    });
    const features = data && data[0] && data[0].features || [];
    const values = [];
    features.forEach(feature =>{
      values.push({
        key: feature.get(key),
        value: feature.get(value)
      })
    });
    return values;
  } catch(err) {
    return [];
  }
};

/**
 * Return values map
 * @param field
 * @returns {Promise<*>}
 */
proto.getValueMapValues = async function(field){
  return field.options.values.filter(value => value !== ALLVALUE);
};

/**
 * Method to get unique values from field
 * @param field
 * @param value
 * @param unique
 * @returns {Promise<[]>}
 */
proto.getUniqueValuesFromField = async function({field, value, unique}){
  let data = [];
  try {
    data = await this.searchLayer.getFilterData({
      suggest: value !== undefined ? `${field}|${value}` : undefined,
      unique,
      ordering: field.attribute
    })
  } catch(err){}
  return data;
};

proto.autocompleteRequest = async function({field, value}={}){
  let data = [];
  try {
    data = await this.searchLayer.getFilterData({
      suggest: `${field}|${value}`,
      unique: field
    })
  } catch(error) {}
  return data.map(value => ({
    id:value,
    text:value
  }))
};

/**
 * Method to run search
 * @param filter
 * @param search_endpoint
 * @param queryUrl
 * @param feature_count
 * @param show
 * @returns {Promise<void|unknown>}
 */
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
      if (this.type === 'search_1n'){
        const relationId = this.config.options.search_1n_relationid;
        const {features=[]} = data.data[0] || {};
        // check if has features on result
        if (features.length){
          const relation = this.project.getRelationById(relationId);
          const inputs = [];
          if (relation){
            const {referencedLayer, fieldRef:{referencedField, referencingField}} = relation;
            const uniqueValues = new Set();
            features.forEach(feature => {
              const value = feature.getProperties()[referencingField];
              if (!uniqueValues.has(value)) {
                uniqueValues.add(value);
                inputs.push({
                  attribute:referencedField,
                  logicop: "OR",
                  operator: "eq",
                  value
                })
              }
            });
            const layer = this.project.getLayerById(referencedLayer);
            const filter = createFilterFormInputs({
              layer,
              search_endpoint,
              inputs
            });
            data = await DataRouterService.getData('search:features', {
              inputs:{
                layer,
                search_endpoint,
                filter,
                formatter: 1, // set formatter to 1
                feature_count
              },
              outputs: {
                title: this.state.title
              }
            });
          }
        } else DataRouterService.showEmptyOutputs();
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
    }
  } catch(err){}
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

/**
 * Method called when input search change
 * @param id
 * @param value
 */
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
    const notAutocompleteSubscribers = subscribers.filter(subscribe => subscribe.type !== 'autocompletefield');
    if (value && value !== ALLVALUE) {
      let isCached;
      let rootValues;
      if (isRoot) {
        const cachedValue = this.cachedependencies[field] && this.cachedependencies[field][value];
        isCached = cachedValue !== undefined;
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
          // set disabled false to dependance field
          subscribe.options.disabled = false;
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
        if (notAutocompleteSubscribers.length) {
          const fieldParams = this.createFieldsDependenciesAutocompleteParameter({
            field,
            value
          });
          //need to set undefined because if we has a subscribe input with valuerelations widget i need to extract the value of the field to get
          // filter data from relation layer
          this.searchLayer.getFilterData({
            field: fieldParams
          }).then(async data => {
            const parentData = data.data[0].features || [];
            for (let i = 0; i < notAutocompleteSubscribers.length; i++) {
              const subscribe = notAutocompleteSubscribers[i];
              const { attribute, widget } = subscribe;
              const uniqueValues = new Set();
              // case value map
              if (widget === 'valuemap') {
                let values = [...subscribe.options._values];
                parentData.forEach(feature => {
                  const value = feature.get(attribute);
                  value && uniqueValues.add(value);
                });
                const data = [...uniqueValues];
                values = values.filter(({key}) => data.indexOf(key) !== -1);
                values.forEach(value => subscribe.options.values.push(value));
              }
              else if (widget === 'valuerelation') {
                parentData.forEach(feature =>{
                    const value = feature.get(attribute);
                    value && uniqueValues.add(value);
                  });
                  if (uniqueValues.size > 0) {
                    const filter = createSingleFieldParameter({
                      field: subscribe.options.key,
                      value: [...uniqueValues]
                    });
                    try {
                      const values = await this.getValueRelationValues(subscribe, filter);
                      values.forEach(value =>  subscribe.options.values.push(value));
                    } catch(err){
                      console.log(err)
                    }
                  }
                }
              else {
                parentData.forEach(feature => {
                  const value = feature.get(attribute);
                  value && uniqueValues.add(value);
                });
                this.valuesToKeysValues([...uniqueValues].sort()).forEach(value => subscribe.options.values.push(value));
              }
              if (isRoot) this.cachedependencies[field][value][subscribe.attribute] = subscribe.options.values.slice(1);
              else {
                const dependenceValue = this.getDependanceCurrentValue(field);
                this.cachedependencies[field][dependenceValue][value][subscribe.attribute] = subscribe.options.values.slice(1);
              }
              subscribe.options.disabled = false;
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
    } else {
      notAutocompleteSubscribers.forEach(subscribe => subscribe.options.disabled = subscribe.options.dependance_strict);
      resolve();
    }
  })
};

proto.getDependencies = function(field){
  return this.inputdependencies[field] || [];
};

proto.setInputDependencies = function({master, slave}={}) {
  this.inputdependencies[master] = this.inputdependencies[master] !== undefined ? this.inputdependencies[master] : [];
  this.inputdependencies[master].push(slave);
};

//set key value for select
proto.valuesToKeysValues = function(values){
  if (values.length) {
    const type = toRawType(values[0]);
    values = type !== 'Object' ? values.map(value =>({
      key: value,
      value
    })): values
  }
  return values;
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
