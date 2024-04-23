export function sanitizeUrl({
  url,
  reserverParameters = [],
} = {}){
  const checkUrl = new URL(url);
  reserverParameters.forEach((param) => {
    let _params = [param.toUpperCase(), param.toLowerCase()];
    for (let i=0; i < 2; i++) {
      const _param = _params[i];
      let _value = checkUrl.searchParams.get(_param);
      if (_value) {
        url = url.replace(`${_param}=${_value}`, '');
        break;
      }
    }
  });
  return url;
};