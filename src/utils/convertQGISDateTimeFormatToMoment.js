/**
 * Covert datetime format from Qgis format to Moment
 * 
 * @param datetimeformat
 * 
 * @returns {*}
 */
export function convertQGISDateTimeFormatToMoment(datetimeformat) {
  datetimeformat = datetimeformat.replace(/y/g, 'Y');
  if (datetimeformat.match(/d/g)?.length < 3) { datetimeformat = datetimeformat.replace(/d/g, 'D'); }
  return datetimeformat;
}