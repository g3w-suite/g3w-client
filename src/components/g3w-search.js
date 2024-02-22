/**
 * @file
 * @since 3.10.0
 */

import { SEARCH_ALLVALUE as ALLVALUE } from 'app/constant';
import G3WObject                       from 'core/g3w-object';
import Component                       from 'core/g3w-component';
import Panel                           from 'core/g3w-panel';
import ProjectsRegistry                from 'store/projects';
import CatalogLayersStoresRegistry     from 'store/catalog-layers';
import QueryBuilderService             from 'services/querybuilder';
import DataRouterService               from 'services/data';
import GUI                             from 'services/gui';
import { toRawType }                   from 'utils/toRawType';
import { getUniqueDomId }              from 'utils/getUniqueDomId';
import { createFilterFormInputs }      from 'utils/createFilterFormInputs';
import { createSingleFieldParameter }  from 'utils/createSingleFieldParameter';
import { isEmptyObject }               from 'utils/isEmptyObject';
import { sortAlphabeticallyArray }     from 'utils/sortAlphabeticallyArray';
import { sortNumericArray }            from 'utils/sortNumericArray';
import { resolve }                     from 'utils/resolve';
import { noop }                        from 'utils/noop';

import * as vueComp                    from 'components/Search.vue';
import * as vueSearchComp              from 'components/SearchPanel.vue';

/**
 * ORIGINAL SOURCE:
 * - src/app/gui/search/vue/search.js@v3.9.3
 * - src/app/gui/search/service.js@3.9.3
 */
export function SearchComponent(opts = {}) {

  const project = ProjectsRegistry.getCurrentProject();

  const state = {
    searches: [],
    tools: [],
    querybuildersearches: QueryBuilderService.getCurrentProjectItems()
  };

  const service = opts.service || new G3WObject();

  service.state                 = state;
  service.title                 = project.state.search_title || "search";
  service.init                  = s  => { state.searches = s || project.state.search; };
  service.addQueryBuilderSearch = s  => { state.querybuildersearches.push(s); }
  service.addTool               = t  => { state.tools.push(t); };
  service.addTools              = tt => { for (const t of tt) service.addTool(t); };
  service.showPanel             = o  => new SearchPanel(o, true);
  service.removeItem            = ({ type, index } = {}) => { 'querybuilder' === type && state.querybuildersearches.splice(index, 1); };
  service.getTitle              = () => service.title;
  service.cleanSearchPanels     = () => { state.panels = {}; };
  service.removeTools           = () => { state.tools.splice(0) };
  service.stop                  = resolve;
  service.removeTool            = noop;
  service.reload                = () => {
    state.searches             = ProjectsRegistry.getCurrentProject().state.search;
    state.querybuildersearches = QueryBuilderService.getCurrentProjectItems();
  };

  const comp = new Component({
    ...opts,
    service,
    id: 'search',
    title: service.getTitle(),
    internalComponent: new (Vue.extend(vueComp))({ service }),
    visible: true,
  });

  comp._reload = () => { comp._service.reload() };

  return comp;
}

/**
 * ORIGINAL SOURCE: src/app/gui/search/vue/panel/searchpanel.js@v3.9.3
 */
export function SearchPanel(opts = {}, show = false) {
  const service = opts.service || new SearchService(opts); 
  return new Panel({
    ...opts,
    show,
    service,
    id: getUniqueDomId(),
    title: 'search',
    internalPanel: new (opts.component || Vue.extend(vueSearchComp))({ service }),
  });
};


/**
 * ORIGINAL SOURCE: src/app/gui/search/vue/panel/searchservice.js@v3.9.3
 */
export class SearchService extends G3WObject {

