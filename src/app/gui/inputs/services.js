import service from './service';
import integerservice from './integer/service';
import floatservice from './float/service';
import radioservice from './radio/service';
import checkservice from './checkbox/service';
import rangeservice from './range/service';
import datetimepickerservice from './datetimepicker/service';
import uniqueservice from './unique/service';
import mediaservice from './media/service';
import selectservice from './select/service';
import sliderservice from './sliderrange/service';
import lonlatservice from './lonlat/service';

const InputsServices = {
  text: service,
  textarea: service,
  integer: integerservice,
  string: service,
  float: floatservice,
  radio: radioservice,
  check: checkservice,
  range: rangeservice,
  datetimepicker: datetimepickerservice,
  unique: uniqueservice,
  select: selectservice,
  media: mediaservice,
  select_autocomplete: selectservice,
  picklayer: service,
  color: service,
  slider: sliderservice,
  lonlat: lonlatservice,
};

export default InputsServices;
