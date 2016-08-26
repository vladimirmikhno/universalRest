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

function respondWithResult(res, statusCode,limit, offset, haveNestedWhere,count) {

  statusCode = statusCode || 200;
  return function(entity) {
    if(entity) {
      // We created limit and offset at server side( not at DB side) until this bug will be fixed https://github.com/sequelize/sequelize/issues/3007
      if((limit||offset) && haveNestedWhere) {
        var limitedEntity= _.cloneDeep(entity).slice(offset || 0,+(offset || 0) + +limit)
      }
      var resObj = {data:limitedEntity|| entity}
      if(count) resObj.count=resObj.data.length;

      return res.status(statusCode).json(resObj);
    }
    return res.status(statusCode).json({status:'updated'});;
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
  var method = 'findAll'

  if(req.query.include){
    var includeList = req.query.include.slice(1,req.query.include.length -1).split(',');
    generateIncludeList(includeList,selector)
  }
  if(req.query.where){
    var whereString = req.query.where.slice(1,req.query.where.length -1);
    var haveNestedWhere=generateWhereList(whereString,selector)
  }
  if(req.query.attributes){
    var attributestring = req.query.attributes.slice(1,req.query.attributes.length -1);
    generateAttributesList(attributestring,selector)
  }
  if(req.query.agregate){
    var agregateString = req.query.agregate.slice(1,req.query.agregate.length -1).split(',');
    generateAgregateList(agregateString,selector,req.params.model);
  }
  if(req.query.limit){
    // We will create limit and offset at server side( not at DB side) until this bug will be fixed https://github.com/sequelize/sequelize/issues/3007
    if(!haveNestedWhere) selector.limit = +req.query.limit;
  }
  if(req.query.offset){
    if(!haveNestedWhere)  selector.offset = +req.query.offset;
  }
  if(req.query.raw){
    selector.raw = true;
  }
  if(req.query.order){
    var orderString = req.query.order.slice(1,req.query.order.length -1)
    generateOrderList(orderString,selector);
  }

  selector.logging = true;

  return db[capitalizeFirstLetter(snakeToCamel(req.params.model))].findAll(selector)
    .then(respondWithResult(res,undefined,req.query.limit,req.query.offset,haveNestedWhere,req.query.count))
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

  if(req.body.array){
    var mode ='bulkCreate'
    var data =[]

    req.body.array.forEach((item)=>{
      var oneData = {};
      Object.keys(item).forEach((itemColumn)=>{oneData[toUnderscore(itemColumn)]= item[itemColumn]});
      data.push(oneData)
    })
  }else{
    var mode ='create'
    var data = {};
    Object.keys(req.body).forEach((item)=>{data[toUnderscore(item)]= req.body[item]});
  }

  return db[capitalizeFirstLetter(snakeToCamel(req.params.model))][mode](data)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

// Upserts the given <model> in the DB at the specified ID
export function upsert(req, res) {

  if(req.body.array){
    //'bulkUpsert'
    var data =[]

    req.body.array.forEach((item)=>{
      var oneData = {};
      Object.keys(item).forEach((itemColumn)=>{oneData[toUnderscore(itemColumn)]= item[itemColumn]});
      data.push(oneData)
    });

    return db[capitalizeFirstLetter(snakeToCamel(req.params.model))].bulkCreate(data, {logging:true,updateOnDuplicate: true })
      .then(respondWithResult(res, 201))
      .catch(handleError(res));

  }else{
    //' single upsert'

    return db[capitalizeFirstLetter(snakeToCamel(req.params.model))].upsert(req.body)
      .then(respondWithResult(res))
      .catch(handleError(res));
  }
}

// Updates an existing <model> in the DB
export function patch(req, res) {

  var selector = {};

  var changes = {};
  Object.keys(req.body).forEach((item)=>{changes[toUnderscore(item)]= req.body[item]});

  if(req.query.where){
    var whereString = req.query.where.slice(1,req.query.where.length -1);
    var haveNestedWhere=generateWhereList(whereString,selector)
  }

  return db[capitalizeFirstLetter(snakeToCamel(req.params.model))].find(selector)
    .then(handleEntityNotFound(res))
    .then(saveUpdates(changes))
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

//===================================================================================================================

function toUnderscore(s){
  return s.replace(/([A-Z])/g, function($1){return "_"+$1.toLowerCase();});
};

function snakeToCamel(s){
  return s.replace(/(\_\w)/g, function(m){return m[1].toUpperCase();});
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function parseValue(array){
  if(array.length==1) return array[0].toLowerCase()=='null'?null:array[0];
  return array;
}

//===================================================================================================================

function generateIncludeList(includeList,inputObject){
  var objectWithInclude = inputObject;

   includeList.forEach((item,i)=>{
     var linkToParent = objectWithInclude;
     var tables = item.split('.');

     tables.forEach((tableName,i)=>{
       var tableName = capitalizeFirstLetter(snakeToCamel(tableName))
       var linkToModel = !!~tableName.indexOf(':')? db[tableName.slice(0,tableName.indexOf(':'))]:db[tableName];



       if(!linkToParent.include) linkToParent.include=[];
       if( !_.find(linkToParent.include,({model:linkToModel,as:capitalizeFirstLetter(snakeToCamel(tableName))}))) linkToParent.include.push({model:linkToModel,as:capitalizeFirstLetter(snakeToCamel(tableName))});
       linkToParent = _.find(linkToParent.include,({model:linkToModel}))
     })

   });
}


function generateWhereList(whereString,inputObject){
  var conditions = [];

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
      value : conditionArray.slice(2),
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
      newSelector[item.column][item.operator]=parseValue(item.value);
    }else{
      let camelPaths = item.path.map(function(item){return capitalizeFirstLetter(snakeToCamel(item))}).join('.')
      newSelector[`$${camelPaths}.${item.column}$`]={};
      newSelector[`$${camelPaths}.${item.column}$`][item.operator]=parseValue(item.value);
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

  //return flag,that shows do we have expressions with nested tables in where
  return paths.length
}


function generateAttributesList(attributeString,inputObject){
  var tables = attributeString.replace(/\]\,/g,'];').replace(/[\[\]]/g,'').split(';')

  tables.forEach(function(item,i){
    item = item.split(',')
    let path = item[0];
    let columns = item.slice(1);
    if (!path.trim()){
      if (!inputObject.attributes) inputObject.attributes  =  [];
      inputObject.attributes = inputObject.attributes.concat(columns);
    }else{
      path = path.split('.');
      path = path.map(function(item){return capitalizeFirstLetter(snakeToCamel(item))});
      let linkToIncludedModel = inputObject;
      path.forEach(function(table,i){

        linkToIncludedModel = _.find(linkToIncludedModel.include,{as :capitalizeFirstLetter(snakeToCamel(table))})
        if(i ==path.length-1){
          if (!linkToIncludedModel.attributes) linkToIncludedModel.attributes = [];
          linkToIncludedModel.attributes = linkToIncludedModel.attributes.concat(columns);
        }
      })
    }
  });
}


function generateAgregateList(attributeList,selector,modelName){
  attributeList[0] = attributeList[0].split('.');
  attributeList[3] = attributeList[3].split('.');

  var column = attributeList[0].pop(),
    path= attributeList[0].map((item)=>{return capitalizeFirstLetter(snakeToCamel(item))}).join('.'),
    func   = attributeList[1],
    alias= attributeList[2],
    groupColumn = attributeList[3].pop(),
    groupPath  =  attributeList[3].map((item)=>{return capitalizeFirstLetter(snakeToCamel(item))}).join('.'),
    attributeFlag = attributeList[4];


    selector.attributes = {include:[],exclude:[]}

    if (!path.trim()){

      selector.attributes.include.push([db.sequelize.fn(func, db.sequelize.col(modelName+'.'+column)), alias])
      if (groupColumn && !groupPath) selector.group= [modelName+'.'+groupColumn]

    }else{
      selector.attributes.include.push([db.sequelize.fn(func, db.sequelize.col(path+'.'+column)), alias])
      if(groupColumn) selector.group= [groupPath?groupPath:modelName+'.'+groupColumn]
    }

  }

function generateOrderList(orderString,selector){

  var orderList = orderString.replace(/\]\,/g,'];').replace(/[\[\]]/g,'').split(';')

  selector.order = [];

  orderList.forEach((item,i)=>{

    var arr = item.split(',');
    var ascDesc = arr[1];
    var arr2 = arr[0].split('.');
    var columnName = arr2.pop();
    var tables = arr2.map((item)=>{return capitalizeFirstLetter(snakeToCamel(item))})

    var result = [];
    tables.forEach((item)=>{
      var linkToModel = !!~item.indexOf(':')? db[item.slice(0,item.indexOf(':'))]:db[item];
      result.push({model:linkToModel,as:item})
    })
    result.push(columnName);
    result.push(ascDesc);


    selector.order.push(result);
  })


}
