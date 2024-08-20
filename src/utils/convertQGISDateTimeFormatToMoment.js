/**
 * Covert datetime format from Qgis format to Moment
 * 
 * @param datetimeformat
 * 
 * @returns {*}
 */
export function convertQGISDateTimeFormatToMoment(datetimeformat) {
  datetimeformat = datetimeformat.replace(/y/g, 'Y');
  const matchDayInDate = datetimeformat.match(/d/g);
  if (matchDayInDate && matchDayInDate.length < 3) { datetimeformat = datetimeformat.replace(/d/g, 'D') }
  return datetimeformat
}