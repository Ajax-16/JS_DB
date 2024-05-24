import dbMethods from './algorithms/array_methods.js';
import { treeSearch } from './algorithms/tree_search.js';
import { Cache } from './utils/cache.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * @class DB
 * @description Represents a reference to a Nue Data Base.
 */
export class DB {

    /**
    * @property {Array} tables - An array to store tables in the database.
    */
    tables = [];
    /**
    * @property {Array} sysTables - An array to store tables in the system database.
    */
    sysTables = [];
    /**
    * @property {Array} rmap - An array to store the database structure.
    */
    rmap = [];
    /**
    * @property {string} name - The name of the database.
    */
    name = 'db';
    /**
    * @property {string} dbFilePath - The file path to the current database.
    */
    dbFilePath = '';
    /**
    * @property {string} sysFilePath - The file path to the system database.
    */
    sysFilePath = '';
    /**
    * @property {string} rmapFilePath - The file path to the current database rmap.
    */
    rmapFilePath = '';
    /**
    * @property {Array} keywords - An array of keywords used for checking table names.
    */
    keywords = ['EXCEPTION ENCOUNTER']

    /**
    * @property {boolean} initialized - Indicates whether the database has been initialized.
    */
    initialized = false;

    /**
    * @property {Cache}
    */
    cache;

    /**
     * Creates an instance of DB.
     * @constructor
     * @param {number} [cacheBufferSize=65536] - The size of the predefined cache buffer.
     */
    constructor(cacheBufferSize = 65536) {
        this.cache = new Cache(cacheBufferSize);
        fs.mkdir(getFolder('data'), { recursive: true });
    }

    /**
    * @async
    * @method init
    * @description Initializes the database by loading existing data.
    * @returns {Promise<void>}
    */
    async init(dbFolder, dbName) {
        try {
            this.dbFilePath = await getFilePath(dbName, dbFolder);
            if (dbFolder === 'data') {
                this.rmapFilePath = await getFilePath(dbName + ".rmap", 'rmaps');
                const rmapContent = await fs.readFile(this.rmapFilePath, 'utf8');
                this.rmap = JSON.parse(rmapContent);
            }
            this.name = dbName;
            const dbContent = await fs.readFile(this.dbFilePath, 'utf8');
            this.tables = JSON.parse(dbContent);
            this.initialized = true;
        } catch (readError) {

        }
        return this.initialized;
    }

    /**
   * @method createTable
   * @description Creates a new table in the database.
   * @param {Object} options - Options for creating the table.
   * @param {string} options.tableName - The name of the table.
   * @param {string} options.primaryKey - The primary key of the table.
   * @param {Array} options.columns - An array of column names.
   * @param {Array<{name, columnName, referenceTable, referenceColumn}>} options.foreignKeys - An array of column names.
   * @returns {Promise<boolean>|Array} True if the table was created successfully; otherwise, it returns an array of arrays containing the error.
   */
    createTable({ tableName = 'table', primaryKey = 'id', columns = [], foreignKeys }) {

        if (!this.initialized) {
            return [['EXCEPTION ENCOUNTER'], ['TABLE CANNOT BE CREATED! NO DATABASE INITIALIZED!']];
        }

        let tableExist = this.getOneTable(tableName);

        if (tableExist[0][0] !== 'EXCEPTION ENCOUNTER') {
            return [['EXCEPTION ENCOUNTER'], ['TABLE CANNOT BE CREATED! TABLE NAME "' + tableName + '" ALREADY IN USE!']];
        }

        const isKeyWord = treeSearch(this.keywords, tableName);

        if (isKeyWord !== -1) {
            return [['EXCEPTION ENCOUNTER'], ['TABLE WITH NAME "' + tableName + '" NOT CREATED! TABLE NAME "' + tableName + '" IS A KEYWORD!']];
        }

        const isValid = treeSearch(tableName, " ");
        if (isValid !== -1) {
            return [['EXCEPTION ENCOUNTER'], ['TABLE WITH NAME "' + tableName + '" NOT CREATED! TABLE NAMES CANNOT HAVE WHITESPACES']];
        }

        let table = [[], []];

        table[0][0] = tableName;

        table[1][0] = primaryKey;

        let headers = {};

        headers.elements = 0;

        dbMethods.insert(table[0], headers);

        if (foreignKeys !== undefined) {

            let foreignColumns = [];

            table[0][1].references = []

            for (const foreignKey of foreignKeys) {

                let { name, columnName, referenceTable, referenceColumn } = foreignKey;

                const referenceTableExist = this.getOneTable(referenceTable);

                if (referenceTableExist[0][0] === 'EXCEPTION ENCOUNTER') {
                    return false;
                }

                const referenceColumnExist = treeSearch(referenceTableExist[1], referenceColumn)
                if (referenceColumnExist === -1) {
                    return false;
                }

                if (name === undefined) {
                    name = "fk_".concat(referenceTable.concat(`_${referenceColumn}`));
                }

                table[0][1].references.push({ name, columnName, referenceTable, referenceColumn })

                dbMethods.insert(foreignColumns, foreignKey.columnName)
            }

            let allcolumns = [...columns, ...foreignColumns]

            if (!dbMethods.hasDuplicity(allcolumns)) {
                for (let i = 0; i < allcolumns.length; i++) {
                    table[1][i + 1] = allcolumns[i];
                }
            } else {
                return false;
            }

        } else {

            if (!dbMethods.hasDuplicity(columns)) {
                for (let i = 0; i < columns.length; i++) {
                    table[1][i + 1] = columns[i];
                }
            } else {
                return false;
            }

        }

        dbMethods.insert(this.tables, table);

        this.updateRmap({ name: table[0][0], columns: table[1], references: table[0][1].references });

        return true;

    }

