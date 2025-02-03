import ApplicationState       from 'store/application'
import { sanitizeFidFeature } from 'utils/sanitizeFidFeature';

/**
 * ORIGINAL SOURCE: src/services/relations.js@v3.10.2
 */
export function createRelationsUrl({
  layer          = {},
  relation       = {},
  fid,
  type       = 'data', // <editing, data, xls>
  formatter = 1,
  page      , //@since 3.11.2
  page_size,  //@since 3.11.2
}) {
  return `${ApplicationState.project.getLayerById(
    undefined === relation.father
      ? (layer.id === relation.referencedLayer ? relation.referencingLayer : relation.referencedLayer)
      : (layer.id === relation.father          ? relation.child            : relation.father)
  ).getUrl(type)}?relationonetomany=${relation.id}|${sanitizeFidFeature(fid)}&formatter=${formatter}${page ? '&page=' + page: ''}${page_size ? '&page_size=' + page_size: ''}`;
}