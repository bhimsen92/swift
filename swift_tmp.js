var crypto = require( "crypto" ),
    fs = require( "fs" );
swift_tmp = {
    max_tries : 64,
    // generate a unique file name and return file descriptor.
    mktmp: function( extension ){
        // generate a hash.
        var hash = crypto.createHash( 'md5' ),
            name,
            fd;
        // try to open in exclusive mode.
        while( this.max_tries > 0 ){
            try{
                hash = crypto.createHash( 'md5' );
                hash.update( Date.now() + '' + process.pid, 'utf-8' );
                name = hash.digest( 'hex' ) + extension;
                // i have no choice but to use openSync function and not the async counter part.
                fd = fs.openSync( name, "wx" );
                break;
            }
            catch( e ){
                this.max_tries--;
                continue;
            }
        }
        // reset max_tries value.
        this.max_tries = 64;
        return { "fd" : fd,
                 "path" : fs.realpathSync( name ) };
    }
}
module.exports = swift_tmp;
