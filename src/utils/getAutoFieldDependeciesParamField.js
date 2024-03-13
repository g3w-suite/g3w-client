import { getCurrentFieldDependance }                     from "utils/getCurrentFieldDependance";
import { createFieldsDependenciesAutocompleteParameter } from 'utils/createFieldsDependenciesAutocompleteParameter'

/**
 * @param field
 * @param inputdependance
 * @param cachedependencies
 *
 * @returns {*}
 */
export function getAutoFieldDependeciesParamField ({ field, inputdependance, cachedependencies }) {
  const fieldDependency = getCurrentFieldDependance({ field, inputdependance, cachedependencies });
  if (fieldDependency) {
    const [field, value] = Object.entries(fieldDependency)[0];
    return createFieldsDependenciesAutocompleteParameter({field, value, inputdependance, cachedependencies})
  }
}