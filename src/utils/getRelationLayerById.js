import ApplicationState from 'store/application';

/**
 * @since 3.11.8
 */
export function getRelationLayerById(relationid) {
  return ApplicationState.project.getLayerById((ApplicationState.project.getRelationById(relationid) || {}).referencedLayer);
}
