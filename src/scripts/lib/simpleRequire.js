// ==Closure.compiler==
// @compilation_level SIMPLE_OPTIMIZATIONS
// ==/Closure.compiler==

// Require() 0.3.4 unstable
//
// Copyright 2012 Torben Schulz <http://pixelsvsbytes.com/>
// 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <http://www.gnu.org/licenses/>.
// 
///////////////////////////////////////////////////////////////////////

(function() {
    // NOTE If we would use strict mode for this closure we won't allow the modules
    //      to be executed in normal mode.
    
    if (window.simpleRequire !== undefined)
        throw 'simpleRequireException: \'simpleRequire\' already defined in global scope';
    
    window.simpleRequire = function(module, callback, avoidForceHttps) {
        var isAvoidForceHttps = typeof(avoidForceHttps) == 'undefined' ? false : avoidForceHttps;
        var url = window.simpleRequire.resolve(module);
        
        if (!isAvoidForceHttps) {
            if (url.indexOf('http://') > -1) {
                console.log('simpleRequire: Warning! required file must be served from https. Will try to get it from https now.')
                url = url.replace('http://', 'https://');
            } else if (url.startsWith('//')) {
                url = 'https:' + url;
            }
        }

        if (simpleRequire.cache[url]) {
            // NOTE The callback should always be called asynchronously
            callback && setTimeout(function(){callback(simpleRequire.cache[url])}, 0);
            return simpleRequire.cache[url];
        }
       
        console.log('simpleRequire: getting ' + url);

        var exports = new Object();
        //var request = new XMLHttpRequest();
        var request = createCORSRequest('GET', url);
        if (!request) {
            throw new Error('CORS not supported');
        }

        request.onreadystatechange = function() {
            if (this.readyState != 4)
                return;
            if (this.status != 200)
                throw 'simpleRequire() exception: GET '+url+' '+this.status+' ('+this.statusText+')';
    
            if (window.simpleRequire.cache[url]) {
                exports = window.simpleRequire.cache[url];
            }
            else if (this.getResponseHeader('content-type').indexOf('application/json') != -1) { 
                exports = JSON.parse(this.responseText);
                window.simpleRequire.cache[url] = exports;
            }
            else {
                window.simpleRequire.cache[url] = exports;
                var source = this.responseText.match(/^\s*(?:(['"]use strict['"])(?:;\r?\n?|\r?\n))?\s*((?:.*\r?\n?)*)/);
                eval('(function(){'+source[1]+';var exports=window.simpleRequire.cache[\''+url+'\'];\n\n'+source[2]+'\n})();\n//@ sourceURL='+url+'\n');
            }
    
            callback && callback(window.simpleRequire.cache[url]);
        };
        request.onerror = function(XMLHttpRequest, textStatus, errorThrown) {
            console.log( 'The data failed to load for: ' + url );
            console.log(JSON.stringify(XMLHttpRequest));
        };
        //request.open('GET', url, !!callback);
        //request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        //request.setRequestHeader( 'Access-Control-Allow-Origin', '*');
        //request.withCredentials = false;
        request.send();
        return exports;
    }

    function createCORSRequest(method, url) {
        var xhr = new XMLHttpRequest();
        if ("withCredentials" in xhr) {
          // Check if the XMLHttpRequest object has a "withCredentials" property.
          // "withCredentials" only exists on XMLHTTPRequest2 objects.
          xhr.open(method, url, true);
        } else if (typeof XDomainRequest != "undefined") {
          // Otherwise, check if XDomainRequest.
          // XDomainRequest only exists in IE, and is IE's way of making CORS requests.
          xhr = new XDomainRequest();
          xhr.open(method, url);
        } else {
          // Otherwise, CORS is not supported by the browser.
          xhr = null;
		}
		
		xhr.setRequestHeader('Accept', '*/*');

        return xhr;
    }
    
    window.simpleRequire.resolve = function(module) {
        if (module.indexOf("http://") == 0 || module.indexOf("https://") == 0) return module;
        var r = module.match(/^(\.{0,2}\/)?([^\.]*)(\..*)?$/);
        return (r[1]?r[1]:'/js_modules/')+r[2]+(r[3]?r[3]:(r[2].match(/\/$/)?'index.js':'.js'));
    }
    
    // INFO initializing module cache
    window.simpleRequire.cache = new Object();
    })();