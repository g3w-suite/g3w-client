//SERVICES
import AppService from './services/app/service';
import EditingServices from './services/plugins/editing/service';

////
const ProjectsRegistry = require('core/project/projectsregistry');
const PluginsRegistry = require('core/plugin/pluginsregistry');
const { t } = require('core/i18n/i18n.service');
const { Expression, Filter } = g3wsdk.core.layer.filter;
const GUI = require('gui/gui');

function IframePluginService(options={}) {

  // handeler of actions
  this.actionsHandlers = {
    app: AppService,
    editing: null
  };

  this._mapControls = {
    query: {
      control: null,
      eventType: 'picked'
    },
    queryBBox: {
      control: null,
      eventType: null
    },
    changeMap: {
      control: null
    }
  };

  // contain all plugin(key) services used by iframe
  this.pluginsDependeciesApiServices = {
    editing: {
      service: EditingServices,
      ready: false
    }
  };

  this.init = async function() {
    this.setPluginsDepenciesApi();
    await GUI.isReady();
    this._mapService = GUI.getComponent('map').getService();
    this.actionsHandlers.app.init({
      project: ProjectsRegistry.getCurrentProject(),
      mapService: this._mapService
    });
    this._mapService.once('ready', ()=>{
      this._map = this._mapService.getMap();
      this._mapCrs = this._mapService.getCrs();
      this._iFrameSetCurrentAfterKey;
      // set alias url to project
      this._iFrameSetCurrentAfterKey = ProjectsRegistry.onafter('setCurrentProject', project => {
        this.projectsDialog && this.projectsDialog.modal('hide');
      });
      const projects = ProjectsRegistry.getListableProjects().map(project => {
        project.title = this.filterProjectName(project.title);
        return project;
      });
      this._mapControls.changeMap.control =  this._mapService.createMapControl('onclick', {
        id: "iframe-change-map",
        options: {
          add: true,
          name: "change-map",
          tipLabel: "Cambio mappa",
          customClass: GUI.getFontClass('change-map'),
          onclick: async () => {
            this._changeProjectModalWindow({
              projects
            });
            return true;
          }
        }
      });
      this._mapControls.query.control = this._mapService.getMapControlByType({
        type: 'query'
      });
      // overwrite query event handler
      this._mapControls.query.control.overwriteEventHandler({
        eventType: this._mapControls.query.eventType,
        handler: (evt) => {
          const {coordinates} = evt;
          const layers = this._setQueryLayers();
          alert('Query')
          // getQueryLayersPromisesByCoordinates(layers, {
          //   map: this._map,
          //   coordinates
          // }).then((responses=[]) => {
          //   this._handleQueryResponse({
          //     responses,
          //     coordinates
          //   });
          // })
        }
      });
      this.postMessage({
        action: 'app:ready',
        params: {}
      })
    });

    if (window.addEventListener) window.addEventListener("message", this.getMessage, false);
    else window.attachEvent("onmessage", this.getMessage);
  };

  //METHODS
  this.setPluginsDepenciesApi = function(){
    const pluginNames = Object.keys(this.pluginsDependeciesApiServices);
    pluginNames.forEach(pluginName => {
      const plugin = PluginsRegistry.getPlugin(pluginName);
      if (plugin) {
        this.pluginsDependeciesApiServices[pluginName].service.init(plugin.getApi());
        this.pluginsDependeciesApiServices[pluginName].ready = true;
      } else {
        PluginsRegistry.onafter('registerPlugin', async plugin =>{
          await plugin.isReady();
          if (pluginNames.indexOf(plugin.getName()) !== -1) {
            this.pluginsDependeciesApiServices[pluginName].service.init(plugin.getApi());
            this.pluginsDependeciesApiServices[pluginName].ready = true;
          }
        })
      }
    });
  };

  this._handleQueryResponse = function(responses) {
    this.postMessage({});
  };

  this.postMessage = function (message={}) {
    if (window.parent) {
      window.parent.postMessage(message, "*")
    }
  };

  this._changeProjectModalWindow = function({projects=[]}) {
    const message = GUI.getProjectMenuDOM({
      projects,
      host: this._host
    });

    this.projectsDialog = GUI.showModalDialog({
      className: "dialogFullScreen",
      title: t('changemap'),
      message
    });
  };

  this.filterProjectName = function(name) {
    if (name){
      name = name || this._project.getName();
      name = name.split('.qgs')[0].split('/');
      return  name[name.length-1]
    }
  };

  this.setLayers = function() {};
  
  this._setQueryLayers = function() {
    // return getMapLayersByFilter({
    //   BASELAYER: false,
    //   IDS: projectlayers.filter(layer => {
    //     return this._project.getLayerById(layer.qgs_layer_id).isVisible()
    //   }).map(layer => layer.qgs_layer_id)
    // });
  };

  this.changeMap = function({gid}) {
    return ApplicationService.changeProject({
      host: this._host,
      gid
    })
  };

  // method to handle all message from window
  this.getMessage = evt => {
    console.log(evt)
    if (evt && evt.data) {
      const { action, params } = evt.data;
      const [context, func] = action.split(':');
      console.log(context, func)
      this.actionsHandlers[context][func](params)

    }
  };

  this.GenericQuestion = function({TYPE, KEYOK, PARAMS}={}){
    let question;
    const id = uniqueId();
    switch (TYPE) {
      case 'changeMap':
        const {project} = PARAMS;
        question = `La mappa corrente non permette la visualizzazione dell'oggetto ricercato.Attivare la mappa ${this.filterProjectName(project.title)}?`;
        this._currentGenericQuestion.KEYOK = KEYOK;
        this._currentGenericQuestion.id = id;
        this._currentGenericQuestion.cb = ()=> {
          if (this._currentGenericQuestion.id === id) {
            this._changeMapData = {
              FUNC:PARAMS.FUNC,
              params: PARAMS.params
            };
            this.changeMap({
              gid: project.gid
            });
          }
        };
        break;
    }
    this.postMessage({
      FNC: 'GenericQuestion',
      ARGS: [question, KEYOK]
    })
  };

  this.ResponseQuestion = function(ARGS={}){
    if (ARGS[0] === this._currentGenericQuestion.param)
      this._currentGenericQuestion.cb();
    this._currentGenericQuestion.cb = () =>{};
    this._currentGenericQuestion.param = this._currentGenericQuestion.id = null;
  };

  this._serverGetRequest = function({layerId, params={}}={})  {
    return new Promise((resolve, reject) => {
      const layer = this._project.getLayerById(layerId);
      const filter =  []
      for (const field in params) {
        let values = params[field];
        if (Array.isArray(values)) {
          values = values.filter(value => value !== null);
          if (values.length)
            filter.push({
              attribute: field,
              operator: 'IN',
              logicop: 'AND',
              value: values
            });
        }
        else {
          const eq = {};
          eq[field] =values;
          filter.push({
            attribute: field,
            operator: 'eq',
            logicop: 'AND',
            value: values
          })
        }
      }
      const expression = new Expression();
      const layerName = layer.getWMSLayerName();
      expression.createExpressionFromFilter(filter, layerName);
      const _filter = new Filter();
      _filter.setExpression(expression.get());
      layer.search({
        filter: _filter,
        feature_count: 100
      }).then((response) => {
        const features = response.length && response[0].features || [];
        resolve(features);
      }).fail((err) => {
        reject(err);
      })
    })
  };
  
  this._getServerRequestAndZoom = function({layers, params}={}){
    const promises = layers.map(layer => {
      return this._serverGetRequest({
        layerId: layer.qgs_layer_id,
        params
      })
    });
    Promise.all(promises)
      .then(features =>{
        features = features.reduce((array, currentArray) => { return array = [...array, ...currentArray]}, []);
        this._mapService.zoomToFeatures(features, {
          highlight: true
        })
      })
      .catch(err =>{console.log(err)})
  };

  this.SelezionaDaCoord = function({FUNC, ARGS=[]}={}) {
    const coordinatesLength = ARGS.length;
    if (coordinatesLength === 2)
      this._mapService.highlightGeometry(new ol.geom.Point(ol.proj.transform(ARGS, 'EPSG:4326', this._mapCrs)), {
        zoom: true,
        highlight: true
      });
    else this._mapService.zoomToExtent(ol.proj.transformExtent(ARGS, 'EPSG:4326', this._mapCrs))
  };

  this._askToChangeMap = function({FUNC, projectIds, params}={}) {
    project.title = this.filterProjectName(ProjectsRegistry.getProjectConfigByGid(project.gid).title);
    this.GenericQuestion({
      TYPE: 'changeMap',
      PARAMS: {
        project,
        FUNC,
        params
      },
      KEYOK: project.type
    })
  };

  this.clear = function() {
    ProjectsRegistry.un('setCurrentProject', this._iFrameSetCurrentAfterKey);
    this._mapControls.query.control.resetOriginalHandlerEvent(this._mapControls.query.eventType);
    this._mapService.removeControlById('iframe-change-map');
    if (window.removeEventListener) window.removeEventListener("message", this.getMessage, false);
    else window.detachEvent("onmessage", this.getMessage);
    this._changeMapData = null;
    Object.keys(this.dependeciesApiServices).forEach(plugin =>{
      this.dependeciesApiServices[plugin].clear();
    });
    this.dependeciesApiServices = null;
  }
}

module.exports = new IframePluginService;
