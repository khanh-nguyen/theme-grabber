var log = require('logging').from(__filename);
var JSDom = require("jsdom");
var Stylesheets = require('./stylesheets');

var $;
var window;

function setup(options) {
    window = options.window;
    $ = window.$;
}


function remove(selector){
    if (selector) { $(selector).html('').text('\n\n**REMOVED**\n\n'); }
}

function removeCrap() {
    $('script').remove();
    $('input[type=hidden]').remove();
    $('span:empty:not([class]):not([id])').remove();
    $('div:empty:not([class]):not([id])').remove();
}

function parse(url, selector) {
    JSDom.env(url,
          [
             'http://code.jquery.com/jquery-1.5.min.js'
          ],
          function(errors, window) {
              setup({ window: window, url: url });
              remove(selector);
              removeCrap();
              Stylesheets.setup({window: window, url: url});
              Stylesheets.load(complete);
          });
}

function complete (data) {
    log('complete');
    console.log('\n\n\n\n*************\n\n\n\n');
    console.log(data.css.join('\n'));
    console.log('\n\n\n\n*************\n\n\n\n');
    console.log(data.html);
    console.log('\n\n\n\n*************\n\n\n\n');
    log('Found', data.found, 'Not Found:', data.notFound, 'Reduction', Math.round(data.notFound/(data.found+data.notFound) * 100) + '%');
}

module.exports.parse = parse;