    updateRmap(newTable, levels = this.rmap) {

        const newTableToAdd = {
            name: newTable.name,
            columns: newTable.columns,
            contains: []
        }

        if (newTable.references) {
            for (const reference of newTable.references) {
                for (const level of levels) {
                    if (level.contains) {
                        this.updateRmap(newTable, level.contains);
                    }
                }
                for (const level of levels) {
                    if (level.name === reference.referenceTable) {
                        level.contains.push(newTableToAdd)
                    }
                }
            }
        } else {
            levels.push(newTableToAdd)
        }
    }

    /**
    * @method dropTable
    * @description Drops an existing table from the database.
    * @param {string} tableName - The name of the table to drop.
    * @returns {Promise<boolean>} True if the table was successfully dropped; otherwise, it returns false.
    */
    dropTable(tableName) {
        if (!this.initialized) {
            return false;
        }

        let result;

        let tableNames = this.showAllTableNames();

        let tableIndex = treeSearch(tableNames, tableName);

        if (tableIndex === -1) {
            result = false;
        }

        result = dbMethods.deleteByIndex(this.tables, tableIndex);

        return result;

    }

    /**
    * @method alterTable
    * @description Alters the specified table's columns or columns' names.
    * @param {String} tableName The name of the table to alter.
    * @param {String} operation The operation to perform on the table.
    * @param {String} target The target to alter.
    */
    alterTable({ tableName, operation, target, options = { save: false }, elements }) {
        if (!this.initialized) {
            return [['EXCEPTION ENCOUNTER'], ['ANY TABLES FOUND! NO DATABASE INITIALIZED!']];
        }

        let table = this.getOneTable(tableName);
        if (table[0] === 'EXCEPTION ENCOUNTER') {
            result = false;
        }

        operation = operation.toUpperCase();
        target = target.toUpperCase();

        switch (operation) {

            case 'ADD':

                switch (target) {

                    case 'COLUMN':

                        elements.forEach((column) => {
                            if (treeSearch(table[1], column.name) === -1) {
                                dbMethods.insert(table[1], column.name);
                                if (column.void) {
                                    for (let i = 2; i < table.length; i++) {
                                        dbMethods.insert(table[i], null);
                                    }
                                }
                            } else {
                                console.log('column already exists');
                            }

                        })

                        break;

                    case 'REFERENCE':



                        break;

                }

                break;

            case 'DROP':

                switch (target) {

                    case 'COLUMN':



                        break;

                    case 'REFERENCE':



                        break;

                }

                break;

            case 'RENAME':

                switch (target) {

                    case 'COLUMN':



                        break;

                    case 'REFERENCE':



                        break;

                }

                break;

            default:

                console.log('UNKNOWN ALTERING OPERATION!')
                return false;

        }

    }

    /**
    * @method getAllTables
    * @description Retrieves all tables in the database.
    * @returns {Array} An array containing all tables.
    */
    getAllTables() {
        if (!this.initialized) {
            return [['EXCEPTION ENCOUNTER'], ['ANY TABLES FOUND! NO DATABASE INITIALIZED!']];
        }
        return this.tables;
    }

