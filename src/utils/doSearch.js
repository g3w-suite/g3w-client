import { SEARCH_ALLVALUE }        from 'app/constant';
import ProjectsRegistry           from 'store/projects';
import DataRouterService          from 'services/data';
import GUI                        from 'services/gui';
import { createFilterFormInputs } from 'utils/createFilterFormInputs';
import { isEmptyObject }          from 'utils/isEmptyObject';

/**
 * Perform search
 * 
 * @param { Object } opts
 * @param opts.filter
 * @param opts.search_endpoint
 * @param opts.queryUrl
 * @param opts.feature_count
 * @param opts.show            - false = internal request (No output data)
 * 
 * @returns { Promise<void|unknown> }
 */
export async function doSearch({
  filter,
  search_endpoint,
  queryUrl,
  show,
  feature_count = 10000,
  state
} = {}) {

  search_endpoint = undefined !== search_endpoint ? search_endpoint : (state.search_endpoint || state.search_layers[0].getSearchEndPoint());
  queryUrl        = undefined !== queryUrl        ? queryUrl        : state.queryurl;
  show            = undefined !== show            ? show            : ('data' === state.return && 'search' === state.type);

  //get or create request filter
  filter = filter || createFilterFormInputs({
    layer:           state.search_layers,
    inputs:          state.forminputs.filter(input => -1 === [null, undefined, SEARCH_ALLVALUE].indexOf(input.value) && '' !== input.value.toString().trim()), // Filter input by NONVALIDVALUES
    search_endpoint: undefined !== search_endpoint ? search_endpoint : (state.search_endpoint || state.search_layers[0].getSearchEndPoint()),
  });

  // set searching to true
  state.searching = true;

  let data, parsed;

  try {
    data = await DataRouterService.getData('search:features', {
      inputs: {
        layer: state.search_layers,
        search_endpoint,
        filter,
        queryUrl,
        formatter: 1,
        feature_count,
        raw: ('search' === state.return) // in order to get raw response
      },
      outputs: show && { title: state.title }
    });

    // auto zoom to query
    if (show && ProjectsRegistry.getCurrentProject().state.autozoom_query && data && 1 === data.data.length) {
      GUI.getService('map').zoomToFeatures(data.data[0].features);
    }

    // parse search_1n

    const search_1n        = !show           && ('search_1n' === state.type);
    const search_by_return = !show           && ('search_1n' !== state.type) && 'search' === state.return;
    const features         = search_1n       && (data.data[0] || {}).features || []
    const relation         = features.length && ProjectsRegistry.getCurrentProject().getRelationById(state.search_1n_relationid); // child and father relation fields (search father layer id based on result of child layer)
    const layer            = relation        && ProjectsRegistry.getCurrentProject().getLayerById(relation.referencedLayer);      // father layer id

    // no features on result → show empty message
    if (search_1n && !features.length) {
      DataRouterService.showEmptyOutputs();
      parsed = [];
    }

    if (relation) {
      const { referencedField, referencingField } = relation.fieldRef;
      parsed = await DataRouterService.getData('search:features', {
        inputs: {
          layer,
          search_endpoint,
          filter: createFilterFormInputs({
            layer,
            search_endpoint,
            inputs: features.map(f => ({
              attribute: (1 === referencedField.length ? referencedField[0] : referencedField),
              logicop:   'OR',
              operator:  'eq',
              value:     [...new Set((1 === referencingField.length // get unique values
                ? features.map(f => f.get(referencingField[0]))     // → single field relation
                : referencingField.map(rf => f.get(rf))             // → multi field relation
              ))],
            })),
          }),
          formatter: 1,
          feature_count
        },
        outputs: {
          title: state.title
        }
      });
    }

    // parse search by return type
    if (search_by_return) {
      parsed = data.data[0].data;
      GUI.closeContent();
    }

    if (search_by_return && !isEmptyObject(parsed)) {
      (new vm.SearchPanel(parsed)).show();
    }

  } catch(e) {
    console.warn(e);
  }

  // set searching false
  state.searching = false;

  return parsed ? parsed : data;
}