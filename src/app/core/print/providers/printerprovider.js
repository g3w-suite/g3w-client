import G3WObject from 'core/g3wobject';

class PrinterProvider extends G3WObject {
  // constructor() {
  //   super();
  // }

  print() {
    console.log('overwrite');
  }

  getPrintUrl() {
    console.log('overwrite');
  }
}

export default PrinterProvider;
