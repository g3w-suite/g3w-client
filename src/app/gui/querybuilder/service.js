import DataRouterService  from 'core/data/routerservice';
import {t}  from 'core/i18n/i18n.service';
import utils from 'core/utils/utils';
import CatalogLayersStorRegistry  from 'core/catalog/cataloglayersstoresregistry';
import ApplicationService  from 'core/applicationservice';
import ProjectsRegistry  from 'core/project/projectsregistry';
import GUI from 'gui/gui';

const QUERYBUILDERSEARCHES = 'QUERYBUILDERSEARCHES';

class QueryBuilderService {
  constructor() {
    this._cacheValues = {};
    this._items = ApplicationService.getLocalItem(QUERYBUILDERSEARCHES) || {};
  }

  getCurrentProjectItems() {
    const projectId = ProjectsRegistry.getCurrentProject().getId();
    this._items[projectId] = this._items[projectId] || [];
    return this._items[projectId];
  };

  getItems(projectId) {
    const items = ApplicationService.getLocalItem(QUERYBUILDERSEARCHES);
    projectId = projectId || ProjectsRegistry.getCurrentProject().getId();
    return items ? items[projectId] || [] : [];
  };

  _getLayerById(layerId){
    return CatalogLayersStorRegistry.getLayerById(layerId);
  };

  getValues = async function({layerId, field}={}){
    this._cacheValues[layerId] = this._cacheValues[layerId] || {};
    let valuesField = this._cacheValues[layerId][field];
    if (valuesField  === undefined) {
      try {
        const layer = this._getLayerById(layerId);
        const dataUrl = layer.getUrl('data');
        const response = await utils.XHR.get({
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

  run({layerId, filter:stringFilter, showResult=true}={}){
    return new Promise(async (resolve, reject) => {
      const layer = this._getLayerById(layerId);
      const search_endpoint = layer.getSearchEndPoint();
      const filter = utils.createFilterFromString({
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

  test = async function({layerId, filter}={}){
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

  delete({id}={}){
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

  editLocalItem(projectId, querybuildersearch) {
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

  _resetItems(projectId, querybuildersearches) {
    setTimeout(()=> {
      querybuildersearches.forEach(querybuildersearch => this._items[projectId].push(querybuildersearch));
    },0);
    this._items[projectId].splice(0);
  };

  addLocalItem(projectId, querybuildersearch) {
    querybuildersearch.id = utils.uniqueId();
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

  save({id, name, layerId, filter, projectId} = {}){
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
    GUI.dialog.prompt(t('sdk.querybuilder.additem'), result =>{
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

  all() {};

  sample() {};

  clear() {
    this._cacheValues = {};
  };

  add() {}
}

export default new QueryBuilderService();
