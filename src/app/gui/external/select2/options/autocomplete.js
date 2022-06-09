import { t }  from 'core/i18n/i18n.service';

export default  {
  matcher: (params, data) => {
    const searchItem = params.term ? params.term.toLowerCase(): params.term;
    // If there are no search terms, return all of the data
    if ($.trim(searchItem) === '') return data;
    // Do not display the item if there is no 'text' property
    if (typeof data.text === 'undefined') return null;
    // `params.term` should be the term that is used for searching
    // `data.text` is the text that is displayed for the data object
    if (data.text.toLowerCase().indexOf(searchItem) > -1) {
      const modifiedData = $.extend({}, data, true);
      // You can return modified objects from here
      // This includes matching the `children` how you want in nested data sets
      return modifiedData;
    }
    // Return `null` if the term should not be displayed
    return null;
  },
  language: {
    noResults(){
      return t("sdk.search.no_results");
    },
    errorLoading(){
      return t("sdk.search.error_loading")
    },
    searching(){
      return t("sdk.search.searching")
    },
    inputTooShort(args) {
      const remainingChars = args.minimum - args.input.length;
      return `${t("sdk.search.autocomplete.inputshort.pre")} ${remainingChars} ${t("sdk.search.autocomplete.inputshort.post")}`;
    }
  },
};