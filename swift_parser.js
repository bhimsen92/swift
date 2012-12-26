var util = require( "util" ),
    fs = require( "fs" ),
    swift_tmp = require( "./swift_tmp" ),
    path = require( "path" );

var State = {
    BOUNDARY: 1,
    HEADER: 2,
    CR: 3,
    LF: 4,
    HEADER_END: 5,
    BODY: 6,
    NO_CONTENT_TYPE: 7
},
SpecialChar = {
    LF:10,
    CR:13,
    HYPHEN:45,
    SPACE:32,
    COLON:58
    
};

function SwiftParser( req ){
    this.request = req;
    this.boundary = undefined;
    this.boundaryLength = 0;
    this.index = 0;
    this.body_index = 0;
    // for processing headers.
    this._buffer = new Buffer( 512 );
    this.body = new Buffer( 1024 * 1024 * 4 );
    this.current_state = State.BOUNDARY;
    this.prev_state = undefined;
    this.context = {};
    this.context.files = [];
    this.headers = {};
}
SwiftParser.prototype.parse = function( buffer ){
    var bidx = 0,
        len = buffer.length;
    while( bidx < len ){
        switch( this.current_state ){
            case State.BOUNDARY:
                                if( buffer[ bidx ] == SpecialChar.CR )
                                    this.current_state = State.CR;
                                this.prev_state = State.BOUNDARY;
                                break;
            case State.HEADER:
                                if( buffer[ bidx ] != SpecialChar.CR )
                                    this._buffer[ this.index++ ] = buffer[ bidx ];
                                else
                                    this.current_state = State.CR;
                                this.prev_state = State.HEADER;
                                break;
            case State.CR:
                                if( buffer[ bidx ] == SpecialChar.LF ){
                                    if( this.prev_state == State.BOUNDARY )
                                        this.current_state = State.HEADER;
                                    else if( this.prev_state == State.HEADER_END ){
                                        this.current_state = State.BODY;
                                    }
                                    else if( this.prev_state == State.HEADER ){
                                        // need to process header here and set index to zero.
                                        this.processHeader();
                                        this.index = 0;
                                        this.current_state = State.HEADER_END;
                                    }
                                    else if( this.prev_state == State.BODY ){
                                        this.processBody();
                                        this.body_index = 0;
                                        // processBody function needs content-type to check whether it is file or field value.
                                        this.headers = {};
                                        this.current_state = State.BOUNDARY;
                                    }
                                    this.prev_state = State.CR;
                                }
                                break;
            case State.HEADER_END:
                                if( buffer[ bidx ] == SpecialChar.CR )
                                    this.current_state = State.CR;
                                else{
                                    // push back the read character.
                                    bidx--;
                                    this.current_state = State.HEADER;
                                }
                                this.prev_state = State.HEADER_END;
                                break;
            case State.BODY:
                                if( buffer[ bidx ] != SpecialChar.CR )
                                    this.body[ this.body_index++ ] = buffer[ bidx ];
                                else
                                    this.current_state = State.CR;
                                this.prev_state = State.BODY;
                                break;
        }
        // move the buffer pointer.
        bidx++;
    }
}
SwiftParser.prototype.processBody = function(){
    var buf = this.body.slice( 0, this.body_index ),
        obj = {}, f = '';
    if( typeof this.headers[ "content-type" ] !== 'undefined' ){
        if( typeof this.headers.value !== 'undefined' )
            f = this.headers.value;
        obj[ this.headers.key ] = f;
        obj[ "type" ] = this.headers[ "content-type" ];
        obj[ "size" ] = this.body_index + 1;
        // the body contains a file, store the data on the disk.
        var file = swift_tmp.mktmp( path.extname( f ) || '' );
        if( fs.writeFileSync( file.path, buf ) )
            console.log( "file could not be saved..!!" );
        obj[ "path" ] = file.path;
        fs.close( file.fd );
        // push this value to files global array.
        this.context.files.push( obj );
    }
    else{
        // content contains the value of the key.
        this.context[ this.headers.key ] = buf.toString( "ascii", 0 );
    }
}
SwiftParser.prototype.processHeader = function(){
    try{
    var buf = this._buffer.slice( 0, this.index ),
        key,
        val = undefined, t;
    // convert it into a string.
    buf = buf.toString( 'ascii', 0 ).split( ":" );
    //console.log( buf );
    // get key    
    key = buf[ 0 ];
    if( typeof buf[ 1 ] !== 'undefined' ){
        val = buf[ 1 ].split( ";" );
        // slice on index 1.
        if( val.length > 1 ){
            val = val.slice( 1 );
            key = val[ 0 ].split( "=" )[ 1 ].replace( /['"]/g, '' );
            this.headers[ "key" ] = key;
            if( typeof val[ 1 ] !== 'undefined' )
                this.headers[ "value" ] = val[ 1 ].split( "=" )[ 1 ].replace( /['"]/g, '' );
        }
        else{
            // check for content type header value.
            if( val != null ){
                this.headers[ key.toLowerCase() ] = val[ 0 ].trim();
            }
        }
    }
    }
    catch( e ){
        if( e.message != 'oob' )
            console.log( e.message );
    }
}
SwiftParser.prototype.getContext = function(){
    return this.context;
}
SwiftParser.prototype.setBoundary = function( req ){
    var boundary = req.headers[ "content-type" ].split( ";" );
    if( typeof boundary[ 1 ] !== 'undefined' ){
        // split on '=', then return element at index 1 as it contains the boundary text.
        this.boundary = boundary[ 1 ].split( "=" )[ 1 ];
        this.boundaryLength = this.boundary.length;
    }
}
module.exports = SwiftParser;
