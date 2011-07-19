$(document).ready(function(){
    var Background = chrome.extension.getBackgroundPage();
    var $messages = $('#messages');

    function log(text) {
        text = text || 'Undefined';
        $('<pre></pre>').text('' + text).appendTo($messages);
    }

    function selectedTab(tab) {
        var error;
        // special chrome pages
        if (tab.url.indexOf('chrome') == 0) {
            error = "I don't work on special Chrome pages.";
        }
        // chrome gallery
        else if (tab.url.indexOf('https://chrome.google.com/extensions') == 0) {
            error = "I don't work on the Google Chrome extension gallery.";
        }
        // local pages
        else if (tab.url.indexOf('file') == 0) {
            error = "I don't work on local files.";
        }

        // disable or enable pickup button
        if ( error ) {
            log('Error: ' + error);
        } else {
            log('Running...');
            Background.run(tab);
        }
    }

    var cssFiles = [];

    function onMessage(req) {
        switch (req.type) {
            case 'css':
                var stylesheetUrl = req.data;
                $.ajax({ url: stylesheetUrl })
                    .complete(function(res){
                        cssFiles.push(stylesheetUrl);
                        log(cssFiles.length + ': ' + stylesheetUrl);
                        var reducedCSS = reduce(res.responseText, stylesheetUrl);
                        if (reducedCSS.css) {
                            log(reducedCSS.css);
                        }
                    });
                break;
            case 'html':
                log(req.data);
                break;
            case 'log':
                log(req.message);
                break;
            case 'reload':
                window.location.reload();
                break;
            default:
                log('unknown message:', req.type);
        }
    }

    function onConnect(port) {
        port.onMessage.addListener(onMessage);
    }

    chrome.extension.onConnect.addListener(onConnect);
    chrome.tabs.getSelected(null, selectedTab);
});
