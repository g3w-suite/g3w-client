import { ALLVALUE } from 'gui/search/constants';
import utils from 'core/utils/utils';
import DataRouterService from 'core/data/routerservice';
import GUI from 'gui/gui';
import G3WObject from 'core/g3wobject';
import CatalogLayersStorRegistry from 'core/catalog/cataloglayersstoresregistry';
import ProjectsRegistry from 'core/project/projectsregistry';
import SearchPanel from 'gui/search/vue/panel/searchpanel';

const NONVALIDVALUES = [null, undefined, ALLVALUE];

class SearchService extends G3WObject {
  constructor(config = {}) {
    super({
      debounces: {
        run: {
          fnc: (...args) => {
            if (GUI.isMobile()) {
              const [width, heigth] = this.mapService.getMap().getSize();
              if (width === 0 || heigth === 0) {
                GUI.hideSidebar();
                setTimeout(() => {
                  this._run(...args);
                }, 600);
              } else this._run(...args);
            } else this._run(...args);
          },
        },
      },
    });
    // reactivity data
    this.state = {
      title: null,
      forminputs: [],
      loading: {},
      searching: false,
    };
    this.config = config;
    const { type, options = {} } = this.config;
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
    this.searchLayers = [layerid, ...otherquerylayerids].map((layerid) => CatalogLayersStorRegistry.getLayerById(layerid));
    // stat to create the form search structure
    this.createInputsFormFromFilter({ filter });
  }

