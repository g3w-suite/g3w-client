const Projection = require('./projection');
const ADDEDPROJECTIONS = ['EPSG:4326', 'EPSG:3857'];

const Projections = {
  get: function(crs, proj4def, extent) {
    crs = Projections.normalizeCrs(crs);
    const _proj =  ol.proj.projections ? ol.proj.projections : ol.proj;
    const cachedProjection = ADDEDPROJECTIONS.indexOf(crs) !== -1 ?  _proj.get(crs) : null;
    if (cachedProjection) return cachedProjection;
    const projection = new Projection({
      crs,
      proj4def,
      extent
    });
    _proj.add ? _proj.add(crs, projection) : _proj.addProjection(projection);
    ADDEDPROJECTIONS.push(crs);
    return projection;
  },
  normalizeCrs: function(crs) {
    if (typeof crs === 'number') return "EPSG:"+crs;
    crs = crs.replace(/[^\d\.\-]/g, "");
    if (crs !== '') return "EPSG:"+parseInt(crs);
  },
  setApplicationProjections() {
    Projections.get("EPSG:3045", "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
    Projections.get("EPSG:6708", "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
    Projections.get("EPSG:32632", "+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs");
    Projections.get("EPSG:32633", "+proj=utm +zone=33 +ellps=WGS84 +datum=WGS84 +units=m +no_defs");
    Projections.get("EPSG:25833", "+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs");
    Projections.get("EPSG:23032", "+proj=utm +zone=32 +ellps=intl +units=m +no_defs ");
    Projections.get("EPSG:23033", "+proj=utm +zone=33 +ellps=intl +units=m +no_defs");
  }
};


module.exports = Projections;
