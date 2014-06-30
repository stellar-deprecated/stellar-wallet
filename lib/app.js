var express    = require('express');
var bodyParser = require('body-parser');
var cors       = require("cors");


var app = global.app = express();

require("./initializers/config")(app);
app.use(cors());
app.use(bodyParser.json());
require("./initializers/logging")(app);
require("./initializers/db")(app);

app.use(bodyParser.json());

app.use('/', require('./app-routes'));

require("./initializers/errors")(app);

module.exports = app;
