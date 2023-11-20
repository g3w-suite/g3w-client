const SCRIPT_URLS = [];
export default {
  load({url, callback}={}){
    if ("undefined" === typeof SCRIPT_URLS.find(loadUrl => url === loadUrl)){
      SCRIPT_URLS.push(url);
      $script(
        url,
        (response) => {
          if ("function" === typeof callback){
            callback(response);
          }
        }
      )
    }
  }
}
