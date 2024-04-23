export function splitContextAndMethod(string='') {
  const [context, method] = string.split(':');
  return {
    context,
    method
  }
};