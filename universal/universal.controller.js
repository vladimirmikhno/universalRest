/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/compassCopy              ->  index
 * POST    /api/compassCopy              ->  create
 * GET     /api/compassCopy/:id          ->  show
 * PUT     /api/compassCopy/:id          ->  upsert
 * PATCH   /api/compassCopy/:id          ->  patch
 * DELETE  /api/compassCopy/:id          ->  destroy
 */

'use strict';

import jsonpatch from 'fast-json-patch';
import db from  '../../sqldb';
import _ from 'lodash'

function respondWithResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function(entity) {
    if(entity) {
      return res.status(statusCode).json({data:entity});
    }
    return null;
  };
}

function patchUpdates(patches) {
  return function(entity) {
    try {
      jsonpatch.apply(entity, patches, /*validate*/ true);
    } catch(err) {
      return Promise.reject(err);
    }

    return entity.save();
  };
}

function saveUpdates(updates) {
  return function(entity) {
    return entity.updateAttributes(updates)
      .then(updated => {
        return updated;
      });
  };
}

function removeEntity(res) {
  return function(entity) {
    if(entity) {
      return entity.destroy()
        .then(() => {
          res.status(204).end();
        });
    }
  };
}

function handleEntityNotFound(res) {
  return function(entity) {
    if(!entity) {
      res.status(404).end();
      return null;
    }
    return entity;
  };
}

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    res.status(statusCode).send(err);
  };
}

// Gets a list of <model>
export function index(req, res) {
  var selector = {};

  if(req.query.include){
    var includeList = req.query.include.slice(1,req.query.include.length -1).split(',');
    generateIncludeList(includeList,selector)
  }
  if(req.query.where){
    var whereString = req.query.where.slice(1,req.query.where.length -1);
    generateWhereList(whereString,selector)
  }
  
  selector.logging = true;

  return db[capitalizeFirstLetter(snakeToCamel(req.params.model))].findAll(selector)
    .then(respondWithResult(res))
    .catch(handleError(res))
}

// Gets a single <model> from the DB
export function show(req, res) {
  return CompassCopy.find({
    where: {
      compass_copy_id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Creates a new <model> in the DB
export function create(req, res) {
  return CompassCopy.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

// Upserts the given <model> in the DB at the specified ID
export function upsert(req, res) {
  if(req.body.compass_copy_id) {
    delete req.body.compass_copy_id;
  }

  return CompassCopy.upsert(req.body, {
    where: {
      compass_copy_id: req.params.id
    }
  })
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Updates an existing <model> in the DB
export function patch(req, res) {
  if(req.body.compass_copy_id) {
    delete req.body.compass_copy_id;
  }
  return CompassCopy.find({
    where: {
      compass_copy_id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Deletes a <model> from the DB
export function destroy(req, res) {
  return CompassCopy.find({
    where: {
      compass_copy_id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}



function toUnderscore(){
  return this.replace(/([A-Z])/g, function($1){return "_"+$1.toLowerCase();});
};

function snakeToCamel(s){
  return s.replace(/(\_\w)/g, function(m){return m[1].toUpperCase();});
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}






function generateIncludeList(includeList,inputObject){
  var objectWithInclude = inputObject;

   includeList.forEach((item,i)=>{
     var linkToParent = objectWithInclude;
     var tables = item.split('.');

     tables.forEach((tableName,i)=>{
       var tableName = capitalizeFirstLetter(snakeToCamel(tableName))
       var linkToModel = db[tableName];

       if(!linkToParent.include) linkToParent.include=[];
       if( !_.find(linkToParent.include,({model:linkToModel,as:capitalizeFirstLetter(snakeToCamel(tableName))}))) linkToParent.include.push({model:linkToModel,as:capitalizeFirstLetter(snakeToCamel(tableName))});
       linkToParent = _.find(linkToParent.include,({model:linkToModel,as:capitalizeFirstLetter(snakeToCamel(tableName))}))
     })

   });
}


function generateWhereList(whereString,inputObject){
  var conditions = [];
  var tables;

  while(whereString){
    let sign;
    if(whereString[0]=='['){ sign = 'AND'}
    else if(whereString.slice(0,3)=='AND'){ sign = 'AND';whereString=whereString.slice(3)}
    else if(whereString.slice(0,2)=='OR'){ sign = 'OR';whereString=whereString.slice(2)}
    else{ return}

    let conditionArray = whereString.slice(whereString.indexOf('[')+1,whereString.indexOf(']')).split(',')
    whereString = whereString.slice(whereString.indexOf(']')+1);

    conditionArray[0]=conditionArray[0].split('.');

    let column = conditionArray[0].pop();
    conditions.push({path :conditionArray[0],
      column : column,
      operator : conditionArray[1],
      value : conditionArray[2],
      sign: sign
    });
  }

  var paths = [];

  var linkToPreviousAnd = {$and:[]}
  inputObject.where= {$or:[linkToPreviousAnd]},

  conditions.forEach((item,i)=>{
    if(item.path.length) paths.push(item.path.join('.'));

    let newSelector = {};
    if(!item.path.length){
      newSelector[item.column] = {};
      newSelector[item.column][item.operator]=item.value;
    }else{
      let camelPaths = item.path.map(function(item){return capitalizeFirstLetter(snakeToCamel(item))}).join('.')
      newSelector[`$${camelPaths}.${item.column}$`]={};
      newSelector[`$${camelPaths}.${item.column}$`][item.operator]=item.value;
    }

    if(item.sign=='AND'){
      linkToPreviousAnd.$and.push(newSelector)
    }else if(item.sign=='OR'){
      linkToPreviousAnd = {$and:[]}
      linkToPreviousAnd.$and.push(newSelector)
      inputObject.where.$or.push(linkToPreviousAnd)
    }

  });

  generateIncludeList(paths,inputObject)
}
