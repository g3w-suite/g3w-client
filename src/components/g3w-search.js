/**
 * @file
 * @since 3.10.0
 */

import {
  SEARCH_ALLVALUE,
  PAGELENGTHS
}                                     from 'g3w-constants';
import Emitter                        from 'g3w-emitter';
import Panel                          from 'g3w-panel';
import ApplicationState               from 'g3w-state'
import GUI                            from 'g3w-app';
import { getUniqueDomId }             from 'utils/getUniqueDomId';
import { createFilterFormInputs }     from 'utils/createFilterFormInputs';
import { toRawType }                  from 'utils/toRawType';
import { getDataForSearchInput }      from 'utils/getDataForSearchInput';
import { debounce }                   from 'utils/debounce';
import { getCatalogLayerById }        from 'utils/getCatalogLayerById';

import vueSearchComp                  from 'components/SearchPanel.vue';

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
    layerid:              (opts.options || {}).layerid,
    otherquerylayerids:   (opts.options|| {}).otherquerylayerids || [],
    search_1n_relationid: opts.options.search_1n_relationid, //relations
    /** Layers that will be searchable for that search form. 
     * The First one is a layer owner of the search set on admin. 
     * Need to ser layer TOC layer olorder on results.
     * */
    search_layers: (GUI._projectLayerIds.filter(id => [(opts.options || {}).querylayerid || (opts.options || {}).layerid, ...((opts.options || {}).otherquerylayerids || [])].includes(id))).map(id => getCatalogLayerById(id)),
    /** Array of inputs that belongs to search form  */
    forminputs:    ((opts.options || {}).filter || []).map((d, i) => ({
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
      dependance_strict:      d.input.options.dependance_strict || false,
      /**
       * true → the select is not disabled and will contain all possible values
       *        (since at the beginning the parent will have the value ALL).
       *        When the value of the dependent field changes, the values in the
       *        select list will be filtered in a manner consistent with the value
       *        of the parent
       */
      dependance:             d.input.options.dependance || false,
      alternativeuniquelayer: d.input.alternativeuniquelayer, //@since 4.0.0 layers to get selectbox data eventually
      value:                  'selectfield' === d.input.type ? SEARCH_ALLVALUE : null,
      operator:               d.op,
      logicop:                i === (opts.options.filter.length - 1) ? null : d.logicop,
      loading:                true,
      disabled:               d.input.options.disabled || false, 
      /** keep a reference to initial search options (you shouldn't mutate them..) */
      options:                d.input.options,
    })),
    /** @since 3.11.0 whether layers are filtered (value = 0/1, see: https://github.com/g3w-suite/g3w-client/issues/676) */
    autofilter: { value: 0 }, //
    /** @since 3.11.0 whether paginate results */
    paginate:  !!opts.options.paginate,
    /** @type { 'search' | 'data' } @since 3.11.0 */
    return:    (opts.options || {}).return  || 'data',
    /** @since 3.11.0 whether search is coming from another search */
    child:     !!opts.child,
  };

  // see: https://github.com/g3w-suite/g3w-client/pull/785#discussion_r2044936089
  if (state.search_layers.some(l => !l)) {
    state.search_layers = state.search_layers.filter(l => l);
    GUI.showUserMessage({
      type: 'warning',
      message: `Invalid <code>search_layers</code> config. Have you deleted some layers from your QGIS project recently?`
    });
  }

  const setInputs = async () => {
    
    for (let i = 0; i <= state.forminputs.length - 1; i++) {

      const input = state.forminputs[i];

      /**@since v4.0.0 set array value for in (only for SelectBox) */
      if ('in' === input.operator) {
        input.value = [].concat(input.value);
      }

      const no_value    = input.dependance_strict && [].concat(state.forminputs.find(i => input.dependance === i.attribute).value).find(v => [SEARCH_ALLVALUE, '', null, undefined].includes(v));
      const has_value   = !no_value;
      const is_cadastre = Array.isArray(input.options.values) && input.options.values.length > 0;              // HOTFIX for cadastre plugin

      // set key-values for select
      input.values = 'selectfield' === input.type  ? (
         [
          SEARCH_ALLVALUE,                                                                                     // set `SEARCH_ALLVALUE` as first element
          ...(has_value && is_cadastre ? input.options.values : []),                                           // ref: https://github.com/g3w-suite/g3w-client/pull/834
          ...(has_value && !is_cadastre ? await getDataForSearchInput({ state, layerid: input.alternativeuniquelayer, field: input.attribute }) : []) // get values from server
          ]
        ).map(value => 'Object' === toRawType(value) ? value : ({ key: value, value })) : [];

      //In case of search with autofilter that return no data, need to setup select input to all
      if (1 === input.values.length && SEARCH_ALLVALUE === input.values[0].value && ['selectfield', 'autocompletefield'].includes(input.type)) {
        input.value = 'in' === input.operator ? [SEARCH_ALLVALUE] : SEARCH_ALLVALUE; // set default value for select
      };
      
      // there is a dependance
      if (input.dependance) {
        state.loading[input.dependance] = false;
        input.disabled                  = no_value; // disabled for BACKCOMP
      }

      // save a copy of original values
      input._values = [...input.values];

      input.loading = false;
    }

  }
  // create search form structure 
  state.mounted = setInputs();

  const service = opts.service || Object.assign(new Emitter, {
    state,
    doSearch,
    setInputs,
    run: debounce((...args) => {
      const [w, h] = GUI.getMap().getSize();
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
      inputs: state.forminputs.filter(i => ![null, undefined, SEARCH_ALLVALUE].includes(i.value) && '' !== i.value.toString().trim()), // filter out INVALID VALUES
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
 * @param { boolean } opts.show false = internal request (No output data)
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
  show     = undefined === show     ? 'search' === state.type && 'data' === state.return : show;

  state.searching = true;

  let data, parsed;
  const search_1n  = !show && ('search_1n' === state.type);

  try {
    data = await GUI.getData('search:features', {
      inputs: {
        layer:     state.search_layers,
        filter:    filter || createFilterFormInputs({
          layer:   state.search_layers,
          inputs:  state.forminputs.filter(input => [].concat(input.value).find(v => ![null, undefined, SEARCH_ALLVALUE].includes(v) && '' !== input.value.toString().trim())), // Filter input by NONVALIDVALUES
        }),
        queryUrl,
        formatter: 1,
        feature_count,
        raw:        'search' === state.return,                                        // whether get a raw response
        autofilter: Number(show && state.autofilter.value),                           // 0/1 = autofilter (by server)
        ...(state.paginate && !search_1n ? { page: 1, page_sizes: PAGELENGTHS } : {}) // @since 3.11.0 pagination configuration
      },
      outputs: show && { title: state.title }
    });

    /* Used by the following plugins: "cadastre" ************************************/
    const has_values = Object.keys((data.data[0] || {}).data || {}).length > 0;
    // has search response (values) → show panel
    if (has_values && 'search' === state.return) {
      await GUI.closeContent();
      new SearchPanel(Object.assign((data.data[0] || {}).data, { child: true }), true); // TODO: remove "child: true" it from core
    }
    // no search response (values) → show an empty result
    if (!has_values && 'search' === state.return) {
      GUI.showData({ data: [] });
      data = [];
    }
    /********************************************************************************/

    const layers_with_features = data?.data?.filter(d => d.features?.length) || [];

    // auto zoom to query (response) in case of single response layer
    if (show && ApplicationState.project.state.autozoom_query && !state.paginate && 1 === layers_with_features.length) {
      GUI.zoomToFeatures(layers_with_features[0].features);
    }

    const features  = search_1n       && (data.data[0] || {}).features || []
    const relation  = features.length && ApplicationState.project.getRelationById(state.search_1n_relationid); // child and father relation fields (search father layer id based on result of child layer)
    const layer     = relation        && ApplicationState.project.getLayerById(relation.referencedLayer);      // father layer id

    // no features on result or no relation found (@since 3.11.0) → show an empty message
    if (search_1n && (0 === features.length || !relation)) {
      GUI.showData({ data: [] });
      parsed = [];
    }

    // parse search_1n
    if (relation) {
      let { referencedField, referencingField } = relation.fieldRef;
      //@since 3.11.0 Backport old relation with relation fields not array (no multiple field)
      referencedField  = [].concat(referencedField);
      referencingField = [].concat(referencingField);
      parsed = await GUI.getData('search:features', {
        inputs: {
          layer,
          filter: createFilterFormInputs({
            layer:  [layer],
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
          autofilter: state.autofilter.value,                             // 0/1 autofilter (by server)
          ...(state.paginate ? { page: 1, page_sizes: PAGELENGTHS } : {}) //@since 3.11.0 pagination configuration
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

  return parsed || data;
}