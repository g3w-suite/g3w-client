/**
 * TODO: remove "Geometry" sub-property (ie. find out how to merge the following functions)
 * 
 * - core/geometry/geometry::isMultiGeometry@v3.4
 * - core/utils/geo::isMultiGeometry@v3.4
 */
const { Geometry } = require('core/utils/geo');

/**
 * DEPRECATED: this folder will be removed after v3.4 (use "core/utils/geo" instead)
 */
module.exports = Geometry;