const Projection = require('./projection');
const ADDEDPROJECTIONS = ['EPSG:4326', 'EPSG:3857'];

const Projections = {
  get(crs={}) {
    const cachedProjection = ADDEDPROJECTIONS.indexOf(crs.epsg) !== -1 ?  ol.proj.get(crs.epsg) : null;
    if (cachedProjection) return cachedProjection;
    const projection = new Projection({
      crs
    });
    ol.proj.addProjection(projection);
    ADDEDPROJECTIONS.push(crs.epsg);
    return projection;
  },
  /**
   * extent get from https://epsg.io/
   */
  setApplicationProjections() {
    this.get({
      epsg: "EPSG:3003",
      proj4: "+proj=tmerc +lat_0=0 +lon_0=9 +k=0.9996 +x_0=1500000 +y_0=0 +ellps=intl +towgs84=-104.1,-49.1,-9.9,0.971,-2.917,0.714,-11.68 +units=m +no_defs",
      axisinverted: false,
      geographic: false,
      extent: [1290650.93, 4190305.78, 2343702.24, 5261004.57]
    });

    this.get({
      epsg: "EPSG:3004",
      proj4: "+proj=tmerc +lat_0=0 +lon_0=15 +k=0.9996 +x_0=2520000 +y_0=0 +ellps=intl +towgs84=-104.1,-49.1,-9.9,0.971,-2.917,0.714,-11.68 +units=m +no_defs",
      axisinverted: false,
      geographic: false,
      extent: [1782205.39, 4190307.02, 2834974.5, 5250474.42]
    });

    this.get({
      epsg: "EPSG:3045",
      proj4:"+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
      axisinverted: true,
      geographic: false,
      extent: [-2465144.8, 3638055.41, 2885759.28, 9493779.8]
     });

    this.get({
      epsg:"EPSG:6708",
      proj4:"+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
      axisinverted: true,
      geographic: false,
      extent: [-331278.39, 3846440.97, 865258.04, 5256332.65]
    });

    this.get({
      epsg:"EPSG:32632",
      proj4:"+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs",
      axisinverted: false,
      geographic: false,
      extent: [166021.44, 0.0, 833978.56, 9329005.18]
    });

    this.get({
      epsg:"EPSG:32633",
      proj4:"+proj=utm +zone=33 +ellps=WGS84 +datum=WGS84 +units=m +no_defs",
      axisinverted: false,
      geographic: false,
      extent: [166021.44, 0.0, 833978.56, 9329005.18]
    });

    this.get({
      epsg:"EPSG:32634",
      proj4:"+proj=utm +zone=34 +datum=WGS84 +units=m +no_defs",
      axisinverted: false,
      geographic: false,
      extent: [166021.44, 0.0, 833978.56, 9329005.18]
    });

    this.get({
      epsg:"EPSG:25833",
      proj4:"+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs",
      axisinverted: false,
      geographic: false,
      extent: [-2465144.8,3638055.41,2885759.28, 9493779.8]
    });

    this.get({
      epsg:"EPSG:23032",
      proj4:"+proj=utm +zone=32 +ellps=intl +units=m +no_defs",
      axisinverted: false,
      geographic: false,
      extent: [-1206117.77, 3859932.9, 2582411.08, 8051813.3]
    });

    this.get({
      epsg:"EPSG:23033",
      proj4:"+proj=utm +zone=33 +ellps=intl +units=m +no_defs",
      axisinverted: false,
      geographic: false,
      extent: [-1767202.11, 3859945.89, 2023400.16, 8079073.01]
   });
    //REGISTER AT THE END THE CUSTOM PROJECTIONS
    ol.proj.proj4.register(proj4)
  }
};


module.exports = Projections;
