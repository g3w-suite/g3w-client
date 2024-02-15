let _uid = 0;

export function getUniqueDomId() {
  return `${_uid+=1}_${Date.now()}`;
};