    /**
    * @method getOneTable
    * @description Retrieves a specific table by name.
    * @param {string} tableName - The name of the table to retrieve.
    * @returns {Array} An array representing the specified table.
    */
    getOneTable(tableName) {
        if (!this.initialized) {
            return [['EXCEPTION ENCOUNTER'], ['TABLE NOT FOUND! NO DATABASE INITIALIZED!']];
        }
        let tableNames = this.showAllTableNames();
        let position = treeSearch(tableNames, tableName);
        if (position !== -1) {
            return this.tables[position];
        }
        return [['EXCEPTION ENCOUNTER'], ['TABLE "' + tableName + '" NOT FOUND!']];
    }

    /**
    * @method showAllTables
    * @description Retrieves all tables with shortened names for display.
    * @returns {Array} An array of tables with shortened names.
    */
    showAllTables() {
        if (!this.initialized) {
            return [['EXCEPTION ENCOUNTER'], ['ANY TABLES FOUND! NO DATABASE INITIALIZED!']];
        }
        let tablesCopy = dbMethods.deepCopy(this.tables);
        for (let i = 0; i < tablesCopy.length; i++) {
            tablesCopy[i][0] = tablesCopy[i][0].slice(0, 1);
        }
        return tablesCopy;
    }

    /**
    * @method showAllTableNames
    * @description Retrieves the name of all tables in the database.
    * @returns {Array} An array containing the name of all tables.
    */
    showAllTableNames() {
        if (!this.initialized) {
            return [['EXCEPTION ENCOUNTER'], ['ANY TABLES FOUND! NO DATABASE INITIALIZED!']];
        }
        let tableNames = [];
        for (let i = 0; i < this.tables.length; i++) {
            dbMethods.insert(tableNames, this.tables[i][0][0]);
        }
        return tableNames;
    }

    /**
    * @method describeOneTable
    * @description Retrieves information about a specific table.
    * @param {string} tableName - The name of the table to describe.
    * @returns {Array} An array containing information about the specified table.
    */
    describeOneTable(tableName) {
        if (!this.initialized) {
            return [['EXCEPTION ENCOUNTER'], ['TABLE NOT FOUND! NO DATABASE INITIALIZED!']];
        }
        let tableNames = this.showAllTableNames();
        let position = treeSearch(tableNames, tableName);
        if (position !== -1) {
            let tableDesc = [[...this.tables[position][0]]];
            tableDesc[0] = tableDesc[0].slice(0, 1);
            dbMethods.insert(tableDesc, this.tables[position][1]);
            return tableDesc;
        }
        return [['EXCEPTION ENCOUNTER'], ['TABLE "' + tableName + '" NOT FOUND!']];
    }

    /**
    * @method insert
    * @description Inserts a new row into a specified table.
    * @param {Object} options - Options for inserting the row.
    * @param {string} options.tableName - The name of the table.
    * @param {Array} options.values - An array of values to insert.
    * @returns {Promise<boolean>|Array} True if the row was successfully inserted; otherwise, it returns an array of arrays containing the error.
    */
    insert({ tableName, columns, values }) {
        if (!this.initialized) {
            return [['EXCEPTION ENCOUNTER'], ['ROW CANNOT BE CREATED! NO DATABASE INITIALIZED!']];
        }

        let table = this.getOneTable(tableName);
        if (table[0][0] === 'EXCEPTION ENCOUNTER') {
            return [['EXCEPTION ENCOUNTER'], ['ROW CANNOT BE CREATED! TABLE "' + tableName + '" DOESN\'T EXISTS!']]
        }

        if (!columns) {
            columns = table[1].slice(1);
        }

        let columnNames = table[1];
        let elementsValue = table[0][1].elements;

        let row = new Array(columnNames.length).fill(null); // Crea una fila llena de nulls
        row[0] = elementsValue; // Establece el valor de auto incremento

        // Asigna valores a las columnas correspondientes
        for (let i = 0; i < columnNames.length; i++) {
            let columnName = columnNames[i];
            let columnIndex = columns.indexOf(columnName);
            if (columnIndex !== -1) {
                values[columnIndex] === undefined ? values[columnIndex] = null : values[columnIndex] = values[columnIndex];
                row[i] = values[columnIndex]; // Asigna el valor correspondiente a la columna
            }
        }

        dbMethods.insert(table, row);
        table[0][1].elements++; // Actualiza el contador de elementos en los encabezados de la tabla

        return true;

    }
    /**
    * @method delete
    * @description Deletes rows from a specified table based on a given condition.
    * @param {string} tableName - The name of the table.
    * @param {string} [condition=this.getOneTable(tableName)[1][0]] - The column used as the condition for the delete operation. Primary key by default.
    * @param {string} [operator='='] - The comparison operator for the condition. "=" by default.
    * @param {any} conditionValue - The value used for the condition.
    * @returns {Promise<boolean>} A boolean indicating whether the delete operation was successful or not.
    */
    delete({ tableName, conditions }) {
        if (!this.initialized) {
            return [['EXCEPTION ENCOUNTER'], ['ROW OR ROWS CANNOT BE DELETED! NO DATABASE INITIALIZED!']];
        }

        let table = this.getOneTable(tableName);
        if (table[0][0] === 'EXCEPTION ENCOUNTER') {
            return [['EXCEPTION ENCOUNTER'], ['ROW OR ROWS CANNOT BE DELETED! TABLE "' + tableName + '" DOESN\'T EXIST!']];
        }

        let { rows, success, errorMessage } = this.retrieveRowIndexes({ table, conditions });

        if (!success) {
            return [['EXCEPTION ENCOUNTER'], [errorMessage]];
        }

        if (rows.length > 0) {
            let deletedRowsCount = 0;
            for (let i = table.length - 1; i >= 2; i--) {
                if (treeSearch(rows, i) !== -1) {
                    dbMethods.deleteByIndex(table, i);
                    deletedRowsCount++;
                }
            }

            return [['RESULT'], [`DELETED ${deletedRowsCount} ROW(S)`]];
        }

        return [['RESULT'], [`0 ROWS DELETED`]];

    }

