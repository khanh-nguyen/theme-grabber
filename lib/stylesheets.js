var log = require('logging').from(__filename);
var Request = require('request');
var CSS = require('./css');

var $;
var document;
var hostname;
var url;

function setup(options) {
    document = options.window.document;
    url = options.url;
    log(url);
    hostname = url.match(/\/\/([^/]+)(.*)$/)[1];
    $ = options.window.$;
}

function reduceHTML(){
    return $('body').html()
                .replace(/src[\s]?=[\s]?"\//g, 'src="http://' + hostname + '/')
                .replace(/href[\s]?=[\s]?"\//g, 'href="http://' + hostname + '/')
                .replace(/action[\s]?=[\s]?"\//g, 'action="http://' + hostname + '/')
                .replace(/onclick/g, 'data-disabled-onclick')
                .replace(/\t/g, '    ')
                .replace(/\xA9/g, '&copy;')
                .replace(/\n[\s]*\n/gs, '\n');
}


function load(callback) {
    var stylesheetsArray = $('link[rel=stylesheet]:not([media=print])').map(function(i, stylesheet){

            log(stylesheet.href);

            return stylesheet.href.indexOf('http') === 0 ? stylesheet.href
                        : 'http://' + hostname + stylesheet.href;
        }),
        stylesheetFiles = [],
        results = { css: [], files: [], html: '', found: 0, notFound: 0};

    results.html = reduceHTML();

    function loadStyleSheet (count) {
        if (count >= stylesheetsArray.length) {
             callback && callback(results);
        } else {
            var url = stylesheetsArray[count];
            if (url) {
                log('get', url);
                Request({ uri: url }, function(error, response, body){
                    if (body) {
                        stylesheetFiles.push({ url: url, data: body });
                        var result = reduce(body, url);
                        if (result && result.css) {
                            results.css = results.css.concat(result.css);
                        }
                        if (result && result.file) {
                            results.files = results.files.concat(result.files);
                        }
                        results.found += result.found;
                        results.notFound += result.notFound;
                    }
                    loadStyleSheet(count+1);

                });
            }
        }
    }

    loadStyleSheet(0);
}


function reduce(data, url) {

    var found = [],
        notFound = [],
        selectors, cssText;

        var absolutePath = url.replace(/\/([^/]+)$/, '');
        var hostname = 'http://' + url.match(/\/\/([^/]+)(.*)$/)[1];

        //remove tabs, make image urls absolute
        //TODO: fails when the url includes http://
        data = data
                    .replace(/\t/g, '    ')
                    .replace(/(url\(['"]?)([a-zA-Z0-9.][^)]*)/g, '$1' + absolutePath + '/$2')
                    .replace(/(url\(['"]?)(\/[^)]*)/g, '$1' + hostname + '$2');

        var stylesheetObject = CSS.parse(data);

        stylesheetObject.cssRules.forEach(function(rule) {
            if (rule.selectorText) {
                selectors = rule.selectorText.split(',');
                cssText = rule.cssText;

                selectors.forEach(function(selector){
                    selector = selector.trim();
                    var simpleSelector = selector
                                .replace('* html ', '') //ie hack
                                .replace('^.ie[6789]', '') //ie hack
                                .replace(/:[^\s]*/g, '')
                                .trim(); //:hover, :focus, etc

                    if (simpleSelector) {
                        try {
                            if (document.querySelector(simpleSelector)) {
                                found.push(selector + ' ' + cssText);
                            } else {
                                notFound.push(selector);
                            }

                        }
                        catch(e){

                            try {
                                if ($(simpleSelector).length) {
                                    found.push(selector + ' ' + cssText);
                                } else {
                                    notFound.push(selector);
                                }
                            }
                            catch (e) {
                                found.push('/' + '* bad selector', selector, '*' + '/');
                            }


                        }
                    }
                });
            }
        });

        return  {
                   found: found.length,
                   notFound: notFound.length,
                   css: found.length ? '/' + '** ' + '\n' +
                        ' * ' + '\n' +
                        ' * imported from: ' + '\n' +
                        ' * ' + (url || 'Inline CSS on ' + document.location) + '' + '\n' +
                        ' * ' + '\n' +
                        ' **' + '/' + '\n' +
                        found.join('\n\n')
                        : ''
        };
}

module.exports.setup = setup;
module.exports.load = load;
