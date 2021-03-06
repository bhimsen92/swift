var util = require( "util" );

var data = [ "bhimsen", "sagar", "santosh", "gourav" ];
function processIndex(){
    var name = this.name,
        age = this.age;
    var data = "<h1>" + name + "</h1><h1>" + age + "</h1>";
    var html = "<form action='/get/1/' method='post' enctype='multipart/form-data'>";
    html += "<input type='file' name='second' value='' /><br /><input type='submit' name='submit' value='submit' /></form>";
    this.send( data + html );
}
function getNameByIndex(){
    if( typeof this.sessions[ "count" ] === 'undefined' )
        this.sessions[ "count" ] = 0;
    this.sessions[ "count" ]++;
    this.send( util.inspect( this ) );
}

var config = {
    host: "localhost",
    user: "root",
    password: "bhimsen98",
    database: "test_swift",
    patterns: {
              "/index\?\\w+" : {
                                    "keys" : [],
                                    "callback" : processIndex
                               },
              "/get/(\\d+)/?" : {
                                    "keys" : [ "index" ],
                                    "callback" : getNameByIndex
                                }
             },
};
module.exports = config;
