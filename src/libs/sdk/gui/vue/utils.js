export const createCompiledTemplate = template => {
  const compiledTemplate = Vue.compile(template);
  return compiledTemplate;
};
