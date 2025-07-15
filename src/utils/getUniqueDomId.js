let _uid = 0;

export function getUniqueDomId() {
  return `${++_uid}_${Date.now()}`;
}