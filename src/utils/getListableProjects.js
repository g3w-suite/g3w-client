import ApplicationState            from 'store/application';

/** used by the following plugins: "iframe", "archiweb" */
export function getListableProjects() {
  window.initConfig.projects
  return window.initConfig.projects.filter(p => {
    if (![null, undefined].includes(p.listable)) {
      return p.listable;
    }
    if (
      p.id === ApplicationState.project.getId() ||
      (window.initConfig.overviewproject && p.gid === window.initConfig.overviewproject)
    ) {
      return false;
    }
    return p;
  }).sort((a, b) => (a.title || '').localeCompare(b.title));
}