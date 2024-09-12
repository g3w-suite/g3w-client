export function sanitizeFidFeature(fid) {
  if ('string' === typeof fid && Number.isNaN(1*fid))  {
    fid = fid.split('.');
    fid = 2 === fid.length ? fid[1] : fid[0];
  }
  return fid;
}