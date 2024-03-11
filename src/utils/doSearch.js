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
 * @param opts.show
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
    layer: state.search_layers,
    inputs: state.forminputs.filter(input => -1 === [null, undefined, SEARCH_ALLVALUE].indexOf(input.value) && '' !== input.value.toString().trim()), // Filter input by NONVALIDVALUES
    search_endpoint: undefined !== search_endpoint ? search_endpoint : (state.search_endpoint || state.search_layers[0].getSearchEndPoint()),
  });

  //set searching to true
  state.searching = true;

  let data, parsed;

  try {
    data = await DataRouterService.getData('search:features', {
      inputs:{
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

    // parse_search_1n - (show = false → internal request. No output data)

    if (!show && ('search_1n' === state.type)) {
      const features          = (data.data[0] || {}).features || []
      const project           = ProjectsRegistry.getCurrentProject();
      const relation          = features.length && project.getRelationById(state.search_1n_relationid); // Search father layer id based on result of child layer
      // check if it has features on result
      if (!features.length) {
        //show empty result output
        DataRouterService.showEmptyOutputs();
        parsed = [];
      } else if (relation) {
        const inputs = []; //store inputs

        //extract properties from relation object
        const {
          referencedLayer, //father layer id
          fieldRef: {referencingField, referencedField}
        } = relation; // child and father relation fields

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

        parsed = await DataRouterService.getData('search:features', {
          inputs: {
            layer,
            search_endpoint,
            filter: createFilterFormInputs({ layer, search_endpoint, inputs }),
            formatter: 1,
            feature_count
          },
          outputs: {
            title: state.title
          }
        });
      }

    }

    // parse search by return type - (show = false → internal request. No output data)
    if (!show && ('search_1n' !== state.type) && 'search' === state.return) {
      parsed = data.data[0].data; // in case of api get first response on array
      GUI.closeContent();
      if (isEmptyObject(parsed)) {
        DataRouterService.showCustomOutputDataPromise(Promise.resolve({}));
      } else {
        (new vm.SearchPanel(parsed)).show();
      }
    }
    
    if (show && ProjectsRegistry.getCurrentProject().state.autozoom_query && data && 1 === data.data.length) {
      GUI.getService('map').zoomToFeatures(data.data[0].features); // auto zoom_query
    }

  } catch(e) {
    console.warn(e);
  }

  //set searching false
  state.searching = false;

  return parsed ? parsed : data;
}