/**
 * Check if a field has a dependance
 *
 * @param field
 *
 * @returns { Object }
 */
export function getCurrentFieldDependance (field) {
  const dependance = this.inputdependance[field];
  return dependance ? ({
    [dependance]:
      (this.cachedependencies[dependance] && ALLVALUE !== this.cachedependencies[dependance]._currentValue)
        ? this.cachedependencies[dependance]._currentValue // dependance as value
        : undefined                                        // undefined = so it no add on list o field dependance
  }) : dependance;
};