    /**
    * @method update
    * @description Updates rows in a specified table based on a given condition.
    * @param {string} tableName - The name of the table.
    * @param {Array<string>} set - The list of columns to be updated.
    * @param {Array<any>} setValues - The new values for the columns to be updated.
    * @param {string} condition - The column used as the condition for the update operation.
    * @param {string} [operator='='] - The comparison operator for the condition. "=" by default.
    * @param {any} conditionValue - The value used for the condition.
    * @returns {Promise<boolean>} A boolean indicating whether the update operation was successful or not.
    */
    update({ tableName, set = [], setValues, conditions }) {
        if (!this.initialized) {
            return [['EXCEPTION ENCOUNTER'], ['ROW OR ROWS CANNOT BE UPDATED! NO DATABASE INITIALIZED!']];
        }
        const table = this.getOneTable(tableName);

        const { rows, success, errorMessage } = this.retrieveRowIndexes({ table, conditions });

        if (!success) {
            return [['EXCEPTION ENCOUNTER'], [errorMessage]];
        }

        if (rows.length === 0) {
            return [['RESULT'], ['0 ROWS UPDATED']];
        }

        const columnIndexes = {};
        table[1].forEach((column, index) => {
            columnIndexes[column] = index;
        });

        let setColumnExist = { exist: true, columnName: null };

        const setIndexes = set.map(column => {
            const index = columnIndexes[column];
            if (index === undefined) {
                setColumnExist = { exist: false, columnName: column }
            }
            return index;
        });

        if (setColumnExist.exist === false) {
            return [['EXCEPTION ENCOUNTER'], ['ROW OR ROWS CANNOT BE UPDATED! CANNOT SET A VALUE TO COLUMN "' + setColumnExist.columnName + '" BECAUSE IT DOES\'T EXISTS!']]
        }

        let updated = false;
        let finalMsg = '';
        let totalUpdated = 0;

        let actualized = false;

        if (setValues && setValues.length === set.length) {
            for (const rowIndex of rows) {
                actualized = false
                for (let j = 0; j < set.length; j++) {
                    if (table[rowIndex][setIndexes[j]] !== setValues[j]) {
                        table[rowIndex][setIndexes[j]] = setValues[j];
                        actualized = true;
                    }
                }
                if (actualized) {
                    totalUpdated++;
                }
            }
            updated = totalUpdated > 0;
            finalMsg = updated ? `UPDATED ${totalUpdated} ROW(S)` : '0 ROWS UPDATED';
        }
        return [['RESULT'], [finalMsg]];
    }

