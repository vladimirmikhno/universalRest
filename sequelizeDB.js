var Sequelize = require('sequelize'),
 DBConfig  = require('./settings.json').DBConfig

var URI='mysql://'+DBConfig.user+':'+DBConfig.password+'@'+DBConfig.host+':3306/'+DBConfig.database,
    options = {logging:DBConfig.logging, define:DBConfig.define}


var db = {
    Sequelize,
    sequelize: new Sequelize(URI,options)
};

module.exports = db;
