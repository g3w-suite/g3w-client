/**
 * @file
 * @since 3.10.0
 */

import { SEARCH_ALLVALUE }            from 'app/constant';
import G3WObject                      from 'core/g3w-object';
import Component                      from 'core/g3w-component';
import Panel                          from 'core/g3w-panel';
import CatalogLayersStoresRegistry    from 'store/catalog-layers';
import ApplicationState               from 'store/application-state';
import ProjectsRegistry               from 'store/projects';
import GUI                            from 'services/gui';
import { resolve }                    from 'utils/resolve';
import { noop }                       from 'utils/noop';
import { getUniqueDomId }             from 'utils/getUniqueDomId';
import { createFilterFormInputs }     from 'utils/createFilterFormInputs';
import { createInputsFormFromFilter } from 'utils/createInputsFormFromFilter';
import { doSearch }                   from 'utils/doSearch';
import { debounce }                   from 'utils/debounce';

import * as vueComp                   from 'components/Search.vue';
import * as vueSearchComp             from 'components/SearchPanel.vue';

/**
 * Retrieve from local storage
 */
function _getSavedSearches() {
  const ITEMS = ApplicationState.querybuilder.searches;
  const id = ProjectsRegistry.getCurrentProject().getId();
  ITEMS[id] = ITEMS[id] || [];
  return ITEMS[id];
}

/**
 * ORIGINAL SOURCE:
 * - src/app/gui/search/vue/search.js@v3.9.3
 * - src/app/gui/search/service.js@3.9.3
 */
export function SearchComponent(opts = {}) {

  const project = ProjectsRegistry.getCurrentProject();

  const state = {
    searches: project.state.search || [],
    tools: [],
    querybuildersearches: _getSavedSearches()
  };

  const service = opts.service || new G3WObject();

  const comp = new Component({
    ...opts,
    id: 'search',
    visible: true,
    title: project.state.search_title || 'search',
    service: Object.assign(service, {
      state,
      title:                 project.state.search_title || "search",
      addQueryBuilderSearch: s  => { state.querybuildersearches.push(s); },
      addTool:               t  => { state.tools.push(t); },
      addTools:              tt => { for (const t of tt) service.addTool(t); },
      showPanel:             o  => new SearchPanel(o, true),
      removeItem:            ({ type, index } = {}) => { 'querybuilder' === type && state.querybuildersearches.splice(index, 1); },
      getTitle:              () => service.title,
      cleanSearchPanels:     () => { state.panels = {}; },
      removeTools:           () => { state.tools.splice(0) },
      stop:                  resolve,
      removeTool:            noop,
      reload:                () => {
        state.searches             = ProjectsRegistry.getCurrentProject().state.search;
        state.querybuildersearches = _getSavedSearches();
      },
    }),
    vueComponentObject: vueComp,
  });

  comp._reload = () => { comp._service.reload() };

  return comp;
}

/**
 * ORIGINAL SOURCE: src/app/gui/search/vue/panel/searchpanel.js@v3.9.3
 * ORIGINAL SOURCE: src/app/gui/search/vue/panel/searchservice.js@v3.9.3
 */
export function SearchPanel(opts = {}, show = false) {
  const state = {
    forminputs:           [], // Array of inputs belongs to form search
    loading:              {}, // store loading state of each input and each dependency
    searching:            false, //Boolean. If true, search request from server is starts. False no search
    title:                opts.name,
    /** @type { 'search' | 'search_1n' } */
    type:                 opts.type || 'search',
    queryurl:             (opts.options || {}).queryurl,
    return:               (opts.options || {}).return || 'data',
    filter:               (opts.options || {}).filter,
    search_endpoint:      opts.search_endpoint, //ows, api
    search_1n_relationid: opts.options.search_1n_relationid, //relations
    /** Layers that will be searchable for that search form. The First one is a layer owner of the search set on admin. */
    search_layers: [(opts.options || {}).querylayerid || (opts.options || {}).layerid || null, ...((opts.options || {}).otherquerylayerids || [])].map(id => CatalogLayersStoresRegistry.getLayerById(id)),
    input: {
      dependance: {},
      dependencies: {},
      cached_deps: {},
    },
  };

  state.mounted = createInputsFormFromFilter(state);

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
    /** @param { 'wms' | 'vector' } search_endpoint api type */
    createFilter: (search_endpoint) => createFilterFormInputs({
      layer: state.search_layers,
      inputs: state.forminputs.filter(input => -1 === [null, undefined, SEARCH_ALLVALUE].indexOf(input.value) && '' !== input.value.toString().trim()), // Filter input by NONVALIDVALUES
      search_endpoint: undefined !== search_endpoint ? search_endpoint : (state.search_endpoint || state.search_layers[0].getSearchEndPoint()),
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