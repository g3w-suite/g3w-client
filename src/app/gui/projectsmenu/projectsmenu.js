const { base, inherit } = require('core/utils/utils');
const ProjectRegistry = require('core/project/projectsregistry');
const MenuComponent = require('./menu');

function ProjectsMenuComponent(options = {}) {
  options.id = 'projectsmenu';
  base(this, options);
  this.state.menuitems = [];
  const { host } = options;
  const ApplicationService = require('core/applicationservice');
  const projects = options.projects || ProjectRegistry.getListableProjects();
  this.state.menuitems = projects.map((project) => ({
    title: project.title,
    description: project.description,
    thumbnail: project.thumbnail,
    gid: project.gid,
    cbk: options.cbk || function (options = {}) {
      const { gid } = options;
      return ApplicationService.changeProject({
        gid,
        host,
      });
    },
  }));
}

inherit(ProjectsMenuComponent, MenuComponent);

module.exports = ProjectsMenuComponent;
