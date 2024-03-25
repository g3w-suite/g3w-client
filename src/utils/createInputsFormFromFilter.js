import { SEARCH_ALLVALUE }         from 'app/constant';
import { toRawType }               from 'utils/toRawType';
import { getDataForSearchInput }   from 'utils/getDataForSearchInput';

/**
 * Create the right search structure for a search form
 * 
 * @param { Object } state
 *
 */
export async function createInputsFormFromFilter(state) {

  console.log(state);

  for (let i = 0; i <= state.forminputs.length - 1; i++) {

    const input = state.forminputs[i];

    console.assert('ValueRelation'     === input.widget_type ? ('selectfield' === input.type && !input.dependance_strict && input.options.layer_id) : true, 'Invalid ValueRelation widget');
    console.assert('RelationReference' === input.widget_type ? ('selectfield' === input.type && !input.dependance_strict && !input.options.layer_id && input.options.relation_reference) : true, 'Invalid RelationReference widget');

    try {

      // field is part of a relationship (`fformatter`)
      if (['RelationReference', 'ValueRelation'].includes(input.widget_type)) {
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