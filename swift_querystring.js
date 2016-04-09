var Context = require( "./swift_context" );
swift_querystring = {
    parse: function( url ){
        /* querystring is everything after ? in url.
           e.g: www.example.com/index.php?q=hello+world&age=10
           ==> querystring = q=hello+world&age=10
        */
        //  extract querystring from the url.
        var querystring = url.substring( url.lastIndexOf( "?" ) + 1 ),
            rval = new Context(),
            p;
        // replace all '+' symbols by space because the uri is encoded by the browser.
        querystring = querystring.replace( /\+/g, ' ' );
        // split on '&'
        querystring = querystring.split( "&" );
        for( var i = 0, len = querystring.length; i < len; i++ ){
            p = querystring[ i ].split( "=" );
            rval[ p[ 0 ] ] = decodeURIComponent( p[ 1 ] );
        }
        return rval;
    }
}
module.exports = swift_querystring;
