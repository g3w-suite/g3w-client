/**
 * @file
 * @since v3.6
 */

import CatalogLayersStoresRegistry from 'store/catalog-layers';
import DataRouterService from 'services/data';
import ProjectsRegistry from 'store/projects';
import ApplicationService from 'services/application';
import GUI from 'services/gui';

const { t } = require('core/i18n/i18n.service');
const { uniqueId, createFilterFromString, XHR } = require('utils');

const QUERYBUILDERSEARCHES = 'QUERYBUILDERSEARCHES';

function QueryBuilderService(options={}){
  this._cacheValues = {};
  this._items = ApplicationService.getLocalItem(QUERYBUILDERSEARCHES) || {};
}

const proto = QueryBuilderService.prototype;

proto.getCurrentProjectItems = function() {
  const projectId = ProjectsRegistry.getCurrentProject().getId();
  this._items[projectId] = this._items[projectId] || [];
  return this._items[projectId];
};

proto.getItems = function(projectId) {
  const items = ApplicationService.getLocalItem(QUERYBUILDERSEARCHES);
  projectId = projectId || ProjectsRegistry.getCurrentProject().getId();
  return items ? items[projectId] || [] : [];
};

proto._getLayerById = function(layerId){
  return CatalogLayersStoresRegistry.getLayerById(layerId);
};

proto.getValues = async function({layerId, field}={}){
  this._cacheValues[layerId] = this._cacheValues[layerId] || {};
  let valuesField = this._cacheValues[layerId][field];
  if (valuesField  === undefined) {
    try {
      const layer = this._getLayerById(layerId);
      const dataUrl = layer.getUrl('data');
      const response = await XHR.get({
        url: dataUrl,
        params: {
          ordering:field,
          unique: field
        }
      });
      if (response.result) this._cacheValues[layerId][field] = this._cacheValues[layerId][field] || response.data;
      return this._cacheValues[layerId][field] || [];
    } catch(err) {
      reject();
    }
  } else return valuesField;
};

proto.run = function({layerId, filter:stringFilter, showResult=true}={}){
  return new Promise(async (resolve, reject) => {
    const layer = this._getLayerById(layerId);
    const search_endpoint = layer.getSearchEndPoint();
    const filter = createFilterFromString({
      layer,
      search_endpoint,
      filter: stringFilter
    });
    try {
      const {data} = await DataRouterService.getData('search:features', {
        inputs: {
          layer,
          filter,
          search_endpoint,
          feature_count: 100
        },
        outputs: showResult
      });
      resolve(data);
    } catch(error){
      GUI.showUserMessage({
        type: 'alert',
        message: 'sdk.querybuilder.error_run',
        autoclose: true
      });
      reject(error)
    }
  })
};

proto.test = async function({layerId, filter}={}){
  try {
    const data = await this.run({
      layerId,
      filter,
      showResult: false
    });
    return data.length && data[0].features.length;
  } catch(err){
    err = t('sdk.querybuilder.error_test');
    return Promise.reject(err);
  }
};

proto.delete = function({id}={}){
  return new Promise((resolve, reject) => {
    GUI.dialog.confirm(t('sdk.querybuilder.delete'), (result)=>{
      if (result) {
        const querybuildersearches = this.getItems().filter(item => item.id !== id);
        const projectId = ProjectsRegistry.getCurrentProject().getId();
        const saveitems = ApplicationService.getLocalItem(QUERYBUILDERSEARCHES);
        if (querybuildersearches.length)
          saveitems[projectId] = querybuildersearches;
        else delete saveitems[projectId];
        if (Object.keys(saveitems).length)
          ApplicationService.setLocalItem({
            id: QUERYBUILDERSEARCHES,
            data: saveitems
          });
        else ApplicationService.removeLocalItem(QUERYBUILDERSEARCHES);
        resolve();
      } else reject();
    })
  })
};

proto.editLocalItem = function(projectId, querybuildersearch) {
  projectId = projectId || ProjectsRegistry.getCurrentProject().getId();
  const querybuildersearches = ApplicationService.getLocalItem(QUERYBUILDERSEARCHES);
  querybuildersearches[projectId].find((_querybuildersearch, index) => {
    if (_querybuildersearch.id === querybuildersearch.id) {
      querybuildersearches[projectId][index] = querybuildersearch;
      return true;
    }
  });
  ApplicationService.setLocalItem({
    id: QUERYBUILDERSEARCHES,
    data: querybuildersearches
  });
  this._resetItems(projectId, querybuildersearches[projectId]);
};

proto._resetItems = function(projectId, querybuildersearches) {
  setTimeout(()=> {
    querybuildersearches.forEach(querybuildersearch => this._items[projectId].push(querybuildersearch));
  },0);
  this._items[projectId].splice(0);
};

proto.addLocalItem = function(projectId, querybuildersearch) {
  querybuildersearch.id = uniqueId();
  projectId = projectId || ProjectsRegistry.getCurrentProject().getId();
  const querybuildersearches = ApplicationService.getLocalItem(QUERYBUILDERSEARCHES);
  if (querybuildersearches === undefined) {
    const querybuildersearches = [querybuildersearch];
    ApplicationService.setLocalItem({
      id: QUERYBUILDERSEARCHES,
      data: {
        [projectId]: querybuildersearches
      }
    });
    this._resetItems(projectId, querybuildersearches);
  } else {
    querybuildersearches[projectId] =  querybuildersearches[projectId] ? [...querybuildersearches[projectId], querybuildersearch] : [querybuildersearch];
    ApplicationService.setLocalItem({
      id: QUERYBUILDERSEARCHES,
      data: querybuildersearches
    });
    this._resetItems(projectId, querybuildersearches[projectId]);
  }
};

proto.save = function({id, name, layerId, filter, projectId} = {}){
  const layerName = this._getLayerById(layerId).getName();
  const querybuildersearch = {
    layerId,
    filter,
    layerName
  };
  if (id) {
    querybuildersearch.name = name;
    querybuildersearch.id = id;
    this.editLocalItem(projectId, querybuildersearch);
    GUI.showUserMessage({
      type: 'success',
      message: t("sdk.querybuilder.messages.changed"),
      autoclose: true
    });
    return;
  }
  GUI.dialog.prompt(t('sdk.querybuilder.additem'), (result)=>{
    if (result) {
      const searchService = GUI.getComponent('search').getService();
      querybuildersearch.name =result;
      searchService.addQueryBuilderSearch(querybuildersearch);
      this.addLocalItem(projectId, querybuildersearch);
      GUI.showUserMessage({
        type: 'success',
        message: t("sdk.querybuilder.messages.changed"),
        autoclose: true
      });
    }
  })
};

proto.all = function() {};

proto.sample = function() {};

proto.clear = function() {
  this._cacheValues = {};
};

proto.add = function() {};


export default new QueryBuilderService();