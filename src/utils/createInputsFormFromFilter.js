import { SEARCH_ALLVALUE }            from 'app/constant';
import CatalogLayersStoresRegistry    from 'store/catalog-layers';
import DataRouterService              from 'services/data';
import { toRawType }                  from 'utils/toRawType';
import { getUniqueDomId }             from 'utils/getUniqueDomId';
import { createFilterFormInputs }     from 'utils/createFilterFormInputs';
import { sortAlphabeticallyArray }    from 'utils/sortAlphabeticallyArray';
import { sortNumericArray }           from 'utils/sortNumericArray';
import { createSingleFieldParameter } from 'utils/createSingleFieldParameter';

/**
 * Create the right search structure for a search form
 * 
 * @param { Object } state
 *
 */
export async function createInputsFormFromFilter(state) {

  const dep             = state.input.dependance;
  const deps            = state.input.dependencies;
  const search_endpoint = state.search_endpoint || state.search_layers[0].getSearchEndPoint();

  for (let i = 0; i <= (state.filter || []).length - 1; i++) {
    let has_error;

    const input = {
      label:     state.filter[i].label,
      attribute: state.filter[i].attribute,
      type:      state.filter[i].input.type || 'textfield',
      options:   {
        // check if it has a dependence
        dependance_strict: false,
        dependance: false,
        values: [],
        ...state.filter[i].input.options,
      },
      value:     null,
      operator:  state.filter[i].op,
      logicop:   i === (state.filter.length - 1) ? null : state.filter[i].logicop,
      id:        state.filter[i].id || getUniqueDomId(),
      loading:   true,
      widget:    null,
    };

    try {

      // In case of select input
      // Request to server value for a specific select field
      // ensure setting values options to an empty array when undefined

      // get value-relation values when `layer_id` dependence is defined
      if ('selectfield' ===  input.type && !input.options.dependance_strict && input.options.layer_id) {
        const response = await DataRouterService.getData('search:features', {
          inputs: {
            layer: CatalogLayersStoresRegistry.getLayerById(input.options.layer_id),
            search_endpoint,
            filter: createFilterFormInputs({
              layer: CatalogLayersStoresRegistry.getLayerById(input.options.layer_id),
              search_endpoint,
              inputs: [{
                // array of unique values
                value: await _getUniqueValuesFromField({ state, field: input.attribute }),
                attribute: input.options.value,
                logicop: "OR",
                operator: "eq"
              }]
            }),
            ordering: input.options.key
          },
          outputs: false
        });
        input.options.values = (response.data && response.data[0] && response.data[0].features || []).map(f => ({ key: f.get(input.options.key), value: f.get(input.options.value) }));
      }

      // Relation reference
      if ('selectfield' ===  input.type && !input.options.dependance_strict && !input.options.layer_id && input.options.relation_reference) {
        // call filter data with fformatter
        const response = await state.search_layers[0].getFilterData({ fformatter: input.attribute });
        // check response
        if (response && response.result && response.data) {
          input.options.values = response.data.map(([value, key]) => ({ key, value }));
        }
        if (!input.options.values.length > 0) {
          input.options.values = await _getUniqueValuesFromField({ state, field: input.attribute })
        }
        // Set key value for select
        if ('Object' !== toRawType(input.options.values[0])) {
          input.options.values = input.options.values.map(value => ({ key: value, value }));
        }
      }

    } catch (e) {
      has_error = e;
      console.warn(e);
    }

    if (has_error && 'selectfield' ===  input.type && !input.options.dependance_strict && !(!input.options.dependance_strict && input.options.layer_id)) {
      input.options.values.splice(0, input.options.values.length);
    }

    if (has_error && 'selectfield' ===  input.type && !input.options.dependance_strict && input.options.layer_id) {
      input.options.values = [];
    }

    // set `SEARCH_ALLVALUE` as first element of array
    if ('selectfield' ===  input.type && input.options.values.length) {
      input.options.values = input.options.values.filter(v => SEARCH_ALLVALUE !== v).unshift({ value: SEARCH_ALLVALUE })
    }
    
    if ('selectfield' ===  input.type) {
      input.value = SEARCH_ALLVALUE;
    }

    // there is a dependence
    if (input.options.dependance && !input.options.dependance_strict && ['selectfield', 'autocompletefield'].includes(input.type)) {
      dep[input.attribute]                        = input.options.dependance;        // set dependence of input
      state.loading[input.options.dependance]     = false;
      input.options.disabled                      = input.options.dependance_strict; // disabled for BACKCOMP
      // set input dependencies
      deps[input.options.dependance]              = (undefined !== deps[input.options.dependance] ? deps[input.options.dependance] : []);
      deps[input.options.dependance].push(input);
    }

    // set a widget type for fill dependency
    if (input.options.dependance && !input.options.dependance_strict && ['selectfield', 'autocompletefield'].includes(input.type) && input.options.values.length > 0) {
      input.widget          = 'valuemap';
      input.options._values = [...input.options.values];
    }

    // set value-relation widget
    if (input.options.dependance && !input.options.dependance_strict && ['selectfield', 'autocompletefield'].includes(input.type) && !input.options.values.length && input.options.layer_id) {
      input.widget = 'valuerelation';
    }

    input.loading = false;

    // add form inputs to list of search input
    state.forminputs.push(input);
  }

}

