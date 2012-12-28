function Value( obj ){
    this.value = obj.value || '';
    this.expires = obj.expires || new Date( new Date().setDate( 0 ) ).toLocaleFormat();
    this.max_age = obj.max_age || undefined;
    this.domain = obj.domain;
    this.path = obj.path || "/";
    this.secure = obj.secure || false;
    this.http_only = obj.http_only || false;
}
Value.prototype.serialize = function( key ){
    var rval = "";
    // set the key,value pair.
    rval = key + "=" + this.value;
    for( prop in this ){
        if( prop !== 'value' && Object.prototype.hasOwnProperty.call( this, prop ) ){
            rval += "; " + this.getSaneKeyName( prop ) + "=" + this[ prop ];
        }
    }
    return rval;
}
Value.prototype.getSaneKeyName = function( prop ){
    var rval = '';
    switch( prop ){
        case 'expires': rval = "Expires"; break;
        case 'max_age': rval = "Max-Age"; break;
        case 'domain':  rval = "Domain"; break;
        case 'path': rval = "Path"; break;
        case 'secure' : rval = "Secure"; break;
        case 'http_only': rval = "HttpOnly";  break;
    }
    return rval;
}
module.exports = Value;
