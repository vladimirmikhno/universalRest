# universalRest

This module is for:
1)creating  sequelize models and relations(without constraints) from MySQL schema
2)creating universal rest API with this models



1) GET /rest/<model_name>?<option>=<value>

Option List :

1) include = [<table_name>.<table_name>.<table_name>,<table_name>.<table_name>,<table_name>.<table_name>.<table_name>]

Join selected tables to result. Tables in path should be separated by '.', and different paths should be separated by ','.
If tables related to other table via two or more fields, then you should use <table_name:column_field> instead of <table_name> in path.
Path should be started from table,that have relation with <model_name>.

2 ) where = [[<path.to.column>,<operator>,<value>]<LOGIC OPERATOR>[<path.to.column>,<operator>,<value>]<LOGIC OPERATOR>[...]....]

Create where statement.
<path.to.column> is like path to table, but should be ended with column_name.
<LOGIC OPERATOR> can be OR or AND. Only one level of logic is supported;

You can find list of operators here : http://docs.sequelizejs.com/en/latest/docs/querying/
Value should be without any '',"". If you need to use more than one value, then you should send it in 4,5,6.. arguments: [<path.to.column>,<operator>,<value1>,<value2>,<value3>]

3) attributes =[[<table_path>,<column_name_1>,<column_name_2>. . .],[. . .],...].

By default all columns will be loaded with each table, if you want to configure your own list of fields, then you should send list of requered fields.
Attributes don't work with agregate parameter.
If table is current , then you should skip first element in list : [,<column_name_1>,<column_name_2>. . .]

4) agregate = [<path.attribute>,<function>,<alias>,<groupBy.attribute>]

Use agregate function for selected field.

If you wan to get list of distinct values of field in some table   do:  agregate = [<attribute>,DISTINCT,<alias>]. It doesn't work with nested tables.

5) order =[[path.path.column,ASC/DESC],[...]]

6) count= true;
7) limit =<number>
8) offset = <number>

9) raw =true .
Return rows from SQL answer.


2) POST /rest/<model_name>

New object parameters should be in req.body
If you want to create many objects, then they should be located in req.body.array

3) PUT /rest/<model_name> Put is for upsert records. Put shouldn't be used for updating fields of objects.

New object parameters should be in req.body
If you want to create many objects, then they should be located in req.body.array

4)PATCH /rest/<model_name>?where=[[..]AND[...]OR...]

Fields with changes should be in req.body. Where selector is the same as for GET request. If you want to update all
records in table you should use empty=true parameter in request.

5)DELETE /rest/<model_name>?where=[[..]AND[...]OR...]

Where selector is the same as for GET request. If you want to delete all
records in table you should use empty=true parameter in request.