  constructor(config = {}) {
    super();

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

    /**
     * reactivity data
     */
    this.state = {
      title: null,
      forminputs: [],
      loading: {},
      searching: false,
    };

    /**
     * @FIXME add description
     */
    this.config            = config;

    const { options = {} } = this.config;
    const layerid          = options.querylayerid || options.layerid || null;

    /**
     * @FIXME add description
     */
    this.inputdependance = {};

    /**
     * @FIXME add description
     */
    this.inputdependencies = {};

    /**
     * @FIXME add description
     */
    this.cachedependencies = {};

    /**
     * @FIXME add description
     */
    this.project = ProjectsRegistry.getCurrentProject();

    /**
     * @FIXME add description
     */
    this.mapService = GUI.getService('map');

    /**
     * @FIXME add description
     */
    this.searchLayer = null;

    /**
     * @FIXME add description
     */
    this.filter = null;

    /**
     * @FIXME add description
     */
    this.inputs = [];

    /**
     * @FIXME add description
     */
    this.state.title = config.name;

    /**
     * @FIXME add description
     */
    this.search_endpoint = config.search_endpoint;

    /**
     * @FIXME add description
     */
    this.url = options.queryurl;

    /**
     * @FIXME add description
     */
    this.filter = options.filter;

    /**
     * @type { 'search' | 'search_1n' }
     */
    this.type = this.config.type || 'search';

    /**
     * @FIXME add description
     */
    this.return = options.return || 'data';

    /**
     * @FIXME add description
     */
    this.show = 'data' === this.return && 'search' === this.type;

    /**
     * @FIXME add description
     */
    this.searchLayer = CatalogLayersStoresRegistry.getLayerById(layerid);

    /**
     * Store layers that will be searchable for that search form.
     * First one is layer owner of the search setted on admin.
     */
    this.searchLayers = [ layerid, ...(options.otherquerylayerids || []) ].map(id => CatalogLayersStoresRegistry.getLayerById(id));

    /**
     * Create the form search structure
     */
    this.createInputsFormFromFilter({ filter: (options.filter || []) });

  }

  /**
   * @TODO slim down and refactor
   * 
   * Create right search structure for search form
   * 
   * @param { Object } opts
   * @param { Array } opts.filter input
   * 
   * @returns { Promise<void> } form input
   */
  async createInputsFormFromFilter({
    filter = [],
  } = {}) {
    for (let i = 0; i <= filter.length - 1; i++) {

      const input = {
        label:     filter[i].label,
        attribute: filter[i].attribute,
        type:      filter[i].input.type || 'textfield',
        options:   { ...filter[i].input.options },
        value:     null,
        operator:  filter[i].op,
        logicop:   i === (filter.length - 1) ? null : filter[i].logicop,
        id:        filter[i].id || getUniqueDomId(),
        loading:   false,
        widget:    null,
      };

      // check if it has a dependence
      const dependance_strict             = undefined !== input.options.dependance_strict ? input.options.dependance_strict : false;
      const dependance                    = undefined !== input.options.dependance        ? input.options.dependance        : false;
      const isInputSelectType             = ['selectfield', 'autocompletefield'].includes(input.type);
      input.options.values                = undefined !== input.options.values            ? input.options.values            : [];
      const { values }                    = input.options;

      let promise;

      //In case of select input
      if ('selectfield' ===  input.type) {
        // ensure setting values options to empty array when undefined
        input.loading = true;

        promise = new Promise((resolve, reject) => {

          // in case of dependence load right now
          if (dependance && dependance_strict) {
            input.loading = false;
            return resolve();
          }

          // not strictly dependence
          if (!dependance_strict) {
            this
              .getValuesFromField(input)
              .then(_values => { values.splice(0, values.length, ...this.valuesToKeysValues(_values)); })
              .catch((err)  => { console.warn(err); values.length = 0 })
              .finally(()   => { input.loading = false; resolve(); })
          }
        });

        promise.then(() => {
          values[values.length && ALLVALUE !== values[0].value ? 'unshift' : 'push']({ value:ALLVALUE });
          input.value = ALLVALUE;
        });

      }

      // there is a dependence
      if (isInputSelectType && dependance) {
        this.inputdependance[input.attribute] = dependance;              // set dependence of input
        this.state.loading[dependance]        = false;
        input.options.disabled                = dependance_strict;       // disabled for BACKCOMP
        this.setInputDependencies({ master: dependance, slave: input }); // set dependence between input

      }

      // set widget type for fill dependency
      if (isInputSelectType && dependance && values.length > 0) {
        input.widget          = 'valuemap';
        input.options._values = [...values];
      }

      //Set input widget
      if (isInputSelectType && dependance && !values.length && input.options.layer_id) {
        input.widget = 'valuerelation';
      }

      // add form inputs to list of search input
      this.state.forminputs.push(input);
    }
  }

