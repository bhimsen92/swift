var db = require( "mysql" ),
    crypto = require( "crypto" ),
    Value = require( "./swift_value" );
    
Sessions = {};

Sessions.load = function( config, session_id, context ){
    var rval = {};
    if( typeof session_id !== 'undefined' ){
        var conn = db.createConnection({
            host: config.host,
            user: config.user,
            password: config.password,
            database: config.database
        });
        conn.connect();
        conn.query( "select * from __swift__session where id = '" + session_id + "'", function( err, rows, fields ){
            if( err ){
                conn.end();
                throw err;
            }
            if( rows.length == 1 ){
                rval = JSON.parse( rows[ 0 ].session_string );
                rval.__destroy = false;
            }
            else if( rows.length > 1 ){
                conn.end();
                throw Error( "Multiple rows with same session id: " + session_id );
            }
            conn.end();
            context.sessions = rval;
            context.emit( "session_loaded" );
        });
    }
    else{
        context.sessions = {};
        context.emit( "session_loaded" );
    }
}

Sessions.save = function( config, sessions, session_id, context, _data, _headers ){
    var rval = false,
        sql = '',
        id = session_id;
    if( typeof session_id !== 'undefined' ){
        // session exists, update the row.
        var string = JSON.stringify( sessions );        
        sql = "update __swift__session set session_string = '" + string + "' where id = '" + session_id + "'";
    }
    else if( Object.keys( sessions ).length > 0 ){
        var string = JSON.stringify( sessions ),
            id = crypto.createHash( 'md5' ).update( Date.now() + string, 'utf-8' ).digest( 'hex' );
        sql = "insert into __swift__session ( id, session_string ) values ( '" + id + "', '" + string + "' )";
    }
    if( sql != '' ){
        conn = db.createConnection({
            host: config.host,
            user: config.user,
            password: config.password,
            database: config.database
        });
        conn.connect();
        conn.query( sql, function( err, rows, fields ){
            if( err ){
                conn.end();
                throw err;
            }            
            conn.end();
            context.cookies[ "SWIFTSESSIONID" ] = new Value( { value: id,
                                                               domain: context._request.headers[ "Host" ] } );
            context.emit( "session_saved", _data, _headers );
        });
    }
    else{
        // no need to set the session cookie, send session_saved event.
        context.emit( "session_saved", _data, _headers );
    }
}

Sessions.install = function( config ){
    var table = "create table __swift__session(";
        table += "id varchar( 64 ) not null,";
        table += "session_string varchar( 4096 ) not null,";
        table += "primary key( id ))"
    
    var conn = db.createConnection({
        host: config.host,
        user: config.user,
        password: config.password,
        database: config.database
    });

    conn.connect();

    conn.query( table, function( err, rows, fields ){
        if( err ){
            throw err;
        }
        console.log( "table created!!" );
    });
    conn.end();
}
module.exports = Sessions;
