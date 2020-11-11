const Projection = require('./projection');
const ADDEDPROJECTIONS = ['EPSG:4326', 'EPSG:3857'];

const Projections = {
  get: function(crs={},  extent) {
    const cachedProjection = ADDEDPROJECTIONS.indexOf(crs.epsg) !== -1 ?  ol.proj.get(crs.epsg) : null;
    if (cachedProjection) return cachedProjection;
    const projection = new Projection({
      crs,
      extent
    });
    ol.proj.addProjection(projection);
    ADDEDPROJECTIONS.push(crs.epsg);
    return projection;
  },
  setApplicationProjections() {
    this.get({
      epsg: "EPSG:3045",
      proj4:"+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
      axisinverted: true,
      geographic: false,
     });

    this.get({
      epsg:"EPSG:6708",
      proj4:"+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
      axisinverted: true,
      geographic: false
    });

    this.get({
      epsg:"EPSG:32632",
      proj4:"+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs",
      axisinverted: false,
      geographic: false
    });

    this.get({
      epsg:"EPSG:32633",
      proj4:"+proj=utm +zone=33 +ellps=WGS84 +datum=WGS84 +units=m +no_defs",
      axisinverted: false,
      geographic: false
    });

    this.get({
      epsg:"EPSG:25833",
      proj4:"+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs",
      axisinverted: false,
      geographic: false
    });

    this.get({
      epsg:"EPSG:23032",
      proj4:"+proj=utm +zone=32 +ellps=intl +units=m +no_defs",
      axisinverted: false,
      geographic: false,
    });

    this.get({
      epsg:"EPSG:23033",
      proj4:"+proj=utm +zone=33 +ellps=intl +units=m +no_defs",
      axisinverted: false,
      geographic: false
   });
  }
};


module.exports = Projections;