  /**
   * Get return type
   */
  getReturnType() {
    return this.return;
  }

  /**
   * Set return type
   */
  setReturnType(returnType='data') {
    this.return = returnType;
    this.show   = ('data' === returnType);
  }

  /**
   * @param field
   * 
   * @returns {*}
   */
  getAutoFieldDependeciesParamField(field) {
    const fieldDependency = this.getCurrentFieldDependance(field);
    if (fieldDependency) {
      const [field, value] = Object.entries(fieldDependency)[0];
      return this.createFieldsDependenciesAutocompleteParameter({field, value})
    }
  }

  /**
   * @param { Object } opts
   * @param opts.fields
   * @param opts.field
   * @param opts.value
   * 
   * @returns { string | undefined | * }
   */
  createFieldsDependenciesAutocompleteParameter({
    fields = [],
    field,
    value,
  } = {}) {
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
  }

  /**
   * Request to server value for a specific select field
   * 
   * @param field form input
   * 
   * @returns { Promise<[]> }
   */
  async getValuesFromField(field) {
    //if defined layer_id dependence
    if (field.options.layer_id) {
      //array of unique values
      const uniqueValues = await this.getUniqueValuesFromField({ field: field.attribute });
      return this.getValueRelationValues(
        field,
        // filter
        createFilterFormInputs({
          layer: CatalogLayersStoresRegistry.getLayerById(field.options.layer_id),
          search_endpoint: this.getSearchEndPoint(),
          inputs: [{value: uniqueValues, attribute: field.options.value, logicop: "OR", operator: "eq" }]
        })
      );
    }

    // Relation reference
    if (field.options.relation_reference) {
      try {
        //call filter data with fformatter
        const response = await this.searchLayer.getFilterData({ fformatter: field.attribute });
        //check response
        if (response && response.result && response.data) {
          field.options.values = response.data.map(([value, key]) => ({ key, value }));
        }
      } catch(err) {
        throw Error(err);
      }
    }

    if (field.options.values.length > 0) {
      return this.getValueMapValues(field);
    }

    return this.getUniqueValuesFromField({ field: field.attribute })
  }

