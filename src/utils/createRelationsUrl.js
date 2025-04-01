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
  ordering,   //@since 3.11.3
  field,      // @since 4.0.0 search columns purpose 
  method = 'GET' // @since v4.0.0 <GET or POST> In case of post return a pst object with url data etc ..
}) {
  const url = `${ApplicationState.project.getLayerById(
    undefined === relation.father
      ? (layer.id === relation.referencedLayer ? relation.referencingLayer : relation.referencedLayer)
      : (layer.id === relation.father          ? relation.child            : relation.father)
  ).getUrl(type)}?relationonetomany=${relation.id}|${sanitizeFidFeature(fid)}`

  if ('GET' === method) {
    return `${url}&formatter=${formatter}${page ? '&page=' + page: ''}${page_size ? '&page_size=' + page_size: ''} ${ordering ? '&ordering=' + ordering: '', field ? '&field=' + field : ''}`;
  }

  if ('POST' === method) {
    return {
      url,
      data: JSON.stringify({
        page,
        page_size,
        formatter,
        ordering,
        field,
      }),
      contentType: 'application/json',
    }
  }
}