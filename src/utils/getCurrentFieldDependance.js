import { SEARCH_ALLVALUE } from "app/constant";

/**
 * Check if a field has a dependance
 *
 * @param field
 * @param inputdependance
 * @param cachedependencies
 *
 * @returns { Object }
 */
export function getCurrentFieldDependance ({field, inputdependance = {}, cachedependencies = {} }) {
  const dependance = inputdependance[field];
  return dependance ? ({
    [dependance]:
      (cachedependencies[dependance] && SEARCH_ALLVALUE !== cachedependencies[dependance]._currentValue)
        ? cachedependencies[dependance]._currentValue // dependance as value
        : undefined                                        // undefined = so it no add on list o field dependance
  }) : dependance;
}