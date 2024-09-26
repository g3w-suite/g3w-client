/** used by the following plugins: "iframe", "archiweb" */
export function getProjectConfigByGid(gid) {
  return window.initConfig.projects.find(p => gid === p.gid);
}