async function _getUniqueValuesFromField({ state, field }) {

  try {

    const layers            = state.search_layers || [];
    const inputdependance   = state.input.dependance || {};
    const cachedependencies = state.input.cached_deps || {};
    const filter            = state.filter || [];

    const createFieldsDeps = ({ field, fields = [] } = {}) => {
      let dep = inputdependance[field];
      let dvalue = undefined;

      if (!dep || !cachedependencies[dep] || SEARCH_ALLVALUE === cachedependencies[dep]._currentValue) {
        return fields.length && fields.join() || undefined;
      }

      // get current field dependance
      if (dep && cachedependencies[dep] && SEARCH_ALLVALUE !== cachedependencies[dep]._currentValue) {
        dvalue = cachedependencies[dep]._currentValue; // dependance as value
      }

      // In case of some input dependency is not filled
      if (undefined !== dvalue) {
        // need to set to lower a case for api purpose
        const { op, logicop } = filter.find(f =>  f.attribute === dep).op;
        fields.unshift(`${dep}|${op.toLowerCase()}|${encodeURI(dvalue)}|` + (fields.length ? logicop.toLowerCase() : ''));
      }

      return createFieldsDeps({ fields, field: dep });
    }

    // check if a field has a dependance
    let dep    = inputdependance[field];
    let dvalue = undefined;

    if (dep && cachedependencies[dep] && SEARCH_ALLVALUE !== cachedependencies[dep]._currentValue) {
      dvalue = cachedependencies[dep]._currentValue // dependance as value
    }

    // get unique value from each layers
    let response = Array.from(
      await Promise
        .allSettled((1 === layers.length ? [layers[0]] : layers).map(l => l.getFilterData({
          field: createFieldsDeps({
            field: dep,
            fields: undefined !== dvalue ? [createSingleFieldParameter({ field: dep, value: dvalue, operator: filter.find(f =>  f.attribute === dep).op }) ] : [],
          }),
          suggest: undefined,
          unique: field,
          ordering: field,
          // TODO ?
          // fformatter: opts.fformatter 
        })))
        .filter(d => 'fulfilled' === d.status)
        .reduce((acc, { value = [] }) => new Set([...acc, ...value]), [])
    )

    // sort array
    switch (response.length && typeof response[0]) {
      case 'string': response = sortAlphabeticallyArray(response);
      case 'number': response = sortNumericArray(response);
    }

    return response;

  } catch(e) { console.warn(e); }

  return [];
}