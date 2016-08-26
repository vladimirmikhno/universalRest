"use strict";
import compose from 'composable-middleware';

const EnabledTablesForGET = [];
const EnabledTablesForPOST = [];
const EnabledTablesForPATCH = [];
const EnabledTablesForDELETE = [];


export function checkEnabledTables(method) {

  var tables = method=='GET'? EnabledTablesForGET: method=='POST'? EnabledTablesForPOST: method=='PATCH'?EnabledTablesForPATCH: method=='DELETE' ? EnabledTablesForPATCH:[]

  return compose()
    .use(function(req,res,next){
      if(!!~tables.indexOf(req.params.model)){ return next();}
      return res.status(403).end();
    })
}
