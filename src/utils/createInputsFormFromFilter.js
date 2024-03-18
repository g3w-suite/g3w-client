import { SEARCH_ALLVALUE }                               from 'app/constant';
import CatalogLayersStoresRegistry                       from 'store/catalog-layers';
import DataRouterService                                 from 'services/data';
import { toRawType }                                     from 'utils/toRawType';
import { getUniqueDomId }                                from 'utils/getUniqueDomId';
import { createFilterFormInputs }                        from 'utils/createFilterFormInputs';
import { getUniqueValuesFromField }                      from "utils/getUniqueValuesFromField";

/**
 * Create the right search structure for a search form
 * 
 * @param { Object } state
 *
 */
export async function createInputsFormFromFilter(state) {

  const inputdependance   = state.input.dependance;
  const inputdependencies = state.input.dependencies;
  const cachedependencies = state.input.cached_deps;
  const search_endpoint   = state.search_endpoint || state.search_layers[0].getSearchEndPoint();

  (state.filter || []).forEach(async (d, i, a) => {
    const input = {
      label:     d.label,
      attribute: d.attribute,
      type:      d.input.type || 'textfield',
      options:   { ...d.input.options },
      value:     null,
      operator:  d.op,
      logicop:   i === (a.length - 1) ? null : d.logicop,
      id:        d.id || getUniqueDomId(),
      loading:   false,
      widget:    null,
    };

    // check if it has a dependence
    const dep_strict     = undefined !== input.options.dependance_strict ? input.options.dependance_strict : false;
    const dep            = undefined !== input.options.dependance        ? input.options.dependance        : false;
    const is_select      = ['selectfield', 'autocompletefield'].includes(input.type);
    input.options.values = undefined !== input.options.values            ? input.options.values            : [];
    const { values }     = input.options;

    //In case of select input
    if ('selectfield' ===  input.type) {
      // Request to server value for a specific select field
      // ensure setting values options to an empty array when undefined
      input.loading = true;

      let _values;

      try {

        // in case of dependence load right now
        if ((dep && dep_strict) || dep_strict) {
          return;
        }

        // if defined layer_id dependence
        if (input.options.layer_id) {
          // get value relation values
          try {
            const {data = []} = await DataRouterService.getData('search:features', {
              inputs: {
                layer: CatalogLayersStoresRegistry.getLayerById(input.options.layer_id),
                search_endpoint,
                filter: createFilterFormInputs({
                  layer: CatalogLayersStoresRegistry.getLayerById(input.options.layer_id),
                  search_endpoint,
                  inputs: [{
                    // array of unique values
                    value: await getUniqueValuesFromField({
                      layers: state.search_layers,
                      field: input.attribute,
                      inputdependance,
                      cachedependencies,
                    }),
                    attribute: input.options.value,
                    logicop: "OR",
                    operator: "eq"
                  }]
                }),
                ordering: input.options.key
              },
              outputs: false
            });
            _values = (data && data[0] && data[0].features || []).map(f => ({key: f.get(input.options.key), value: f.get(input.options.value)}));
          } catch (e) {
            console.warn(e);
            _values = [];
          }
          return;
        }

        // Relation reference
        if (input.options.relation_reference) {
          //call filter data with fformatter
          const response = await state.search_layers[0].getFilterData({ fformatter: input.attribute });
          //check response
          if (response && response.result && response.data) {
            input.options.values = response.data.map(([value, key]) => ({ key, value }));
          }
        }

        // return mapped values
        if (input.options.values.length > 0) {
          _values = input.options.values.filter(v => SEARCH_ALLVALUE !== v);
          return;
        }

        _values = await getUniqueValuesFromField({
          field: input.attribute,
          layers: state.search_layers,
          inputdependance,
          cachedependencies,
        })
      } catch (e) {
        console.warn(e);
        values.length = 0;
      } finally {
        // set key value for select
        if (undefined !== _values) {
          values.splice(0,
            values.length,
            _values.length
              ? (
                'Object' !== toRawType(_values[0])
                  ? _values.map(value => ({ key: value, value }))
                  : _values
                )
              : _values
            );
        }
        if (values.length && SEARCH_ALLVALUE !== values[0].value) {
          values.unshift({ value: SEARCH_ALLVALUE });
        } else {
          values.push({ value: SEARCH_ALLVALUE });
        }
        input.value   = SEARCH_ALLVALUE;
        input.loading = false;
      }
    }

    // there is a dependence
    if (is_select && dep) {
      inputdependance[input.attribute] = dep;        // set dependence of input
      state.loading[dep]               = false;
      input.options.disabled           = dep_strict; // disabled for BACKCOMP
      // set input dependencies
      inputdependencies[dep] = (undefined !== inputdependencies[dep] ? inputdependencies[dep] : []);
      inputdependencies[dep].push(input);
    }

    // set a widget type for fill dependency
    if (is_select && dep && values.length > 0) {
      input.widget          = 'valuemap';
      input.options._values = [...values];
    }

    // Set input widget
    if (is_select && dep && !values.length && input.options.layer_id) {
      input.widget = 'valuerelation';
    }

    // add form inputs to list of search input
    state.forminputs.push(input);
  });
}