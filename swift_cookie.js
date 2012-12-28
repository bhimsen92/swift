var Value = require( "./swift_value" );

var swift_cookies = {
    parse: function( req ){
        var cookies,
            rval = {},
            t;
        if( typeof req.headers[ "Cookie" ] !== 'undefined' ){
            // cookie exist.
            cookies = req.headers[ "Cookie" ].split( ";" );
            for( pair in cookies ){
                // remove trailing white spaces.
                pair = pair.trim();
                // split on '=';
                pair = pair.split( "=" );
                rval[ pair[ 0 ] ] = new Value( { value: decodeURIComponent( pair[ 1 ] ) } );
            }
        }
        return rval;
    },
    getCookieString: function( cookies ){
        return '';
    }
};
module.exports = swift_cookies;
