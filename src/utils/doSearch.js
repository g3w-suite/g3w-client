import { SEARCH_ALLVALUE }        from 'app/constant';
import ApplicationState           from 'store/application-state';
import ProjectsRegistry           from 'store/projects';
import DataRouterService          from 'services/data';
import GUI                        from 'services/gui';
import IFrameRouterService        from 'services/iframe';
import { createFilterFormInputs } from 'utils/createFilterFormInputs';

console.assert(undefined !== IFrameRouterService);

/**
 * Perform search
 * 
 * @param { Object } opts
 * @param opts.filter
 * @param opts.queryUrl
 * @param opts.feature_count
 * @param opts.show            - false = internal request (No output data)
 * 
 * @returns { Promise<void|unknown> }
 */
export async function doSearch({
  filter,
  queryUrl,
  show,
  feature_count = 10000,
  state
} = {}) {

  queryUrl = undefined !== queryUrl ? queryUrl : state.queryurl;
  show     = undefined !== show     ? show     : 'search' === state.type;

  state.searching = true;

  let data, parsed;

  try {
    data = await DataRouterService.getData('search:features', {
      inputs: {
        layer:     state.search_layers,
        filter:    filter || createFilterFormInputs({
          layer:   state.search_layers,
          inputs:  state.forminputs.filter(input => -1 === [null, undefined, SEARCH_ALLVALUE].indexOf(input.value) && '' !== input.value.toString().trim()), // Filter input by NONVALIDVALUES
        }),
        queryUrl,
        formatter: 1,
        feature_count,
        raw:       false // in order to get a raw response
      },
      outputs: show && { title: state.title }
    });

    // auto zoom to query
    if (show && ProjectsRegistry.getCurrentProject().state.autozoom_query && data && data.data && 1 === data.data.length) {
      GUI.getService('map').zoomToFeatures(data.data[0].features);
    }

    const search_1n = !show           && ('search_1n' === state.type);
    const features  = search_1n       && (data.data[0] || {}).features || []
    const relation  = features.length && ProjectsRegistry.getCurrentProject().getRelationById(state.search_1n_relationid); // child and father relation fields (search father layer id based on result of child layer)
    const layer     = relation        && ProjectsRegistry.getCurrentProject().getLayerById(relation.referencedLayer);      // father layer id

    // no features on result → show an empty message
    if (search_1n && !features.length) {
      GUI.outputDataPlace(Promise.resolve({ data: [] }));
      parsed = [];
    }

    // parse search_1n
    if (relation) {
      const { referencedField, referencingField } = relation.fieldRef;
      parsed = await DataRouterService.getData('search:features', {
        inputs: {
          layer,
          filter: createFilterFormInputs({
            layer,
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

  } catch(e) {
    console.warn(e);
  }

  state.searching = false;

  return parsed ? parsed : data;
}