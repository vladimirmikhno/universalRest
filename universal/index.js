'use strict';

var express = require('express');
var controller = require('./universal.controller.js');


var router = express.Router();

router.get('/:model', controller.index);
// router.get('/:id', controller.show);
// router.post('/', controller.create);
// router.put('/:id', controller.upsert);
// router.patch('/:id', controller.patch);
// router.delete('/:id', controller.destroy);

module.exports = router;
