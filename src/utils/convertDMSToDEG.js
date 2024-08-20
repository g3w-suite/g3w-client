/**
 * Convert Degree Minutes Seconds to Degree
 * 
 * @param { Object } opts
 * @param { Array | string } opts.dms [0] = degrees, [1] = minutes, [2] = seconds, [3] = direction
 * @param { string } opts.type
 * 
 * @returns { string } deg
 */
export function convertDMSToDEG({
  dms,
  type = 'Array',
}) {
  const dms_Array = 'Array' === type ? dms : dms.split(/[^\d\w\.]+/);
  return (Number(1 * dms_Array[0]) + Number(1 * dms_Array[1]) / 60 + Number(1 * dms_Array[2]) / 3600).toFixed(6) * (['S', 'W'].includes(dms_Array[3]) ? -1 : 1);
}