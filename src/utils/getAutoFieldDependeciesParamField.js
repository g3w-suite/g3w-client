import { getCurrentFieldDependance } from "utils/getCurrentFieldDependance";
import { createFieldsDependenciesAutocompleteParameter } from 'utils/createFieldsDependenciesAutocompleteParameter'

/**
 * @param field
 *
 * @returns {*}
 */
export function getAutoFieldDependeciesParamField (field) {
  const fieldDependency = getCurrentFieldDependance(field);
  if (fieldDependency) {
    const [field, value] = Object.entries(fieldDependency)[0];
    return this.createFieldsDependenciesAutocompleteParameter({field, value})
  }
};