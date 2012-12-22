var swift = require( "./swift" );

var data = [ "bhimsen", "sagar", "santosh", "gourav" ];

var patterns = {
    "/index/?" : {
                    "keys" : [],
                    "callback" : processIndex
                 },
    "/get/(\\d+)/?" : {
                      "keys" : [ "id" ],
                      "callback" : getNameByIndex
                    }
};

swift.run( patterns );

function processIndex(){
    var html = "<form action='/get/1/' method='get'>";
    html += "<input type='text' name='id' value='' /><br /><input type='submit' name='submit' value='submit' /></form>";
    return {
        data : html
    };
}
function getNameByIndex(){
    return { "data" : data[ this.id ] };
}
