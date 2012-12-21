var http = require( "http" );

swift = {
    patterns: [],
    route: function( url ){
        var p,
            m;
        for( var i = 0, len = this.patterns.length; i < len; i++ ){
            p = this.patterns[ i ];
            m = url.match( p.pattern );
            if( !m )
                return undefined;
            m = m.slice( 1 );
            // call the callback and return the response.
            return p.callback.call( {}, m );
        }
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
                    regex.compile( url );
                    this.patterns.push(
                        {
                            "pattern" : regex,
                            "callback" : urls[ url ]
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
            var response = $this.route( req.url );
            if( typeof response === 'undefined' )
                throw Error( "Function must return a response" );
            else{
                res.writeHead( 200 );
                res.end( response.data );
            }
        });
        this.server.listen( process.env.PORT || 8080, process.env.IP || '0.0.0.0' );
    }
};
module.exports = swift;
