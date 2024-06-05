/**
 * @TODO convert it to ES6 class (or external utils)
 * 
 * @file
 * @since 3.9.0
 */

import ApplicationService   from 'services/application';
import GUI                  from 'services/gui';
import { prompt }           from 'utils/prompt';

const { t }                 = require('core/i18n/i18n.service');

/**
 * Selection state 
 */
export const SELECTION = {
  ALL:     '__ALL__',
  EXCLUDE: '__EXCLUDE__'
};

export default {

  /**
   * Check if is selected
   * 
   * @returns {boolean}
   */
  isSelected() {
    return this.state.selected;
  },

  /**
   * Set Selected
   * 
   * @param {boolean} bool
   */
  setSelected(bool) {
    this.state.selected = bool;
  },

  /**
   * Set Selection
   * 
   * @param bool
   * 
   * @returns {Promise<void>}
   * 
   * @fires unselectionall
   */
  async setSelection(bool=false) {
    this.state.selection.active = bool;

    // skip when selection is active
    if (bool) { return }

    //check if filter is active
    const is_active   = this.state.filter.active;
    const has_current = null !== this.state.filter.current;

    /** @TODO add description */
    if (has_current && is_active) {
      await this._applyFilterToken(this.state.filter.current)
    }

    /** @TODO add description */
    if (!has_current && is_active) {
      await this.deleteFilterToken();
    }

    this.emit('unselectionall', this.getId());
  },

  /**
   * @returns {boolean} whether selection si active
   */
  isSelectionActive() {
    return this.state.selection.active;
  },

  /**
   * Get selection
   * 
   * @returns {{ active: boolean }}
   */
  getSelection() {
    return this.state.selection;
  },

  /**
   * @returns filter
   */
  getFilter() {
    return this.state.filter;
  },

  /**
   * Set filter Active to layer
   * 
   * @param {boolean} bool
   */
  setFilter(bool = false) {
    this.state.filter.active = bool;
    if (this.isGeoLayer() && this.state.filter.active) {
      this.hideOlSelectionFeatures();
    }

    if (this.isGeoLayer() && !this.state.filter.active) {
      this.updateMapOlSelectionFeatures();
    }

  },

  /**
   * get current filter
   */
  getCurrentFilter() {
    return this.state.filter.current;
  },

  /**
   * @TODO Add description
   * 
   * @returns {boolean}
   */
  getFilterActive() {
    return this.state.filter.active;
  },

  /**
   * @returns { Array } saved filters
   */
  getFilters() {
    return this.state.filters;
  },

  /**
   * Add new filter
   * 
   * @param filter Object filter
   */
  addFilter(filter = {}) {
    this.state.filters.push(filter);
  },

  /**
   * Remove saved filter from filters Array
   * 
   * @param fid unique filter id
   */
  removefilter(fid) {
    this.state.filters = this.state.filters.filter(f => fid === f.fid);
  },

  /**
   * Set Current filter
   * 
   * @param {{ fid, name }} filter 
   */
  setCurrentFilter(filter) {
    this.state.filter.current = filter;
  },

  /**
   * Apply layer filter by fid
   * 
   * @param filter
   */
  async applyFilter(filter) {
    if (!this.providers['filtertoken']) {
      return;
    }

    // the current filter is set and is different from current
    if (null === this.state.filter.current || filter.fid !== this.state.filter.current.fid ) {
      await this.clearSelectionFids();
      GUI.closeContent();
    }

    await this._applyFilterToken(filter);
  },

  /**
   * @returns {Promise<void>}
   * 
   * @private
   */
  async _applyFilterToken(filter) {
    const { filtertoken } = await this.providers['filtertoken'].applyFilterToken(filter.fid);
    if (filtertoken) {
      this.setFilter(false);
      this.setCurrentFilter(filter);
      this.setFilterToken(filtertoken);
    }
  },

  /**
   * @since 3.9.0
   */
  saveFilter() {

    // skip when ..
    if (!this.providers['filtertoken'] || !this.selectionFids.size > 0) {
      return;
    }

    const layer = this;

    prompt({
      label: t('layer_selection_filter.tools.savefilter'),
      value: layer.getCurrentFilter() ? layer.getCurrentFilter().name : '' ,
      callback: async(name) => {
        const data = await layer.providers['filtertoken'].saveFilterToken(name);

        // skip when no data return from provider
        if (!data) {
          return;
        }
      
        let filter = layer.state.filters.find(f => f.fid === data.fid);
      
        // add saved filter to filters array
        if (undefined === filter) {
          filter = {
            fid: data.fid, //get fid
            name: data.name //get name
          }
          layer.state.filters.push(filter);
        }

        layer.setCurrentFilter(filter);      // set current filter
        layer.setFilter(false);              // set to false
        layer.getSelection().active = false; // reset selection to false
        layer.selectionFids.clear();         // clear current fids
      
        //in case of geolayer
        if (layer.isGeoLayer()) {
          //remove selection feature from map
          layer.setOlSelectionFeatures();
        }
      
        //emit unselectionall
        layer.emit('unselectionall', layer.getId());
      
      },
    });

  },

  /**
   * Method to set unset filter token on layer
   */
  async toggleFilterToken() {

    //set to handle select or hide ol
    this.setFilter(!this.state.filter.active);

    const has_current = this.state.filter.current;
    const is_active   = this.state.filter.active;

    // there is an active filter --> create a new filter
    if (is_active) {
      await this.createFilterToken();
    }

    // there is a current saved filter --> apply filter
    if (has_current && !is_active) {
      await this.applyFilter(this.state.filter.current);
    }

    // there is no current saved filter --> delete it
    if (!has_current && !is_active) {
      await this.deleteFilterToken();
    }

    return this.state.filter.active;
  },

  /**
   * Delete filtertoken from server
   * 
   * @param fid  unique id of filter saved to delete
   */
  async deleteFilterToken(fid) {
    try {
      // skip when no filtertoken provider is set
      if (!this.providers['filtertoken']) {
        return;
      }

      // delete filtertoken related to layer provider
      const filtertoken = await this.providers['filtertoken'].deleteFilterToken(fid);

      // remove it from filters list when deleting a saved filter (since v3.9.0)
      if (undefined !== fid) {
        this.state.filters = this.state.filters.filter(f => fid !== f.fid);
      }

      this.setCurrentFilter(null);      // set current filter set to null
      // set active filter to false
      if (this.state.filter.active) { this.setFilter(false) }
      this.setFilterToken(filtertoken); // pass `filtertoken` to application

    } catch(err) {
      console.log('Error deleteing filtertoken', err);
    }
  },

  /**
   * Set applicaton filter token
   * 
   * @param filtertoken
   *
   * @fires filtertokenchange when filtertoken is changed
   * 
   * @since 3.9.0
   */
  setFilterToken(filtertoken = null) {
    ApplicationService.setFilterToken(filtertoken);
    this.emit('filtertokenchange', { layerId: this.getId() });
  },

  /**
   * Create filter token
   */
  async createFilterToken() {
    try {

      const provider  = this.providers['filtertoken'];
      const selection = this.selectionFids;

      // skip when no filter token provider is set or selectionFids is empty
      if (!provider || !selection.size > 0) {
        return;
      }

      // select all features
      if (selection.has(SELECTION.ALL)) {
        await provider.deleteFilterToken();
        this.setFilterToken(null);

        return;
      }

      const fids = Array.from(selection);

      // exclude some features from selection
      if (selection.has(SELECTION.EXCLUDE)) {
        this.setFilterToken( await provider.getFilterToken({ fidsout: fids.filter(id => id !== SELECTION.EXCLUDE).join(',') }) );
        return;
      }
      // include some features in selection
      this.setFilterToken( await provider.getFilterToken({ fidsin: fids.join(',') }) );

    } catch(err) {
      console.log('Error create update token', err);
    }
  },

  /**
   * Get Application filter token
   * 
   * @returns {*}
   */
  getFilterToken() {
    return ApplicationService.getFilterToken();
  },

  /**
   * @TODO add description
   */
  setSelectionFidsAll() {
    this.selectionFids.clear();
    this.selectionFids.add(SELECTION.ALL);

    /** @TODO add description */
    if (this.isGeoLayer()) {
      //set all features selected
      Object.values(this.olSelectionFeatures).forEach(feat => feat.selected = true);
      this.updateMapOlSelectionFeatures();
    }

    /** @TODO add description */
    this.setSelection(true);
    if (this.state.filter.active) {
      this.createFilterToken();
    }
  },

  /**
   * @returns {Set<any>} stored selection `fids` 
   */
  getSelectionFids() {
    return this.selectionFids;
  },

  /**
   * Invert current selection fids
   */
  invertSelectionFids() {
    const selection = this.selectionFids;

    /** @TODO add description */
    if (selection.has(SELECTION.EXCLUDE))  { selection.delete(SELECTION.EXCLUDE); }
    else if (selection.has(SELECTION.ALL)) { selection.delete(SELECTION.ALL); }
    else if (selection.size > 0)           { selection.add(SELECTION.EXCLUDE); }

    /** @TODO add description */
    if (this.isGeoLayer()) {
      this.setInversionOlSelectionFeatures();
    }

    /** In the case of tocken filter active create */
    if (this.state.filter.active) { this.createFilterToken() }

    this.setSelection(selection.size > 0);
  },


  /**
   * Check if feature id is present
   * 
   * @param fid feature id
   * 
   * @returns {boolean}
   */
  hasSelectionFid(fid) {
    const selection = this.selectionFids;

    /** In case contain selection ALL, mean all features selected */
    if (selection.has(SELECTION.ALL)) { return true }

    /**In case selection contains exclude value, check if id is not in excluded feature id */
    if (selection.has(SELECTION.EXCLUDE)) { return !selection.has(fid) }

    /** Check if id is on selection set */
    return selection.has(fid);
  },


  /**
   * Include fid feature id to selection
   * 
   * @param fid
   * @param createToken
   * 
   * @returns {Promise<void>}
   */
  async includeSelectionFid(fid, createToken = true) {

    const selection = this.selectionFids;

    // whether fid is excluded from selection
    const is_excluded = selection.has(SELECTION.EXCLUDE) && selection.has(fid);

    // remove fid from exclude
    if (is_excluded) { selection.delete(fid) }

    // add to selection fid
    if (!is_excluded) { selection.add(fid) }

    // if the only one exclude Set all selected
    if (is_excluded && 1 === selection.size) { this.setSelectionFidsAll() }

    /** @TODO add description */
    if (!is_excluded && !this.isSelectionActive()) { this.setSelection(true) }
    
    /** @TODO add description */
    if (this.isGeoLayer()) {
      this.setOlSelectionFeatureByFid(fid, is_excluded ? 'remove' : 'add');
    }
    
    /** @TODO add description */
    if (createToken && this.state.filter.active) {
      await this.createFilterToken();
    }

  },

  /**
   * Exclude fid to selection
   * 
   * @param fid
   * @param createToken
   * 
   * @returns {Promise<void>}
   */
  async excludeSelectionFid(fid, createToken = true) {

    const selection = this.selectionFids;

    /**In case all features are selected or no features are selected */
    if (selection.has(SELECTION.ALL) || 0 === selection.size) {
      //set an empty selection set
      selection.clear();
      //add exclude item
      selection.add(SELECTION.EXCLUDE);
    }


    /** If has exclude item, mean add fid to exclude */
    if (selection.has(SELECTION.EXCLUDE)) {
      //add to exclude
      selection.add(fid);
    } else {
      //remote to exclude
      selection.delete(fid);
    }

    /** If no selection */
    if (0 === selection.size) { this.clearSelectionFids() }

    /** If contain only exclude fid */
    if (1 === selection.size && selection.has(SELECTION.EXCLUDE)) {
      //celar selection set
      selection.clear();
      this.setselectionFidsAll();
    }


    if (this.isGeoLayer()) {
      // whether fid is excluded from selection
      const is_excluded = selection.has(SELECTION.EXCLUDE) ? selection.has(fid) : !selection.has(fid);
      this.setOlSelectionFeatureByFid(fid, is_excluded  ? 'remove' : 'add');
    }

    /** If there is a filterActive */
    if (createToken && this.state.filter.active) {
      await this.createFilterToken();
    }

  },

  /**
   * @param { Array }   fids
   * @param { boolean } createToken since 3.9.0
   * 
   * @returns { Promise<void> }
   */
  async includeSelectionFids(fids = [], createToken = true) {
    // pass false because eventually token filter creation needs to be called after
    fids.forEach(fid => this.includeSelectionFid(fid, false));

    /** @TODO add description */
    if (createToken && this.state.filter.active) {
      await this.createFilterToken();
    }
  },

  /**
   * Exclude fids from selection
   * 
   * @param { Array }   fids
   * @param { boolean } createToken since 3.9.0
   * 
   * @returns { Promise<void> }
   */
  async excludeSelectionFids(fids = [], createToken = true) {
    //pass false because eventually token filter creation need to be called after
    fids.forEach(fid => this.excludeSelectionFid(fid, false));

    /** @TODO add description */
    if (createToken && this.state.filter.active) {
      await this.createFilterToken();
    }
  },

  /**
   * Clear selection
   */
  async clearSelectionFids() {
    this.selectionFids.clear();
    // remove selected feature on a map
    if (this.isGeoLayer()) {
      //set all features unselected
      Object.values(this.olSelectionFeatures).forEach(feat => feat.selected = false);
      this.updateMapOlSelectionFeatures();
    }
    // set selection false
    await this.setSelection(false);
  },

};