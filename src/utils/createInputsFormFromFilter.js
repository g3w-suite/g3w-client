import { SEARCH_ALLVALUE }       from 'app/constant';
import { toRawType }             from 'utils/toRawType';
import { getDataForSearchInput } from 'utils/getDataForSearchInput';

/**
 * Create the right search structure for a search form
 * 
 * @param { Object } state
 *
 */
export async function createInputsFormFromFilter(state) {

  for (let i = 0; i <= state.forminputs.length - 1; i++) {

    const input            = state.forminputs[i];
    const has_autocomplete = 'autocompletefield' === input.type;

    // set key-values for select
    input.values = [
      ...('selectfield' === input.type ? [SEARCH_ALLVALUE] : []),          // set `SEARCH_ALLVALUE` as first element
      ...(input.dependance_strict || has_autocomplete
          ? input.values
          : await getDataForSearchInput({ state, field: input.attribute }) // retrieve input values from server
        )
    ].map(value => 'Object' === toRawType(value) ? value : ({ key: value, value }));

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