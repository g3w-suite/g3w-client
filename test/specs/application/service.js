import { server as serverConfig } from '../../../src/config';
import { LOGIN as LoginConfig} from '../../config/config';
const GUI = require('gui/gui');
const ApplicationService = require('core/applicationservice');
const XHR = require('core/utils/utils').XHR;
const ProjectsRegistry = require('core/project/projectsregistry');
const Application = require('gui/app/index');
window.g3wsdk = require('api');
const MapComponent = require('gui/map/vue/map');
const mapDOM = {
  width: 1168,
  height: 899
}
let ApplicationTemplate;

const setupFakeGUIMethods = function(){
  GUI.notify = {};
  GUI.setContent = GUI.closeContent = GUI.closeOpenSideBarComponent = GUI.notify.error = ()=>{};
}

const initApplicationTemplate = function(){
  ApplicationTemplate = new Application({
    ApplicationService
  });
  ApplicationTemplate._setUpServices();
  const templateConfig = ApplicationTemplate._createTemplateConfig();
  const { placeholders:{sidebar}, othercomponents, viewport } = templateConfig;
  //viewport component
  Object.values(viewport.components).forEach(component =>{
    ApplicationTemplate._addComponent(component, component.getId())
  })
  GUI.getComponent('map').getService().setupViewer(mapDOM.width, mapDOM.height);
  GUI.getComponent('map').getService().getMap().setSize([mapDOM.width, mapDOM.height]);
  //othercomponent
  ApplicationTemplate._addComponents(othercomponents);
  sidebar.components.forEach(component =>{
    try {
      ApplicationTemplate._addComponent(component, component.getId())
    } catch(err) {
      console.log(err)
    }
  })
  setupFakeGUIMethods();
}

const urls = {
  login: null,
  initconfig: null
}

export const setUrls = function({groupId, lng}){
  urls.initconfig = `/${serverConfig.urls.initconfig}/${groupId}/`;
  urls.login = `/${lng}/login/?next=/${lng}/`;
  return urls;
};

export const getUrls = function() {
  return urls;
}

export const getUrl = function(type) {
  return urls[type];
}

export const Authentication = async function({lng='en'}) {
  const csrftoken = await doAuthentication({
    lng
  });
  return csrftoken;
}

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
}

export const getApplicationConfig = async function(url) {
  try {
    const initConfig = await getInitConfig(url);
    return ApplicationService.createApplicationConfig(initConfig);
  }catch(error) {
    return Promise.reject(error);
  }
}

export const getProjetsRegistry = async function(url) {
  try {
    const config = await getApplicationConfig(url);
    ApplicationService.setConfig(config);
    ProjectsRegistry.clear();
    const promise = new Promise((resolve, reject) => {
      ProjectsRegistry.init(config)
        .then(() =>{
          initApplicationTemplate();
          resolve();
        })
        .fail((error)=> {
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
}

export function getProject(gid) {
  return new Promise((resolve, reject) => {
    ProjectsRegistry.getProject(gid).then(project => {
      resolve(project);
    }).fail(error => {
      reject(error)
    })
  })
};

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
  getApplicationLayout
};