  /**
   * Start Method to create right search structure for search form
   * @param filter
   * @returns {Promise<void>}
   */
  createInputsFormFromFilter = async function ({ filter = [] } = {}) {
    const filterLenght = filter.length - 1;
    for (let index = 0; index <= filterLenght; index++) {
      const input = filter[index];
      const forminput = {
        label: input.label,
        attribute: input.attribute,
        type: input.input.type || 'textfield',
        options: { ...input.input.options },
        value: null,
        operator: input.op,
        logicop: index === filterLenght ? null : input.logicop,
        id: input.id || utils.getUniqueDomId(),
        loading: false,
        widget: null,
      };
      // check if has a dependance
      const { options: { dependance, dependance_strict } } = forminput;
      if (forminput.type === 'selectfield' || forminput.type === 'autocompletefield') {
        // to be sure set values options to empty array if undefined
        forminput.loading = forminput.type !== 'autocompletefield';
        const promise = new Promise((resolve, reject) => {
          if (forminput.options.values === undefined) forminput.options.values = [];
          else if (dependance) { // in case of dependence load rigth now
            if (!dependance_strict) {
              this.getValuesFromField(forminput).then((values) => { // return array of values
                values = this.valuesToKeysValues(values); // set values for select
                forminput.options.values = values;
              })
                .catch(() => forminput.options.values = [])// in case of error
                .finally(() => {
                  forminput.loading = false;
                  resolve();
                });
            } else {
              forminput.loading = false;
              resolve();
            }
          } else {
            // no dependance
            this.getValuesFromField(forminput).then((values) => { // return array of values
              values = this.valuesToKeysValues(values); // set values for select
              forminput.options.values = values;
            })
              .catch(() => forminput.options.values = [])// in case of error
              .finally(() => {
                resolve();
                forminput.loading = false;
              });
          }
        });
        if (dependance) {
          // set dependance of input
          this.inputdependance[forminput.attribute] = dependance;
          this.state.loading[dependance] = false;
          // set disabled false for back compatibility
          forminput.options.disabled = dependance_strict;
          /**
           * Set dependance between input
           */
          this.setInputDependencies({
            master: dependance,
            slave: forminput,
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
        promise.then(() => {
          if (forminput.type !== 'autocompletefield') {
            if (forminput.options.values.length) forminput.options.values[0].value !== ALLVALUE && forminput.options.values.unshift({ value: ALLVALUE });
            else forminput.options.values.push({ value: ALLVALUE });
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

  getReturnType() {
    return this.return;
  }

  /**
   * Set return type
   */

  setReturnType(returnType = 'data') {
    this.return = returnType;
    // set show only in case return === 'data'
    this.show = this.return === 'data';
  }

  createFieldsDependenciesAutocompleteParameter({ fields = [], field, value } = {}) {
    const dependendency = this.getCurrentFieldDependance(field);
    if (value !== undefined) {
      const fieldParam = utils.createSingleFieldParameter({
        field,
        value,
        operator: this.getFilterInputFromField(field).op,
      });
      fields.push(fieldParam);
    }
    if (dependendency) {
      const [field, value] = Object.entries(dependendency)[0];
      const operator = this.getFilterInputFromField(field).op;
      fields.unshift(`${field}|${operator}|${encodeURI(value)}`);
      return this.createFieldsDependenciesAutocompleteParameter({
        fields,
        field,
      });
    }
    return fields.length && fields.join() || undefined;
  }

  /**
   * Request to server value for a specific select select field
   * @param field (form input)
   * @returns {Promise<*[]>}
   */
  getValuesFromField(field) {
    if (field.options.layer_id) return this.getValueRelationValues(field);
    if (field.options.values.length) return this.getValueMapValues(field);
    return this.getUniqueValuesFromField({
      field,
      unique: field.attribute,
    });
  }

  getValueRelationValues = async function (field, filter) {
    const { layer_id, key, value } = field.options;
    const layer = CatalogLayersStorRegistry.getLayerById(layer_id);
    try {
      const { data = [] } = await DataRouterService.getData('search:features', {
        inputs: {
          layer,
          search_endpoint: this.getSearchEndPoint(),
          filter,
          ordering: key,
        },
        outputs: false,
      });
      const features = data && data[0] && data[0].features || [];
      const values = [];
      features.forEach((feature) => {
        values.push({
          key: feature.get(key),
          value: feature.get(value),
        });
      });
      return values;
    } catch (err) {
      return [];
    }
  };

  /**
   * Return values map
   * @param field
   * @returns {Promise<*>}
   */
  getValueMapValues = async function (field) {
    return field.options.values.filter((value) => value !== ALLVALUE);
  };

  /**
   * Method to get unique values from field
   * @param field
   * @param value
   * @param unique
   * @returns {Promise<[]>}
   */
  getUniqueValuesFromField = async function ({ field, value, unique }) {
    let data = [];
    try {
      data = await this.searchLayer.getFilterData({
        suggest: value !== undefined ? `${field}|${value}` : undefined,
        unique,
        ordering: field.attribute,
      });
    } catch (err) {}
    return data;
  };

  autocompleteRequest = async function ({ field, value } = {}) {
    let data = [];
    try {
      data = await this.searchLayer.getFilterData({
        // field: this.createFieldsDependenciesAutocompleteParameter({
        //   field,
        //   value
        // }),
        suggest: `${field}|${value}`,
        unique: field,
      });
    } catch (error) {}
    return data.map((value) => ({
      id: value,
      text: value,
    }));
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
  doSearch = async function ({
    filter, search_endpoint = this.getSearchEndPoint(), queryUrl = this.url, feature_count = 10000, show = this.show,
  } = {}) {
    filter = filter || this.createFilter();
    // call a generic method of layer
    let data;
    this.state.searching = true;
    try {
      data = await DataRouterService.getData('search:features', {
        inputs: {
          layer: this.searchLayers,
          search_endpoint,
          filter,
          queryUrl,
          formatter: 1, // set formatter to 1
          feature_count,
          raw: this.return === 'search', // parameter to get raw response
        },
        outputs: show && {
          title: this.state.title,
        },
      });
      if (show) {
        // in case of autozoom_query
        if (this.project.state.autozoom_query && data && data.data.length === 1) {
          this.mapService.zoomToFeatures(data.data[0].features);
        }
      } else if (this.type === 'search_1n') {
        const relationId = this.config.options.search_1n_relationid;
        const { features = [] } = data.data[0] || {};
        // check if has features on result
        if (features.length) {
          const relation = this.project.getRelationById(relationId);
          const inputs = [];
          if (relation) {
            const { referencedLayer, fieldRef: { referencedField, referencingField } } = relation;
            const uniqueValues = new Set();
            features.forEach((feature) => {
              const value = feature.getProperties()[referencingField];
              if (!uniqueValues.has(value)) {
                uniqueValues.add(value);
                inputs.push({
                  attribute: referencedField,
                  logicop: 'OR',
                  operator: 'eq',
                  value,
                });
              }
            });
            const layer = this.project.getLayerById(referencedLayer);
            const filter = utils.createFilterFormInputs({
              layer,
              search_endpoint,
              inputs,
            });
            data = await DataRouterService.getData('search:features', {
              inputs: {
                layer,
                search_endpoint,
                filter,
                formatter: 1, // set formatter to 1
                feature_count,
              },
              outputs: {
                title: this.state.title,
              },
            });
          }
        } else DataRouterService.showEmptyOutputs();
      } else {
        switch (this.return) {
          case 'search':
            GUI.closeContent();
            // in case of api get first response on array
            data = data.data[0].data;
            if (utils.isEmptyObject(data)) {
              const dataPromise = Promise.resolve({});
              DataRouterService.showCustomOutputDataPromise(dataPromise);
            } else {
              const add_panel = new SearchPanel(data);
              add_panel.show();
            }
            break;
        }
      }
    } catch (err) {
      console.log(err);
    }
    this.state.searching = false;
    return data;
  };

  filterValidFormInputs() {
    return this.state.forminputs.filter((input) => NONVALIDVALUES.indexOf(input.value) === -1 && input.value.toString().trim() !== '');
  }

  /**
   *
   * @returns {string|*|string}
   */
  getSearchEndPoint() {
    return this.search_endpoint || this.searchLayer.getSearchEndPoint();
  }

  /*
  * type wms, vector (for vector api)
  * */
  createFilter(search_endpoint = this.getSearchEndPoint()) {
    const inputs = this.filterValidFormInputs();
    return utils.createFilterFormInputs({
      layer: this.searchLayers,
      inputs,
      search_endpoint,
    });
  }

  _run() {
    this.doSearch();
  }

  /**
   * Method called when input search change
   * @param id
   * @param value
   */
  changeInput({ id, value } = {}) {
    const input = this.state.forminputs.find((input) => id == input.id);
    input.value = value;
  }

  createQueryFilterFromConfig({ filter }) {
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
  }

  getFilterInputFromField(field) {
    return this.filter.find((input) => input.attribute === field);
  }

  _getExpressionOperatorFromInput(field) {
    const dependanceCascadeField = this.getFilterInputFromField(field);
    return dependanceCascadeField ? dependanceCascadeField.op : null;
  }

  _getCascadeDependanciesFilter(field, dependencies = []) {
    const dependanceCascadeField = this.getFilterInputFromField(field);
    const { dependance } = dependanceCascadeField.input.options;
    if (dependance) {
      dependencies.unshift(dependance);
      this._getCascadeDependanciesFilter(dependance, dependencies);
    }
    return dependencies;
  }

  getCurrentFieldDependance(field) {
    const dependance = this.inputdependance[field];
    return dependance && this.cachedependencies[dependance] && this.cachedependencies[dependance]._currentValue !== ALLVALUE && {
      [dependance]: this.cachedependencies[dependance]._currentValue,
    } || null;
  }

  // check the current value of dependance
  getDependanceCurrentValue(field) {
    const dependance = this.inputdependance[field];
    return dependance ? this.cachedependencies[dependance]._currentValue : this.state.forminputs.find((forminput) => forminput.attribute === field).value;
  }

  // fill all dependencies inputs based on value
  fillDependencyInputs({ field, subscribers = [], value = ALLVALUE } = {}) {
    const isRoot = this.inputdependance[field] === undefined;
    // check id inpute father is valid to search on subscribers
    const invalidValue = value === ALLVALUE || value === null || value === undefined || value.toString().trim() === '';
    return new Promise((resolve, reject) => {
      subscribers.forEach((subscribe) => {
        // in case of atuocomplete reset values to empty array
        if (subscribe.type === 'autocompletefield') subscribe.options.values.splice(0);
        else {
          // set starting all values
          if (subscribe.options._allvalues === undefined) subscribe.options._allvalues = [...subscribe.options.values];
          // case of father is set an empty invalid value (all value exmaple)
          if (invalidValue) {
            // subscribe has to set all valaues
            subscribe.options.values.splice(0);
            setTimeout(() => {
              subscribe.options.values = [...subscribe.options._allvalues];
            });
          } else subscribe.options.values.splice(1); // otherwise has to get first __ALL_VALUE
        }
        subscribe.value = subscribe.type !== 'selectfield' ? ALLVALUE : null;
      });
      this.cachedependencies[field] = this.cachedependencies[field] || {};
      this.cachedependencies[field]._currentValue = value;
      const notAutocompleteSubscribers = subscribers.filter((subscribe) => subscribe.type !== 'autocompletefield');
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
            resolve();
          }
        } else {
          this.state.loading[field] = true;
          if (isRoot) this.cachedependencies[field][value] = this.cachedependencies[field][value] || {};
          else {
            const dependenceValue = this.getDependanceCurrentValue(field);
            this.cachedependencies[field][dependenceValue] = this.cachedependencies[field][dependenceValue] || {};
            this.cachedependencies[field][dependenceValue][value] = this.cachedependencies[field][dependenceValue][value] || {};
          }
          // exclude autocomplete subscribers
          if (notAutocompleteSubscribers.length) {
            const fieldParams = this.createFieldsDependenciesAutocompleteParameter({
              field,
              value,
            });
            // need to set undefined beacuse if we has a subscribe input with valuerelations widget i need to wxtract the value of the field to get
            // filter data from relation layer
            this.searchLayer.getFilterData({
              field: fieldParams,
            }).then(async (data) => {
              const parentData = data.data[0].features || [];
              for (let i = 0; i < notAutocompleteSubscribers.length; i++) {
                const subscribe = notAutocompleteSubscribers[i];
                const { attribute, widget } = subscribe;
                const uniqueValues = new Set();
                // case value map
                if (widget === 'valuemap') {
                  let values = [...subscribe.options._values];
                  parentData.forEach((feature) => {
                    const value = feature.get(attribute);
                    value && uniqueValues.add(value);
                  });
                  const data = [...uniqueValues];
                  values = values.filter(({ key }) => data.indexOf(key) !== -1);
                  values.forEach((value) => subscribe.options.values.push(value));
                } else if (widget === 'valuerelation') {
                  parentData.forEach((feature) => {
                    const value = feature.get(attribute);
                    value && uniqueValues.add(value);
                  });
                  if (uniqueValues.size > 0) {
                    const filter = utils.createSingleFieldParameter({
                      field: subscribe.options.key,
                      value: [...uniqueValues],
                    });
                    try {
                      const values = await this.getValueRelationValues(subscribe, filter);
                      values.forEach((value) => subscribe.options.values.push(value));
                    } catch (err) {
                      console.log(err);
                    }
                  }
                } else {
                  parentData.forEach((feature) => {
                    const value = feature.get(attribute);
                    value && uniqueValues.add(value);
                  });
                  this.valuesToKeysValues([...uniqueValues].sort()).forEach((value) => subscribe.options.values.push(value));
                }
                if (isRoot) this.cachedependencies[field][value][subscribe.attribute] = subscribe.options.values.slice(1);
                else {
                  const dependenceValue = this.getDependanceCurrentValue(field);
                  this.cachedependencies[field][dependenceValue][value][subscribe.attribute] = subscribe.options.values.slice(1);
                }
                subscribe.options.disabled = false;
              }
            }).catch((error) => reject(error))
              .finally(() => {
                this.state.loading[field] = false;
                resolve();
              });
          } else {
            this.state.loading[field] = false;
            resolve();
          }
        }
      } else {
        notAutocompleteSubscribers.forEach((subscribe) => subscribe.options.disabled = subscribe.options.dependance_strict);
        resolve();
      }
    });
  }

  getDependencies(field) {
    return this.inputdependencies[field] || [];
  }

  setInputDependencies({ master, slave } = {}) {
    this.inputdependencies[master] = this.inputdependencies[master] !== undefined ? this.inputdependencies[master] : [];
    this.inputdependencies[master].push(slave);
  }

  // set key value for select
  valuesToKeysValues(values) {
    if (values.length) {
      const type = utils.toRawType(values[0]);
      values = type !== 'Object' ? values.map((value) => ({
        key: value,
        value,
      })) : values;
    }
    return values;
  }

  createQueryFilterObject({ ogcService = 'wms', filter = {} } = {}) {
    const info = this.getInfoFromLayer(ogcService);
    Object.assign(info, {
      ogcService,
      filter,
    });
    return info;
  }

  getInfoFromLayer(ogcService) {
    const queryUrl = ogcService === 'wfs' ? this.searchLayer.getProject().getWmsUrl() : this.searchLayer.getQueryUrl();
    return {
      url: queryUrl,
      layers: [],
      infoFormat: this.searchLayer.getInfoFormat(ogcService),
      crs: this.searchLayer.getCrs(),
      serverType: this.searchLayer.getServerType(),
    };
  }

  setSearchLayer(layer) {
    this.searchLayer = layer;
  }

  getSearchLayer() {
    return this.searchLayer;
  }

  clear() {
    this.state = null;
  }
}

export default SearchService;
