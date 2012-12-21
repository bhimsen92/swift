var swift = require( "./swift" );

var data = [ "bhimsen", "sagar", "santosh", "gourav" ];

var patterns = {
    "/get/(\\d+)/?" : getNameByIndex
};

swift.run( patterns );

function processIndex(){
    return {
        data : "Welcome to swift framework!!"
    };
}
function getNameByIndex( index ){
    return { "data" : data[ index ] };
}
