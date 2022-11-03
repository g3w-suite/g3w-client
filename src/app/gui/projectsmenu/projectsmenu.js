import ProjectsRegistry from 'store/projects';

const { base, inherit } = require('core/utils/utils');
const MenuComponent = require('gui/projectsmenu/menu');

function ProjectsMenuComponent(options={}) {
  options.id = 'projectsmenu';
  base(this, options);
  this.state.menuitems = [];
  const host = options.host;
  const ApplicationService = require('core/applicationservice');
  const projects = options.projects || ProjectsRegistry.getListableProjects();
  this.state.menuitems = projects.map(project => ({
    title: project.title,
    description: project.description,
    thumbnail: project.thumbnail,
    gid: project.gid,
    cbk: options.cbk || function(options={}) {
      const {gid} = options;
      return ApplicationService.changeProject({
        gid,
        host
      })
    }
  }));
}

inherit(ProjectsMenuComponent, MenuComponent);

module.exports = ProjectsMenuComponent;


