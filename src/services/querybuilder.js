/**
 * @file
 * @since v3.6
 */

import CatalogLayersStoresRegistry from 'store/catalog-layers';
import DataRouterService           from 'services/data';
import ProjectsRegistry            from 'store/projects';
import ApplicationService          from 'services/application';
import GUI                         from 'services/gui';

const { t }                                     = require('core/i18n/i18n.service');
const { uniqueId, createFilterFromString, XHR } = require('utils');

const QUERYBUILDERSEARCHES = 'QUERYBUILDERSEARCHES';

class QueryBuilderService {

  constructor(options = {}) {
    this._cacheValues = {};
    this._items       = ApplicationService.getLocalItem(QUERYBUILDERSEARCHES) || {};
  }

  getCurrentProjectItems() {
    const projectId        = ProjectsRegistry.getCurrentProject().getId();
    this._items[projectId] = this._items[projectId] || [];
    return this._items[projectId];
  }

  getItems(projectId) {
    const items = ApplicationService.getLocalItem(QUERYBUILDERSEARCHES);
    projectId   = projectId || ProjectsRegistry.getCurrentProject().getId();
    return items ? items[projectId] || [] : [];
  }

  _getLayerById(layerId){
    return CatalogLayersStoresRegistry.getLayerById(layerId);
  }

  async getValues({ layerId, field } = {}) {
    this._cacheValues[layerId] = this._cacheValues[layerId] || {};
    let valuesField            = this._cacheValues[layerId][field];

    if (undefined !== valuesField) {
      return valuesField;
    }

    try {
      const response = await XHR.get({
        url: this._getLayerById(layerId).getUrl('data'),
        params: { ordering: field, unique: field }
      });
      if (response.result) {
        this._cacheValues[layerId][field] = this._cacheValues[layerId][field] || response.data;
      }
      return this._cacheValues[layerId][field] || [];
    } catch(err) {
      reject();
    }
  };

  run({ layerId, filter, showResult = true } = {}) {
    return new Promise(async (resolve, reject) => {
      const layer           = this._getLayerById(layerId);
      const search_endpoint = layer.getSearchEndPoint();
      try {
        const { data } = await DataRouterService.getData(
          'search:features',
          {
            inputs: {
              layer,
              filter: createFilterFromString({ layer, search_endpoint, filter }),
              search_endpoint,
              feature_count: 100
            },
            outputs: showResult
          }
        );
        resolve(data);
      } catch(error) {
        GUI.showUserMessage({ type: 'alert', message: 'sdk.querybuilder.error_run', autoclose: true });
        reject(error)
      }
    })
  }

  async test({ layerId, filter } = {}) {
    try {
      const data = await this.run({ layerId, filter, showResult: false });
      return data.length && data[0].features.length;
    } catch(err) {
      return Promise.reject(t('sdk.querybuilder.error_test'));
    }
  }

  delete({ id } = {}) {
    return new Promise((resolve, reject) => {
      GUI
        .dialog
        .confirm(
          t('sdk.querybuilder.delete'),
          (result) => {
            if (result) {
              const items = this.getItems().filter(item => item.id !== id);
              const id    = ProjectsRegistry.getCurrentProject().getId();
              const saved = ApplicationService.getLocalItem(QUERYBUILDERSEARCHES);
              if (items.length) {
                saved[id] = items;
              } else {
                delete saved[id];
              }
              if (Object.keys(saved).length) {
                ApplicationService.setLocalItem({ id: items, data: saved });
              } else {
                ApplicationService.removeLocalItem(items);
              }
              resolve();
            } else {
              reject();
            }
          }
        );
      }
    );
  }

  editLocalItem(projectId, query) {
    projectId = projectId || ProjectsRegistry.getCurrentProject().getId();
    const saved = ApplicationService.getLocalItem(QUERYBUILDERSEARCHES);
    saved[projectId]
      .find(
        (item, idx) => {
          if (item.id === query.id) {
            saved[projectId][idx] = query;
            return true;
          }
        }
      );
    ApplicationService.setLocalItem({ id: QUERYBUILDERSEARCHES, data: saved });
    this._resetItems(projectId, saved[projectId]);
  }

  _resetItems(projectId, querybuildersearches) {
    setTimeout(() => { querybuildersearches.forEach(item => this._items[projectId].push(item)); }, 0);
    this._items[projectId].splice(0);
  }

  addLocalItem(projectId, querybuildersearch) {
    querybuildersearch.id = uniqueId();
    projectId             = projectId || ProjectsRegistry.getCurrentProject().getId();

    const saved = ApplicationService.getLocalItem(QUERYBUILDERSEARCHES);
    const items = [querybuildersearch];

    if (saved === undefined) {
      ApplicationService.setLocalItem({ id: QUERYBUILDERSEARCHES, data: { [projectId]: items } });
      this._resetItems(projectId, items);
    } else {
      saved[projectId] = saved[projectId] ? [...saved[projectId], querybuildersearch] : items;
      ApplicationService.setLocalItem({ id: QUERYBUILDERSEARCHES, data: saved });
      this._resetItems(projectId, saved[projectId]);
    }

  }

  save({ id, name, layerId, filter, projectId } = {}) {
    const item = {
      layerId,
      filter,
      layerName: this._getLayerById(layerId).getName()
    };

    if (id) {
      item.name = name;
      item.id   = id;
      this.editLocalItem(projectId, item);
      GUI.showUserMessage({ type: 'success', message: t("sdk.querybuilder.messages.changed"), autoclose: true });
      return;
    }

    GUI
      .dialog
      .prompt(
        t('sdk.querybuilder.additem'),
        (result) => {
          if (result) {
            item.name = result;
            GUI.getComponent('search').getService().addQueryBuilderSearch(item);
            this.addLocalItem(projectId, item);
            GUI.showUserMessage({ type: 'success', message: t("sdk.querybuilder.messages.changed"), autoclose: true });
          }
        });
  }

  clear() {
    this._cacheValues = {};
  }

  all() {}

  sample() {}

  add() {}

}


export default new QueryBuilderService();