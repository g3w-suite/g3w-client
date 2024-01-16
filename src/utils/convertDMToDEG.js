/**
 * Convert Degree Minutes to Degree
 * 
 * @param { Object } opts 
 * @param { Array | string } opts.dms [0] = degrees, [1] = minutes
 * @param { string } opts.type
 * 
 * @returns { string } deg
 */
export function convertDMToDEG({
  dms,
  type = 'Array',
}) {
  const dms_Array = 'Array' === type ? dms : dms.split(/[^\d\w\.]+/);
  return 1 * (Number(1 * dms_Array[0]) + Number(1 * dms_Array[1])/60).toFixed(6);
}