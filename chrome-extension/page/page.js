(function($) {
    var Port = chrome.extension.connect();
    function sendMessage(message) {
        Port.postMessage(message);
    }

    var hostname = document.location.origin;  // Example: http://site.com


    function html(){
        return $('body')
                    .html()
                    .replace(/src[\s]?=[\s]?"\//g, 'src="' + hostname + '/')
                    .replace(/href[\s]?=[\s]?"\//g, 'href="' + hostname + '/')
                    .replace(/action[\s]?=[\s]?"\//g, 'action="' + hostname + '/')
                    .replace(/onclick/g, 'data-disabled-onclick')
                    .replace(/\t/g, '    ')
                    .replace(/\xA9/g, '&copy;') //TODO: trademark and other unicode characters
                    .replace(/\n[\s]*\n/gs, '\n');
    }


    function styleSheets () {
        return $('link[rel=stylesheet]:not([media=print])').map(function(i, stylesheet){
            return stylesheet.href.indexOf('http') === 0 ? stylesheet.href
                        : hostname + stylesheet.href;
        });
    }


    sendMessage({ type: 'log', message: 'Ready from ' + hostname });

    sendMessage({ type: 'html', data: html() });
    
    styleSheets().each(function(i, stylesheetUrl){
        sendMessage({ type: 'css', data: stylesheetUrl });
    });



})($.noConflict());