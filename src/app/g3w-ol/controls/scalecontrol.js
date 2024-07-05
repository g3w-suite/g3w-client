import { PRINT_SCALES }           from 'app/constant';
import { getResolutionFromScale } from 'utils/getResolutionFromScale';
import { getScaleFromResolution } from 'utils/getScaleFromResolution';

const { t } = require('core/i18n/i18n.service');

class ScaleControl extends ol.control.Control {

  constructor(options= {}) {
    options.target = 'scale-control';
    super(options);
    this.isMobile = options.isMobile || false;
  }

  layout(map) {
    const self = this;
    let isMapResolutionChanged = false;
    let selectedOnClick = false;
    const select2 = $(this.element).children('select').select2({
      tags:                    true,
      dropdownParent:          $(map.getTargetElement()),
      width:                   '120px',
      height:                  '20px',
      language:                { noResults: () => t("sdk.mapcontrols.scale.no_valid_scale") },
      minimumResultsForSearch: this.isMobile ? -1 : 0,
      createTag(params) {
        let newTag = null;
        let scale;
        // Don't offset to create a tag if there is no @ symbol
        if (-1 !== params.term.indexOf('1:')) {
          // Return null to disable tag creation
          scale = params.term.split('1:')[1];
        } else if (Number.isInteger(Number(params.term)) && Number(params.term) > 0) {
          scale = Number(params.term);
          if (1*scale <= self.scales[0]) {
            newTag = {
              id: scale,
              text: `1:${params.term}`,
              new: true
            };
            deleteLastCustomScale()
          }
        }
        return newTag
      }
    });
    //get change mapsize to close
    map.on('change:size', () => select2.select2('close'));

    function deleteLastCustomScale() {
      select2.find('option').each((index, option) => self.scales.indexOf(1*option.value) === -1 && $(option).remove());
    }

    function addCustomTag (data) {
      if (select2.find("option[value='" + data.id + "']").length) select2.val(data.id).trigger('change');
      else {
        deleteLastCustomScale();
        select2.append(new Option(data.text, data.id, true, true)).trigger('change');
      }
    }

    map.on('moveend', function() {
      if (isMapResolutionChanged) {
        const scale = parseInt(getScaleFromResolution(this.getView().getResolution(), this.getView().getProjection().getUnits()));
        addCustomTag({
          id: scale,
          text: `1:${scale}`,
          new: true
        });
        isMapResolutionChanged = false;
      } else selectedOnClick = false;
    });

    const setChangeResolutionHandler = () => {
      map.getView().on('change:resolution', () => isMapResolutionChanged = !selectedOnClick);
    };

    setChangeResolutionHandler();

    map.on('change:view', () => setChangeResolutionHandler());

    select2.on('select2:select', function(e) {
      selectedOnClick = true;
      const data = e.params.data;
      if (data.new) {
        deleteLastCustomScale();
        addCustomTag(data);
      }
      map.getView().setResolution(getResolutionFromScale(1 * data.id, map.getView().getProjection().getUnits()));
    });
  }

  setMap(map) {
    if (!map) {
      return;
    }

    // set scales
    const currentScale = parseInt(getScaleFromResolution(map.getView().getResolution(), map.getView().getProjection().getUnits()));
    this.scales = PRINT_SCALES.map(scale => scale.value).filter(scale => scale < currentScale);
    this.scales.unshift(currentScale);

    // create control
    const div      = document.createElement('div');
    const select   = document.createElement('select');
    const optgroup = Object.assign(document.createElement('optgroup'), { label: '' });

    this.scales.forEach((scale, index) => {
      optgroup.appendChild(Object.assign(
        document.createElement('option'),
        {
          value: scale,
          text: `1:${scale}`,
          selected: index === 0  ? true : false,
        }
      ));
    });

    select.appendChild(optgroup);

    if (!this.isMobile) {
      const optgroup_custom  = document.createElement('optgroup');
      optgroup_custom.label = 'Custom';
      select.appendChild(optgroup_custom);
    }

    div.appendChild(select);

    // set element of control (it is necessary to visualize it)
    this.element = div;
    $(this.element).css('height', '20px');

    this.layout(map);
    ol.control.Control.prototype.setMap.call(this, map);
  }

}

ScaleControl.prototype.offline = true;

module.exports = ScaleControl;