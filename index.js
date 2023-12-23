import dbMethods from './algorithms/array_methods.js';
import { treeSearch } from './algorithms/tree_search.js';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import path, { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * @class DB
 * @description Represents a simple database with basic CRUD operations.
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
    * @property {Array} keywords - An array of keywords used for checking table names.
    */
    keywords = ['TABLE NOT FOUND!', 'TABLE CANNOT BE CREATED!', 'ROW CANNOT BE CREATED!', 'ROW OR ROWS CANNOT BE DELETED!', 'ROW OR ROWS NOT FOUND!', 'ROW OR ROWS NOT FOUND!, ANY TABLES FOUND!']

    /**
    * @property {boolean} intialized - Indicates whether the database has been initialized.
    */
    intialized = false;

    /**
    * @constructor
    * @param {string} name - The name of the database.
    */
    constructor(name) {
        this.name = name;
        this.filePath = resolve(__dirname, `./db/${this.name}_db.json`);
    }

    /**
    * @async
    * @method init
    * @description Initializes the database by loading existing data or creating a new file.
    * @returns {Promise<void>}
    */
    async init() {
        try {
            const fileContent = await fs.readFile(this.filePath, 'utf8');
            this.tables = JSON.parse(fileContent);
            this.intialized = true;
        } catch (readError) {
            this.tables = [];

            try {
                await fs.writeFile(this.filePath, '');
                console.log('DATABASE CREATED SUCCESSFULY');
                this.intialized = true;
            } catch (writeError) {
                console.error('ERROR WRITING ON DATABASE:', writeError);
            }
        }
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
    async createTable({ tableName, primaryKey, columns }) {

        if (!this.intialized) {
            console.log('TABLE WITH NAME "' + tableName + '" NOT CREATED. DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['TABLE CANNOT BE CREATED!', 'DATABASE ' + this.name + ' NOT INITIALIZED'], []];
        }

        let tableExist = this.getOneTable(tableName);

        if (tableExist[0][0] !== 'TABLE NOT FOUND!') {
            console.log('TABLE WITH NAME "' + tableName + '" NOT CREATED. TABLE NAME = "' + tableName + '" IS ALREADY CREATED');
            return [['TABLE CANNOT BE CREATED!', 'NAME ' + tableName + ' ALREADY IN USE'], []];
        }

        if (tableName === undefined) {
            tableName = 'table';
        }

        if (primaryKey === undefined || columns === undefined) {
            primaryKey = 'id';
            columns = [];
        }

        let isKeyWord = treeSearch(this.keywords, tableName);

        if (isKeyWord !== -1) {
            console.log('TABLE WITH NAME "' + tableName + '" NOT CREATED. TABLE_NAME = "' + tableName + '" IS A KEYWORD');
            return [['TABLE CANNOT BE CREATED!', 'NAME "' + tableName + '" IS A KEYWORD'], []];
        }

        let table = [[], []];

        table[0][0] = tableName;

        table[0][1] = 0;

        table[1][0] = primaryKey;

        for (let i = 0; i < columns.length; i++) {
            table[1][i + 1] = columns[i];
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

        if (!this.intialized) {
            console.log('TABLE WITH NAME "' + tableName + '" COULD NOT BE DROPPED!. DATABASE "' + this.name + '" NOT INITIALIZED');
            return false;
        }

        let result;

        let tableNames = this.showAllTableNames();

        let tableIndex = treeSearch(tableNames, tableName);

        if (tableIndex === -1) {
            console.log('TABLE COULD NOT BE DROPPED!. TABLE DOES\'T EXIST')
            result = false;
        }

        result = dbMethods.deleteByIndex(this.tables, tableIndex);

        console.log('TABLE "' + tableName + '" DROPPED SUCCESSFULY');

        await this.save();

        return result;

    }

    /**
    * @method getAllTables
    * @description Retrieves all tables in the database.
    * @returns {Array} An array containing all tables.
    */
    getAllTables() {
        if (!this.intialized) {
            console.log('ANY TABLES FOUND! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['ANY TABLES FOUND!'], ['DATABASE "' + this.name + '" NOT INITIALIZED']];
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
        if (!this.intialized) {
            console.log('TABLE NOT FOUND! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['TABLE NOT FOUND!'], ['DATABASE "' + this.name + '" NOT INITIALIZED']];
        }
        let tableNames = this.showAllTableNames();
        let position = treeSearch(tableNames, tableName);
        if (position !== -1) {
            return this.tables[position];
        }
        return [['TABLE NOT FOUND!'], []];
    }

    /**
    * @method showAllTables
    * @description Retrieves all tables with shortened names for display.
    * @returns {Array} An array of tables with shortened names.
    */
    showAllTables() {
        if (!this.intialized) {
            console.log('ANY TABLES FOUND! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['ANY TABLES FOUND!'], ['DATABASE "' + this.name + '" NOT INITIALIZED']];
        }
        let tablesCopy = [...this.tables];
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
        if (!this.intialized) {
            console.log('ANY TABLES FOUND! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['ANY TABLES FOUND!'], ['DATABASE "' + this.name + '" NOT INITIALIZED']];
        }
        let tableNames = [];
        for (let i = 0; i < this.tables.length; i++) {
            dbMethods.insert(tableNames, this.tables[i][0][0]);
        }
        return tableNames;
    }

    /**
    * @method showOneTable
    * @description Retrieves a specific table with a shortened name for display.
    * @param {string} tableName - The name of the table to retrieve.
    * @returns {Array} An array representing the specified table with a shortened name.
    */
    showOneTable(tableName) {
        if (!this.intialized) {
            console.log('TABLE NOT FOUND! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['TABLE NOT FOUND!'], ['DATABASE "' + this.name + '" NOT INITIALIZED']];
        }
        let tableNames = this.showAllTableNames();
        let position = treeSearch(tableNames, tableName);
        if (position !== -1) {
            let tableCopy = [...this.tables[position]];
            tableCopy[0] = tableCopy[0].slice(0, 1);
            return tableCopy;
        }
        return [['TABLE NOT FOUND!'], []];
    }

    /**
    * @method describeOneTable
    * @description Retrieves information about a specific table.
    * @param {string} tableName - The name of the table to describe.
    * @returns {Array} An array containing information about the specified table.
    */
    describeOneTable(tableName) {
        if (!this.intialized) {
            console.log('TABLE NOT FOUND! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['TABLE NOT FOUND!'], ['DATABASE "' + this.name + '" NOT INITIALIZED']];
        }
        let tableNames = this.showAllTableNames();
        let position = treeSearch(tableNames, tableName);
        if (position !== -1) {
            let tableDesc = [[...this.tables[position][0]]];
            tableDesc[0] = tableDesc[0].slice(0, 1);
            dbMethods.insert(tableDesc, this.tables[position][1]);
            return tableDesc;
        }
        return [['TABLE NOT FOUND!'], []];
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
    async insert({ tableName, values }) {
        if (!this.intialized) {
            console.log('ROW CANNOT BE CREATED! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['ROW CANNOT BE CREATED!'], ['DATABASE "' + this.name + '" NOT INITIALIZED']];
        }
        let table = this.getOneTable(tableName);
        if (table[0][0] === 'TABLE NOT FOUND!') {
            console.log('ROW CANNOT BE CREATED! TABLE "' + tableName + '" DOESN\'T EXISTS');
            return [['ROW CANNOT BE CREATED!', 'TABLE ' + tableName + ' DOESN\'T EXISTS'], []]
        }
        let limitOnValues = table[1].length - 1;
        if (values.length < limitOnValues) {
            console.log('ROW CANNOT BE CREATED! SOME OF THE VALUES ARE NULL')
            return [['ROW CANNOT BE CREATED!', 'SOME OF THE VALUES ARE NULL'], []]
        }
        let row = [table[0][1]];
        for (let i = 0; i < limitOnValues; i++) {
            dbMethods.insert(row, values[i]);
        }

        dbMethods.insert(table, row);

        table[0][1]++;

        await this.save();

        console.log('CREATED ROW WITH "' + table[1][0] + '" VALUE = "' + table[table.length - 1][0] + '"')

        return true;

    }

    /**
    * @async
    * @method delete
    * @description Deletes rows from a specified table based on a condition.
    * @param {Object} options - Options for deleting rows.
    * @param {string} options.tableName - The name of the table.
    * @param {string} [options.condition] - The column to use as a condition for deletion.
    * @param {string|number} options.conditionValue - The value to compare with the condition column.
    * @returns {Promise<boolean>|Array} True if the row or rows were successfully deleted; otherwise, it returns an array of arrays containing the error.
    */
    async delete({ tableName, condition = this.getOneTable(tableName)[1][0], conditionValue }) {
        conditionValue = parseInt(conditionValue);
        if (!this.intialized) {
            console.log('ROW OR ROWS CANNOT BE DELETED! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['ROW OR ROWS CANNOT BE DELETED!'], ['DATABASE "' + this.name + '" NOT INITIALIZED']];
        }
        let table = this.getOneTable(tableName);
        if (table[0][0] === 'TABLE NOT FOUND!') {
            console.log('ROW OR ROWS CANNOT BE DELETED! TABLE "' + tableName + '" DOESN\'T EXISTS')
            return [['ROW OR ROWS CANNOT BE DELETED!', 'TABLE ' + tableName + ' DOESN\'T EXISTS'], []]
        }

        let columnIndex = treeSearch(table[1], condition);

        if (columnIndex === -1) {
            console.log('ROW OR ROWS CANNOT BE DELETED! CONDITION "' + condition + '" IS NOT A VALID COLUMN')
            return [['ROW OR ROWS CANNOT BE DELETED!', 'CONDITION ' + condition + ' IS NOT A VALID COLUMN'], []]
        }

        let columns = [];

        for (let i = 2; i < table.length; i++) {
            dbMethods.insert(columns, table[i][columnIndex]);
        }

        let elementExist = dbMethods.deleteAllByContent(columns, conditionValue);

        if (elementExist) {
            for (let i = table.length - 1; i >= 2; i--) {
                const deleteElement = treeSearch(columns, table[i][columnIndex]);
                if (deleteElement === -1) {
                    console.log('DELETED ONE ROW WITH "' + table[1][columnIndex] + '" VALUE = "' + table[i][columnIndex] + '"')
                    dbMethods.deleteByIndex(table, i);
                    await this.save();
                }
            }

            return true;

        } else {
            console.log('0 ROWS AFFECTED')
        }

    }

    /**
    * @async
    * @method update
    * @description Updates rows in a specified table based on a condition.
    * @param {Object} options - Options for updating rows.
    * @param {string} options.tableName - The name of the table.
    * @param {Array} [options.set] - An array of columns to update.
    * @param {Array} [options.setValues] - An array of values corresponding to the set columns.
    * @param {string} [options.condition] - The column to use as a condition for updating.
    * @param {string|number} options.conditionValue - The value to compare with the condition column.
    * @returns {Promise<boolean>|Array} True if the row or rows were successfully updated; otherwise, it returns an array of arrays containing the error.
    */
    async update({ tableName, set = [this.getOneTable(tableName)[1][0]], setValues, condition = this.getOneTable(tableName)[1][0], conditionValue }) {
        if (!this.intialized) {
            console.log('ROW OR ROWS NOT UPDATED! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['ROW OR ROWS NOT UODATED!'], ['DATABASE "' + this.name + '" NOT INITIALIZED']];
        }
        let table = this.getOneTable(tableName);
        let columnsIndexes = [];

        for (let i = 0; i < set.length; i++) {
            dbMethods.insert(columnsIndexes, treeSearch(table[1], set[i]));

            if (columnsIndexes[i] === -1) {
                console.log('ROW OR ROWS NOT UPDATED! CONDITION "' + set[i] + '" IS NOT A VALID COLUMN');
                return [['ROW OR ROWS NOT UPDATED!', 'CONDITION ' + set[i] + ' IS NOT A VALID COLUMN'], []];
            }
        }

        if (table[0][0] === 'TABLE NOT FOUND!') {
            console.log('ROW OR ROWS NOT UPDATED! TABLE "' + tableName + '" DOESN\'T EXISTS');
            return [['ROW OR ROWS NOT UPDATED!', 'TABLE ' + tableName + ' DOESN\'T EXISTS'], []];
        }

        let columns = [];

        for (let i = 0; i < set.length; i++) {
            columns[i] = [];
            for (let j = 2; j < table.length; j++) {
                if (columnsIndexes[i] < table[j].length) {
                    dbMethods.insert(columns[i], table[j][columnsIndexes[i]]);
                }
            }
        }
        if (setValues && setValues.length === set.length) {
            for (let i = 2; i < table.length; i++) {
                const conditionIndex = table[1].indexOf(condition);
                if (conditionIndex !== -1 && table[i][conditionIndex] === conditionValue) {
                    for (let j = 0; j < set.length; j++) {
                        const updateElement = treeSearch(columns[j], table[i][columnsIndexes[j]]);
                        if (updateElement !== -1) {
                            table[i][columnsIndexes[j]] = setValues[j];
                            await this.save();
                        }
                    }
                }
            }
        }

        return true;

    }

    /**
   * @method find
   * @description Finds rows in a specified table based on a condition.
   * @param {Object} options - Options for finding rows.
   * @param {string} options.tableName - The name of the table.
   * @param {string} [options.condition] - The column to use as a condition for finding rows.
   * @param {string|number} options.conditionValue - The value to compare with the condition column.
   * @param {number} [options.limit] - The maximum number of rows to retrieve.
   * @returns {Array} The specified rows in the specified table based on a condition.
   */
    find({ tableName, condition = this.getOneTable(tableName)[1][0], conditionValue, limit }) {
        if (!this.intialized) {
            console.log('ROW OR ROWS NOT FOUND! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['ROW OR ROWS NOT FOUND!'], ['DATABASE "' + this.name + '" NOT INITIALIZED']];
        }
        let table = this.getOneTable(tableName);
        if (limit === undefined || limit > table.length - 2) {
            limit = table.length - 2;
        }
        if (table[0][0] === 'TABLE NOT FOUND!') {
            console.log('ROW OR ROWS NOT FOUND! TABLE "' + tableName + '" DOESN\'T EXISTS')
            return [['ROW OR ROWS NOT FOUND!', 'TABLE ' + tableName + ' DOESN\'T EXISTS'], []]
        }

        let columnIndex = treeSearch(table[1], condition);

        if (columnIndex === -1) {
            console.log('ROW OR ROWS NOT FOUND! CONDITION "' + condition + '" IS NOT A VALID COLUMN')
            return [['ROW OR ROWS NOT FOUND!', 'CONDITION ' + condition + ' IS NOT A VALID COLUMN'], []]
        }

        let columns = [];

        for (let i = 2; i < table.length; i++) {
            dbMethods.insert(columns, table[i][columnIndex]);
        }

        let values = [];

        for (let i = 0; i < table[1].length; i++) {

            dbMethods.insert(values, table[1][i]);

        }

        let rows = [[table[0][0]], values];

        let elementExist = dbMethods.deleteAllByContent(columns, conditionValue);

        let inserts = 0;

        if (elementExist) {
            for (let i = 2; i < table.length; i++) {
                const foundElement = treeSearch(columns, table[i][columnIndex]);
                if (inserts === limit) {
                    break;
                }
                if (foundElement === -1) {
                    dbMethods.insert(rows, table[i]);
                    inserts++;
                }
            }

        } else {
            console.log('ROW OR ROWS NOT FOUND!')
            return [['ROW OR ROWS NOT FOUND!'], []]
        }

        return rows;

    }

    /**
    * @async
    * @method save
    * @description Saves the current state of the database to a file.
    * @returns {Promise<void>}
    */
    async save() {
        if (!this.intialized) {
            console.log('YOU CAN\'T SAVE! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['YOU CAN\'T SAVE!'], ['DATABASE "' + this.name + '" NOT INITIALIZED']];
        }
        await fs.writeFile(this.filePath, JSON.stringify(this.tables, null, 2));
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
        const dbPath = resolve(__dirname, `./db/${dbName}_db.json`);
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
    * @function describeAllTables
    * @description Retrieves information about all tables in the database.
    * @param  {String} - The name of the database you want to describe
    * @returns {Array} An array containing information about all tables.
    */
export async function describeDatabase(currentDb, dbName) {

    let databases = [];

    let files = await fs.readdir(path.join(__dirname, 'db'));

    files.forEach((file) => {
        dbMethods.insert(databases, file.split('_').shift());
    })

    let dbNamePos = treeSearch(databases, dbName);

    if (dbNamePos === -1) {
        console.log('DATABASE NOT FOUND!')
        return [['DATABASE NOT FOUND!'], ['DATABASE "' + dbName + '" DO NOT EXIST!']];
    }

    let newDb = new DB(databases[dbNamePos]);

    await newDb.init();

    let dbDesc = newDb.showAllTableNames();
    
    if(currentDb instanceof DB){
        currentDb.init();
    }

    return dbDesc;
}