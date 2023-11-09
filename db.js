import dbMethods from './algorithms/array_methods.js';
import { treeSearch } from './algorithms/tree_search.js';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class DB {

    tables = [];

    name = 'db';

    keywords = ['TABLE NOT FOUND!', 'TABLE CANNOT BE CREATED!', 'ROW CANNOT BE CREATED!', 'ROW OR ROWS CANNOT BE DELETED!', 'ROW OR ROWS NOT FOUND!', 'ROW OR ROWS NOT FOUND!']

    constructor(name) {
        this.name = name;
        this.filePath = resolve(__dirname, `./db/${this.name}_db.json`);
    }

    async init() {
        try {
            const fileContent = await fs.readFile(this.filePath, 'utf8');
            this.tables = JSON.parse(fileContent);
            console.log('CONTENT LOADED');
        } catch (readError) {
            this.tables = [];

            try {
                await fs.writeFile(this.filePath, '');
                console.log('DATABASE CREATED SUCCESSFULY');
            } catch (writeError) {
                console.error('ERROR WRITING ON DATABASE FILE:', writeError);
            }
        }
    }

    createTable(tableName, primaryKey, columns) {

        let tableExist = this.getOneTable(tableName);

        if (tableExist[0][0] !== 'TABLE NOT FOUND!') {
            console.log('TABLE WITH NAME "' + tableName + '" NOT CREATED. TABLE NAME = "' + tableName + '" IS ALREADY CREATED');
            return [['TABLE CANNOT BE CREATED!', 'NAME ' + tableName + ' ALREADY IN USE'], []];
        }

        if(primaryKey === undefined || columns === undefined ){
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

        this.save();

        console.log('TABLE WITH NAME "' + tableName + '" CREATED SUCCESSFULY');

        return true;

    }

    async dropTable(tableName) {

        let result;

        let tableNames = this.getAllTableNames();

        let tableIndex = treeSearch(tableNames, tableName);

        if(tableIndex===-1) {
            console.log('TABLE COULD NOT BE DROPPED. TABLE DOES\'T EXIST')
            result = false;
        }

        result = dbMethods.deleteByIndex(this.tables, tableIndex);

        console.log('TABLE "' + tableName + '" DROPPED SUCCESSFULY');

        await this.save();

        return 

    }

    getAllTables() {
        return this.tables;
    }

    getAllTableNames() {
        let tableNames = [];
        for (let i = 0; i < this.tables.length; i++) {
            tableNames.push(this.tables[i][0][0]);
        }
        return tableNames;
    }

    getOneTable(tableName) {
        let tableNames = this.getAllTableNames();
        let position = treeSearch(tableNames, tableName);
        if (position !== -1) {
            return this.tables[position];
        }
        return [['TABLE NOT FOUND!'], []];
    }

    async insert({ tableName, values }) {
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

        console.log('CREATED ROW WITH "' + table[1][0] + '" VALUE = "' + table[table.length-1][0] + '"')

        return true;

    }

    async delete({ tableName, condition = this.getOneTable(tableName)[1][0], conditionValue }) {
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
            
        }else {
            console.log('0 ROWS AFFECTED')
        }

    }

    async update({ tableName, set = [this.getOneTable(tableName)[1][0]], setValues, condition = this.getOneTable(tableName)[1][0], conditionValue }) {
        let table = this.getOneTable(tableName);
        let columnsIndexes = [];
    
        for (let i = 0; i < set.length; i++) {
            dbMethods.insert(columnsIndexes, treeSearch(table[1], set[i]));
    
            if (columnsIndexes[i] === -1) {
                console.log('ROW OR ROWS NOT FOUND! CONDITION "' + set[i] + '" IS NOT A VALID COLUMN');
                return [['ROW OR ROWS NOT FOUND!', 'CONDITION ' + set[i] + ' IS NOT A VALID COLUMN'], []];
            }
        }
    
        if (table[0][0] === 'TABLE NOT FOUND!') {
            console.log('ROW OR ROWS NOT FOUND! TABLE "' + tableName + '" DOESN\'T EXISTS');
            return [['ROW OR ROWS NOT FOUND!', 'TABLE ' + tableName + ' DOESN\'T EXISTS'], []];
        }
    
        let columns = [];
    
        for (let i = 0; i < set.length; i++) {
            columns[i] = [];
            for (let j = 2; j < table.length; j++) {
                if (columnsIndexes[i] < table[j].length) {
                    columns[i].push(table[j][columnsIndexes[i]]);
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
                            console.log('UPDATED ONE ROW WITH "' + table[1][0] + '" = ' + table[i][0])
                            table[i][columnsIndexes[j]] = setValues[j];
                            await this.save();
                        }
                    }
                }
            }
        } else {
            console.log('0 ROWS AFFECTED');
        }
    }

    find({ tableName, condition = this.getOneTable(tableName)[1][0], conditionValue, limit }) {
        let table = this.getOneTable(tableName);
        if(limit === undefined || limit > table.length-2){
            limit = table.length-2;
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

        for(let i = 0; i < table[1].length; i++) {
        
            dbMethods.insert(values, table[1][i]);

        }

        let rows = [[table[0][0]], values];

        let elementExist = dbMethods.deleteAllByContent(columns, conditionValue);

        if (elementExist) {
            for (let i = 2; i < limit+2; i++) {
                const foundElement = treeSearch(columns, table[i][columnIndex]);
                if (foundElement === -1) {
                    dbMethods.insert(rows, table[i]);
                }
            }
            
        }else {
            console.log('ROW OR ROWS NOT FOUND')
            return [['ROW OR ROWS NOT FOUND'], []]
        }

        return rows;

    }

    async save() {
        await fs.writeFile(this.filePath, JSON.stringify(this.tables, null, 2));
    }

}