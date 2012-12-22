var http = require( "http" ),
    querystring = require( "./swift_querystring" );

swift = {
    patterns: [],
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
        return undefined;
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
    run: function( urls ){
        var $this = this;
        // process urls,
        this.processPatterns( urls );
        // create server.
        this.server = http.createServer( function( req, res ){
            // get the callback function.
            var q = $this.processRequest( req, function( req, context ){
                var response = $this.route( req.url, context );
                if( typeof response === 'undefined' )
                    throw Error( "Function must return a response" );
                else{
                    res.writeHead( 200, {
                        "Content-Length" : Buffer.byteLength( response.data ),
                        "Content-Type" : "text/html; charset=utf-8"
                    } );
                    res.end( response.data );
                }
            });
        });
        this.server.listen( process.env.PORT || 8080, process.env.IP || '0.0.0.0' );
    },
    processRequest: function( req, callback ){
        var data = '',
            q;
        // set the encoding of incoming data.
        req.setEncoding( "utf-8" );
        req.on( "data", function( chunk ){
            data += chunk;
        });
        // called when data is flushed to the kernel buffer from main memory.
        req.on( "drain", function( chunk ){
        });
        // called when the readstream ends.[ time to call the callback ]
        req.on( "end", function(){
            if( req.method == 'GET' ){
                q = querystring.parse( req.url );
            }
            else if( req.method == 'POST' ){
                // parse the body to get the querystring.
                q = querystring.parse( data );
            }
            callback.call( {}, req, q );
        });
    }
};
module.exports = swift;
