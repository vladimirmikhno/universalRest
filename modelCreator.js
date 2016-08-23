
'use strict'
const fs = require('fs')
    ,path = require('path')
    , _ = require('underscore'),
 sequelizeDB = require('./sequelizeDB'),
 DBConfig  = require('./settings.json').DBConfig;



if(DBConfig.type='Sequelize'){
    generateEntitiesForSequelize();
}else if(DBConfig.type='Sequelize'){
    generateEntitiesForSQL()
}

//======================================================================================================================
//======================================================================================================================
//======================================================================================================================

function generateEntitiesForSQL(){
    deleteFolderRecursive(path.join(__dirname,'SQL'));
    deleteFolderRecursive(path.join(__dirname,'DBdata'));
    fs.mkdirSync(path.join(__dirname,'SQL'));
    fs.mkdirSync(path.join(__dirname,'SQL','models'));
    fs.mkdirSync(path.join(__dirname,'DBdata'));
};

//======================================================================================================================
//======================================================================================================================
//======================================================================================================================


function generateEntitiesForSequelize() {

    deleteFolderRecursive(path.join(__dirname,'sequelize'));
    deleteFolderRecursive(path.join(__dirname,'DBdata'));
    fs.mkdirSync(path.join(__dirname,'sequelize'));
    fs.mkdirSync(path.join(__dirname,'sequelize','models'));
    fs.mkdirSync(path.join(__dirname,'DBdata'));

    generateModelsForSequilize()
    generateRelationsForSequilize()
}



function generateModelsForSequilize(){

    sequelizeDB.sequelize.query("select table_name,column_name,is_nullable,column_type,column_key,extra from information_schema.columns where table_schema= ? ", {
            replacements: [DBConfig.database],
            type: sequelizeDB.sequelize.QueryTypes.SELECT})
        .then(function(columns) {

            var groupedColumns = _.groupBy(columns,'table_name');

            fs.writeFile(path.join(__dirname,'DBdata','tablesData.json'),JSON.stringify(groupedColumns)),

                Object.keys(groupedColumns).forEach(function(table){
                    // if(table!='air_segment') return;

                    let columns = groupedColumns[table]

                    let content =
                        `/*This file was generated by universalRest module */
/* Sequelize model: ${table}*/
/*Table schema: ${DBConfig.database}*/

export default function(sequelize, DataTypes) {
  return sequelize.define('${table}', {

`;

                    columns.forEach(function(column){
                        var dataType = getSequelizeDataTypeFromMysqlType(column.column_type)

                        content +=`
${column.column_name}: {
    type: DataTypes.${dataType[0]}${dataType[1]?'('+dataType[1]+(dataType[2]?','+dataType[2]:'')+')':''},
    allowNull: ${column.is_nullable=='YES'?true:false},\
${column.column_key && column.column_key == 'PRI'?'\n    primaryKey:true,':''}\
${column.extra && column.extra  == 'auto_increment'?'\n    autoIncrement: true,':''}\
},
`
                    })

                    content +=`
  }, {
    timestamps: false,
    tableName: '${table}'
  });
}
`
                    fs.writeFile(path.join(__dirname,'sequelize','models',snakeToCamel(table)+'.model.js'),content)
                });
        });


    function getSequelizeDataTypeFromMysqlType(type){
        if(!!~type.indexOf('(')){
            var typeArr = [type.slice(0,type.indexOf('('))].concat(type.slice(type.indexOf('(')+1,type.indexOf(')')).split(','))
        }

        if (typeArr){
            switch(typeArr[0]){
                case 'bit':
                    return ['INTEGER']
                case 'char':
                    return ['CHAR',typeArr[1]]
                case 'decimal':
                    return ['DECIMAL',typeArr[1],typeArr[2]]
                case 'int':
                    return ['INTEGER']
                case 'text':
                    return ['TEXT']
                case 'tinyint':
                    return ['INTEGER']
                case 'varchar':
                    return ['STRING',typeArr[1]]
            }

        }else{
            switch(type){
                case 'date':
                    return ['DATEONLY']
                case 'datetime':
                    return ['DATE']


                case 'bit':
                    return ['INTEGER']
                case 'char':
                    return ['CHAR']
                case 'decimal':
                    return ['DECIMAL']
                case 'int':
                    return ['INTEGER']
                case 'text':
                    return ['TEXT']
                case 'tinyint':
                    return ['INTEGER']
                case 'varchar':
                    return ['STRING']
            }
        }
    }
}


