
(function(global) {
    var tab;

    function onMessage(req) {
        switch (req.type) {
            default:
                //console.log('unknown action:', req.type);
        }
    }

    function onConnect(port) {
        port.onMessage.addListener(onMessage);
    }

    function init() {
        chrome.extension.onConnect.addListener(onConnect);
    }

    function run(Tab) {
        tab = Tab;
        chrome.tabs.executeScript(tab.id, {allFrames: false, file: "page/jquery.min.js"}, function() {
            chrome.tabs.executeScript(tab.id, {allFrames: false, file: "page/page.js"}, function() {

            });
        });
    }

    global.init = init;
    global.run = run;
})(window);