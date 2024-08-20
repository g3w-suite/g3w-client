export function resolve(value){
  const d = $.Deferred();
  d.resolve(value);
  return d.promise();
}