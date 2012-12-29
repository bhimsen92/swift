function Value( obj ){
    this.value = obj.value || '';
    this.expires = obj.expires || undefined;//new Date( new Date().setDate( 0 ) ).toGMTString();
    this.max_age = obj.max_age || undefined;
    this.domain = obj.domain;
    this.path = obj.path || "/";
    this.secure = obj.secure || undefined;
    this.http_only = obj.http_only || undefined;
}
Value.prototype.serialize = function( key ){
    var rval = "";
    // set the key,value pair.
    rval = key + "=" + this.value;
    for( prop in this ){
        if( prop !== 'value' && Object.prototype.hasOwnProperty.call( this, prop ) ){
            if( ( prop != 'secure' && prop != 'http_only' ) && typeof this[ prop ] !== 'undefined' ){
                rval += "; " + this.getSaneKeyName( prop ) + "=" + this[ prop ];
            }
        }
    }
    rval += ";";
    return rval;
}
Value.prototype.getSaneKeyName = function( prop ){
    var rval = '';
    switch( prop ){
        case 'expires': rval = "expires"; break;
        case 'max_age': rval = "max-Age"; break;
        case 'domain':  rval = "domain"; break;
        case 'path': rval = "path"; break;
        case 'secure' : rval = "Secure"; break;
        case 'http_only': rval = "HttpOnly";  break;
    }
    return rval;
}
module.exports = Value;
