/**
 * Get Media Type from mime_type value
 *
 * ORIGINAL SOURCE: src/mixins/media.js@3.8
 *
 * @param mime_type
 *
 * @returns { string }
 *
 * @since 3.10.0
 */
export function getMediaFieldType(mime_type) {
  let media = {
    type: null,
    options: {}
  };

  switch(mime_type) {

    case 'image/gif':
    case 'image/png':
    case 'image/jpeg':
    case 'image/bmp':
      media.type = 'image';
      break;

    case 'application/pdf':
      media.type = 'pdf';
      break;

    case 'video/mp4':
    case 'video/ogg':
    case 'video/x-ms-wmv':
    case 'video/x-msvideo':
    case 'video/quicktime':
      media.type = 'video';
      media.options.format = mime_type;
      break;

    case 'application/gzip':
    case 'application/zip':
      media.type = 'zip';
      break;

    case 'application/msword':
    case 'application/vnd.oasis.opendocument.text':
      media.type = 'text';
      break;

    case 'application/vnd.ms-office':
    case 'application/vnd.oasis.opendocument.spreadsheet':
      media.type = 'excel';
      break;

    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    case 'application/vnd.ms-powerpoint':
    case 'application/vnd.oasis.opendocument.presentation':
      media.type = 'ppt';
      break;

    default:
      media.type = 'unknow';
  }

  return media;
};