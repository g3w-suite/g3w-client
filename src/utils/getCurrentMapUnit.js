import ApplicationState from 'store/application-state';

/**
 * @FIXME utility functions should be stateles (move it elsewhere)
 */
export function getCurrentMapUnit() {
 return ApplicationState.map.unit;
}