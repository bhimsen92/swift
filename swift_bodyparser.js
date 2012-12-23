var util = require( "util" );

var swift_bodyparser = {
    _buffer : new Buffer( 512 ),    
    getBoundary: function( req ){
        var boundary = req.headers[ "content-type" ].split( ";" );
        if( typeof boundary[ 1 ] !== 'undefined' ){
            // split on '=', then return element at index 1 as it contains the boundary text.
            boundary = boundary[ 1 ].split( "=" )[ 1 ];
        }
        else
            boundary = '';
            
        return boundary;
    },
    parse: function( req, data ){
        var boundary = this.getBoundary( req ),
            bytes = new Buffer( 1024 * 4 ),
            count = 0,
            l,
            headers = {};
            
        // if boudary exists.
        if( boundary !== '' ){
            // read until new line is seen.
            l = this.getLine( data, count );
            while( l.line.trim() !== '' ){
                // parsing headers and boundary.
                // if it is not boundary, then it is a header, parse it.
                if( l.line[ 0 ] !== '-' ){
                    this.processHeader( l.line, headers );
                }
                l = this.getLine( data, l.nextByte );
            }
            // read the body, right now only 4K data can be read.
            for( var i = l.nextByte, len = data.length; i < len; i++ ){
                if( data[ i ] == '\r' && data[ i + 1 ] == '\n' ){
                    console.log( bytes.slice( 0, count ).toString( 'utf-8' ) );
                    count = 0;
                    break;
                }
                else{
                    bytes.write( data[ i ], count );
                    count++;
                }
            }
            console.log( "Body read!!" );
            //console.log( util.inspect( headers ) );
        }
    },
    getLine: function( data, pos ){
        var count = 0;
        for( var i = pos, len = data.length; i < len; i++ ){
            if( data[ i ] == '\r' && data[ i + 1 ] == '\n' ){
                return {
                    line : this._buffer.slice( 0, count ).toString( 'utf-8' ),
                    nextByte: i + 2
                };
            }
            else{
                this._buffer.write( data[ i ], count );
                count++;
            }
        }
        // always fails.
        return {
            line : '',
            nextByte : data.length + 1
        }
    },
    processHeader: function( line, headers ){
        var key = '',
            vals = [],
            t = {},
            p;
        // split on  ':'
        line = line.split( ":" );
        // get the main key.
        key = line[ 0 ];
        // split on ';' and extract key, value pairs if present.
        vals = line[ 1 ].split( ";" );
        if( vals.length == 1 ){
            // first element itself is the value.
            t = vals[ 0 ].trim();
        }
        else{
            // it has key,value pairs, parse it and put it inside a subobject.
            for( var j = 0, len = vals.length; j < len; j++ ){
                p = vals[ j ].trim().split( "=" );
                // if value does not exists, then it will be set as undefined.
                if( typeof p[ 1 ] !== 'undefined' ){
                    if( p[ 1 ][ 0 ] == '"' )
                        p[ 1 ] = p[ 1 ].replace( /\"/g, '' );
                    else if( p[ 1 ][ 0 ] == "'" )
                        p[ 1 ] = p[ 1 ].replace( /\'/g, '' );
                }
                t[ p[ 0 ] ] = p[ 1 ];
            }
        }
        headers[ key ] = t;
    }
};
module.exports = swift_bodyparser;
