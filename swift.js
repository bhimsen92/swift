var http = require( "http" ),
    querystring = require( "./swift_querystring" ),
    fs = require( "fs" ),
    util = require( "util" ),
    SwiftParser = require( "./swift_parser" ),
    swift_sessions = require( "./swift_sessions" ),
    swift_cookies = require( "./swift_cookies" ),
    Context = require( "./swift_context" );

swift = {
    patterns: [],
    parser: undefined,
    config: undefined,
    swift_sessions: undefined,
    route: function( url, context ){
        var p,
            m, obj = context;
        for( var i = 0, len = this.patterns.length; i < len; i++ ){
            p = this.patterns[ i ];
            m = url.match( p.pattern );
            if( !m )
                continue;
            m = m.slice( 1 );
            // populate context object which will be set as "this" of callback function.
            for( var i = 0, len = p.keys.length; i < len; i++ ){
                obj[ p.keys[ i ] ] = m[ i ];
            }
            // call the callback and return the response.
            return p.callback.call( obj, m );
        }
        // if no patterns are matched, send 404 to the client.        
        context._response.writeHead( 404 );
        context._response.end();
        return;
    },
    processPatterns: function( urls ){
        var regex;
        for( var url in urls ){
            // make sure that, property is on the object and not on its prototype.
            if( Object.prototype.hasOwnProperty.call( urls, url ) ){
                if( url.constructor === RegExp ){
                    ;
                }
                else if( url.constructor === String ){
                    regex = new RegExp( url );
                    // compile the regex for faster execution next time.
                    regex.compile( url );
                    this.patterns.push(
                        {
                            "pattern" : regex,
                            "callback" : urls[ url ].callback,
                            "keys" : urls[ url ].keys
                        }
                    );
                }
            }
        }
    },
    run: function( config ){
        var $this = this;
        this.config = config;
        // process urls,
        this.processPatterns( config.patterns );
        // create server.
        this.server = http.createServer( function( req, res ){
            // get the callback function.
            $this.processRequest( req, function( req, context ){
                var tval = undefined;
                // load the cookies
                context.cookies = swift_cookies.parse( req );
                context.sessions = {};
                context._request = req;
                // 'res' from closure.
                context._response = res;
                
                if( typeof context.cookies[ "SWIFTSESSIONID" ] !== 'undefined' ){
                    tval = context.cookies[ "SWIFTSESSIONID" ].value;
                }
                
                context.on( "send_data", function( _data, _headers ){
                    swift_sessions.save( $this.config, this.sessions, tval, this, _data, _headers );
                });
                
                context.on( "session_loaded", function(){
                    // once the session is loaded, route the request to a function.
                    $this.route( this._request.url, this );
                });
                context.on( "session_saved", function( _data, _headers ){
                    var cookie_string = swift_cookies.getCookieString( this.cookies ),
                        rheader = {};
                    if( typeof cookie_string != 'undefined' ){
                        rheader[ "Set-Cookie" ] = cookie_string;
                    }
                    
                    rheader[ "Content-Length" ] = Buffer.byteLength( _data );
                    rheader[ "Content-Type" ] = "text/html; charset=utf-8";
                    this._response.writeHead( 200, rheader );
                    this._response.end( _data );
                });
                // load the sessions.
                swift_sessions.load( $this.config, tval, context );                
            });
        });
        this.server.listen( process.env.PORT || 8080, process.env.IP || '0.0.0.0' );
    },
    processRequest: function( req, callback ){
        var q = new Context(),
            $this = this, count = 0;
        // set the encoding of incoming data.
        this.parser = new SwiftParser( req );
        req.on( "data", function( chunk ){
            if( $this.parser.parse( chunk ) != chunk.length )
                throw Error( "Parse error" );
        });
        // called when readstream ends.[ time to call the callback ]
        req.on( "end", function(){
            var type;
            if( req.method == 'GET' ){
                q = querystring.parse( req.url );
            }
            else if( req.method == 'POST' ){
                type = $this.getType( req );
                if( type === 'multipart/form-data' ){
                    q = $this.parser.getContext();
                }
                else{
                    // parse the body to get the querystring.
                    q = querystring.parse( data );
                }
            }
            callback.call( {}, req, q );
        });
    },
    getType: function( req ){
        var type = '';
        if( typeof req.headers[ "content-type" ] !== 'undefined' ){
            type = req.headers[ "content-type" ].split( ";" );
        }
        return type[ 0 ];
    },
    install: function( config ){
        Sessions.install( config );
    }
};
module.exports = swift;
