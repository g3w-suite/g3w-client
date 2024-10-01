import ApplicationState from 'store/application';

/**
 * @param name
 *
 * @returns Plugin instance
 */
export function getPlugin(name) {
  return ApplicationState._plugins[name];
}