    /**
    * @method find
    * @description Retrieves rows from a specified table based on certain conditions.
    * @param {string} tableName - The name of the table.
    * @param {Boolean} [distinct=false] - Whether to retrieve distinct rows.
    * @param {Array<String>} [columns=this.getOneTable(tableName)[1]] - The list of columns to retrieve. All columns by default.
    * @param {Array<{referenceTable, referenceColumn, columnName}>} joins
    * @param {string} [condition=this.getOneTable(tableName)[1][0]] - The column used as the condition for the search. Primary key by default.
    * @param {string} [operator='='] - The comparison operator for the condition. "=" by default.
    * @param {any} conditionValue - The value used for the condition.
    * @param {number} [offset=0] - The starting index from which to retrieve rows. 0 by default.
    * @param {number} limit - The maximum number of rows to retrieve.
    * @returns {Promise<Array<Array<any>>>} An array containing the retrieved rows, or an array indicating an exception encounter if no rows are found.
    */
    find({ tableName, distinct = false, columns, joins, conditions, offset = 0, limit, orderBy, asc = true }) {
        if (!this.initialized) {
            return [['EXCEPTION ENCOUNTER'], ['NO DATABASE INITIALIZED!']];
        }

        let table = this.getOneTable(tableName);
        if (table[0][0] === 'EXCEPTION ENCOUNTER') {
            return [['EXCEPTION ENCOUNTER'], ['TABLE ' + tableName + ' DOESN\'T EXIST!']];
        }

        if (joins) {
            table = this.joinTables(this.getOneTable(tableName), joins);
            if (table[0][0] === 'EXCEPTION ENCOUNTER') {
                return table;
            }
        }

        if (columns === undefined) {
            columns = table[1];
        }

        if (orderBy === undefined) {
            orderBy = table[1][0]
        }

        for (let i = 0; i < columns.length; i++) {
            if (!table[1].includes(columns[i])) {
                return [['EXCEPTION ENCOUNTER'], ['COLUMN "' + columns[i] + '" IS NOT A VALID COLUMN!']];
            }
        }

        let { rows, success, errorMessage } = this.retrieveRowIndexes({ table, conditions });

        if (!success) {
            return [['EXCEPTION ENCOUNTER'], [errorMessage]];
        }

        if (rows.length > 0) {

            if (distinct !== false) {
                const distinctRows = [];
                const set = new Set();
                for (const rowIndex of rows) {
                    // Creamos una firma para cada fila la cual va a ser un string con la fila en sí y así evitar que se repita.
                    let rowSignature = '';
                    for (const column of columns) {
                        const columnIndex = treeSearch(table[1], column);
                        if (columnIndex !== -1) {
                            rowSignature += table[rowIndex][columnIndex];
                        }
                    }
                    // Comprobamos que el SET no tenga ya esa firma y así evitar que se inserte en el array de filas a devolver.
                    if (!set.has(rowSignature)) {
                        distinctRows.push(rowIndex);
                        // Si no existe la firma en el SET, la añadimos.
                        set.add(rowSignature);
                    }
                }
                rows = distinctRows;
            }

            const orderColumnIndex = treeSearch(table[1], orderBy);
            if (orderColumnIndex === -1) {
                return [['EXCEPTION ENCOUNTER'], ['ORDER COLUMN "' + orderBy + '" DOESN\'T EXIST ON TABLE "' + tableName + '"!']];
            }

            rows.sort((rowIndexA, rowIndexB) => {
                const valueA = table[rowIndexA][orderColumnIndex];
                const valueB = table[rowIndexB][orderColumnIndex];
                if (asc) {
                    if (valueA < valueB) return -1;
                    if (valueA > valueB) return 1;
                    return 0;
                } else {
                    if (valueA > valueB) return -1;
                    if (valueA < valueB) return 1;
                    return 0;
                }
            });

            let result = [];

            if (offset > rows.length) {
                return [[tableName], columns];
            }

            // Devuelve todas las filas de las columnas selceccionadas.
            for (let i = offset; i < rows.length; i++) {
                let rowIndex = rows[i];
                let row = [];
                for (let j = 0; j < columns.length; j++) {
                    let column = columns[j];
                    let columnIndex = treeSearch(table[1], column);
                    if (columnIndex !== -1) {
                        row.push(table[rowIndex][columnIndex]);
                    }
                }
                result.push(row);
            }

            if (limit && limit < rows.length) {
                result = result.slice(0, limit);
            }

            return [[table[0][0]], columns, ...result];
        }

        return [[table[0][0]], columns]

    }

