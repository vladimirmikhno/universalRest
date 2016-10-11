'use strict';

var express = require('express');
var controller = require('./universal.controller.js');

var router = express.Router();

router.get('/:model', controller.index);
router.post('/:model', controller.create);
router.put('/:model', controller.upsert);
router.patch('/:model', controller.patch);
router.delete('/:model', controller.destroy);

module.exports = router;
