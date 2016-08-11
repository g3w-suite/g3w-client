var OGC_PIXEL_WIDTH = 0.28;
var OGC_DPI = 25.4/OGC_PIXEL_WIDTH;

module.exports = {
  resToScale: function(res, metric) {
    var metric = metric || 'm';
    var scale;
    switch (metric) {
      case 'm':
        var scale = (res*1000) / OGC_PIXEL_WIDTH;
        break
    }
    return scale;
  }
};
