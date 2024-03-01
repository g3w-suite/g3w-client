/**
 * @file
 * @since v3.6
 */

import CatalogLayersStoresRegistry from 'store/catalog-layers';
import DataRouterService           from 'services/data';
import ProjectsRegistry            from 'store/projects';
import ApplicationService          from 'services/application';
import GUI                         from 'services/gui';
import { getUniqueDomId }          from 'utils/getUniqueDomId';
import { createFilterFromString }  from 'utils/createFilterFromString';
import { XHR }                     from 'utils/XHR';
import { noop }                    from 'utils/noop';

const { t } = require('core/i18n/i18n.service');

let CACHE = {};
let ITEMS = ApplicationService.getLocalItem('QUERYBUILDERSEARCHES') || {};

/**
 * @param id project id 
 */
function _getItems(id) {
  const items = ApplicationService.getLocalItem('QUERYBUILDERSEARCHES');
  id = id || ProjectsRegistry.getCurrentProject().getId();
  return items ? items[id] || [] : [];
}

async function _run({ layerId, filter, showResult = true } = {}) {
  try {
    const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
    const search_endpoint = layer.getSearchEndPoint();
    return (
      await DataRouterService.getData('search:features', {
        inputs: {
          layer,
          filter: createFilterFromString({ layer, search_endpoint, filter }),
          search_endpoint,
          feature_count: 100,
        },
        outputs: showResult,
      })
    ).data;
  } catch(e) {
    console.warn(e);
    GUI.showUserMessage({ type: 'alert', message: 'sdk.querybuilder.error_run', autoclose: true });
    return Promise.reject(e);
  }
}

function _save({ id, name, layerId, filter, projectId } = {}) {
  const query = {
    layerId,
    filter,
    layerName: CatalogLayersStoresRegistry.getLayerById(layerId).getName(),
  };
  if (id) {
    query.name = name;
    query.id = id;
    _editLocalItem(projectId, query);
    GUI.showUserMessage({ type: 'success', message: t("sdk.querybuilder.messages.changed"), autoclose: true });
    return;
  }
  GUI.dialog.prompt(t('sdk.querybuilder.additem'), (result) => {
    if (result) {
      query.name =result;
      GUI.getComponent('search').getService().addQueryBuilderSearch(query);
      this.addLocalItem(projectId, query);
      GUI.showUserMessage({ type: 'success', message: t("sdk.querybuilder.messages.changed"), autoclose: true });
    }
  })
}

/** 
 * @returns { number } number of features 
 */
async function _test({ layerId, filter } = {}) {
  try {
    const data = await _run({ layerId, filter, showResult: false });
    return data.length && data[0].features.length;
  } catch(e) {
    console.warn(e);
    return Promise.reject(t('sdk.querybuilder.error_test'));
  }
}

/**
* @param id    project id 
* @param queries query builder searches 
*/
function _resetItems(id, queries) {
  setTimeout(() => { queries.forEach(q => ITEMS[id].push(q)); }, 0);
  ITEMS[id].splice(0);
}

/**
 * @param id    project id 
 * @param query query builder search 
 */
function _editLocalItem(id, query) {
  id = id || ProjectsRegistry.getCurrentProject().getId();
  const searches = ApplicationService.getLocalItem('QUERYBUILDERSEARCHES');
  const i = searches[id].findIndex(s => s.id === query.id);
  if (-1 !== i) {
    searches[id][i] = query;
  }
  ApplicationService.setLocalItem({ id: 'QUERYBUILDERSEARCHES', data: searches });
  _resetItems(id, searches[id]);
}

/**
 * @param id    project id 
 * @param query query builder searches 
 */
function _addLocalItem(id, query) {
  query.id = getUniqueDomId();
  id = id || ProjectsRegistry.getCurrentProject().getId();
  const searches = ApplicationService.getLocalItem('QUERYBUILDERSEARCHES');
  let data, queries;
  if (undefined === searches) {
    data = { [id]: [query] };
    queries = data[id];
  } else {
    searches[id] = searches[id] ? [...searches[id], query] : [query];
    data = searches;
    queries = searches[id];
  }
  ApplicationService.setLocalItem({ id: 'QUERYBUILDERSEARCHES', data });
  _resetItems(id, queries);
}

async function _delete({ id } = {}) {
  try {
    await (new Promise((res, rej) => { GUI.dialog.confirm(t('sdk.querybuilder.delete'), d => d ? res() : rej()) }));
    const searches  = _getItems().filter(item => item.id !== id);
    const projectId = ProjectsRegistry.getCurrentProject().getId();
    const items     = ApplicationService.getLocalItem('QUERYBUILDERSEARCHES');
    if (searches.length)           items[projectId] = searches;
    else                           delete items[projectId];
    if (Object.keys(items).length) ApplicationService.setLocalItem({ id: 'QUERYBUILDERSEARCHES', data: items });
    else                           ApplicationService.removeLocalItem('QUERYBUILDERSEARCHES');
  } catch (e) {
    console.warn(e);
    return Promise.reject(e);
  }
}

async function _getValues({ layerId, field } = {}) {
  CACHE[layerId] = CACHE[layerId] || {};
  let cached = CACHE[layerId][field];
  if (undefined !== cached) {
    return cached;
  }
  try {
    const response = await XHR.get({
      url: CatalogLayersStoresRegistry.getLayerById(layerId).getUrl('data'),
      params: { ordering: field, unique: field }
    });
    if (response.result) {
      CACHE[layerId][field] = CACHE[layerId][field] || response.data;
    }
    return CACHE[layerId][field] || [];
  } catch(e) {
    console.warn(e);
    reject();
  }
}

function _clear() {
  CACHE = {};
}

function _getLayerById(layerId) {
  return CatalogLayersStoresRegistry.getLayerById(layerId);
}

function _getCurrentProjectItems() {
  const id = ProjectsRegistry.getCurrentProject().getId();
  ITEMS[id] = ITEMS[id] || [];
  return ITEMS[id];
}

export default {
  _cacheValues:           CACHE,
  _items:                 ITEMS,
  getCurrentProjectItems: _getCurrentProjectItems,
  getItems:               _getItems,
  getValues:              _getValues,
  run:                    _run,
  test:                   _test,
  delete:                 _delete,
  editLocalItem:          _editLocalItem,
  addLocalItem:           _addLocalItem,
  save:                   _save,
  clear:                  _clear,
  all:                    noop,
  sample:                 noop,
  add:                    noop,
  _resetItems,
  _getLayerById,
};