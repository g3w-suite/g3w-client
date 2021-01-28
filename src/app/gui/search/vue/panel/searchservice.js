import { ALLVALUE }  from '../../constants';
const { base, inherit, toRawType } = require('core/utils/utils');
const t = require('core/i18n/i18n.service').t;
const GUI = require('gui/gui');
const G3WObject = require('core/g3wobject');
const CatalogLayersStorRegistry = require('core/catalog/cataloglayersstoresregistry');
const ProjectsRegistry = require('core/project/projectsregistry');
const Filter = require('core/layers/filter/filter');
const Expression = require('core/layers/filter/expression');
const NONVALIDVALUES = [null, void 0, ALLVALUE];

function SearchService(config={}) {
  this.debounces =  {
    run: {
      fnc: (...args) => {
        this._run(...args)
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
  const filter = options.filter || [];
  this.inputdependance = {};
  this.inputdependencies = [];
  this.cachedependencies = {};
  this.project = ProjectsRegistry.getCurrentProject();
  this.searchLayer = null;
  this.filter = null;
  this.inputs = [];
  this.state.title = config.name;
  this.search_endpoint = config.search_endpoint || 'ows';
  this.url = options.queryurl;
  this.filter = options.filter;
  this.searchLayer = CatalogLayersStorRegistry.getLayerById(layerid);
  this.createInputsFormFromFilter({
    filter
  });
}

inherit(SearchService, G3WObject);

const proto = SearchService.prototype;

proto.createSingleFieldParameter = function({field, value, operator='eq', logicop=null}){
  logicop = logicop && `|${logicop}`;
  return `${field}|${operator.toLowerCase()}|${value}${logicop || ''}`;
};

proto.createFieldsDependenciesAutocompleteParameter = function({fields=[], field, value}={}) {
  const dependendency = this.getCurrentFieldDependance(field);
  if (value !== void 0) {
    const fieldParam = this.createSingleFieldParameter({
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
    data = await this.searchLayer.getFilterData({
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

proto.doSearch = function({filter, searchType=this.search_endpoint, queryUrl=this.url, feature_count=10000} ={}) {
  filter = filter || this.createFilter(searchType);
  return new Promise((resolve, reject) => {
    switch (searchType) {
      case 'ows':
        this.searchLayer.search({
          filter,
          queryUrl,
          feature_count
        }).then(results => {
          results = {
            data: results
          };
          resolve(results);
        }).fail(error => {
          reject(error)
        });
        break;
      case 'api':
        this.searchLayer.getFilterData({
          field: filter
        }).then(response => {
          resolve(response)
        }).catch(error => {
          reject(error);
        });
        break;
    }
  })
};

proto.filterValidFormInputs = function(){
  return this.state.forminputs.filter(input => NONVALIDVALUES.indexOf(input.value) === -1 && input.value.toString().trim() !== '');
};

/*
* type wms, vector (for vector api)
* */
proto.createFilter = function(type='ows'){
  let filter;
  const inputs = this.filterValidFormInputs();
  switch (type) {
    case 'ows':
      const expression = new Expression();
      const layerName = this.searchLayer.getWMSLayerName();
      expression.createExpressionFromFilter(inputs, layerName);
      filter = new Filter();
      filter.setExpression(expression.get());
      break;
    case 'api':
      const inputsLength = inputs.length -1 ;
      const fields = inputs.map((input, index) => this.createSingleFieldParameter({
          field: input.attribute,
          value: input.value,
          operator: input.operator,
          logicop: index < inputsLength ?  input.logicop: null
        })
      );
      filter = fields.join() || null;
      break;
  }
  return filter;
};

proto._run = function() {
  this.state.searching = true;
  GUI.closeContent();
  const showQueryResults = GUI.showContentFactory('query');
  const queryResultsService = showQueryResults(this.state.title);
  this.doSearch().then(results => {
    queryResultsService.onceafter('postRender', () => {
      this.state.searching = false;
    });
    queryResultsService.setQueryResponse(results);
  }).catch((error) => {
    GUI.notify.error(t('server_error'));
    GUI.closeContent();
    this.state.searching = false;
  })
};

proto.changeInput = function({attribute, value} = {}) {
  const input = this.state.forminputs.find(input => attribute === input.attribute);
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
  const isRoot = this.inputdependance[field] === void 0;
  const invalidValue = value===ALLVALUE || value === null || value === void 0 || value.toString().trim() === '';
  return new Promise((resolve, reject) => {
    subscribers.forEach(subscribe => {
      subscribe.value =  subscribe.type !== 'selectfield' ? ALLVALUE : null;
      //subscribe.options.disabled = subscribe.type !== 'autocompletefield' || invalidValue ;
      if (subscribe.type === 'autocompletefield') subscribe.options.values.splice(0);
      else {
        subscribe.options._allvalues = subscribe.options._allvalues ||  [...subscribe.options.values];
        value === ALLVALUE ? subscribe.options.values = [...subscribe.options._allvalues] : subscribe.options.values.splice(1);
      }
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
        isCached = cachedValue !== void 0;
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
            //subscribe.options.disabled = false;
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
        // exclude autocomplet subscribers
        const notAutocompleteSubscribers = subscribers.filter( subscribe => subscribe.type !== 'autocompletefield');
        if (notAutocompleteSubscribers.length) {
          const fieldParams = this.createFieldsDependenciesAutocompleteParameter({
            field,
            value
          });
          const uniqueParams = notAutocompleteSubscribers.length && notAutocompleteSubscribers.length=== 1 ? notAutocompleteSubscribers[0].attribute : void 0;
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
              //subscribe.options.disabled = false;
            }
          }).catch(error => {
            reject(error)
          }).finally(() => {
            this.state.loading[field] = false;
            resolve();
          })
        } else resolve();
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
  let id = 0;
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
      id: input.id || id,
      loading: false
    };
    if (forminput.type === 'selectfield' || forminput.type === 'autocompletefield') {
      if (forminput.options.values === void 0) forminput.options.values = [];
       else if (forminput.options.dependance){
        forminput.loading = true;
        try {
          forminput.options.values =  await this.getUniqueValuesFromField({unique: forminput.attribute})
        } catch(err){
          forminput.options.values = []
        }
        forminput.loading = false;
      };
      forminput.options.values = this.valuesToKeysValues(forminput.options.values);
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
    id+=1;
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
