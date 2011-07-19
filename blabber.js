var log = require('logging').from(__filename);
var DOM = require('server/lib/dom');


DOM.parse('http://opower.com/careers', '.page, .ometer-block');

//DOM.parse('https://ei-cec-dev.opower.com/cec-ei/app/tip/tip151_save_energy_to_save_money_peak', 'header-meta');

//DOM.parse('http://www.first-utility.com/home-energy/our-tariffs', '#breadcrumb, #mainContent');
//DOM.parse('http://www.apple.com/ipad/', '#main');
//DOM.parse('https://ei-demo-qa.opower.com/demo-ei/app/ideas/free', '#content');
