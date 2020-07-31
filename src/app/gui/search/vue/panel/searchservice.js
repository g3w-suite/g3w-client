const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const t = require('core/i18n/i18n.service').t;
const GUI = require('gui/gui');
const G3WObject = require('core/g3wobject');
const CatalogLayersStorRegistry = require('core/catalog/cataloglayersstoresregistry');
const ProjectsRegistry = require('core/project/projectsregistry');
const Filter = require('core/layers/filter/filter');
const Expression = require('core/layers/filter/expression');

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
    dependencies: [],
    cachedependencies:{},
    forminputs: [],
    loading: {},
    searching: false
  };
  this.depedencies = {};
  this.project = ProjectsRegistry.getCurrentProject();
  this.searchLayer = null;
  this.filter = null;
  this.currentFilter = {};
  this._rootFilterOperator = 'AND';
  this.init = function(config) {
    this.state.title = config.name;
    const options = config.options || {};
    this.url = options.queryurl;
    this.filter = options.filter;
    const layerid = options.querylayerid || options.layerid || null;
    this.searchLayer = CatalogLayersStorRegistry.getLayerById(layerid);
    const filter = options.filter || {AND:[]};
    this._rootFilterOperator = Object.keys(filter)[0];
    this.fillInputsFormFromFilter({filter});
  };
  // set run function
  return this.init(config);
}

inherit(SearchService, G3WObject);

const proto = SearchService.prototype;

proto.doSearch = function({filter=this.createFilter(), queryUrl=this.url, feature_count=10000} ={}) {
  return new Promise((resolve, reject) => {
    this.searchLayer.search({
      filter,
      queryUrl,
      feature_count
    }).then((results) => {
      results = {
        data: results
      };
      resolve(results);
    }).fail(error => reject(error))
  })
};

proto.createFilter = function(){
  const filterObject = this.fillFilterInputsWithValues();
  const expression = new Expression();
  const layerName = this.searchLayer.getWMSLayerName();
  expression.createExpressionFromFilter(filterObject, layerName);
  const filter = new Filter();
  filter.setExpression(expression.get());
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
  const input = this.state.forminputs.find((input) => {
    return attribute === input.attribute
  });
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

proto._getExpressionOperatorFromInput = function(field) {
  const dependanceCascadeField = this.filter[this._rootFilterOperator].find((input) => {
    return input.attribute === field;
  });
  return dependanceCascadeField ? dependanceCascadeField.op : null;
};

proto._getCascadeDependanciesFilter = function(field, dependencies=[]) {
  const dependanceCascadeField = this.filter[this._rootFilterOperator].find((input) => {
    return input.attribute === field;
  });
  const dependance = dependanceCascadeField.input.options.dependance;
  if (dependance) {
    dependencies.unshift(dependance);
    this._getCascadeDependanciesFilter(dependance, dependencies)
  }
  return dependencies
};

// check the current value of father dependance
proto._getDependanceCurrentValue = function(field) {
  const dependance = this.depedencies[field];
  return this.state.cachedependencies[dependance]._currentValue
};

proto.fillDependencyInputs = function({field, subscribers=[], value=''}={}) {
  const isRoot = this.depedencies.root === field;
  return new Promise((resolve, reject) => {
    subscribers.forEach((subscribe) => {
      subscribe.options.disabled = true;
      subscribe.value = '';
      subscribe.options.values.splice(1);
    });
    this.state.cachedependencies[field] = this.state.cachedependencies[field] || {};
    this.state.cachedependencies[field]._currentValue = value;
    if (value) {
      let isCached;
      let rootValues;
      if (isRoot) {
        const cachedValue = this.state.cachedependencies[field] && this.state.cachedependencies[field][value];
        isCached = cachedValue !== undefined;
        rootValues = isCached && cachedValue;
      } else {
        const dependenceCurrentValue = this._getDependanceCurrentValue(field);
        const cachedValue = this.state.cachedependencies[field]
          && this.state.cachedependencies[field][dependenceCurrentValue]
          && this.state.cachedependencies[field][dependenceCurrentValue][value];
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
            subscribe.options.disabled = false;
          }
          resolve()
        }
      } else {
        this.queryService = GUI.getComponent('queryresults').getService();
        this.state.loading[field] = true;
        if (isRoot) this.state.cachedependencies[field][value] = this.state.cachedependencies[field][value] || {};
        else {
          const dependenceValue =  this._getDependanceCurrentValue(field);
          this.state.cachedependencies[field][dependenceValue] = this.state.cachedependencies[field][dependenceValue] || {};
          this.state.cachedependencies[field][dependenceValue][value] = this.state.cachedependencies[field][dependenceValue][value] || {}
        }
        const equality = {};
        const inputFilterObject = {};
        equality[field] = value;
        const operator = this._getExpressionOperatorFromInput(field);
        inputFilterObject[operator] = equality;
        const filter = {};
        filter[this._rootFilterOperator] = [inputFilterObject];
        this._getCascadeDependanciesFilter(field).forEach((dependanceField) => {
          filter[this._rootFilterOperator].splice(filter[this._rootFilterOperator].length -1, 0,this.currentFilter[dependanceField]);
        });
        const expression = new Expression();
        const layerName = this.searchLayer.getWMSLayerName();
        expression.createExpressionFromFilter(filter, layerName);
        const _filter = new Filter();
        _filter.setExpression(expression.get());
        this.currentFilter[field] = inputFilterObject;
        this.searchLayer.search({
          filter: _filter,
          feature_count: 10000 //SET HIGHT LEVEL OF FEATURE COUNT TO GET MAXIMUM RESPONSES
        }).then((response) => {
          const digestResults = this.queryService._digestFeaturesForLayers(response);
          if (digestResults.length) {
            const features = digestResults[0].features;
            for (let i = 0; i < subscribers.length; i++) {
              const subscribe = subscribers[i];
              let uniqueValue = new Set();
              features.forEach((feature) => {
                let value = feature.attributes[subscribe.attribute];
                if (value && !uniqueValue.has(value)) {
                  subscribe.options.values.push(value);
                  uniqueValue.add(value);
                }
              });
              subscribe.options.values.sort();
              if (isRoot) this.state.cachedependencies[field][value][subscribe.attribute] = subscribe.options.values.slice(1);
              else {
                const dependenceValue =  this._getDependanceCurrentValue(field);
                this.state.cachedependencies[field][dependenceValue][value][subscribe.attribute] = subscribe.options.values.slice(1);
              }
              subscribe.options.disabled = false;
            }
          }
        }).fail((err) => {
          reject(err);
        }).always(() => {
            this.state.loading[field] = false;
            resolve();
          })
      }
    } else {
      resolve()
    }
  })
};

