/** used by the following plugins: "archiweb" */
export function setProjectAliasUrl(alias) {
  const project = window.initConfig.projects.find(p => alias.gid === p.gid);
  if (project) {
    project.url = `${alias.host || ''}${alias.url}`
  }
}