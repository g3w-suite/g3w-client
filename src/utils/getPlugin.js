import ApplicationState from 'g3w-state';

/**
 * @param name
 *
 * @returns Plugin instance
 */
export function getPlugin(name) {
  return ApplicationState._plugins[name];
}