proto._checkInputDependencies = function(forminput) {
  const { dependance } = forminput.options;
  const dependency = this.state.dependencies.find((_dependency) => {
    return _dependency.observer === dependance;
  });
  !dependency && this.state.dependencies.push({
      observer: dependance,
      subscribers: [forminput]
    }) || dependency.subscribers.push(forminput)
};

proto.fillInputsFormFromFilter = function({filter}) {
  let id = 0;
  for (const operator in filter) {
    const inputs = filter[operator];
    inputs.forEach((input) => {
      const forminput = {
        label: input.label,
        attribute: input.attribute,
        type: input.input.type || 'textfield',
        options: Object.assign({}, input.input.options),
        value: '',
        id: input.id || id
      };
      if (forminput.type === 'selectfield') {
        const dependance = forminput.options.dependance;
        if (dependance) {
          this.depedencies[forminput.attribute] = dependance;
          this.state.loading[dependance] = false;
          forminput.options.disabled = true;
          this._checkInputDependencies(forminput);
        } else {
          this.depedencies.root = forminput.attribute;
        }
        if (forminput.options.values[0] !== '')
          forminput.options.values.unshift('');
        forminput.value = '';
      } else
        forminput.value = null;
      this.state.forminputs.push(forminput);
      id+=1;
    });
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

proto.fillFilterInputsWithValues = function(filter=this.filter, filterWithValues={}, exclude=[]) {
  const forminputs = this.state.forminputs;
  const getvaluefromforminputid = [];
  for (const operator in filter) {
    filterWithValues[operator] = [];
    const inputs = filter[operator];
    inputs.forEach((input) => {
      const _input = input.input;
      if (exclude.indexOf(_input.attribute) === -1)
        if (Array.isArray(_input)){
          this.fillFilterInputsWithValues(_input);
        } else {
          const _operator = input.op;
          const fieldName = input.attribute;
          const filterInput = {};
          filterInput[_operator] = {};
          const forminputwithvalue = forminputs.find((forminput) => {
              return forminput.attribute === fieldName && getvaluefromforminputid.indexOf(forminput.id) === -1;
          });
          getvaluefromforminputid.push(forminputwithvalue.id);
          const value = forminputwithvalue.value;
          filterInput[_operator][fieldName] = value;
          filterWithValues[operator].push(filterInput);
        }
    })
  }
  return filterWithValues;
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
