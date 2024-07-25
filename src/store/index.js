/**
 * @file
 * @since v3.6
 */

import CatalogLayersStoresRegistry from './catalog-layers';
import ComponentsRegistry          from './components';
import PluginsRegistry             from './plugins';
import ProjectsRegistry            from './projects';

/**
 * @FIXME importing directly from this file breaks application
 * (maybe related to: https://github.com/Raruto/g3w-client/commit/c83d99934d00ea5c6047c215c6eba54fd2d5aefa)
 */
export {
  CatalogLayersStoresRegistry,
  ComponentsRegistry,
  PluginsRegistry,
  ProjectsRegistry,
};