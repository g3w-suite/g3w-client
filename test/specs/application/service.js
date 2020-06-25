import { server as serverConfig } from '../../../src/config';
const ApplicationService = require('core/applicationservice');
const XHR = require('core/utils/utils').XHR;
const ProjectsRegistry = require('core/project/projectsregistry');
const Application = require('gui/app/index');
const GUI = require('gui/gui');
window.g3wsdk = require('api');

const bootstrap = function() {
  return new Promise((resolve, reject) => {
    //create the Application instance passing the template configuration
    // and the applicationService instance that is useful to work with project API
    const applicationTemplate = new Application({
      ApplicationService
    });
    // Listen ready event emit after build interface
    applicationTemplate.on('ready', () =>  {
      resolve();
    });
    //call initialize applicationTemplate method
    applicationTemplate.init();
  })

};

const urls = {
  login: null,
  initconfig: null
}

const setUrls = function({groupId, lng}){
  urls.initconfig = `/${serverConfig.urls.initconfig}/${groupId}/`;
  urls.login = `/${lng}/login/?next=/${lng}/`;
  return urls;
};

const getUrls = function() {
  return urls;
}

const getUrl = function(type) {
  return urls[type];
}

const Authentication = async function({lng='en'}) {
  return await doAuthentication({
    lng
  });
}

async function doAuthentication({lng='en'}={}) {
  const url = urls.login;
  const response = await fetch(url)
  const csrftoken = response.headers.get('csrftoken');
  //set document cookie
  document.cookie = `csrftoken=${csrftoken}`;
  await XHR.post({
    url,
    data: {
      username: 'admin01',
      password: 'kote@25#t',
      csrfmiddlewaretoken: csrftoken
    }
  });
  return csrftoken;
}

const getInitConfig = async function(url) {
  try {
    const initConfig = await ApplicationService.getInitConfig(url);
    return initConfig;
  } catch(error) {
    const initConfig = {
      error
    };
  }
}

const getApplicationConfig = async function(url) {
  try {
    const initConfig = await getInitConfig(url);
    return ApplicationService.createApplicationConfig(initConfig);
  }catch(error) {
    return Promise.reject(error);
  }
}

const getProjetsRegistry = async function(url) {
  try {
    console.log(url)
    const config = await getApplicationConfig(url);
    ApplicationService.setConfig(config);
    ProjectsRegistry.clear();
    const promise = new Promise((resolve, reject) => {
      ProjectsRegistry.init(config)
        .then(() =>{
          resolve();
        })
        .fail((error)=> {
          reject(error);
        })
    })
    await promise;
    return config;
  } catch(error) {
    console.log(error)
    Promise.reject({
      error
    })
  }
}

function getProject(gid) {
  return new Promise((resolve, reject) => {
    ProjectsRegistry.getProject(gid).then(project => {
      resolve(project);
    }).fail(error => {
      reject(error)
    })
  })
};

export default {
  bootstrap,
  setUrls,
  getUrls,
  getUrl,
  Authentication,
  getInitConfig,
  getApplicationConfig,
  getProjetsRegistry,
  getProject
};