/**
 * @file
 * @since v3.7
 */
const G3WObject         = require('core/g3wobject');

// service sidebar

export default new (class NavbaritemsService extends G3WObject {
  constructor(opts = {}) {
    super(opts);
    this.state = {
      items: {
        left:  [],
        right: []
      }
    };
  }
  addItem(item, position = 'right') {
    this.state.items[position].push(item);
  };
});