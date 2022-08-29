/**
 * NB: node.js modules are singletons by default.
 * 
 * @see https://medium.com/@lazlojuly/are-node-js-modules-singletons-764ae97519af
 */
const CatalogEventHub = new Vue();

export default CatalogEventHub;
