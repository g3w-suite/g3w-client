/**
 * @param gid
 * 
 * @returns {string}
 */
export function getProjectUrl(gid) {
 const project = window.initConfig.projects.find(p => gid === p.gid);
 try {
   return `${(new URL(window.initConfig.urls.baseurl))}${project.url}`;
 } catch(e) {
   console.warn(e);
   return `${location.origin}${window.initConfig.urls.baseurl}${project.url}`;
 }
}