  /**
   * @param field
   * @param filter
   * 
   * @returns { Promise<[]> }
   */
  async getValueRelationValues(field, filter) {
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
      (data && data[0] && data[0].features || [])
        .forEach(feature => {
          values.push({ key: feature.get(field.options.key), value: feature.get(field.options.value) })
        });
      return values;
    } catch(err) {
      return [];
    }
  }

  /**
   * Return mapped values
   * 
   * @param field
   * 
   * @returns { Promise<*> }
   */
  async getValueMapValues(field) {
    return field.options.values.filter(value => ALLVALUE !== value);
  }


  /**
   * @param layers
   * @param options.field
   * @param options.suggest
   * @param options.unique
   * @param options.fformatter since 3.9.0
   * @param options.ordering
   * 
   * @returns { Promise<*> }
   * 
   * @since 3.8.0
   */
  async getLayersFilterData(layers, options = {}) {
    const {
      field,
      suggest,
      unique,
      ordering,
      fformatter,
    } = options;
    // get unique value from each layers
    const promisesData = await Promise
      .allSettled(layers.map(layer => layer.getFilterData({
        field,
        suggest,
        unique,
        ordering,
        fformatter,
      })));

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
  }

  /**
   * Get unique values from field
   * 
   * @param { Object } options
   * @param options.field
   * @param options.value
   * @param options.unique 
   * 
   * @returns { Promise<[]> }
   */
  async getUniqueValuesFromField({field, value, output}) {
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
  }

  /**
   * Perform search
   * 
   * @param { Object } opts
   * @param opts.filter
   * @param opts.search_endpoint
   * @param opts.queryUrl
   * @param opts.feature_count
   * @param opts.show
   * 
   * @returns { Promise<void|unknown> }
   */
  async doSearch({
    filter,
    search_endpoint = this.getSearchEndPoint(),
    queryUrl        = this.url,
    feature_count   = 10000,
    show            = this.show,
  } = {}) {

    //get or create request filter
    filter = filter || this.createFilter();

    //set searching to true
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
      // not show (request internal. No output data are show)
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
        this.mapService.zoomToFeatures(data.data[0].features); // auto zoom_query
      }
    } catch(e) {
      console.warn(e);
    }

    //set searchin false
    this.state.searching = false;

    return data;
  }

  /**
   * Filter input by NONVALIDVALUES
   * 
   * @returns { Array }
   */
  filterValidFormInputs() {
    return this.state
      .forminputs
      .filter(input => -1 === [null, undefined, ALLVALUE].indexOf(input.value) && '' !== input.value.toString().trim());
  }

  /**
   * @returns { string | * }
   */
  getSearchEndPoint() {
    return this.search_endpoint || this.searchLayer.getSearchEndPoint()
  }

  /**
   * type wms, vector (for vector api)
   */
  createFilter(search_endpoint = this.getSearchEndPoint()) {
    return createFilterFormInputs({ layer: this.searchLayers, inputs: this.filterValidFormInputs(), search_endpoint });
  }

  /**
   * @private
   */
  _run() {
    this.doSearch();
  }

  /**
   * Called on search input change
   * 
   * @param { Object } opts
   * @param opts.id
   * @param opts.value
   */
  changeInput({id, value} = {}) {
    this.state.forminputs.find(input => id == input.id).value = value;
  }

  /**
   * @param { Object } opts
   * @param opts.filter
   * 
   * @returns { Object }
   */
  createQueryFilterFromConfig({ filter }) {
    let queryFilter;
    for (const operator in filter) {
      queryFilter = create_boolean_filter(operator, filter[operator]);
    }
    return queryFilter;
  }

  /**
   * @param field
   * 
   * @returns {*}
   */
  getFilterInputFromField(field) {
    return this.filter.find(input =>  input.attribute === field);
  }

  /**
   * @param field
   * 
   * @returns { * | null }
   * 
   * @private
   */
  _getExpressionOperatorFromInput(field) {
    const dependanceCascadeField = this.getFilterInputFromField(field);
    return dependanceCascadeField ? dependanceCascadeField.op : null;
  };

  _getCascadeDependanciesFilter(field, dependencies = []) {
    const dependance = this.getFilterInputFromField(field).input.options.dependance;
    if (dependance) {
      dependencies.unshift(dependance);
      this._getCascadeDependanciesFilter(dependance, dependencies)
    }
    return dependencies;
  }

  /**
   * Check if a field has a dependance
   * 
   * @param field
   * 
   * @returns { Object }
   */
  getCurrentFieldDependance(field) {
    const dependance = this.inputdependance[field];
    return dependance ? ({
      [dependance]:
        (this.cachedependencies[dependance] && ALLVALUE !== this.cachedependencies[dependance]._currentValue)
          ? this.cachedependencies[dependance]._currentValue // dependance as value
          : undefined                                        // undefined = so it no add on list o field dependance
      }) : dependance;
  }

  /**
   * Check the current value of dependance
   */
  getDependanceCurrentValue(field) {
    return this.inputdependance[field] ?
      this.cachedependencies[this.inputdependance[field]]._currentValue :
      this.state.forminputs.find(forminput => forminput.attribute === field).value;
  }

  /**
   * @TODO slim down and refactor
   * 
   * Fill all dependencies inputs based on value
   */
  fillDependencyInputs({field, subscribers=[], value=ALLVALUE}={}) {
    const isRoot = this.inputdependance[field] === undefined;
    //check id inpute father is valid to search on subscribers
    const invalidValue = value===ALLVALUE || value === null || value === undefined || value.toString().trim() === '';
    return new Promise((resolve, reject) => {
      //loop over dependencies fields inputs
      subscribers.forEach(subscribe => {
        // in case of autocomplete reset values to empty array
        if (subscribe.type === 'autocompletefield') {
          subscribe.options.values.splice(0);
        } else {
          //set starting all values
          if (subscribe.options._allvalues === undefined) {
            subscribe.options._allvalues = [...subscribe.options.values];
          }
          //case of father is set an empty invalid value (all value example)
          if (invalidValue) {
            //subscribe has to set all valaues
            subscribe.options.values.splice(0);
            setTimeout(()=>subscribe.options.values = [...subscribe.options._allvalues]);
          } else {
            subscribe.options.values.splice(1);
          } //otherwise has to get first __ALL_VALUE
        }
        subscribe.value =  subscribe.type !== 'selectfield' ? ALLVALUE : null;
      });
      // check if cache field values are set
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
          if (isRoot) {
            this.cachedependencies[field][value] = this.cachedependencies[field][value] || {};
          } else {
            const dependenceValue =  this.getDependanceCurrentValue(field);
            this.cachedependencies[field][dependenceValue] = this.cachedependencies[field][dependenceValue] || {};
            this.cachedependencies[field][dependenceValue][value] = this.cachedependencies[field][dependenceValue][value] || {}
          }
          // exclude autocomplete subscribers
          if (notAutocompleteSubscribers.length > 0) {
            const fieldParams = this.createFieldsDependenciesAutocompleteParameter({
              field,
              value
            });
            //need to set undefined because if
            // it has a subscribe input with valuerelations widget needs to extract the value of the field to get
            // filter data from relation layer
            this.searchLayer.getFilterData({
              field: fieldParams,
              formatter: 0 //v3.0 need to force to use raw value with formatter 0 parameter
            })
            .then(async data => {
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
                    if (value) {
                      // need to covert to string
                      // because input values are string
                      uniqueValues.add(`${value}`);
                    }
                  });
                  const data = [...uniqueValues];
                  values = values.filter(({key}) =>  data.indexOf(key) !== -1);
                  values.forEach(value => subscribe.options.values.push(value));
                } else if (widget === 'valuerelation') {
                  parentData.forEach(feature => {
                    const value = feature.get(attribute);
                    value && uniqueValues.add(value);
                  });
                  if (uniqueValues.size > 0) {
                    const filter = createSingleFieldParameter({
                      layer: CatalogLayersStoresRegistry.getLayerById(subscribe.options.layer_id),
                      search_endpoint: this.getSearchEndPoint(),
                      field: subscribe.options.value, //v3.8.x has subscribe.options.key
                      value: [...uniqueValues]
                    });
                    try {
                      const values = await this.getValueRelationValues(subscribe, filter);
                      values.forEach(value =>  subscribe.options.values.push(value));
                    } catch(err) {console.log(err)}
                  }
                } else {
                  parentData.forEach(feature => {
                    const value = feature.get(attribute);
                    value && uniqueValues.add(value);
                  });
                  this.valuesToKeysValues([...uniqueValues].sort()).forEach(value => subscribe.options.values.push(value));
                }
                if (isRoot) {
                  this.cachedependencies[field][value][subscribe.attribute] = subscribe.options.values.slice(1);
                } else {
                  const dependenceValue = this.getDependanceCurrentValue(field);
                  this.cachedependencies[field][dependenceValue][value][subscribe.attribute] = subscribe.options.values.slice(1);
                }
                subscribe.options.disabled = false;
              }
            })
            .catch(error => reject(error))
            .finally(() => {
              this.state.loading[field] = false;
              resolve();
            })
          } else {
            //set disable
            subscribers.forEach(subscribe => {
              if (subscribe.options.dependance_strict) {
                subscribe.options.disabled = false;
              }
            });
            this.state.loading[field] = false;
            resolve();
          }
        }
      } else {
        subscribers
          .forEach(subscribe => subscribe.options.disabled = subscribe.options.dependance_strict);
        resolve();
      }
    })
  }

  /**
   * @param field
   * 
   * @returns { Array | * }
   */
  getDependencies(field) {
    return this.inputdependencies[field] || [];
  }

  /**
   * @param { Object } opts
   * @param opts.master
   * @param opts.slave
   */
  setInputDependencies({ master, slave }={}) {
    this.inputdependencies[master] = (undefined !== this.inputdependencies[master] ? this.inputdependencies[master] : []);
    this.inputdependencies[master].push(slave);
  }

  /**
   * set key value for select
   */
  valuesToKeysValues(values) {
    return values.length ?
      ('Object' !== toRawType(values[0]) ? values.map(value => ({ key: value, value })) : values) :
      values;
  }

  /**
   * @param { Object } opts
   * @param opts.ogcService
   * @param opts.filter
   * 
   * @returns {{infoFormat: *, crs: *, serverType, layers: [], url: *} & {filter: {}, ogcService: string}}
   */
  createQueryFilterObject({
    ogcService = 'wms',
    filter     = {},
  } = {}) {
    return Object.assign(this.getInfoFromLayer(ogcService), { ogcService, filter });
  }

  /**
   * @param ogcService
   * 
   * @returns {{infoFormat: *, crs: *, serverType, layers: [], url: *}}
   */
  getInfoFromLayer(ogcService) {
    return {
      url: ('wfs' === ogcService ? this.searchLayer.getProject().getWmsUrl() : this.searchLayer.getQueryUrl()),
      layers: [],
      infoFormat: this.searchLayer.getInfoFormat(ogcService),
      crs: this.searchLayer.getCrs(),
      serverType: this.searchLayer.getServerType()
    };
  }

  /**
   * @param layer
   */
  setSearchLayer(layer) {
    this.searchLayer = layer;
  }

  /**
   * @returns { null | * }
   */
  getSearchLayer() {
    return this.searchLayer;
  }

  /**
   *
   */
  clear() {
    this.state = null;
  }

}

