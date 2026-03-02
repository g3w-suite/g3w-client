import ApplicationState       from 'g3w-state'
import { sanitizeFidFeature } from 'utils/sanitizeFidFeature';

/**
 * ORIGINAL SOURCE: src/services/relations.js@v3.10.2
 */
export function createRelationsUrl({
  layerId,
  relation = {},
  fid,
  type     = 'data', // <editing, data, xls>
}) {
  return `${ApplicationState.project.getLayerById(
      undefined === relation.father
        ? (layerId === relation.referencedLayer ? relation.referencingLayer : relation.referencedLayer)
        : (layerId === relation.father          ? relation.child            : relation.father)
    ).getUrl(type)}?relationonetomany=${relation.id}|${sanitizeFidFeature(fid)}`;
}