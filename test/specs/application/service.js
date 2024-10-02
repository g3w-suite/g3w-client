import { server as serverConfig } from 'app/config';
import { LOGIN as LoginConfig} from '../../config/config';
import GUI from 'services/gui';
import DataRouterService from 'services/data';
import ApplicationService from 'services/application';
import ProjectsRegistry from 'store/projects';
import PluginsRegistry from 'store/plugins';
window.g3wsdk = require('api'); //usefull for plugiin
const {XHR} = require('utils');
const Application = require('gui/app/main');
const MapComponent = require('gui/map/vue/map');
const mapDOM = {
  width: 1168,
  height: 899
};
let ApplicationTemplate;

const setupFakeGUIMethods = function(){
  GUI.notify = {};
  GUI.setContent = GUI.disableSideBar = GUI.getFontClass = GUI.showContentFactory = GUI.setLoadingContent = GUI.closeContent = GUI.closeOpenSideBarComponent = GUI.notify.error = ()=>{};
};

const initApplicationTemplate = function(){
  ApplicationTemplate = new Application({
    ApplicationService
  });
  ApplicationTemplate._setUpServices();
  const templateConfig = ApplicationTemplate._createTemplateConfig();
  const { placeholders:{sidebar}, othercomponents, viewport } = templateConfig;
  //viewport component
  Object.values(viewport.components).forEach(component =>{ApplicationTemplate._addComponent(component, component.getId())});
  setupFakeGUIMethods();
  const mapService = GUI.getComponent('map').getService();

  const mapcontainer = document.createElement('div');
  mapcontainer.id = "g3w-maps";

  const mapdiv = document.createElement('div');
  mapdiv.id = 'map';

  const mapcontrols = document.createElement('div');
  mapcontainer.classList.add('g3w-map-controls');
  mapcontainer.classList.add('rv');

  mapdiv.appendChild(mapcontrols);
  mapcontainer.appendChild(mapdiv);
  document.body.appendChild(mapcontainer);

  mapService.setMapControlsContainer($(mapcontrols));
  mapService.layout({width: mapDOM.width, height: mapDOM.height});
  mapService.getMap().setSize([mapDOM.width, mapDOM.height]);
  //othercomponent
  ApplicationTemplate._addComponents(othercomponents);
  sidebar.components.forEach(component =>{
    try {
      ApplicationTemplate._addComponent(component, component.getId())
    } catch(err) {
      console.log(err)
    }
  })
};

const urls = {
  login: null,
  initconfig: null
};

export const setUrls = function({groupId, lng}){
  urls.initconfig = `/${serverConfig.urls.initconfig}/${groupId}/`;
  urls.login = `/${lng}/login/?next=/${lng}/`;
  return urls;
};

export const getUrls = function() {
  return urls;
};

export const getUrl = function(type) {
  return urls[type];
};

export const Authentication = async function({lng='en'}) {
  const csrftoken = await doAuthentication({
    lng
  });
  return csrftoken;
};

export async function doAuthentication({lng='en'}={}) {
  const {username, password} = LoginConfig;
  const url = urls.login;
  const response = await fetch(url);
  const csrftoken = response.headers.get('csrftoken');
  //set document cookie
  document.cookie = `csrftoken=${csrftoken}`;
  await XHR.post({
    url,
    data: {
      username,
      password,
      csrfmiddlewaretoken: csrftoken
    }
  });
  return csrftoken;
}

export const getInitConfig = async function(url) {
  try {
    const initConfig = await ApplicationService.getInitConfig(url);
    return initConfig;
  } catch(error) {
    const initConfig = {
      error
    };
  }
};

export const getApplicationConfig = async function(url) {
  try {
    const initConfig = await getInitConfig(url);
    return ApplicationService.createApplicationConfig(initConfig);
  } catch(error) {
    return Promise.reject(error);
  }
};

export function setPluginsConfig(config){
  PluginsRegistry.setPluginsConfig(config);
}

export const getProjetsRegistry = async function(url) {
  try {
    const config = await getApplicationConfig(url);
    ApplicationService.setConfig(config);
    ApplicationService.setupI18n(); //setup i18n
    ProjectsRegistry.clear();
    DataRouterService.init();
    const promise = new Promise((resolve, reject) => {
      ProjectsRegistry.init(config)
        .then(() =>{
          initApplicationTemplate();
          resolve();
        })
        .fail(error=> {
          reject(error);
        })
    })
    await promise;
    return config;
  } catch(error) {
    Promise.reject({
      error
    })
  }
};

export function getProject(gid) {
  return new Promise((resolve, reject) => {
    ProjectsRegistry.getProject(gid).then(project => {
      resolve(project);
    }).fail(error => {
      reject(error)
    })
  })
}

export function getApplicationLayout() {
  return ApplicationService.getConfig().layout || {};
}

export default {
  setUrls,
  getUrls,
  getUrl,
  Authentication,
  getInitConfig,
  getApplicationConfig,
  getProjetsRegistry,
  getProject,
  getApplicationLayout,
  setPluginsConfig
};