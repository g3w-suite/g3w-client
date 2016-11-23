var t = require('core/i18n/i18n.service').t;
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var ProjectsRegistry = require('core/project/projectsregistry');
var MenuComponent = require('./menu');

function ProjectsMenuComponent(options){
  base(this,options);
  var menuitems = [];
  var projects = ProjectsRegistry.getListableProjects();
  _.forEach(projects,function(project){
    menuitems.push({
      title: project.title,
      cbk: function() {

        ProjectsRegistry.getProject(project.gid)
        .then(function(project) {
          ProjectsRegistry.setCurrentProject(project);
        });
      }
    })
  });
  this.state.menuitems = menuitems;
}
inherit(ProjectsMenuComponent, MenuComponent);

module.exports = ProjectsMenuComponent;


