/**
 * @file
 * @since v3.7
 */
const { base, inherit } = require('utils');
const G3WObject = require('core/g3wobject');

// service sidebar
function navbaritemsService() {
  this.state = {
    items: {
      left:[],
      right:[]
    }
  };
  this.addItem = function(item, position='right') {
    this.state.items[position].push(item);
  };

  base(this)
}

inherit(navbaritemsService, G3WObject);

export default new navbaritemsService();