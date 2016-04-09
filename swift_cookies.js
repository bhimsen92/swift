var Value = require( "./swift_value" );

var swift_cookies = {
    parse: function( req ){
        var cookies,
            rval = {},
            t;
        if( typeof req.headers[ "cookie" ] !== 'undefined' ){
            // cookie exist.
            cookies = req.headers[ "cookie" ].split( ";" );
            for( var i = 0, len = cookies.length; i < len; i++ ){
                pair = cookies[ i ];
                // remove trailing white spaces.
                pair = pair.trim();
                // split on '=';
                pair = pair.split( "=" );
                rval[ pair[ 0 ] ] = new Value( { value: decodeURIComponent( pair[ 1 ] ),
                                                 domain: req.headers[ "host" ] } );
            }
        }
        return rval;
    },
    getCookieString: function( cookies ){
        var rval = [];
        for( key in cookies ){
            if( Object.prototype.hasOwnProperty.call( cookies, key ) ){
                rval.push( cookies[ key ].serialize( key ) );
            }
        }
        if( rval.length == 0 )
            return undefined;
        else if( rval.length == 1 )
            return rval[ 0 ];
        else
            return rval;
    }
};
module.exports = swift_cookies;
