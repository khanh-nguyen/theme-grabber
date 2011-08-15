(function() {
    var Tab, Port, ObjectUrl;

    function sendMessage(message) {
        Port.postMessage(message);
    }

    function log(message) {
        sendMessage({type: 'log', data: message});
    }

    function onRequest(message, sender, sendResponse) {
        switch (message.type) {
            case 'load':
                if (message.url && message.url.replace(/\?.*$/, '').replace(/^\/\//, 'http://').match(/(^http|\.....?$)/)) {
                    var url = message.url;
                    log('loading ' + url);
                    $.ajax({
                        url: url,
                        beforeSend: function( xhr ) {
                                if (message.binary) {
                                    xhr.overrideMimeType( 'text/plain; charset=x-user-defined' );
                                }
                            }
                        })
                    .complete( function(response){
                        log('request complete for ' + url + ' size: ' +  (response && response.responseText ?  response.responseText.length : 0));
                        sendResponse({ url: url, data: response.responseText });
                    });
                } else {
                    log('cannot ajax request ' + url);
                    sendResponse({ url: url, data: false });
                }
                break;
            case 'zip':
                ObjectUrl = webkitURL.createObjectURL(createZip(message));
                sendResponse(true);
                break;
            case 'download':
                chrome.tabs.update(Tab.id, { url: ObjectUrl },
                    function() {
                        log('Download complete');
                    });
                break;
            default:
                log('unknown message type');
        }
    }

    function onConnect(port) {
        Port = port;
    }


    function urlToFilename(url) {
        //Todo: clean this up. 

        return url ? ((url.replace(/\?.*/, '')   //remove querystring
                      .match(/\/([^/]*\....)$/)       //remove hostname and path
                        || [false, false] )[1] || 'noname').replace(/[^\w\.]/gi, '')         //remove non-alphabetical characters
                 : false;
    }

    function createZip(content){
        log('creating zip for theme ' + content.themeName);
        var debug = false;
        var zip = new JSZip('STORE'); //'DEFLATE'
        var themeDir = content.themeName + '/';

        if (!debug) {
            zip.add(themeDir + 'body.html', content.html);
            zip.add(themeDir + 'assets/theme.css', content.reduced.join('\n'));
            zip.add(themeDir + 'assets/overrides.css', '/* Put overrides in here */');

            var duplicateCheck = {};

            content.originals.forEach(function(stylesheet, i){
                var filename = urlToFilename(stylesheet.url)|| 'file' + i + '.css';
                if (duplicateCheck[filename]) {
                    var temp = filename.match(/^([^.]*)\.(.*)$/);
                    filename = temp[1] + i + '.' + temp[2];
                }
                log('adding stylesheet: ' + filename);
                zip.add(themeDir + 'originals/' + filename, stylesheet.data);
                duplicateCheck[filename] = true;
            });
        }
        content.images.forEach(function(image, i) {
            var filename = image.filename;
            if (debug && i == 0 || !debug) {
                log('adding image: ' + filename + ' (' + image.url + ')');
                zip.add(themeDir + 'assets/' + filename, image.data, {binary: true} );
            }
        });

        log('done adding files to zip. sending to user...');
        return zip.generate();
    }

    function activate(tab) {
        Tab = tab;
        var clientScripts = [
            'thirdParty/jquery.min.js',
            'thirdParty/CSSOM.js',
            'page/files.js',
            'page/stylesheets.js',
            'page/page.js'
        ];

        function addScript() {
            var file = clientScripts.shift();
            if (file) {
                chrome.tabs.executeScript(tab.id, { file: file }, addScript);
            }
        }

        chrome.tabs.insertCSS(Tab.id, { file: 'page/page.css' }, addScript);
    }

    chrome.extension.onConnect.addListener(onConnect);
    chrome.extension.onRequest.addListener(onRequest);
    chrome.browserAction.onClicked.addListener(activate);

})();