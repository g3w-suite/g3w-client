/**
 * @file
 * @since v3.7
 */

class navbaritemsService {

  constructor() {
    this.state = {
      items: {
        left: [],
        right:[]
      }
    };
  }

  addItem(item, position = 'right') {
    this.state.items[position].push(item);
  }

}

export default new navbaritemsService();