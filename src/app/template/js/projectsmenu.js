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
      title: project.title
    })
  });
  this.state.menuitems = menuitems;
}
inherit(ProjectsMenuComponent, MenuComponent);

var proto = ProjectsMenuComponent.prototype;

proto.trigger = function(action,options) {

};

module.exports = ProjectsMenuComponent;


