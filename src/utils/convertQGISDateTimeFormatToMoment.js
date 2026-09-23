/**
 * Covert datetime format from Qgis format to Moment
 * 
 * @param datetimeformat
 * 
 * @returns {*}
 */
export function convertQGISDateTimeFormatToMoment(datetimeformat) {
  return datetimeformat
    .replace(/y/g, 'Y')
    .replace(/\bd{1,2}\b/g, match => match.toUpperCase());
}