function create_boolean_filter(operator, inputs = []) {
  const boolean = { [operator]: [] };
  inputs
    .forEach((input) => {
      for (const operator in input) {
        if (Array.isArray(input[operator])) {
          create_boolean_filter(operator, input[operator]); // recursion step.
          break;
        }
      }
      boolean[operator].push({
        [input.op] : {
        [input.attribute]: null
      }});
  });
  return boolean;
}

/**
 * Search father layer id based on result of child layer
 */
async function parse_search_1n(data, options) {
  const { search_endpoint, feature_count, relation_id, output_title } = options;

  const { features = [] } = data.data[0] || {};

  const project = ProjectsRegistry.getCurrentProject();

  // check if it has features on result
  if (!features.length) {
    //show empty result output
    DataRouterService.showEmptyOutputs();
    return [];
  }

  //get relation
  const relation = project.getRelationById(relation_id);

  //if exist relation
  if (relation) {

    const inputs = []; //store inputs

    //extract properties from relation object
    const {
      referencedLayer, //father layer id
      fieldRef: {referencingField, referencedField}} = relation; // child and father relation fields

    //Number of relation fields
    const rFLength = referencingField.length;

    //Just one field
    if (1 === rFLength) {
      const uniqueValues = new Set();
      //loop trough feature child layer
      features.forEach(feature => {
        const value = feature.get(referencingField[0]);
        if (!uniqueValues.has(value)) {
          uniqueValues.add(value);
        }
      })
      inputs.push({ attribute: referencedField[0], logicop: "OR", operator: "eq", value: Array.from(uniqueValues) })
    } else {
      const uniqueValues = [];
      features.forEach(feature => {
        const values = referencingField.map(rF => feature.get(rF));
        if (!uniqueValues.find((v) => {
          return v.reduce((accumulator, value, index) => {
            return accumulator && values[index] === value;
          }, true);
        })) {
          uniqueValues.push(values);
          inputs.push({ attribute: referencedField, logicop: "OR", operator: "eq", value: values })
        }
      })
    }

    const layer = project.getLayerById(referencedLayer);


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

function parse_search_by_returnType(data, returnType) {
  if ('search' === returnType) {
    GUI.closeContent();
    // in case of api get first response on array
    data = data.data[0].data;
    if (isEmptyObject(data)) {
      DataRouterService.showCustomOutputDataPromise(Promise.resolve({}));
    } else {
      (new SearchPanel(data)).show();
    }
  }
  return data;
}