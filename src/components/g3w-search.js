/**
 * @file
 * @since 3.10.0
 */

import { SEARCH_ALLVALUE }            from 'g3w-constants';
import G3WObject                      from 'g3w-object';
import Panel                          from 'g3w-panel';
import ApplicationState               from 'store/application'
import GUI                            from 'services/gui';
import DataRouterService              from 'services/data';
import { getUniqueDomId }             from 'utils/getUniqueDomId';
import { createFilterFormInputs }     from 'utils/createFilterFormInputs';
import { toRawType }                  from 'utils/toRawType';
import { getDataForSearchInput }      from 'utils/getDataForSearchInput';
import { debounce }                   from 'utils/debounce';
import { getCatalogLayerById }        from 'utils/getCatalogLayerById';

import * as vueSearchComp             from 'components/SearchPanel.vue';

/**
 * ORIGINAL SOURCE: src/app/gui/search/vue/panel/searchpanel.js@v3.9.3
 * ORIGINAL SOURCE: src/app/gui/search/vue/panel/searchservice.js@v3.9.3
 */
export function SearchPanel(opts = {}, show = false) {
  const state = {
    loading:              {}, // store loading state of each input and each dependency
    searching:            false, //Boolean. If true, search request from server is starts. False no search
    title:                opts.name,
    /** @type { 'search' | 'search_1n' } */
    type:                 opts.type || 'search',
    /** @TODO check if deprecated */
    queryurl:             (opts.options || {}).queryurl,
    /** @deprecated will be removed in v4.x */
    search_endpoint:      'api',
    search_1n_relationid: opts.options.search_1n_relationid, //relations
    /** Layers that will be searchable for that search form. The First one is a layer owner of the search set on admin. */
    search_layers:        [(opts.options || {}).querylayerid || (opts.options || {}).layerid || null, ...((opts.options || {}).otherquerylayerids || [])].map(id => getCatalogLayerById(id)),
    /** Array of inputs that belongs to search form  */
    forminputs:           ((opts.options || {}).filter || []).map((d, i) => ({
      id:          d.id || getUniqueDomId(),
      type:        d.input.type || 'textfield',
      widget_type: d.input.widget_type,
      label:       d.label,
      attribute:   d.attribute,
      values:      d.input.options.values || [],
      /** group values by parent value */
      dvalues: {},
      /**
       * true → initially it is disabled (values = [], ALL value)
       *        as in the case in which the dependent field will
       *        return to having ALL value. When a value is set to
       *        the dependent field, the select will be enabled and
       *        will contain the filtered values consistent with the
       *        value of the dependent parent field
       */
      dependance_strict: d.input.options.dependance_strict || false,
      /**
       * true → the select is not disabled and will contain all possible values
       *        (since at the beginning the parent will have the value ALL).
       *        When the value of the dependent field changes, the values in the
       *        select list will be filtered in a manner consistent with the value
       *        of the parent
       */
      dependance: d.input.options.dependance || false,
      value:     'selectfield' === d.input.type ? SEARCH_ALLVALUE : null,
      operator:  d.op,
      logicop:   i === (opts.options.filter.length - 1) ? null : d.logicop,
      loading:   true,
      disabled:  d.input.options.disabled || false, 
      /** keep a reference to initial search options (you shouldn't mutate them..) */
      options:   d.input.options,
    })),
    autofilter:           0, //@since v3.11.0. Used to set already feature layers filtered https://github.com/g3w-suite/g3w-client/issues/676
  };

  // create search form structure 
  state.mounted = (async function(state) {

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
  
  })(state);

  const service = opts.service || Object.assign(new G3WObject, {
    state,
    doSearch,
    run: debounce((...args) => {
      const [w, h] = GUI.getService('map').getMap().getSize();
      const hide   = GUI.isMobile() && (0 === w || 0 === h);
      setTimeout(() => {
        if (hide) {
          GUI.hideSidebar();
        }
        panel.getService().doSearch({...args, state });
      }, hide ? 0 : 600);
    }),
    clear() {
      panel.getService().state = null;
    },
    createFilter: () => createFilterFormInputs({
      layer:  state.search_layers,
      inputs: state.forminputs.filter(i => ![null, undefined, SEARCH_ALLVALUE].includes(i.value) && '' !== i.value.toString().trim()), // Filter input by NONVALIDVALUES
    }),
  });

  const panel = new Panel({
    ...opts,
    show,
    id:                 opts.id        || getUniqueDomId(),
    title:              opts.title     || 'search',
    vueComponentObject: opts.component || vueSearchComp,
    service,
  });

  return panel;
}

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
async function doSearch({
  filter,
  queryUrl,
  show,
  feature_count = 10000,
  state
} = {}) {

  queryUrl = undefined === queryUrl ? state.queryurl : queryUrl;
  show     = undefined === show     ? 'search' === state.type : show;

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
        raw:        false, // in order to get a raw response
        autofilter: Number(show && state.autofilter), //0/1 autofilter by server,
      },
      outputs: show && { title: state.title }
    });

    // auto zoom to query
    if (show && ApplicationState.project.state.autozoom_query && data && data.data && 1 === data.data.length) {
      GUI.getService('map').zoomToFeatures(data.data[0].features);
    }

    const search_1n = !show           && ('search_1n' === state.type);
    const features  = search_1n       && (data.data[0] || {}).features || []
    const relation  = features.length && ApplicationState.project.getRelationById(state.search_1n_relationid); // child and father relation fields (search father layer id based on result of child layer)
    const layer     = relation        && ApplicationState.project.getLayerById(relation.referencedLayer);      // father layer id

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
          feature_count,
          autofilter: state.autofilter //Boolean autofilter by server
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

  const result = parsed ? parsed : data;

  //In the case of autofilter, need to get filtertokern attribute from server response data and set to each layer
  if (1 === state.autofilter && result) {
    (result.data || []).forEach(({ layer, filtertoken }) => {
      //if returned filtertoken, filter is apply on layer
      if (filtertoken) {
        layer.state.filter.active = true;
        layer.setFilterToken(filtertoken);
        layer.update()
      }
    })
  }

  return result;
}