import { SEARCH_ALLVALUE as ALLVALUE } from 'app/constant';
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import DataRouterService from 'services/data';
import ProjectsRegistry from 'store/projects';
import GUI from 'services/gui';

const {
  base,
  inherit,
  toRawType,
  getUniqueDomId,
  createFilterFormInputs,
  createSingleFieldParameter,
  isEmptyObject,
  sortAlphabeticallyArray,
  sortNumericArray
} = require('core/utils/utils');

const G3WObject = require('core/g3wobject');

const NONVALIDVALUES = [null, undefined, ALLVALUE];

function SearchService(config = {}) {

  this.debounces = {
    run: {
      fnc: (...args) => {
        const [width, heigth] = this.mapService.getMap().getSize();
        if (!GUI.isMobile() || !(width === 0 || heigth === 0)) {
          this._run(...args);
          return;
        }
        GUI.hideSidebar();
        setTimeout(() => { this._run(...args); }, 600);
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

  const { options = {} } = this.config;
  const layerid          = options.querylayerid || options.layerid || null;

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

  /**
   * @type { 'search' | 'search_1n' }
   */
  this.type = this.config.type || 'search';

  this.return = options.return || 'data';

  this.show = this.return === 'data' && this.type === 'search';

  this.searchLayer = CatalogLayersStoresRegistry.getLayerById(layerid);

  /**
   * Store layers that will be searchable for that search form.
   * First one is layer owner of the search setted on admin.
   */
  this.searchLayers = [
    layerid,
    ...(options.otherquerylayerids || [])
  ].map(layerid => CatalogLayersStoresRegistry.getLayerById(layerid));


  /**
   * Create the form search structure
   */
  this.createInputsFormFromFilter({ filter: (options.filter || []) });
}

inherit(SearchService, G3WObject);

const proto = SearchService.prototype;

/**
 * @TODO slim down and refactor
 * 
 * Start Method to create right search structure for search form
 * 
 * @param filter
 * 
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
        else if (dependance) { // in case of dependence load right now
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
        } else if (forminput.options.layer_id) {
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
proto.getReturnType = function() {
  return this.return;
};

/**
 * Set return type
 */
proto.setReturnType = function(returnType='data') {
  this.return = returnType;
  this.show   = ('data' === returnType);
};

proto.getAutoFieldDependeciesParamField = function(field) {
  const fieldDependency = this.getCurrentFieldDependance(field);
  if (fieldDependency) {
    const [field, value] = Object.entries(fieldDependency)[0];
    return this.createFieldsDependenciesAutocompleteParameter({field, value})
  }
};

proto.createFieldsDependenciesAutocompleteParameter = function({ fields = [], field, value }={}) {
  const dependendency = this.getCurrentFieldDependance(field);
  if (undefined !== value) {
    fields.push(createSingleFieldParameter({ field, value, operator: this.getFilterInputFromField(field).op }));
  }
  if (!dependendency) {
    return fields.length && fields.join() || undefined;
  }
  const [dfield, dvalue] = Object.entries(dependendency)[0];
  // In case of some input dependeny are not filled
  if (undefined !== dvalue) {
    // need to set to lower case for api purpose
    const { op, logicop } = this.getFilterInputFromField(dfield);
    fields.unshift(`${dfield}|${op.toLowerCase()}|${encodeURI(dvalue)}|` + (fields.length ? logicop.toLowerCase() : ''));
  }
  return this.createFieldsDependenciesAutocompleteParameter({ fields, dfield });
};

/**
 * Request to server value for a specific select field
 * 
 * @param field form input
 * 
 * @returns {Promise<[]>}
 */
proto.getValuesFromField = async function(field) {
  if (field.options.layer_id) {
    const uniqueValues = await this.getUniqueValuesFromField({ field: field.attribute });
    return this.getValueRelationValues(
      field,
      // filter
      createFilterFormInputs({
        layer: CatalogLayersStoresRegistry.getLayerById(field.options.layer_id),
        search_endpoint: this.getSearchEndPoint(),
        inputs: uniqueValues.map( value => ({ value, attribute: field.options.value, logicop: "OR", operator: "eq" }))
      })
    );
  }
  if (field.options.values.length) {
    return this.getValueMapValues(field);
  }
  return this.getUniqueValuesFromField({ field:field.attribute })
};

proto.getValueRelationValues = async function(field, filter) {
  try {
    const { data = [] } = await DataRouterService.getData('search:features', {
      inputs:{
        layer: CatalogLayersStoresRegistry.getLayerById(field.options.layer_id),
        search_endpoint: this.getSearchEndPoint(),
        filter,
        ordering: field.options.key
      },
      outputs: false
    });
    const values = [];
    (data && data[0] && data[0].features || []).forEach(feature => {
      values.push({ key: feature.get(field.options.key), value: feature.get(field.options.value) })
    });
    return values;
  } catch(err) {
    return [];
  }
};

/**
 * Return mapped values
 * 
 * @param field
 * 
 * @returns {Promise<*>}
 */
proto.getValueMapValues = async function(field) {
  return field.options.values.filter(value => ALLVALUE !== value);
};

/**
 * @param layers
 * @param options.field
 * @param options.suggest
 * @param options.unique
 * @param options.ordering
 * 
 * @returns {Promise<*>}
 * 
 * @since 3.8.0
 */
proto.getLayersFilterData = async function(layers, options = {}) {
  const { field, suggest, unique, ordering } = options;
  // get unique value from each layers
  const promisesData = await Promise.allSettled(layers.map(layer => layer.getFilterData({ field, suggest, unique, ordering })));

  const data = Array.from(
    promisesData
      .filter(({status}) => 'fulfilled' === status)
      .reduce((accumulator, { value = [] }) => new Set([...accumulator, ...value]), [])
  )
  //check if is not empty array
  switch (data.length && typeof data[0]) {
    case 'string': return sortAlphabeticallyArray(data);
    case 'number': return sortNumericArray(data);
    default:       return data;
  }
};

/**
 * Get unique values from field
 * 
 * @param options.field
 * @param options.value
 * @param options.unique 
 * 
 * @returns {Promise<[]>}
 */
proto.getUniqueValuesFromField = async function({field, value, output}) {
  let data = [];
  try {
    data = await this.getLayersFilterData(
      (1 === this.searchLayers.length ? [this.searchLayer] : this.searchLayers), {
      field: this.getAutoFieldDependeciesParamField(field),
      suggest: value !== undefined ? `${field}|${value}` : undefined,
      unique: field,
      ordering: field
    });

    if ('autocomplete' === output) {
      data = data.map(value => ({ id:value, text:value }));
    }
  } catch(e) { console.warn(e); }

  return data;
};

/**
 * Perform search
 * 
 * @param filter
 * @param search_endpoint
 * @param queryUrl
 * @param feature_count
 * @param show
 * 
 * @returns {Promise<void|unknown>}
 */
proto.doSearch = async function({
  filter,
  search_endpoint = this.getSearchEndPoint(),
  queryUrl        = this.url,
  feature_count   = 10000,
  show            = this.show
} = {}) {

  filter = filter || this.createFilter();

  this.state.searching = true;

  let data;

  try {
    data = await DataRouterService.getData('search:features', {
      inputs:{
        layer: this.searchLayers,
        search_endpoint,
        filter,
        queryUrl,
        formatter: 1,
        feature_count,
        raw: ('search' === this.return) // in order to get raw response
      },
      outputs: show && { title: this.state.title }
    });
    if (!show) {
      const parsed = ('search_1n' === this.type)
        ? await parse_search_1n(data, {
          search_endpoint,
          feature_count,
          relation_id: this.config.options.search_1n_relationid,
          output_title: this.state.title
        })
        : parse_search_by_returnType(data, this.return);
      data = parsed ? parsed : data;
    } else if (this.project.state.autozoom_query && data && 1 === data.data.length) {
      this.mapService.zoomToFeatures(data.data[0].features); // autozoom_query
    }
  } catch(e) {
    console.warn(e);
  }

  this.state.searching = false;

  return data;
};

proto.filterValidFormInputs = function() {
  return this.state.forminputs.filter(input => -1 === NONVALIDVALUES.indexOf(input.value) && '' !== input.value.toString().trim());
};

/**
 *
 * @returns {string|*|string}
 */
proto.getSearchEndPoint = function() {
  return this.search_endpoint || this.searchLayer.getSearchEndPoint()
};

/*
* type wms, vector (for vector api)
* */
proto.createFilter = function(search_endpoint = this.getSearchEndPoint()) {
  return createFilterFormInputs({ layer: this.searchLayers, inputs: this.filterValidFormInputs(), search_endpoint });
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
  this.state.forminputs.find(input => id == input.id).value = value;
};

proto.createQueryFilterFromConfig = function({filter}) {
  let queryFilter;
  for (const operator in filter) {
    queryFilter = create_boolean_filter(operator, filter[operator]);
  }
  return queryFilter;
};

proto.getFilterInputFromField = function(field) {
  return this.filter.find(input =>  input.attribute === field);
};

proto._getExpressionOperatorFromInput = function(field) {
  const dependanceCascadeField = this.getFilterInputFromField(field);
  return dependanceCascadeField ? dependanceCascadeField.op : null;
};

proto._getCascadeDependanciesFilter = function(field, dependencies = []) {
  const dependance = this.getFilterInputFromField(field).input.options.dependance;
  if (dependance) {
    dependencies.unshift(dependance);
    this._getCascadeDependanciesFilter(dependance, dependencies)
  }
  return dependencies;
};

/**
 * Check if a field has a dependance
 * @param field
 * @returns {{}}
 */
proto.getCurrentFieldDependance = function(field) {
  const dependance = this.inputdependance[field];
  return dependance ? ({
    [dependance]:
      (this.cachedependencies[dependance] && ALLVALUE !== this.cachedependencies[dependance]._currentValue)
        ? this.cachedependencies[dependance]._currentValue // dependance as value
        : undefined                                        // undefined = so it no add on list o field dependance
    }) : dependance;
};

/**
 * Check the current value of dependance
 */
proto.getDependanceCurrentValue = function(field) {
  return this.inputdependance[field] ? this.cachedependencies[this.inputdependance[field]]._currentValue : this.state.forminputs.find(forminput => forminput.attribute === field).value;
};

/**
 * @TODO slim down and refactor
 * 
 * Fill all dependencies inputs based on value
 */
proto.fillDependencyInputs = function({field, subscribers=[], value=ALLVALUE}={}) {
  const isRoot = this.inputdependance[field] === undefined;
  //check id inpute father is valid to search on subscribers
  const invalidValue = value===ALLVALUE || value === null || value === undefined || value.toString().trim() === '';
  return new Promise((resolve, reject) => {
    //loop over dependencies fields inputs
    subscribers.forEach(subscribe => {
      // in case of autocomplete reset values to empty array
      if (subscribe.type === 'autocompletefield') subscribe.options.values.splice(0);
      else {
        //set starting all values
        if (subscribe.options._allvalues === undefined) subscribe.options._allvalues = [...subscribe.options.values];
        //case of father is set an empty invalid value (all value example)
        if (invalidValue) {
          //subscribe has to set all valaues
          subscribe.options.values.splice(0);
          setTimeout(()=>subscribe.options.values = [...subscribe.options._allvalues]);
        } else subscribe.options.values.splice(1); //otherwise has to get first __ALL_VALUE
      }
      subscribe.value =  subscribe.type !== 'selectfield' ? ALLVALUE : null;
    });
    // check i cache field values are set
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
          // set disabled false to dependence field
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
                    } catch(err) {console.log(err)}
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
          //set disable
          subscribers.forEach(subscribe => {
            if (subscribe.options.dependance_strict) subscribe.options.disabled = false;
          });
          this.state.loading[field] = false;
          resolve();
        }
      }
    } else {
      subscribers.forEach(subscribe => subscribe.options.disabled = subscribe.options.dependance_strict);
      resolve();
    }
  })
};

