var util = require( "util" ),
    swift_tmp = require( "./swift_tmp" ),
    path = require( "path" ),
    fs = require( "fs" );

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
            bytes, //= new Buffer( 1024 * 1024 * 4 ),
            count = 0,
            forward = 0,
            l,bytesWritten,
            headers = {},
            context = {}, type;
            
        // if boudary exists.
        if( boundary !== '' ){
            while( forward < data.length ){
                // read the top headers.
                l = this.processTop( data, forward, headers );
                forward = l.nextByte;
                // read the body, right now only 4K data can be read.
                // this if,else block is added to prevent error which was occuring during image upload.
                type = headers[ "Content-Type" ];
                if( typeof type !== 'undefined' ){
                    if( type.indexOf( "image/" ) == -1 ){
                        bytes = new Buffer( 1024 * 1024 * 4 );
                        type = "utf-8";
                    }
                    else{
                        bytes = new Buffer( 1024 * 1024 * 4, 'base64' );
                        type = "base64";
                    }
                }
                for( var i = l.nextByte, len = data.length; i < len; i++ ){
                    if( data[ i ] == '\r' && data[ i + 1 ] == '\n' ){
                        // point pass the '\r\n' bytes.
                        forward += ( count + 2 );
                        break;
                    }
                    else{
                        bytes.write( data[ i ], count, Buffer.byteLength( data[ i ] ), type );
                        count++;
                    }
                }
                // populate context.
                if( typeof headers[ "Content-Type" ] !== 'undefined' ){
                    context[ headers[ "Content-Disposition" ][ "name" ] ] = headers[ "Content-Disposition" ][ "filename" ];
                    context[ "type" ] = headers[ "Content-Type" ];
                    // write data to file.
                    var tmp = swift_tmp.mktmp( path.extname( headers[ "Content-Disposition" ][ "filename" ] ) );
                    context[ "path" ] = tmp.path;
                    bytesWritten = fs.writeFileSync( tmp.path, bytes, type );
                    if( bytesWritten )
                        console.log( "Everything is OK!!" );
                    else
                        console.log( "We are dooooomed....!!: " );
                }
                else if( typeof headers[ "Content-Disposition" ] !== 'undefined' ){
                    // value is in the body of the message.
                    context[ headers[ "Content-Disposition" ][ "name" ] ] = bytes.slice( 0, count ).toString( 'utf-8' );
                }
                // reinitialize the variables.
                headers = {};
                count = 0;
            }
        }
        // return the context object.
        return context;
    },
    getLine: function( data, pos ){
        var count = 0;
        for( var i = pos, len = data.length; i < len; i++ ){
            if( ( data[ i ] == '\r' && data[ i + 1 ] == '\n' ) ){
                return {
                    line : this._buffer.slice( 0, count ).toString( 'utf-8' ),
                    nextByte: i + 2
                };
            }
            else if( ( data[ i ] == '\r' || data[ i + 1 ] == '\n' ) ){
                return {
                    line : this._buffer.slice( 0, count ).toString( 'utf-8' ),
                    nextByte: i + 1
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
        // if, nested ifs are added to prevent errors which was occuring while uploading image data.
        if( line !== '' ){
            line = line.split( ":" );
            // get the main key.
            if( typeof line[ 0 ] !== 'undefined' )
                key = line[ 0 ];
            // split on ';' and extract key, value pairs if present.
            if( typeof line[ 1 ] !== 'undefined' )
                vals = line[ 1 ].split( ";" );
        }
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
    },
    processTop: function( data, count, headers ){
        var l = {};
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
        return l;
    }
};
module.exports = swift_bodyparser;
