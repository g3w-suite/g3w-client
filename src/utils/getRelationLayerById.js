import ApplicationState from 'g3w-state';

/**
 * @since 3.11.8
 */
export function getRelationLayerById(relationid) {
  return ApplicationState.project.getLayerById((ApplicationState.project.getRelationById(relationid) || {}).referencedLayer);
}
