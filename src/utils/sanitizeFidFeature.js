export function sanitizeFidFeature(fid) {
  if ('string' === typeof fid && Number.isNaN(1*fid))  {
    fid = fid.split('.');
    fid = fid.at(2 === fid.length ? 1 : 0);
  }
  return fid;
}