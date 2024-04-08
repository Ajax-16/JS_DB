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
    * @property {string} name - The name of the database.
    */
    name = 'db';
    /**
    * @property {string} name - The file path to the current database.
    */
    filePath = '';
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
     * @param {string} name - The name of the database.
     * @param {number} [cacheBufferSize=65536] - The size of the predefined cache buffer.
     */
    constructor(name, cacheBufferSize = 65536) {
        this.name = name;
        this.cache = new Cache(cacheBufferSize);
        fs.mkdir(getDbFolder(), { recursive: true });
    }

    /**
    * @async
    * @method init
    * @description Initializes the database by loading existing data or creating a new file.
    * @returns {Promise<void>}
    */
    async init() {
        try {
            this.filePath = await this.getDbFilePath(this.name);
            const fileContent = await fs.readFile(this.filePath, 'utf8');
            this.tables = JSON.parse(fileContent);
            this.initialized = true;
        } catch (readError) {
            this.tables = [];

            try {
                await fs.writeFile(this.filePath, '[]');
                if (await getDatabasePosition(this.name) === -1) {
                    console.log('DATABASE CREATED SUCCESSFULY');
                }
                this.initialized = true;
            } catch (writeError) {
                console.error('ERROR READING DATABASE: ', writeError);
            }
        }
        return this.initialized;
    }

    /**
   * @async
   * @method createTable
   * @description Creates a new table in the database.
   * @param {Object} options - Options for creating the table.
   * @param {string} options.tableName - The name of the table.
   * @param {string} options.primaryKey - The primary key of the table.
   * @param {Array} options.columns - An array of column names.
   * @returns {Promise<boolean>|Array} True if the table was created successfully; otherwise, it returns an array of arrays containing the error.
   */
    async createTable({ tableName, primaryKey, columns, foreignKeys }) {

        if (!this.initialized) {
            console.log('TABLE WITH NAME "' + tableName + '" NOT CREATED. DATABASE "' + this.name + '" NOT INITIALIZED! ');
            return [['EXCEPTION ENCOUNTER'], ['TABLE CANNOT BE CREATED! DATABASE "' + this.name + '" NOT INITIALIZED!']];
        }

        let tableExist = this.getOneTable(tableName);

        if (tableExist[0][0] !== 'EXCEPTION ENCOUNTER') {
            console.log('TABLE WITH NAME "' + tableName + '" NOT CREATED. TABLE NAME "' + tableName + '" IS ALREADY CREATED!');
            return [['EXCEPTION ENCOUNTER'], ['TABLE CANNOT BE CREATED! TABLE NAME "' + tableName + '" ALREADY IN USE!']];
        }

        if (tableName === undefined) {
            tableName = 'table';
        }

        if (primaryKey === undefined) {
            primaryKey = 'id';
        }

        if (columns === undefined) {
            columns = [];
        }

        let isKeyWord = treeSearch(this.keywords, tableName);

        if (isKeyWord !== -1) {
            console.log('TABLE WITH NAME "' + tableName + '" NOT CREATED. TABLE NAME "' + tableName + '" IS A KEYWORD!');
            return [['EXCEPTION ENCOUNTER'], ['TABLE CANNOT BE CREATED! TABLE NAME "' + tableName + '" IS A KEYWORD!']];
        }

        let table = [[], []];

        table[0][0] = tableName;

        table[1][0] = primaryKey;

        let headers = {};

        headers.elements = 0;

        dbMethods.insert(table[0], headers);

        if (foreignKeys !== undefined) {

            let foreignColumns = [];

            table[0][1]["references"] = []

            for (const foreignKey of foreignKeys) {

                let { name, columnName, referenceTable, referenceColumn } = foreignKey;

                if (name === undefined) {
                    name = referenceTable.concat(`_${referenceColumn}`);
                }

                table[0][1]["references"].push({ name, columnName, referenceTable, referenceColumn })

                dbMethods.insert(foreignColumns, foreignKey.columnName)
            }

            let allcolumns = [...columns, ...foreignColumns]

            if (!dbMethods.hasDuplicity(allcolumns)) {
                for (let i = 0; i < allcolumns.length; i++) {
                    table[1][i + 1] = allcolumns[i];
                }
            } else {
                console.log('TABLE WITH NAME "' + tableName + '" CANNOT BE CREATED. DUPLICATED COLUMNS FOUND!');
                return false;
            }

        } else {

            if (!dbMethods.hasDuplicity(columns)) {
                for (let i = 0; i < columns.length; i++) {
                    table[1][i + 1] = columns[i];
                }
            } else {
                console.log('TABLE WITH NAME "' + tableName + '" CANNOT BE CREATED. DUPLICATED COLUMNS FOUND!');
                return false;
            }

        }

        dbMethods.insert(this.tables, table);

        await this.save();

        console.log('TABLE WITH NAME "' + tableName + '" CREATED SUCCESSFULY');

        return true;

    }

    /**
    * @async
    * @method dropTable
    * @description Drops an existing table from the database.
    * @param {string} tableName - The name of the table to drop.
    * @returns {Promise<boolean>} True if the table was successfully dropped; otherwise, it returns false.
    */
    async dropTable(tableName) {
        if (!this.initialized) {
            console.log('TABLE WITH NAME "' + tableName + '" COULD NOT BE DROPPED! DATABASE "' + this.name + '" NOT INITIALIZED!');
            return false;
        }

        let result;

        let tableNames = this.showAllTableNames();

        let tableIndex = treeSearch(tableNames, tableName);

        if (tableIndex === -1) {
            console.log('TABLE COULD NOT BE DROPPED! TABLE "' + tableName + '" DOES\'T EXIST!')
            result = false;
        }

        result = dbMethods.deleteByIndex(this.tables, tableIndex);

        console.log('TABLE "' + tableName + '" DROPPED SUCCESSFULY');

        await this.save();

        return result;

    }

    /**
    * @method alterTable
    * @description Alters the specified table's columns or columns' names.
    * @param {String} tableName The name of the table to alter.
    * @param {String} operation The operation to perform on the table.
    * @param {String} target The target to alter.
    */
    async alterTable({ tableName, operation, target, options = { save: false }, elements }) {
        if (!this.initialized) {
            console.log('ANY TABLES FOUND! DATABASE "' + this.name + '" NOT INITIALIZED!');
            return [['EXCEPTION ENCOUNTER'], ['ANY TABLES FOUND! DATABASE "' + this.name + '" NOT INITIALIZED!']];
        }

        let table = this.getOneTable(tableName);
        if (table[0] === 'EXCEPTION ENCOUNTER') {
            console.log('TABLE COULD NOT BE ALTERED! TABLE "' + tableName + '" DOES\'T EXIST!')
            result = false;
        }

        operation = operation.toUpperCase();
        target = target.toUpperCase();

        switch (operation) {

            case 'ADD':

                switch (target) {

                    case 'COLUMN':

                        elements.forEach(async (column) => {
                            if (treeSearch(table[1], column.name) === -1) {
                                dbMethods.insert(table[1], column.name);
                                if (column.void) {
                                    for (let i = 2; i < table.length; i++) {
                                        dbMethods.insert(table[i], null);
                                    }
                                }

                                if (options.save) {
                                    await this.save();
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
            console.log('ANY TABLES FOUND! DATABASE "' + this.name + '" NOT INITIALIZED!');
            return [['EXCEPTION ENCOUNTER'], ['ANY TABLES FOUND! DATABASE "' + this.name + '" NOT INITIALIZED!']];
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
            console.log('TABLE NOT FOUND! DATABASE "' + this.name + '" NOT INITIALIZED!');
            return [['EXCEPTION ENCOUNTER'], ['TABLE NOT FOUND! DATABASE "' + this.name + '" NOT INITIALIZED!']];
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
    async showAllTables() {
        if (!this.initialized) {
            console.log('ANY TABLES FOUND! DATABASE "' + this.name + '" NOT INITIALIZED!');
            return [['EXCEPTION ENCOUNTER'], ['ANY TABLES FOUND! DATABASE "' + this.name + '" NOT INITIALIZED!']];
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
            console.log('ANY TABLES FOUND! DATABASE "' + this.name + '" NOT INITIALIZED!');
            return [['EXCEPTION ENCOUNTER'], ['ANY TABLES FOUND! DATABASE "' + this.name + '" NOT INITIALIZED!']];
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
            console.log('TABLE NOT FOUND! DATABASE "' + this.name + '" NOT INITIALIZED!');
            return [['EXCEPTION ENCOUNTER'], ['TABLE NOT FOUND! DATABASE "' + this.name + '" NOT INITIALIZED!']];
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
    * @async
    * @method insert
    * @description Inserts a new row into a specified table.
    * @param {Object} options - Options for inserting the row.
    * @param {string} options.tableName - The name of the table.
    * @param {Array} options.values - An array of values to insert.
    * @returns {Promise<boolean>|Array} True if the row was successfully inserted; otherwise, it returns an array of arrays containing the error.
    */
    async insert({ tableName, columns, values }) {
        if (!this.initialized) {
            console.log('ROW CANNOT BE CREATED! DATABASE "' + this.name + '" NOT INITIALIZED!');
            return [['EXCEPTION ENCOUNTER'], ['ROW CANNOT BE CREATED! DATABASE "' + this.name + '" NOT INITIALIZED!']];
        }
        let table = this.getOneTable(tableName);
        if (table[0][0] === 'EXCEPTION ENCOUNTER') {
            console.log('ROW CANNOT BE CREATED! TABLE "' + tableName + '" DOESN\'T EXISTS!');
            return [['EXCEPTION ENCOUNTER'], ['ROW CANNOT BE CREATED! TABLE "' + tableName + '" DOESN\'T EXISTS!']]
        }

        if (!columns) {
            columns = table[1].slice(1);
        }

        let columnNames = table[1];
        let elementsValue = table[0][1].elements;
        let row = [elementsValue];

        for (let i = 1; i < columnNames.length; i++) {
            let columnName = columnNames[i];
            if (columns.includes(columnName)) {
                let valueIndex = treeSearch(columns, columnName);
                if (values[valueIndex] !== undefined) {
                    dbMethods.insert(row, values[valueIndex])
                } else {
                    dbMethods.insert(row, null);
                }
            } else {
                dbMethods.insert(row, null);
            }
        }

        dbMethods.insert(table, row);
        table[0][1].elements++; // Actualizar el contador de elements en los encabezados de la tabla

        await this.save();

        console.log('CREATED ROW WITH "' + table[1][0] + '" VALUE = "' + table[table.length - 1][0] + '"')

        return true;
    }

    /**
    * @async
    * @method delete
    * @description Deletes rows from a specified table based on a given condition.
    * @param {string} tableName - The name of the table.
    * @param {string} [condition=this.getOneTable(tableName)[1][0]] - The column used as the condition for the delete operation. Primary key by default.
    * @param {string} [operator='='] - The comparison operator for the condition. "=" by default.
    * @param {any} conditionValue - The value used for the condition.
    * @returns {Promise<boolean>} A boolean indicating whether the delete operation was successful or not.
    */
    async delete({ tableName, condition = this.getOneTable(tableName)[1][0], operator = '=', conditionValue }) {
        if (!this.initialized) {
            console.log('ROW OR ROWS CANNOT BE DELETED! DATABASE "' + this.name + '" NOT INITIALIZED!');
            return [['EXCEPTION ENCOUNTER'], ['ROW OR ROWS CANNOT BE DELETED! DATABASE "' + this.name + '" NOT INITIALIZED!']];
        }

        let table = this.getOneTable(tableName);
        if (table[0][0] === 'EXCEPTION ENCOUNTER') {
            console.log('ROW OR ROWS CANNOT BE DELETED! TABLE "' + tableName + '" DOESN\'T EXIST!');
            return [['EXCEPTION ENCOUNTER'], ['ROW OR ROWS CANNOT BE DELETED! TABLE "' + tableName + '" DOESN\'T EXIST!']];
        }

        const { columnIndex, rows, success, errorMessage } = await this.findRowsByCondition({ table, condition, operator, conditionValue });

        if (!success) {
            return [['EXCEPTION ENCOUNTER'], [errorMessage]];
        }

        if (columnIndex === -1) {
            console.log('ROW OR ROWS CANNOT BE DELETED! CONDITION "' + condition + '" IS NOT A VALID COLUMN!');
            return [['EXCEPTION ENCOUNTER'], ['ROW OR ROWS CANNOT BE DELETED! CONDITION "' + condition + '" IS NOT A VALID COLUMN!']];
        }

        if (rows.length > 0) {

            for (let i = rows.length - 1; i >= 0; i--) {
                dbMethods.deleteByIndex(table, rows[i]);
            }

            console.log(`DELETED ${rows.length} ROW(S) WITH "${condition}" ${operator} "${conditionValue}"`);

            await this.save();

            return true;

        }

        console.log('0 ROWS DELETED');

        return false;

    }

    /**
    * @async
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
    async update({ tableName, set = [], setValues, condition = this.getOneTable(tableName)[1][0], operator = '=', conditionValue }) {
        if (!this.initialized) {
            console.log('ROW OR ROWS CANNOT BE UPDATED! DATABASE "' + this.name + '" NOT INITIALIZED!');
            return [['EXCEPTION ENCOUNTER'], ['ROW OR ROWS CANNOT BE UPDATED! DATABASE "' + this.name + '" NOT INITIALIZED!']];
        }
        const table = this.getOneTable(tableName);

        const { columnIndex, rows, success, errorMessage } = await this.findRowsByCondition({ table, condition, operator, conditionValue });

        if (!success) {
            return [['EXCEPTION ENCOUNTER'], [errorMessage]];
        }

        if (columnIndex === undefined || columnIndex === -1) {
            console.log('ROW OR ROWS CANNOT BE UPDATED! CONDITION "' + condition + '" IS NOT A VALID COLUMN!');
            return [['EXCEPTION ENCOUNTER'], ['ROW OR ROWS CANNOT BE UPDATED! CONDITION "' + condition + '" IS NOT A VALID COLUMN!']];
        }

        if (rows.length === 0) {
            console.log('NO ROWS FOUND WITH CONDITION "' + condition + '" ' + operator + ' "' + conditionValue + '"!');
            return [['EXCEPTION ENCOUNTER'], ['NO ROWS FOUND WITH CONDITION "' + condition + '" ' + operator + ' "' + conditionValue + '"!']];
        }

        const columnIndexes = {};
        table[1].forEach((column, index) => {
            columnIndexes[column] = index;
        });

        let setColumnExist = { exist: true, columnName: null };

        const setIndexes = set.map(column => {
            const index = columnIndexes[column];
            if (index === undefined) {
                console.log('ROW OR ROWS CANNOT BE UPDATED! CANNOT SET A VALUE TO COLUMN "' + column + '" BECAUSE IT DOES\'T EXISTS!');
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
            finalMsg = updated ? `UPDATED ${totalUpdated} ROW(S) WITH (${JSON.stringify(set)}) VALUES (${JSON.stringify(setValues)})` : '0 ROWS UPDATED';
            await this.save();
        }
        console.log(finalMsg);
        return updated;
    }

    /**
    * @async
    * @method find
    * @description Retrieves rows from a specified table based on certain conditions.
    * @param {string} tableName - The name of the table.
    * @param {Boolean} [distinct=false] - Whether to retrieve distinct rows.
    * @param {Array<String>} [columns=this.getOneTable(tableName)[1]] - The list of columns to retrieve. All columns by default.
    * @param {string} [condition=this.getOneTable(tableName)[1][0]] - The column used as the condition for the search. Primary key by default.
    * @param {string} [operator='='] - The comparison operator for the condition. "=" by default.
    * @param {any} conditionValue - The value used for the condition.
    * @param {number} [offset=0] - The starting index from which to retrieve rows. 0 by default.
    * @param {number} limit - The maximum number of rows to retrieve.
    * @returns {Promise<Array<Array<any>>>} An array containing the retrieved rows, or an array indicating an exception encounter if no rows are found.
    */
    async find({ tableName, distinct = false, columns, joins, condition, operator = '=', conditionValue, offset = 0, limit, orderBy, asc = true }) {
        if (!this.initialized) {
            console.log('DATABASE "' + this.name + '" NOT INITIALIZED!');
            return [['EXCEPTION ENCOUNTER'], ['DATABASE "' + this.name + '" NOT INITIALIZED!']];
        }

        let table = this.getOneTable(tableName);
        if (table[0][0] === 'EXCEPTION ENCOUNTER') {
            console.log('TABLE "' + tableName + '" DOESN\'T EXIST!');
            return [['EXCEPTION ENCOUNTER'], ['TABLE ' + tableName + ' DOESN\'T EXIST!']];
        }

        if (joins) {
            table = await this.joinTables(this.getOneTable(tableName), joins);
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

        let { rows, success, errorMessage } = await this.findRowsByCondition({ table, condition, operator, conditionValue });

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
                console.log('ORDER COLUMN "' + orderBy + '" DOESN\'T EXIST ON TABLE "' + tableName + '"!');
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

        return [['EXCEPTION ENCOUNTER'], ['ROW OR ROWS NOT FOUND!']]


    }

    async joinTables(originTable, joins) {

        originTable = dbMethods.deepCopy(originTable);

        originTable[1] = originTable[1].map(column => `${originTable[0][0]}.${column}`)

        let joinedTables = originTable;

        const tablesAlreadyJoined = originTable;

        for (const join of joins) {
            const { referenceTable, referenceColumn, columnName } = join;
            const joinedTable = dbMethods.deepCopy(this.getOneTable(referenceTable));
            if (tablesAlreadyJoined.includes(joinedTable)) {
                console.log('TABLE "' + joinedTable[0][0] + '" IS ALREADY JOINED!');
                return [['EXCEPTION ENCOUNTER'], ['TABLE "' + joinedTable[0][0] + '" IS ALREADY JOINED!']];
            }
            tablesAlreadyJoined.push(joinedTable);
            const joinedTableColumns = joinedTable[1];
            joinedTables[0][0] = joinedTables[0][0].concat(`|${referenceTable}`)
            joinedTables[1] = joinedTables[1].concat(joinedTableColumns.map(column => `${join.referenceTable}.${column}`));
            const referenceColumnIndex = treeSearch(joinedTable[1], referenceColumn.split('.').pop());
            if (referenceColumnIndex === -1) {
                console.log('REFERENCE COLUMN "' + referenceColumn + '" DOESN\'T EXIST ON TABLE "' + referenceTable + '"!');
                return [['EXCEPTION ENCOUNTER'], ['REFERENCE COLUMN "' + referenceColumn + '" DOESN\'T EXIST ON TABLE "' + referenceTable + '"!']];
            }

            const columnIndex = treeSearch(joinedTables[1], columnName);
            if (columnIndex === -1) {
                console.log('COLUMN "' + columnName.split('.')[1] + '" DOESN\'T EXIST ON TABLE "' + joinedTables[0][0] + '"!');
                return [['EXCEPTION ENCOUNTER'], ['COLUMN "' + columnName.split('.')[1] + '" DOESN\'T EXIST ON TABLE "' + joinedTables[0][0] + '"!']];
            }

            let resultantJoinedTables = joinedTables.slice(0, 2);

            for (let i = 2; i < joinedTables.length; i++) {
                const value = joinedTables[i][columnIndex];
                for (let j = 2; j < joinedTable.length; j++) {
                    if (joinedTable[j][referenceColumnIndex] === value) {
                        resultantJoinedTables.push(joinedTables[i].concat(joinedTable[j]))
                    }
                }
            }
            joinedTables = resultantJoinedTables;
        }

        return joinedTables;
    }

    /**
     * @async
     * @method findRowsByCondition
     * @description Searches for rows that meet a certain condition in a table.
     * @param {string} tableName - The name of the table.
     * @param {string} condition - The column used as a condition.
     * @param {string} operator - The logical operator to filter the results.
     * @param {any} conditionValue - The value used for the condition.
     * @returns {Promise<{ columnIndex: number, rows: Array<number> }>} An object with the column index and the rows that meet the condition.
     */
    async findRowsByCondition({ table, condition, operator, conditionValue }) {

        let rows = [];

        let escapedPattern, regexPattern, regex;

        if (condition === undefined || conditionValue === undefined) {

            // Obtiene todas las filas de la tabla sin filtrar (FIND "columnas" IN "tabla")
            for (let i = 2; i < table.length; i++) {
                rows.push(i);
            }

            return { rows, success: true };

        } else {

            const columnIndex = treeSearch(table[1], condition);
            if (columnIndex === -1) {
                console.log('CONDITION COLUMN "' + condition + '" DOESN\'T EXIST ON TABLE "' + table[0][0] + '"!');
                return { columnIndex: 0, rows: [], success: false, errorMessage: 'CONDITION COLUMN "' + condition + '" DOESN\'T EXIST ON TABLE "' + table[0][0] + '"!' };
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

            switch (operator.toUpperCase()) {
                case '>':
                    if (Array.isArray(conditionValue)) {
                        for (let [value, indices] of indexMap) {
                            if (value > Math.max(...conditionValue)) {
                                rows = rows.concat(indices);
                            }
                        }
                    } else {
                        for (let [value, indices] of indexMap) {
                            if (value > conditionValue) {
                                rows = rows.concat(indices);
                            }
                        }
                    }
                    break;
                case '<':
                    if (Array.isArray(conditionValue)) {
                        for (let [value, indices] of indexMap) {
                            if (value < Math.min(...conditionValue)) {
                                rows = rows.concat(indices);
                            }
                        }
                    } else {
                        for (let [value, indices] of indexMap) {
                            if (value < conditionValue) {
                                rows = rows.concat(indices);
                            }
                        }
                    }
                    break;
                case '>=':
                    if (Array.isArray(conditionValue)) {
                        for (let [value, indices] of indexMap) {
                            if (value >= Math.max(...conditionValue)) {
                                rows = rows.concat(indices);
                            }
                        }
                    } else {
                        for (let [value, indices] of indexMap) {
                            if (value >= conditionValue) {
                                rows = rows.concat(indices);
                            }
                        }
                    }
                    break;
                case '<=':
                    if (Array.isArray(conditionValue)) {
                        for (let [value, indices] of indexMap) {
                            if (value <= Math.min(...conditionValue)) {
                                rows = rows.concat(indices);
                            }
                        }
                    } else {
                        for (let [value, indices] of indexMap) {
                            if (value <= conditionValue) {
                                rows = rows.concat(indices);
                            }
                        }
                    }
                    break;
                case 'IN':
                    if (Array.isArray(conditionValue)) {
                        for (let [value, indices] of indexMap) {
                            if (conditionValue.includes(value)) {
                                rows = rows.concat(indices);
                            }
                        }
                    } else {
                        if (!indexMap.has(conditionValue)) {
                            rows = [];
                        } else {
                            rows = indexMap.get(conditionValue) || [];
                        }
                    }
                    break;
                case 'NOT IN':
                    if (Array.isArray(conditionValue)) {
                        for (let [value, indices] of indexMap) {
                            if (!conditionValue.includes(value)) {
                                rows = rows.concat(indices);
                            }
                        }
                    } else {
                        for (let [value, indices] of indexMap) {
                            if (value !== conditionValue) {
                                rows = rows.concat(indices);
                            }
                        }
                    }
                    break;
                case 'LIKE':
                    if (conditionValue === null || !isNaN(conditionValue)) {
                        if (!indexMap.has(conditionValue)) {
                            rows = [];
                        } else {
                            rows = indexMap.get(conditionValue) || [];
                        }
                        break;
                    }

                    escapedPattern = conditionValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                    regexPattern = escapedPattern.replace(/%/g, '.*');

                    regex = new RegExp(`^${regexPattern}$`, 'ui');

                    for (let [value, indices] of indexMap) {
                        if (regex.test(value)) {
                            rows = rows.concat(indices);
                        }
                    }
                    break;
                case 'NOT LIKE':
                    if (conditionValue === null || !isNaN(conditionValue)) {
                        for (let [value, indices] of indexMap) {
                            if (value !== conditionValue) {
                                rows = rows.concat(indices);
                            }
                        }
                        break;
                    }
                    escapedPattern = conditionValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                    regexPattern = escapedPattern.replace(/%/g, '.*');

                    regex = new RegExp(`^${regexPattern}$`, 'ui');

                    for (let [value, indices] of indexMap) {
                        if (!regex.test(value)) {
                            rows = rows.concat(indices);
                        }
                    }
                    break;
                case '!=':
                    for (let [value, indices] of indexMap) {
                        if (value !== conditionValue) {
                            rows = rows.concat(indices);
                        }
                    }
                    break;
                case '=':
                default:
                    if (!indexMap.has(conditionValue)) {
                        rows = [];
                    } else {
                        rows = indexMap.get(conditionValue) || [];
                    }
                    break;
            }
            return { columnIndex, rows, success: true };
        }
    }

    /**
    * Gets the file path of the specified database.
    * @param {string} dbName - The name of the database.
    * @returns {Promise<string>} The file path of the specified database.
    * @private
    */
    async getDbFilePath(dbName) {
        const dbFolder = getDbFolder();

        try {
            await fs.access(dbFolder);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await fs.mkdir(dbFolder, { recursive: true });
            } else {
                throw error;
            }
        }

        return path.join(dbFolder, `${dbName}_db.json`);
    }

    /**
    * @async
    * @method save
    * @description Saves the current state of the database to a file.
    * @returns {Promise<void>}
    */
    async save() {
        if (!this.initialized) {
            console.log('YOU CAN\'T SAVE! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['EXCEPTION ENCOUNTER'], ['YOU CAN\'T SAVE! DATABASE "' + this.name + '" NOT INITIALIZED']];
        }
        await fs.writeFile(this.filePath, JSON.stringify(this.tables, null, 2));
        return true;
    }

}

/**
 * @async
 * @function dropDb
 * @description Deletes the entire database file.
 * @param {string} dbName - The name of the database to delete.
 * @returns {Promise<boolean>} True if the database was successfully deleted; otherwise, it returns false.
 */
export async function dropDb(dbName) {
    try {
        const dbPath = path.join(getDbFolder(), `/${dbName}_db.json`);
        await fs.unlink(dbPath);
        console.log('DATABASE DELETED SUCCESSFULLY');
        return true;
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log('DATABASE NOT FOUND');
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

    let dbNamePos = await getDatabasePosition(dbName);

    if (dbNamePos === -1) {
        console.log('DATABASE "' + dbName + '" DOES\'T EXIST!')
        return [['EXCEPTION ENCOUNTER'], ['DATABASE NOT FOUND! DATABASE "' + dbName + '" DOES\'T EXIST!']];
    }

    let databases = await getAllDatabases();
    let newDb = new DB(databases[dbNamePos]);

    await newDb.init();

    let dbDesc = newDb.showAllTableNames();

    if (currentDb instanceof DB) {
        currentDb.init();
    }

    return dbDesc.length > 0 ? dbDesc : [['EXCEPTION ENCOUNTER'], ['DATABASE "' + dbName + '" HAS NO TABLES!']]

}

/**
 * Gets the folder path of the database.
 * @returns {string} The folder path of all databases.
 * @private
 */
function getDbFolder() {
    const baseDir = process.platform === 'win32' ? 'C:/nuedb/' : '/var/nuedb/';
    const dbFolder = path.join(baseDir, 'data');

    return dbFolder;
}

/**
 * Gets all database names.
 * @returns {Promise<Array>} An array containing all database names.
 * @private
 */
async function getAllDatabases() {
    let files = await fs.readdir(getDbFolder());
    return files.map(file => file.split('_')[0]);
}

/**
 * Gets the position of the database in the list of all databases.
 * @param {string} dbName - The name of the database.
 * @returns {Promise<number>} The position of the database in the list of all databases.
 * @private
 */
async function getDatabasePosition(dbName) {
    let databases = await getAllDatabases();
    return treeSearch(databases, dbName);
}
