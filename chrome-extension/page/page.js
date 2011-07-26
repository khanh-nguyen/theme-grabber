(function($) {

    var SELECTOR_KEY = 'plugin_selector';

    var Port = chrome.extension.connect();

    Port.onMessage.addListener(onMessage);

    var hostname = document.location.origin;  // Example: http://site.com

    function html(){
        //Todo: disable javascript
        //Todo: include any tips?

        return $('body')
                    .html()
                    //.replace(/href[\s]?=[\s]?"\//g, 'href="' + hostname + '/')
                    //.replace(/action[\s]?=[\s]?"\//g, 'action="' + hostname + '/')
                    .replace(/onclick/g, 'data-disabled-onclick')
                    .replace(/\t/g, '    ')
                    .replace(/\xA9/g, '&copy;') //TODO: trademark and other unicode characters
                    .replace(/\xAE/, '&reg;')
                    .replace(/\n[\s]*\n/gs, '\n')
                    .replace(/[^A-Za-z0-9<>:.;+\-"(){_}=\[\]\t\s\r\n\/\*!\'\&\#\%,\?\$\`~|]/g, '') // kill all non ascii
                    .trim();
    }

    function loadStylesheets(cb) {
        var urls =  $('link[rel=stylesheet]:not([media=print])').map(function(i, stylesheet){
            return stylesheet.href.indexOf('http') === 0 ? stylesheet.href
                        : hostname + stylesheet.href;
        }).toArray();

        var reduced = [];
        var originals = [];
        var imageUrls = {};

        function loadCSS() {
            var url = urls.shift();
            if (url) {
                chrome.extension.sendRequest( {type: 'load', url: url }, function (response) {
                    if (response.data) {
                        var reducedResults = reduce(response.data || '', url, imageUrls);
                        if (reducedResults.css) {
                            reduced.push(reducedResults.css);
                            imageUrls = reducedResults.imageUrls;
                        }
                        originals.push({ url: url, data: response.data });
                    }
                    loadCSS();
                });
            } else {
               cb(null, {reduced: reduced, originals: originals, imageUrls: imageUrls});
            }
        }
        loadCSS();
    }

    function loadImages(imageUrls, cb) {

        $('img').each(function(){
            var url = this.src;
            url = Files.fixRelative(url, document.location.origin + document.location.pathname);
            var filename = Files.urlToFilename(url);
            if (filename) {
                imageUrls = Files.add(url, imageUrls);
                this.src = '{clientUrl}/images/' + filename;
            }
        });

        //TODO: inline styles
        /*
            $('style')
            $('[style*=background]')

         */
        var images = [];
        var filenames = Object.keys(imageUrls);

        function loadImage() {
            var filename = filenames.shift();
            if (filename) {
                chrome.extension.sendRequest( {type: 'load', url: imageUrls[filename], binary: true }, function (response) {
                    if (response.data) {
                        images.push({ url: imageUrls[filename], filename: filename, data: response.data });
                    }
                    loadImage();
                });
            } else {
               cb(null, {images: images });
            }
        }
        loadImage();
    }


    function createUI() {

        var $info = $('<div class="plugin_info">Snooper' +
            '<input type="text" placeholder="CSS Selector" data-purpose="selector"/>' +
            '<input type="button" value="Download Theme" data-action="download"/>' +
            '</div>');

        var $selector = $info.find('[data-purpose=selector]');
        
        $selector.bind('keyup change', function(){
                var value = $selector.val().trim();
                $selector.css({minWidth: value.length * 6});

                $('.plugin_remove').removeClass('plugin_remove');

                try {
                    var $elements = $(value);
                    $elements.addClass('plugin_remove');
                    window.localStorage.setItem(SELECTOR_KEY, value);
                } catch(err) {
                    console.log('Invalid CSS Selector', value);
                }

            })
            .val(window.localStorage.getItem(SELECTOR_KEY))
            .change();

        $info.find('[data-action=download]').click(function() {
            $($selector.val() || '#NOTHING').html('***Removed****');

            var reduced;
            var originals;

            loadStylesheets(function(err, data){
                reduced = data.reduced;
                originals = data.originals;
                loadImages(data.imageUrls, function(err, data) {
                    chrome.extension.sendRequest({ type: 'zip', html: html(), reduced: reduced, originals: originals, images: data.images  },
                        function(response) {
                            console.log('Ready to download');
                            chrome.extension.sendRequest({ type: 'download'});
                        });
                });
            });
        });

        $info.appendTo(document.body);
    }


    function onMessage (message) {
        switch (message.type) {
            case 'log':
                console.log(message.data);
                break;
            default:
                console.log('Unknown message', message);
        }
    }

    if ($('.plugin_info').length) {
        $('.plugin_info').remove();
        $('.plugin_remove').removeClass('plugin_remove');
    } else {
        createUI();
    }

})($.noConflict());