    joinTables(originTable, joins) {

        let sameJoinCount = 2;

        originTable = dbMethods.deepCopy(originTable);

        originTable[1] = originTable[1].map(column => `${originTable[0][0]}.${column}`)

        let joinedTables = dbMethods.deepCopy(originTable);

        for (const join of joins) {
            let { referenceTable, firstColumn, secondColumn } = join;
            const joinedTable = dbMethods.deepCopy(this.getOneTable(referenceTable));
            if (joinedTable[0][0] === "EXCEPTION ENCOUNTER") {
                return [['EXCEPTION ENCOUNTER'], ['TABLE ' + referenceTable + ' DOESN\'T EXIST!']];
            }
            if ([...joinedTables][0][0].split("|").includes(referenceTable)) {
                referenceTable += `_${sameJoinCount}`;
                sameJoinCount++;
            }

            const joinedTableColumns = joinedTable[1];
            joinedTables[0][0] = joinedTables[0][0].concat(`|${referenceTable}`)
            joinedTables[1] = joinedTables[1].concat(joinedTableColumns.map(column => `${referenceTable}.${column}`));

            const firstColumnIndex = treeSearch(joinedTables[1], firstColumn);

            const secondColumnIndex = treeSearch(joinedTables[1], secondColumn);

            let cartesianProduct = []

            for (let i = 2; i < joinedTables.length; i++) {
                for (let j = 2; j < joinedTable.length; j++) {
                    cartesianProduct.push(joinedTables[i].concat(joinedTable[j]))
                }
            }

            joinedTables = joinedTables.slice(0, 2).concat(this.innerJoin(cartesianProduct, firstColumnIndex, secondColumnIndex))

        }

        return joinedTables;
    }

    innerJoin(cartesianProduct, firstColumnIndex, secondColumnIndex) {
        return cartesianProduct.filter(row => row[firstColumnIndex] === row[secondColumnIndex]);
    }


