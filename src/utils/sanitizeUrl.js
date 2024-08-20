export function sanitizeUrl({
  url,
  reserverParameters = [],
} = {}) {
  const checkUrl = new URL(url);
  reserverParameters.forEach(p => {
    const params = [p.toUpperCase(), p.toLowerCase()];
    for (let i = 0; i < 2; i++) {
      const param = params[i];
      const value = checkUrl.searchParams.get(param);
      if (value) {
        url = url.replace(`${param}=${value}`, '');
        break;
      }
    }
  });
  return url;
}