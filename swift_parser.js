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
    BOUNDARY_CHECK: 7,
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
    this.tidx = 0;
    // for processing headers.
    this._buffer = new Buffer( 512 );
    // stores data while doing boundary checks.
    this._tbuffer = new Buffer( 1024 );
    this.body = new Buffer( 1024 * 1024 * 4 );
    this.current_state = State.BOUNDARY;
    this.prev_state = undefined;
    this.context = {};
    this.context.files = [];
    this.headers = {};
    
    // set the boundary.
    this.setBoundary( req );
}
SwiftParser.prototype.parse = function( buffer ){
    var bidx = 0,
        len = buffer.length,
        tchar;
    console.log( this.tidx );
    while( bidx < len ){
        switch( this.current_state ){
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
                                        this.current_state = State.BOUNDARY;
                                    }
                                }
                                else{
                                    if( this.prev_state == State.BODY ){
                                        this.body[ this.body_index++ ] = SpecialChar.CR;
                                        this.body[ this.body_index++ ] = buffer[ bidx ];
                                        this.current_state = State.BODY;
                                    }
                                }
                                this.prev_state = State.CR;
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
                                else{
                                    this.current_state = State.CR;
                                }
                                this.prev_state = State.BODY;
                                break;
            case State.BOUNDARY:
                                      // check for end of the boundary, if it is the end of the body, then process the body,
                                      // else write all the characters that have been read into the body, update the body index,
                                      // set the current state to body.
                                      if( typeof this.boundary !== 'undefined' ){
                                        if( buffer[ bidx ] == this.boundary.charCodeAt( this.tidx ) ){
                                            this._tbuffer[ this.tidx++ ] = buffer[ bidx ];
                                        }
                                        else{
                                            if( buffer[ bidx ] != SpecialChar.CR && buffer[ bidx ] != SpecialChar.HYPHEN )
                                                this._tbuffer[ this.tidx++ ] = buffer[ bidx ];
                                            bidx -= this.processBoundaryCheck();
                                        }
                                      }
                                      this.prev_state = State.BOUNDARY;
                                      break;
        }
        // move the buffer pointer.
        bidx++;
    }
    return bidx;
}
SwiftParser.prototype.processBoundaryCheck = function(){
    var rval = 0;
    if( this.tidx == this.boundary.length ){
        // i completely seen the body, process it, reinitialize the vars.
        this.processBody();
        this.body_index = 0;
        this.headers = {};
        this.current_state = State.CR;
    }
    else{
        // put CR,LF into write buffer.
        this.body[ this.body_index++ ] = SpecialChar.CR;
        this.body[ this.body_index++ ] = SpecialChar.LF;
        for( var i = this.body_index, j = 0; j < this.tidx; j++, i++ ){
            this.body[ i ] = this._tbuffer[ j ];
        }
        this.body_index = i;
        this.current_state = State.BODY;
        rval = 1;
    }
    this.tidx = 0;
    // to move the buffer pointer one step back.[ to unread the current character ]
    return rval;
}

SwiftParser.prototype.processBody = function(){
    if( this.body_index > 0 ){
        var buf = this.body.slice( 0, this.body_index ),
            obj = {}, f = '';
        //console.log( buf.toString( 'utf-8', 0 ) );
        if( typeof this.headers[ "content-type" ] !== 'undefined' ){
            if( typeof this.headers.value !== 'undefined' )
                f = this.headers.value;
            obj[ this.headers.key ] = f;
            obj[ "type" ] = this.headers[ "content-type" ];
            obj[ "size" ] = this.body_index;
            // the body contains a file, store the data on the disk.
            var file = swift_tmp.mktmp( path.extname( f ) || '' );
            if( fs.writeFileSync( file.path, buf ) )
                console.log( "file could not be saved..!!" );
            fs.close( file.fd );
            obj[ "path" ] = file.path;
            // push this value to files global array.
            this.context.files.push( obj );
        }
        else{
            // content contains the value of the key.
            this.context[ this.headers.key ] = buf.toString( "ascii", 0 );
        }
    }
}
SwiftParser.prototype.processHeader = function(){
    var buf = this._buffer.slice( 0, this.index ),
        key,
        val = undefined, t;
    // convert it into a string.
    buf = buf.toString( 'ascii', 0 ).split( ":" );
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
SwiftParser.prototype.getContext = function(){
    return this.context;
}
SwiftParser.prototype.setBoundary = function( req ){
    if( typeof req.headers[ "content-type" ] !== "undefined" ){
        var boundary = req.headers[ "content-type" ].split( ";" );
        if( typeof boundary[ 1 ] !== 'undefined' ){
            // split on '=', then return element at index 1 as it contains the boundary text.
            this.boundary = "--" + boundary[ 1 ].split( "=" )[ 1 ].trim();
            this.boundaryLength = this.boundary.length;
        }
    }
}
module.exports = SwiftParser;
