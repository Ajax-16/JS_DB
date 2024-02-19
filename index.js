import dbMethods from './algorithms/array_methods.js';
import { treeSearch } from './algorithms/tree_search.js';
import { Cache } from './utils/cache.js';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';

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
    * @constructor
    * @param {string} name - The name of the database.
    */
    constructor(name, cacheBufferSize = 65536) {
        this.name = name;
        this.cache = new Cache(cacheBufferSize);
    }

    /**
    * @async
    * @method init
    * @description Initializes the database by loading existing data or creating a new file.
    * @returns {Promise<void>}
    */
    async init() {
        try {
            this.filePath = await getFilePath(this.name);
            const fileContent = await fs.readFile(this.filePath, 'utf8');
            this.tables = JSON.parse(fileContent);
            this.initialized = true;
        } catch (readError) {
            this.tables = [];

            try {
                await fs.writeFile(this.filePath, '');
                console.log('DATABASE CREATED SUCCESSFULY');
                this.initialized = true;
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

        if (!this.initialized) {
            console.log('TABLE WITH NAME "' + tableName + '" NOT CREATED. DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['EXCEPTION ENCOUNTER'], ['TABLE CANNOT BE CREATED! DATABASE ' + this.name + ' NOT INITIALIZED']];
        }

        let tableExist = this.getOneTable(tableName);

        if (tableExist[0][0] !== 'EXCEPTION ENCOUNTER') {
            console.log('TABLE WITH NAME "' + tableName + '" NOT CREATED. TABLE NAME "' + tableName + '" IS ALREADY CREATED');
            return [['EXCEPTION ENCOUNTER'], ['TABLE CANNOT BE CREATED! TABLE NAME ' + tableName + ' ALREADY IN USE']];
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
            console.log('TABLE WITH NAME "' + tableName + '" NOT CREATED. TABLE NAME "' + tableName + '" IS A KEYWORD');
            return [['EXCEPTION ENCOUNTER'], ['TABLE CANNOT BE CREATED! TABLE NAME "' + tableName + '" IS A KEYWORD']];
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

        if (!this.initialized) {
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
        if (!this.initialized) {
            console.log('ANY TABLES FOUND! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['EXCEPTION ENCOUNTER'], ['ANY TABLES FOUND! DATABASE "' + this.name + '" NOT INITIALIZED']];
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
            console.log('TABLE NOT FOUND! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['EXCEPTION ENCOUNTER'], ['TABLE NOT FOUND! DATABASE "' + this.name + '" NOT INITIALIZED']];
        }
        let tableNames = this.showAllTableNames();
        let position = treeSearch(tableNames, tableName);
        if (position !== -1) {
            return this.tables[position];
        }
        return [['EXCEPTION ENCOUNTER'], ['TABLE NOT FOUND!']];
    }

    /**
    * @method showAllTables
    * @description Retrieves all tables with shortened names for display.
    * @returns {Array} An array of tables with shortened names.
    */
    async showAllTables() {
        if (!this.initialized) {
            console.log('ANY TABLES FOUND! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['EXCEPTION ENCOUNTER'], ['ANY TABLES FOUND! DATABASE "' + this.name + '" NOT INITIALIZED']];
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
        if (!this.initialized) {
            console.log('ANY TABLES FOUND! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['EXCEPTION ENCOUNTER'], ['ANY TABLES FOUND! DATABASE "' + this.name + '" NOT INITIALIZED']];
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
    async showOneTable(tableName, offset = 0, limit) {
        if (!this.initialized) {
            console.log('DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['EXCEPTION ENCOUNTER'],['DATABASE "' + this.name + '" NOT INITIALIZED']];
        }
    
        const tableNames = this.showAllTableNames();
        const position = treeSearch(tableNames, tableName);
        if (position !== -1) {
            let tableCopy = [...this.tables[position]];
            tableCopy[0] = tableCopy[0].slice(0, 1);
    
            const tableHeaders = tableCopy.slice(0, 2);
    
            let dataRows = tableCopy.slice(2);
            if (limit !== undefined) {
                dataRows = dataRows.slice(offset, offset + limit);
            } else if (offset > 0) {
                dataRows = dataRows.slice(offset);
            }

            if(dataRows.length === 0) {
                return tableHeaders
            }
            // Concatena las cabeceras con las filas de datos procesadas
            return tableHeaders.concat(dataRows);
        }
    
        return [['EXCEPTION ENCOUNTER'],['TABLE NOT FOUND!']];
    }
    
    /**
    * @method describeOneTable
    * @description Retrieves information about a specific table.
    * @param {string} tableName - The name of the table to describe.
    * @returns {Array} An array containing information about the specified table.
    */
    describeOneTable(tableName) {
        if (!this.initialized) {
            console.log('TABLE NOT FOUND! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['EXCEPTION ENCOUNTER'], ['TABLE NOT FOUND! DATABASE "' + this.name + '" NOT INITIALIZED']];
        }
        let tableNames = this.showAllTableNames();
        let position = treeSearch(tableNames, tableName);
        if (position !== -1) {
            let tableDesc = [[...this.tables[position][0]]];
            tableDesc[0] = tableDesc[0].slice(0, 1);
            dbMethods.insert(tableDesc, this.tables[position][1]);
            return tableDesc;
        }
        return [['EXCEPTION ENCOUNTER'], ['TABLE NOT FOUND!']];
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
        if (!this.initialized) {
            console.log('ROW CANNOT BE CREATED! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['EXCEPTION ENCOUNTER'], ['ROW CANNOT BE CREATED! DATABASE "' + this.name + '" NOT INITIALIZED']];
        }
        let table = this.getOneTable(tableName);
        if (table[0][0] === 'EXCEPTION ENCOUNTER') {
            console.log('ROW CANNOT BE CREATED! TABLE "' + tableName + '" DOESN\'T EXISTS');
            return [['EXCEPTION ENCOUNTER'], ['ROW CANNOT BE CREATED! TABLE "' + tableName + '" DOESN\'T EXISTS']]
        }
        let limitOnValues = table[1].length - 1;
        if (values.length < limitOnValues) {
            console.log('ROW CANNOT BE CREATED! SOME OF THE VALUES ARE NULL')
            return [['EXCETION ENCOUNTER'], ['ROW CANNOT BE CREATED! SOME OF THE VALUES ARE NULL']]
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

    async delete({ tableName, condition = this.getOneTable(tableName)[1][0], conditionValue }) {
        if (!this.initialized) {
            console.log('ROW OR ROWS CANNOT BE DELETED! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['EXCEPTION ENCOUNTER'], ['ROW OR ROWS CANNOT BE DELETED! DATABASE "' + this.name + '" NOT INITIALIZED']];
        }
    
        let table = this.getOneTable(tableName);
        if (table[0][0] === 'EXCEPTION ENCOUNTER') {
            console.log('ROW OR ROWS CANNOT BE DELETED! TABLE "' + tableName + '" DOESN\'T EXIST');
            return [['EXCEPTION ENCOUNTER'], ['ROW OR ROWS CANNOT BE DELETED! TABLE "' + tableName + '" DOESN\'T EXIST']];
        }
    
        let columnIndex = treeSearch(table[1], condition);
    
        if (columnIndex === -1) {
            console.log('ROW OR ROWS CANNOT BE DELETED! CONDITION "' + condition + '" IS NOT A VALID COLUMN');
            return [['EXCEPTION ENCOUNTER'], ['ROW OR ROWS CANNOT BE DELETED! CONDITION "' + condition + '" IS NOT A VALID COLUMN']];
        }
    
        // Index the column values
        let indexMap = new Map();
        for (let i = 2; i < table.length; i++) {
            let value = table[i][columnIndex];
            if (!indexMap.has(value)) {
                indexMap.set(value, []);
            }
            indexMap.get(value).push(i);
        }
    
        if (!indexMap.has(conditionValue)) {
            console.log('0 ROWS DELETED');
            return false;
        }
    
        let rowsToDelete = indexMap.get(conditionValue);
    
        // Delete rows
        for (let i = rowsToDelete.length - 1; i >= 0; i--) {
            let rowIndex = rowsToDelete[i];            
            dbMethods.deleteByIndex(table, rowIndex);
        }

        console.log(`DELETED ${rowsToDelete.length} ROW(S) WITH ${condition} VALUE = ${conditionValue}`);
    
        await this.save();
        return true;
    }
    

    async update({ tableName, set = [], setValues, condition, conditionValue }) {
        if (!this.initialized) {
            console.log('ROW OR ROWS CANNOT BE UPDATED! DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['EXCEPTION ENCOUNTER'], ['ROW OR ROWS CANNOT BE UPDATED! DATABASE "' + this.name + '" NOT INITIALIZED']];
        }
    
        const table = this.getOneTable(tableName);
        if (table[0][0] === 'EXCEPTION ENCOUNTER') {
            console.log('ROW OR ROWS CANNOT BE UPDATED! TABLE "' + tableName + '" DOESN\'T EXIST');
            return [['EXCEPTION ENCOUNTER'], ['ROW OR ROWS CANNOT BE UPDATED! TABLE "' + tableName + '" DOESN\'T EXIST']];
        }
    
        const columnIndexes = {};
        table[1].forEach((column, index) => {
            columnIndexes[column] = index;
        });
    
        const conditionIndex = columnIndexes[condition];
        if (conditionIndex === undefined) {
            console.log('ROW OR ROWS CANNOT BE UPDATED! CONDITION "' + condition + '" IS NOT A VALID COLUMN');
            return [['EXCEPTION ENCOUNTER'], ['ROW OR ROWS CANNOT BE UPDATED! CONDITION "' + condition + '" IS NOT A VALID COLUMN']];
        }
    
        const setIndexes = set.map(column => {
            const index = columnIndexes[column];
            if (index === undefined) {
                console.log('ROW OR ROWS CANNOT BE UPDATED! CONDITION "' + condition + '" IS NOT A VALID COLUMN');
            }
            return index;
        });
    
        const rowsToUpdate = [];
        for (let i = 2; i < table.length; i++) {
            if (table[i][conditionIndex] === conditionValue) {
                rowsToUpdate.push(i);
            }
        }

        let totalUpdated = 0;
    
        if (setValues && setValues.length === set.length) {
            for (const rowIndex of rowsToUpdate) {
                for (let j = 0; j < set.length; j++) {
                    if(table[rowIndex][setIndexes[j]] !== setValues[j]){
                        table[rowIndex][setIndexes[j]] = setValues[j];
                        totalUpdated++;
                    }
                }
            }
            let finalMsg = totalUpdated ? `UPDATED ${totalUpdated} ROW(S) WITH (${JSON.stringify(set)}) VALUES (${JSON.stringify(setValues)})` : '0 ROWS UPDATED'
            console.log(finalMsg);
            await this.save();
        }
    
        return true;
    }

    async find({ tableName, condition = this.getOneTable(tableName)[1][0], conditionValue, offset = 0, limit }) {
        if (!this.initialized) {
            console.log('DATABASE "' + this.name + '" NOT INITIALIZED');
            return [['EXCEPTION ENCOUNTER'], ['DATABASE "' + this.name + '" NOT INITIALIZED']];
        }
    
        let table = this.getOneTable(tableName);
        if (table[0][0] === 'EXCEPTION ENCOUNTER') {
            console.log('TABLE "' + tableName + '" DOESN\'T EXIST');
            return [['EXCEPTION ENCOUNTER'], ['TABLE ' + tableName + ' DOESN\'T EXIST']];
        }
    
        let columnIndex = treeSearch(table[1], condition);
    
        if (columnIndex === -1) {
            console.log('CONDITION "' + condition + '" IS NOT A VALID COLUMN');
            return [['EXCEPTION ENCOUNTER'], ['CONDITION "' + condition + '" IS NOT A VALID COLUMN']];
        }
    
        // Index the column values
        let indexMap = new Map();
        for (let i = 2; i < table.length; i++) {
            let value = table[i][columnIndex];
            if (!indexMap.has(value)) {
                indexMap.set(value, []);
            }
            indexMap.get(value).push(i);
        }
    
        if (!indexMap.has(conditionValue)) {
            console.log('ROW OR ROWS NOT FOUND!');
            return [['EXCEPTION ENCOUNTER'], ['ROW OR ROWS NOT FOUND!']];
        }
    
        let rows = indexMap.get(conditionValue);
    
        let result = [];

        if(offset > rows.length) {
            return [[tableName], table[1]];
        }
    
        // Retrieve rows
        for (let i = offset; i < rows.length; i++) {
            let rowIndex = rows[i];
            let row = [];
            for (let j = 0; j < table[rowIndex].length; j++) {
                row.push(table[rowIndex][j]);
            }
            result.push(row);
        }

        if (limit && limit < rows.length) {
            result = result.slice(0, limit);
        }
    
        return [[tableName], table[1], ...result];
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
    * @param  {String} - The name of the database you want to describe
    * @returns {Array} An array containing the name about all tables.
    */
export async function describeDatabase(currentDb, dbName) {

    let databases = [];

    let files = await fs.readdir(getDbFolder());

    files.forEach((file) => {
        dbMethods.insert(databases, file.split('_').shift());
    })

    let dbNamePos = treeSearch(databases, dbName);

    if (dbNamePos === -1) {
        console.log('DATABASE "' + dbName + '" DO NOT EXIST!')
        return [['EXCEPTION ENCOUNTER'], ['DATABASE NOT FOUND! DATABASE "' + dbName + '" DO NOT EXIST!']];
    }

    let newDb = new DB(databases[dbNamePos]);

    await newDb.init();

    let dbDesc = newDb.showAllTableNames();

    if (currentDb instanceof DB) {
        currentDb.init();
    }

    return dbDesc;
}

function getDbFolder() {
    const baseDir = process.platform === 'win32' ? 'C:/ajaxdb/' : '/var/ajaxdb/';
    const dbFolder = path.join(baseDir, 'data');

    return dbFolder;
}

async function getFilePath(dbName) {
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