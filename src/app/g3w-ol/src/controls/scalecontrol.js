const layout = require('./utils').layout;
const changeLayout = require('./utils').changeLayoutBottomControl;
const t = require('core/i18n/i18n.service').t;
const getResolutionFromScale = require('../utils/utils').getResolutionFromScale;
const getScaleFromResolution = require('../utils/utils').getScaleFromResolution;
const SCALES = [
  1000000,5000000, 250000, 100000, 50000, 25000, 10000, 5000, 2500, 2000, 1000
];

const ScaleControl = function(options= {}) {
  this.isMobile = options.isMobile || false;
  options.target = 'scale-control';
  ol.control.Control.call(this, options);
};

ol.inherits(ScaleControl, ol.control.Control);

module.exports = ScaleControl;

const proto = ScaleControl.prototype;

proto.offline = true;

// called from map when layout change
proto.changelayout = function(map) {
  const position = this.position;
  const element = $(this.element);
};

proto.layout = function(map) {
  const self = this;
  let isMapResolutionChanged = false;
  let selectedOnClick = false;
  const position = this.position;
  const element = $(this.element);
  const select2 = element.children('select').select2({
    tags: true,
    width: '120px',
    height: '20px',
    language: {
      noResults(params) {
        return t("sdk.mapcontrols.scale.no_valid_scale");
      }
    },
    minimumResultsForSearch: this.isMobile ? -1 : 0,
    createTag: function (params) {
      let newTag = null;
      let scale;
      // Don't offset to create a tag if there is no @ symbol
      if (params.term.indexOf('1:') !== -1) {
        // Return null to disable tag creation
        scale = params.term.split('1:')[1];
      } else if (Number.isInteger(Number(params.term)))
        scale = Number(params.term);
      if (1*scale <= self.scales[0]) {
        newTag = {
          id: scale,
          text: `1:${params.term}`,
          new: true
        };
        deleteLastCustomScale()
      }
      return newTag
    }
  });

  function deleteLastCustomScale() {
    select2.find('option').each((index, option) => {
      if (self.scales.indexOf(1*option.value) === -1) {
        $(option).remove()
      }
    });
  }

  function addCustomTag (data) {
    if (select2.find("option[value='" + data.id + "']").length) {
      select2.val(data.id).trigger('change')
    } else {
      deleteLastCustomScale();
      const newOption = new Option(data.text, data.id, true, true);
      select2.append(newOption).trigger('change');
    }
  }

  map.on('moveend', function() {
    if (isMapResolutionChanged) {
      const view = this.getView();
      const resolution = view.getResolution();
      const mapUnits = view.getProjection().getUnits();
      const scale = parseInt(getScaleFromResolution(resolution, mapUnits));
      const data = {
        id: scale,
        text: `1:${scale}`,
        new: true
      };
      addCustomTag(data);
      isMapResolutionChanged = false;
    } else {
      selectedOnClick = false;
    }
  });
  const setChangeResolutionHandler = () =>{
    map.getView().on('change:resolution', () => {
      isMapResolutionChanged = !selectedOnClick;
    });
  };
  setChangeResolutionHandler();

  map.on('change:view', () => {
    setChangeResolutionHandler();
  });

  select2.on('select2:select', function (e) {
    selectedOnClick = true;
    const data = e.params.data;
    if (data.new) {
      deleteLastCustomScale();
      addCustomTag(data);
    }
    const mapUnits = map.getView().getProjection().getUnits();
    const scale = 1*data.id;
    const resolution = getResolutionFromScale(scale, mapUnits);
    map.getView().setResolution(resolution);
  });
};

proto._setScales = function(map) {
  const mapUnits = map.getView().getProjection().getUnits();
  const currentResolution = map.getView().getResolution();
  const currentScale = parseInt(getScaleFromResolution(currentResolution, mapUnits));
  this.scales = SCALES.filter((scale) => {
    return scale < currentScale;
  });
  this.scales.unshift(currentScale);
  this._createControl();
};

proto._createControl = function() {
  const controlDomElement = document.createElement('div');
  const select = document.createElement('select');
  const optgroup  = document.createElement('optgroup');
  optgroup.label = '';
  this.scales.forEach((scale, index) => {
    const option = document.createElement('option');
    option.value = scale;
    option.text = `1:${scale}`;
    option.selected = index === 0  ? true : false;
    optgroup.appendChild(option);
  });
  select.appendChild(optgroup);
  if (!this.isMobile) {
    const optgroup_custom  = document.createElement('optgroup');
    optgroup_custom.label = 'Custom';
    select.appendChild(optgroup_custom);
  }
  controlDomElement.appendChild(select);
  // set element of control (it is necessary to visualize it)
  this.element = controlDomElement;
  $(this.element).css('height', '20px');
};

proto.setMap = function(map) {
  if (map) {
    this._setScales(map);
    this.layout(map);
    ol.control.Control.prototype.setMap.call(this, map);
  }
};





