(function(window){

    function fixRelative(url, sourceUrl) {

        var hostname = 'http://' + sourceUrl.match(/\/\/([^/]+)(.*)$/)[1];
        var absolutePath = sourceUrl.replace(/\/([^/]+)$/, '');

        //https://a248.e.akamai.net/assets.github.com/f6beba6f5ca2ecc7178182a74ecbc21e08b301e1/stylesheets/bundle_github.css
        //../../images/modules/issues/clear-x.png

        url = absoluteUrl(url);

        if (!url) {
            return false;
        }

        if (url.match(/^https?:\/\//)) {
            //1) starts with http:// <- do nothing
        } else if (url.match(/^\/\//)) {
            //2) starts with // <- append http:
            url = 'http:' + url;
        } else if (url.match(/^\//)) {
            //3) starts with / <- append hostname
            url = hostname + url;
        } else {
            //4) starts with anything else? <- append full path
            url = absolutePath + url;
        }

        //replace path/../ with / (run mulitple times because g not helping here)
        url = url.replace(/\/[^\/]*\/\.\.\//g, '/')
                .replace(/\/[^\/]*\/\.\.\//g, '/')
                .replace(/\/[^\/]*\/\.\.\//g, '/');
        return url;
    }

    function absoluteUrl(url) {
        if (!url || !url.trim || !url.replace) {
            console.log('Bad url?', url);
            return false;
        }

        return url
            .trim()                         // remove spaces
            .replace(/^\/\//, 'http://')    // replace leading double slashes with http
            .replace(/\?.*/, '');           // remove querystring
    }

    function urlToFilename(url) {
        var filename = absoluteUrl(url);

        if (!filename || filename.match(/#/) || filename.match(/\(/)) { return false; }

        filename = filename
                        .replace(/https?:\/\//, '') // remove remove http
                        .replace(/([^/])*\//, '')   // remove domain
                        .replace(/.*\//, '')        // remove path
                        .replace(/[^\w\.\-_0-9]/g, '-').replace(/\-+/g, '-');  //remove most non-alphabetical characters

        // Need some kind of extension
        if (!filename.match(/\./)) {
            filename = filename + '.png';
        }

        return filename;
    }

    function add(originalUrl, filenameHash) {
        var url = absoluteUrl(originalUrl);
        var filename = urlToFilename(url);
        if (filename) {
            if (!filenameHash[filename]) {
                // this image is new
                filenameHash[filename] = url;
            } else {
                // somebody already has this filename
                filename = filename.replace(/\./, '-2.'); // add a -2 before the dot. could be cleaner.
                filenameHash[filename] = url;
            }
        } else {
            console.log('bad image url?', originalUrl);
        }
        return filenameHash;
    }
    
    window.Files = {
        add:            add,
        urlToFilename:  urlToFilename,
        fixRelative:    fixRelative
    };

})(window);