/**
 * DEPRECATED: will be removed after v3.4 (use vue's Single File Components instead)
 */
export const createCompiledTemplate = template => {
  const compiledTemplate = Vue.compile(template);
  return compiledTemplate;
};
