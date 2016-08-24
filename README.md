# universalRest

This module is for:
1)creating  sequelize models and relations(without constraints) from MySQL schema
2)creating universal rest API with this models



universalApi

1) GET   /rest/<model_name>?<option>=<value>

Option List : 

 1) include = ['a.b.c','d.e','a.b.d']
 join selected tables to result
                
 2 ) where = [['a.b.c',$eq,4]OR['a',$in,3,4,5,6]AND[...]....]
  Create where statement.
  You can find  list of operators here : http://docs.sequelizejs.com/en/latest/docs/querying/
  
  
 3) attributes =[['<table_path>',column,column...],[...],...]
 
    if table  is current , then skip first element in list like : [,a,b,c]
 
 4) agregate =  [<path.attribute>,<function>,<alias>,<groupBy.attribute>]

example = rest/compass_navigator_group?&where=[[compass_navigators.name_first,$eq,Vova]]
                                       &agregate=[compass_navigators.compass_navigators_id,count,CountOfVovasInEachGroup,compass_group_id]



5) count= true

6) limit =<number>
7) offset = <number>
