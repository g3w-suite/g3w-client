import Projection  from './projection';
import proj4 from 'ol/proj/proj4'
import proj from 'ol/proj';
const ADDEDPROJECTIONS = ['EPSG:4326', 'EPSG:3857'];

const Projections = {
  get(crs={},  extent) {
    const cachedProjection = ADDEDPROJECTIONS.indexOf(crs.epsg) !== -1 ?  proj.get(crs.epsg) : null;
    if (cachedProjection) return cachedProjection;
    const projection = new Projection({
      crs,
      extent
    });
    proj.addProjection(projection);
    ADDEDPROJECTIONS.push(crs.epsg);
    return projection;
  },
  setApplicationProjections() {
    this.get({
      epsg: "EPSG:3003",
      proj4: "+proj=tmerc +lat_0=0 +lon_0=9 +k=0.9996 +x_0=1500000 +y_0=0 +ellps=intl +towgs84=-104.1,-49.1,-9.9,0.971,-2.917,0.714,-11.68 +units=m +no_defs",
      axisinverted: false,
      geographic: false,
    });

    this.get({
      epsg: "EPSG:3004",
      proj4: "+proj=tmerc +lat_0=0 +lon_0=15 +k=0.9996 +x_0=2520000 +y_0=0 +ellps=intl +towgs84=-104.1,-49.1,-9.9,0.971,-2.917,0.714,-11.68 +units=m +no_defs",
      axisinverted: false,
      geographic: false,
    });

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
      epsg:"EPSG:32634",
      proj4:"+proj=utm +zone=34 +datum=WGS84 +units=m +no_defs",
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
    //REGISTER AT THE END THE CUSTOM PROJECTIONS
    proj4.register(proj4)
  }
};


export default  Projections;
