'use strict';

var express = require('express');
var controller = require('./universal.controller.js');
import * as auth from '../../auth/auth.service'
import {checkEnabledTables} from './universal.middleware.js'

var router = express.Router();

router.get('/:model',auth.isAuthenticated(),checkEnabledTables('GET'), controller.index);
// router.get('/:id', controller.show);
router.post('/:model', auth.isAuthenticated(),checkEnabledTables('POST'), controller.create);
router.put('/:model', auth.isAuthenticated(),checkEnabledTables('PATCH'), controller.upsert);
router.patch('/:id', controller.patch);
// router.delete('/:id', controller.destroy);

module.exports = router;
