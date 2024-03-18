import { SEARCH_ALLVALUE }            from 'app/constant';
import { createSingleFieldParameter } from 'utils/createSingleFieldParameter';

/**
 * @param { Object } opts
 * @param opts.fields
 * @param opts.field
 * @param opts.value
 * 
 * @returns { string | undefined | * }
 */
export function createFieldsDependenciesAutocompleteParameter({
  fields = [],
  field,
  value,
  filter,
  inputdependance = {},
  cachedependencies = {},
} = {}) {
  // get current field dependance
  let dep = inputdependance[field];
  if (dep && (cachedependencies[dep] && SEARCH_ALLVALUE !== cachedependencies[dep]._currentValue)) {
    dep = { [dep]: cachedependencies[dep]._currentValue }; // dependance as value
  } else if(dep) {
    dep = { [dep]: undefined }; // undefined = so it no add on list o field dependance
  }

  if (undefined !== value) {
    fields.push(createSingleFieldParameter({ field, value, operator: filter.find(f =>  f.attribute === field).op }));
  }
  if (!dep) {
    return fields.length && fields.join() || undefined;
  }
  const [dfield, dvalue] = Object.entries(dep)[0];
  // In case of some input dependency is not filled
  if (undefined !== dvalue) {
    // need to set to lower a case for api purpose
    const { op, logicop } = filter.find(f =>  f.attribute === dfield).op;
    fields.unshift(`${dfield}|${op.toLowerCase()}|${encodeURI(dvalue)}|` + (fields.length ? logicop.toLowerCase() : ''));
  }
  return createFieldsDependenciesAutocompleteParameter({ fields, dfield /* @FIXME field ? */, filter, inputdependance, cachedependencies });
}