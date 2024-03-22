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

  const search_endpoint = state.search_endpoint || state.search_layers[0].getSearchEndPoint();

  console.log(state);

  for (let i = 0; i <= state.forminputs.length - 1; i++) {

    const input = state.forminputs[i];

    console.assert('ValueRelation'     === input.widget_type ? ('selectfield' === type && !input.dependance_strict && input.options.layer_id) : true);
    console.assert('RelationReference' === input.widget_type ? ('selectfield' === type && !input.dependance_strict && !input.options.layer_id && input.options.relation_reference) : true);

    try {

      // value-relation (select input values from `layer_id`)
      if ('ValueRelation' === input.widget_type) {
        const response = await DataRouterService.getData('search:features', {
          inputs: {
            layer: CatalogLayersStoresRegistry.getLayerById(input.options.layer_id),
            search_endpoint,
            filter: createFilterFormInputs({
              layer: CatalogLayersStoresRegistry.getLayerById(input.options.layer_id),
              search_endpoint,
              inputs: [{
                value: await getDataForSearchInput({ state, field: input.attribute }),
                attribute: input.value,
                logicop: 'OR',
                operator: 'eq'
              }]
            }),
            ordering: input.options.key
          },
          outputs: false
        });
        input.values = (response.data && response.data[0] && response.data[0].features || []).map(f => ({ key: f.get(input.options.key), value: f.get(input.value) }));
      }

      // Relation reference (`fformatter`)
      if ('RelationReference' === input.widget_type) {
        const response       = await state.search_layers[0].getFilterData({ fformatter: input.attribute });
        input.values = ((response && response.result && response.data) || []).map(([value, key]) => ({ key, value }));
      }

      /** @TODO should we check input.type ? */
      if (!input.dependance && !input.values.length > 0) {
        input.values = await getDataForSearchInput({ state, field: input.attribute });
      }

      /** @TODO should we check input.type ? */
      // Set key value for select
      if ('Object' !== toRawType(input.values[0])) {
        input.values = input.values.map(value => ({ key: value, value }));
      }

    } catch (e) {
      input.values = []; // reset to empty array on error
      console.warn(e);
    }

    // set `SEARCH_ALLVALUE` as first element of array
    if ('selectfield' === input.type) {
      input.values = [{ value: SEARCH_ALLVALUE }].concat(input.values.filter(v => SEARCH_ALLVALUE !== v));
    }

    // there is a dependence
    if (input.dependance) {
      state.loading[input.dependance] = false;
      input.disabled                  = input.dependance_strict; // disabled for BACKCOMP
    }

    // save a copy of original values
    input._values = [...input.values];

    input.loading = false;
  }

}