var EventEmitter = require( "events" ).EventEmitter,
    util = require( "util" );

function Context(){
}
util.inherits( Context, EventEmitter );

module.exports = Context;

Context.prototype.send = function( data, headers ){
    this.emit( "send_data", data, headers );
}
