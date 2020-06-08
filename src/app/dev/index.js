const ProjectsRegistry = require('core/project/projectsregistry');
const ApplicationService = require('core/applicationservice');
const GUI = require('gui/gui');

// Handle ApplicationService on ready event
ApplicationService.once('ready', function(){});

// Handle project configuration to insert custom element on project
ProjectsRegistry.oncebefore('setCurrentProject', function(project) {});

//Ready GUI
GUI.once('ready', function(){});