proto.getDependencies = function(field) {
  return this.inputdependencies[field] || [];
};

proto.setInputDependencies = function({ master, slave }={}) {
  this.inputdependencies[master] = (undefined !== this.inputdependencies[master] ? this.inputdependencies[master] : []);
  this.inputdependencies[master].push(slave);
};

//set key value for select
proto.valuesToKeysValues = function(values) {
  return values.length ? ('Object' !== toRawType(values[0]) ? values.map(value => ({ key: value, value })) : values) : values;
};

proto.createQueryFilterObject = function({ogcService='wms', filter={}}={}) {
  return Object.assign(this.getInfoFromLayer(ogcService), { ogcService, filter });
};

proto.getInfoFromLayer = function(ogcService) {
  return {
    url: ('wfs' === ogcService ? this.searchLayer.getProject().getWmsUrl() : this.searchLayer.getQueryUrl()),
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

/**
 * @private 
 */
function create_boolean_filter(operator, inputs = []) {
  const boolean = { [operator]: [] };
  inputs.forEach((input) => {
    for (const operator in input) {
      if (Array.isArray(input[operator])) {
        create_boolean_filter(operator, input[operator]); // recursion step.
        break;
      }
    }
    boolean[operator].push({
      [input.op] : {
        [input.attribute]: null
      }
    });
  });
  return boolean;
}

/**
 * @private 
 */
async function parse_search_1n(data, options) {
  const { search_endpoint, feature_count, relation_id, output_title } = options;

  const { features = [] } = data.data[0] || {};

  const project = ProjectsRegistry.getCurrentProject();

  // check if it has features on result
  if (!features.length) {
    DataRouterService.showEmptyOutputs();
    return [];
  }

  const relation = project.getRelationById(relation_id);
  if (relation) {
    const inputs = [];

    const uniqueValues = new Set();
    features.forEach(feature => {
      const value = feature.getProperties()[relation.fieldRef.referencingField];
      if (!uniqueValues.has(value)) {
        uniqueValues.add(value);
        inputs.push({ attribute:relation.fieldRef.referencedField, logicop: "OR", operator: "eq", value });
      }
    });

    const layer = project.getLayerById(relation.referencedLayer);
    data = await DataRouterService.getData('search:features', {
      inputs: {
        layer,
        search_endpoint,
        filter: createFilterFormInputs({ layer, search_endpoint, inputs }),
        formatter: 1,
        feature_count
      },
      outputs: {
        title: output_title
      }
    });
  }
  return data;
}

/**
 * @private 
 */
function parse_search_by_returnType(data, returnType) {
  if ('search' === returnType) { 
    GUI.closeContent();
    // in case of api get first response on array
    data = data.data[0].data;
    if (isEmptyObject(data)) {
      DataRouterService.showCustomOutputDataPromise(Promise.resolve({}));
    } else {
      const SearchPanel = require('gui/search/vue/panel/searchpanel');
      (new SearchPanel(data)).show();
    }
  }
  return data;
}

module.exports = SearchService;
