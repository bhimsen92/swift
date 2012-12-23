var swift = require( "./swift" ),
    util = require( "util" );

var data = [ "bhimsen", "sagar", "santosh", "gourav" ];

var patterns = {
    "/index\?\\w+" : {
                    "keys" : [],
                    "callback" : processIndex
                 },
    "/get/(\\d+)/?" : {
                      "keys" : [ "index" ],
                      "callback" : getNameByIndex
                    }
};

swift.run( patterns );

function processIndex(){
    var name = this.name,
        age = this.age;
    var data = "<h1>" + name + "</h1><h1>" + age + "</h1>";
    var html = "<form action='/get/1/' method='post' enctype='multipart/form-data'>";
    html += "<input type='file' name='id' value='' /><br /><input type='submit' name='submit' value='submit' /></form>";
    return {
        data : data + html
    };
}
function getNameByIndex(){
    return { data: util.inspect( this ) };
}
