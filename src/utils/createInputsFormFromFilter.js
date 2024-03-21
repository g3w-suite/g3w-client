import { SEARCH_ALLVALUE }         from 'app/constant';
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import DataRouterService           from 'services/data';
import { toRawType }               from 'utils/toRawType';
import { createFilterFormInputs }  from 'utils/createFilterFormInputs';
import { getDataForSearchInput }   from 'utils/getDataForSearchInput';

/**
 * Create the right search structure for a search form
 * 
 * @param { Object } state
 *
 */
export async function createInputsFormFromFilter(state) {

  const deps            = state.input.dependencies;
  const search_endpoint = state.search_endpoint || state.search_layers[0].getSearchEndPoint();

  console.log(state);

  for (let i = 0; i <= state.forminputs.length - 1; i++) {

    const input = state.forminputs[i];
    const type  = input.type;

    const value_relation     = !!('selectfield' === type                              && !input.options.dependance_strict && input.options.layer_id);
    const relation_reference = !!('selectfield' === type                              && !input.options.dependance_strict && !input.options.layer_id && input.options.relation_reference);
    const chained_select     = !!(['selectfield', 'autocompletefield'].includes(type) && input.options.dependance); 

    console.log(input, value_relation, relation_reference, chained_select);

    try {

      // value-relation (select input values from `layer_id`)
      if (value_relation) {
        const response = await DataRouterService.getData('search:features', {
          inputs: {
            layer: CatalogLayersStoresRegistry.getLayerById(input.options.layer_id),
            search_endpoint,
            filter: createFilterFormInputs({
              layer: CatalogLayersStoresRegistry.getLayerById(input.options.layer_id),
              search_endpoint,
              inputs: [{
                value: await getDataForSearchInput({ state, field: input.attribute }),
                attribute: input.options.value,
                logicop: 'OR',
                operator: 'eq'
              }]
            }),
            ordering: input.options.key
          },
          outputs: false
        });
        input.options.values = (response.data && response.data[0] && response.data[0].features || []).map(f => ({ key: f.get(input.options.key), value: f.get(input.options.value) }));
      }

      // Relation reference (`fformatter`)
      if (relation_reference) {
        const response       = await state.search_layers[0].getFilterData({ fformatter: input.attribute });
        input.options.values = ((response && response.result && response.data) || []).map(([value, key]) => ({ key, value }));
      }

      /** @TODO should we check input.type ? */
      if (!input.options.dependance && !input.options.values.length > 0) {
        input.options.values = await getDataForSearchInput({ state, field: input.attribute });
      }

      /** @TODO should we check input.type ? */
      // Set key value for select
      if ('Object' !== toRawType(input.options.values[0])) {
        input.options.values = input.options.values.map(value => ({ key: value, value }));
      }

    } catch (e) {
      input.options.values = []; // reset to empty array on error
      console.warn(e);
    }

    // set `SEARCH_ALLVALUE` as first element of array
    if ('selectfield' === input.type) {
      input.options.values = [{ value: SEARCH_ALLVALUE }].concat(input.options.values.filter(v => SEARCH_ALLVALUE !== v));
    }

    // there is a dependence
    if (chained_select) {
      state.loading[input.options.dependance] = false;
      input.options.disabled                  = input.options.dependance_strict; // disabled for BACKCOMP
      // set input dependencies
      deps[input.options.dependance]          = (undefined !== deps[input.options.dependance] ? deps[input.options.dependance] : []);
      deps[input.options.dependance].push(input);
    }

    // save a copy of original values
    input.options._values = [...input.options.values];

    input.loading = false;
  }

}