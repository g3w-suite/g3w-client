export function reject(value){
  const d = $.Deferred();
  d.reject(value);
  return d.promise();
}