const utils = {
  merge(obj1, obj2) {
    const obj3 = {
      ...obj1,
      ...obj2,
    };
    return obj3;
  },
};

export default utils;