    /**
     * @method retrieveRowIndexes
     * @description Searches for rows that meet a certain condition in a table.
     * @param {string} tableName - The name of the table.
     * @param {string} condition - The column used as a condition.
     * @param {string} operator - The logical operator to filter the results.
     * @param {any} conditionValue - The value used for the condition.
     * @returns {Promise<{ columnIndex: number, rows: Array<number> }>} An object with the column index and the rows that meet the condition.
     */
    retrieveRowIndexes({ table, conditions }) {
        let rows = [];
        let escapedPattern, regexPattern, regex;
        if (!conditions || conditions.length === 0) {
            // Si no se proporcionan condiciones, devuelve todas las filas
            for (let i = 2; i < table.length; i++) {
                rows.push(i);
            }
            return { rows, success: true };
        }

        // Realiza la evaluación de las condiciones
        for (let conditionObj of conditions) {
            let { condition, operator, conditionValue, logicalOperator } = conditionObj;

            // Realiza la lógica de evaluación de cada condición
            let resultRows = [];

            if(!condition) {
                condition = table[1][0];
            }

            const columnIndex = treeSearch(table[1], condition);

            if (columnIndex === -1) {
                return { columnIndex: undefined, rows: [], success: false, errorMessage: 'CONDITION COLUMN "' + condition + '" DOESN\'T EXIST ON TABLE "' + table[0][0] + '"!' };
            }

            // Se indexan los valores de la columna especificada en la condición
            const indexMap = new Map();
            for (let i = 2; i < table.length; i++) {
                const value = table[i][columnIndex];
                if (!indexMap.has(value)) {
                    indexMap.set(value, []);
                }
                indexMap.get(value).push(i);
            }

            switch (true) {
               
                case /^>$/.test(operator):
                    console.log(operator)
                    if (Array.isArray(conditionValue)) {
                        for (let [value, indices] of indexMap) {
                            if (value > Math.max(...conditionValue)) {
                                resultRows = resultRows.concat(indices);
                            }
                        }
                    } else {
                        for (let [value, indices] of indexMap) {
                            if (value > conditionValue) {
                                resultRows = resultRows.concat(indices);
                            }
                        }
                    }
                    break;
                case /^<$/.test(operator):
                    if (Array.isArray(conditionValue)) {
                        for (let [value, indices] of indexMap) {
                            if (value < Math.min(...conditionValue)) {
                                resultRows = resultRows.concat(indices);
                            }
                        }
                    } else {
                        for (let [value, indices] of indexMap) {
                            if (value < conditionValue) {
                                resultRows = resultRows.concat(indices);
                            }
                        }
                    }
                    break;
                // mayor o igual
                case /^>=$/.test(operator):
                    if (Array.isArray(conditionValue)) {
                        for (let [value, indices] of indexMap) {
                            if (value >= Math.max(...conditionValue)) {
                                resultRows = resultRows.concat(indices);
                            }
                        }
                    } else {
                        for (let [value, indices] of indexMap) {
                            if (value >= conditionValue) {
                                resultRows = resultRows.concat(indices);
                            }
                        }
                    }
                    break;
                // menor o igual
                case /^<=$/.test(operator):
                    if (Array.isArray(conditionValue)) {
                        for (let [value, indices] of indexMap) {
                            if (value <= Math.min(...conditionValue)) {
                                resultRows = resultRows.concat(indices);
                            }
                        }
                    } else {
                        for (let [value, indices] of indexMap) {
                            if (value <= conditionValue) {
                                resultRows = resultRows.concat(indices);
                            }
                        }
                    }
                    break;
                case /^IN$/ui.test(operator):
                    if (Array.isArray(conditionValue)) {
                        for (let [value, indices] of indexMap) {
                            if (conditionValue.includes(value)) {
                                resultRows = resultRows.concat(indices);
                            }
                        }
                    } else {
                        if (!indexMap.has(conditionValue)) {
                            resultRows = [];
                        } else {
                            resultRows = indexMap.get(conditionValue) || [];
                        }
                    }
                    break;
                case /^NOT\s+IN$/ui.test(operator):
                    if (Array.isArray(conditionValue)) {
                        for (let [value, indices] of indexMap) {
                            if (!conditionValue.includes(value)) {
                                resultRows = resultRows.concat(indices);
                            }
                        }
                    } else {
                        for (let [value, indices] of indexMap) {
                            if (value !== conditionValue) {
                                resultRows = resultRows.concat(indices);
                            }
                        }
                    }
                    break;
                case /^LIKE$/ui.test(operator):
                    if (conditionValue === null || !isNaN(conditionValue)) {
                        if (!indexMap.has(conditionValue)) {
                            resultRows = [];
                        } else {
                            resultRows = indexMap.get(conditionValue) || [];
                        }
                        break;
                    }

                    escapedPattern = conditionValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    regexPattern = escapedPattern.replace(/%/g, '.*');
                    regex = new RegExp(`^${regexPattern}$`, 'u');

                    for (let [value, indices] of indexMap) {
                        if (regex.test(value)) {
                            resultRows = resultRows.concat(indices);
                        }
                    }
                    break;
                case /^ILIKE$/ui.test(operator):
                    
                    if (conditionValue === null || !isNaN(conditionValue)) {
                        if (!indexMap.has(conditionValue)) {
                            resultRows = [];
                        } else {
                            resultRows = indexMap.get(conditionValue) || [];
                        }
                        break;
                    }

                    escapedPattern = conditionValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    regexPattern = escapedPattern.replace(/%/g, '.*');
                    regex = new RegExp(`^${regexPattern}$`, 'ui');

                    for (let [value, indices] of indexMap) {
                        if (regex.test(value)) {
                            resultRows = resultRows.concat(indices);
                        }
                    }
                    break;
                case /^NOT\s+LIKE$/ui.test(operator):
                    if (conditionValue === null || !isNaN(conditionValue)) {
                        for (let [value, indices] of indexMap) {
                            if (value !== conditionValue) {
                                resultRows = resultRows.concat(indices);
                            }
                        }
                        break;
                    }
                    escapedPattern = conditionValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    regexPattern = escapedPattern.replace(/%/g, '.*');
                    regex = new RegExp(`^${regexPattern}$`, 'u');

                    for (let [value, indices] of indexMap) {
                        if (!regex.test(value)) {
                            resultRows = resultRows.concat(indices);
                        }
                    }
                    break;
                case /^NOT\s+ILIKE$/ui.test(operator):
                    
                    if (conditionValue === null || !isNaN(conditionValue)) {
                        if (!indexMap.has(conditionValue)) {
                            resultRows = [];
                        } else {
                            resultRows = indexMap.get(conditionValue) || [];
                        }
                        break;
                    }

                    escapedPattern = conditionValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    regexPattern = escapedPattern.replace(/%/g, '.*');
                    regex = new RegExp(`^${regexPattern}$`, 'ui');

                    for (let [value, indices] of indexMap) {
                        if (!regex.test(value)) {
                            resultRows = resultRows.concat(indices);
                        }
                    }
                    break;
                case /^!=$/.test(operator):
                    
                    for (let [value, indices] of indexMap) {
                        if (value !== conditionValue) {
                            resultRows = resultRows.concat(indices);
                        }
                    }
                    break;
                case /^=$/.test(operator):
                default:
                    if (!indexMap.has(conditionValue)) {
                        resultRows = [];
                    } else {
                        resultRows = indexMap.get(conditionValue) || [];
                    }
                    break;
            }

            // Aplicar operador lógico al resultado actual y el acumulado
            if (rows.length === 0 || !logicalOperator) {
                rows = resultRows;
            } else {
                switch (logicalOperator.toUpperCase()) {
                    case 'AND':
                        rows = rows.filter(row => resultRows.includes(row));
                        break;
                    case 'OR':
                        rows = [...new Set([...rows, ...resultRows])]; // Unión de conjuntos
                        break;
                    default:
                        return { rows: [], success: false, errorMessage: 'Operador lógico no válido: ' + logicalOperator };
                }
            }
        }

        return { rows, success: true };
    }

