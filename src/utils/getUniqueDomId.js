let _uid = 0;

export function getUniqueDomId() {
  _uid+=1;
  return `${_uid}_${Date.now()}`;
};