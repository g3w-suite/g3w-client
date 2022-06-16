import ProjectRegistry from 'core/project/projectsregistry';
import ApplicationService from 'core/applicationservice';
import MenuComponent from './menu';

class ProjectsMenuComponent extends MenuComponent {
  constructor(options = {}) {
    options.id = 'projectsmenu';
    super(options);
    this.state.menuitems = [];
    const { host } = options;
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
}

export default ProjectsMenuComponent;