    /**
    * @async
    * @method save
    * @description Saves the current state of the database to a file.
    * @returns {Promise<void>}
    */
    async save() {
        if (!this.initialized) {
            return [['EXCEPTION ENCOUNTER'], ['YOU CAN\'T SAVE! NO DATABASE INITIALIZED']];
        }
        await fs.writeFile(this.dbFilePath, JSON.stringify(this.tables, null, 0));
        return true;
    }

    async rmapSave() {
        await fs.writeFile(this.rmapFilePath, JSON.stringify(this.rmap, null, 0));
    }

}

export async function createDb(dbFolder, dbName) {
    let rmapFilePath;
    const dbFilePath = await getFilePath(dbName, dbFolder);
    if (dbFolder === 'data') {
        rmapFilePath = await getFilePath(dbName + ".rmap", 'rmaps');
    }
    try {
        if (await checkFileExists(dbFilePath)) {
            return false;
        }
        await fs.writeFile(dbFilePath, '[]');
        if (rmapFilePath) {
            await fs.writeFile(rmapFilePath, '[]');
        }
        return true;
    } catch (writeError) {
        console.error('ERROR READING DATABASE: ', writeError);
        return false;
    }
}

/**
 * @async
 * @function dropDb
 * @description Deletes the entire database file.
 * @param {string} dbName - The name of the database to delete.
 * @returns {Promise<boolean>} True if the database was successfully deleted; otherwise, it returns false.
 */
export async function dropDb(dbFolder, dbName) {
    try {
        const dbPath = path.join(getFolder(dbFolder), `/${dbName}.json`);
        await fs.rm(dbPath);
        return true;
    } catch (err) {
        if (err.code === 'ENOENT') {
            return false;
        } else {
            console.log('ERROR DELETING DATABASE:', err.message);
        }
        return false;
    }
}

/**
* @function describeDatabase
* @description Retrieves the name of all tables in the database.
* @param  {DB} currentDb - The reference to the current database.
* @param  {String} dbName - The name of the database you want to describe.
* @returns {Array} An array containing the name about all tables.
*/
export async function describeDatabase(currentDb, dbName) {

    const newDb = new DB();

    await newDb.init('data', dbName);

    let dbDesc = newDb.showAllTableNames();

    if (dbDesc.length > 0 && dbDesc[0][0] === 'EXCEPTION ENCOUNTER') {
        return [['EXCEPTION ENCOUNTER'], ['DATABASE "' + dbName + '" DOESN\'T EXIST!']]
    }

    if (currentDb instanceof DB) {
        currentDb.init('data', currentDb.name);
    }

    return dbDesc.length > 0 ? dbDesc : [['EXCEPTION ENCOUNTER'], ['DATABASE "' + dbName + '" HAS NO TABLES!']]

}

/**
 * Gets the folder path of the database.
 * @returns {string} The folder path of all databases.
 * @private
 */
function getFolder(folder) {
    const baseDir = process.platform === 'win32' ? 'C:/nuedb/' : '/var/nuedb/';
    const dbFolder = path.join(baseDir, folder);

    return dbFolder;
}

/**
 * Gets the file path of the specified database.
 * @param {string} dbName - The name of the database.
 * @returns {Promise<string>} The file path of the specified database.
 * @private
 */
async function getFilePath(name, type) {
    const folder = getFolder(type);

    try {
        await fs.access(folder);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.mkdir(folder, { recursive: true });
        } else {
            throw error;
        }
    }

    return path.join(folder, `${name}.json`);
}

async function checkFileExists(file) {
    return await fs.access(file, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false)
}