function generateRelationsForSequilize(){

    sequelizeDB.sequelize.query(`SELECT
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE.table_name,                            -- Foreign key table
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE.column_name,                           -- Foreign key column
    referenced_table_name,                 -- Origin key table
    referenced_column_name,                 -- Origin key column
    columns_1.column_key first_type,
        columns_2.column_key second_type

    FROM
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE  -- Will fail if user don't have privilege

    LEFT JOIN  information_schema.columns columns_1  ON  (columns_1.table_schema  =  INFORMATION_SCHEMA.KEY_COLUMN_USAGE.TABLE_SCHEMA
    AND columns_1.table_name  =  INFORMATION_SCHEMA.KEY_COLUMN_USAGE.TABLE_NAME
    AND columns_1.column_name  =  INFORMATION_SCHEMA.KEY_COLUMN_USAGE.COLUMN_NAME)

    LEFT JOIN  information_schema.columns columns_2  ON  (columns_2.table_schema  =  INFORMATION_SCHEMA.KEY_COLUMN_USAGE.TABLE_SCHEMA
    AND columns_2.table_name  =  INFORMATION_SCHEMA.KEY_COLUMN_USAGE.referenced_TABLE_NAME
    AND columns_2.column_name  =  INFORMATION_SCHEMA.KEY_COLUMN_USAGE.referenced_COLUMN_NAME)
    WHERE
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE.TABLE_SCHEMA = ?                -- Detect current schema in USE
    AND INFORMATION_SCHEMA.KEY_COLUMN_USAGE.REFERENCED_TABLE_NAME IS NOT NULL
    Order BY INFORMATION_SCHEMA.KEY_COLUMN_USAGE.TABLE_NAME, REFERENCED_TABLE_NAME`, {
        replacements: [DBConfig.database],
        type: sequelizeDB.sequelize.QueryTypes.SELECT}).then(function(relations) {
            fs.writeFile(path.join(__dirname,'DBdata','relationsData.json'),JSON.stringify(relations));

            var content = `/*This file was generated by universalRest module */
/*Table schema : ${DBConfig.database}*/

const db = require('../sequelizeDB');

`;

            let models = fs.readdirSync(path.join(__dirname,'sequelize','models'))
            models.forEach((item,i)=>{models[i]=models[i].slice(0,models[i].length-3)})
            models.forEach((item)=>{content += ` 
db.${capitalizeFirstLetter(snakeToCamel(item.slice(0,item.indexOf('.model'))))} = db.sequelize.import('./models/${snakeToCamel(item)}');`
            })

        content +=`
        
`;

        relations.forEach((item)=>{
            if(item.second_type!='PRI' || !item.column_name || !item.referenced_column_name) return;

            if(item.first_type=='MUL'){
            content+= `db.${capitalizeFirstLetter(snakeToCamel(item.table_name))}.belongsTo(db.${capitalizeFirstLetter(snakeToCamel(item.referenced_table_name))}, {foreignKey: '${item.column_name}',targetKey: '${item.referenced_column_name}',constraints:false, as:'${capitalizeFirstLetter(snakeToCamel(item.referenced_table_name))}'});
db.${capitalizeFirstLetter(snakeToCamel(item.referenced_table_name))}.hasMany(db.${capitalizeFirstLetter(snakeToCamel(item.table_name))}, {foreignKey: '${item.column_name}', constraints:false, as:'${capitalizeFirstLetter(snakeToCamel(item.table_name))}'});
`
            }
            else if(item.first_type=='UNI' || item.first_type=='PRI' ){
                content+= `db.${capitalizeFirstLetter(snakeToCamel(item.table_name))}.belongsTo(db.${capitalizeFirstLetter(snakeToCamel(item.referenced_table_name))}, {foreignKey: '${item.column_name}',targetKey: '${item.referenced_column_name}',constraints:false,as:'${capitalizeFirstLetter(snakeToCamel(item.referenced_table_name))}'});
db.${capitalizeFirstLetter(snakeToCamel(item.referenced_table_name))}.belongsTo(db.${capitalizeFirstLetter(snakeToCamel(item.table_name))}, {foreignKey: '${item.referenced_column_name}',targetKey: '${item.column_name}',constraints:false,as:'${capitalizeFirstLetter(snakeToCamel(item.table_name))}'});
`
            }
        });



        fs.writeFile(path.join(__dirname,'sequelize','relations.js'),content);

    })
}


function deleteFolderRecursive(path) {
    if( fs.existsSync(path) ) {
        fs.readdirSync(path).forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};


function snakeToCamel(s){
    return s.replace(/(\_\w)/g, function(m){return m[1].toUpperCase();});
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
