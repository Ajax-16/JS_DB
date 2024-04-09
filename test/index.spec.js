import { DB } from "../index.js"
import jest from "jest-mock";
import { promises as fs } from 'fs';

const trueMock = jest.fn().mockReturnValue(true);

fs.mkdir = trueMock;
fs.writeFile = trueMock;
fs.readFile = trueMock;
fs.access = trueMock;
fs.unlink = trueMock;
fs.readdir = trueMock;

const testDBInstance = new DB("test");

beforeEach(() => {

    const testDBText =
    [
        [
            [
                "test_table_1",
                {
                    "elements": 0
                }
            ],
            [
                "id",
                "test_column_1",
                "test_column_2",
                "test_column_3"
            ]
        ]
    ]

    testDBInstance.save = trueMock;

    Object.defineProperty(testDBInstance, 'tables', {
        value: testDBText,
        writable: true
    });
    Object.defineProperty(testDBInstance, 'initialized', {
        value: true,
        writable: true
    });

})

describe("Create table test", () => {
    test("Should not create a table because there are duplicated normal columns", async () => {
        const tableCreate = await testDBInstance.createTable({ tableName: "test_table_2", primaryKey: "id", columns: ["test_column_1", "test_column_1"] })
        expect(tableCreate).toBe(false);
    })
    test("Should not create a table because there are duplicated normal and fk columns", async () => {
        const tableCreate = await testDBInstance.createTable({
            tableName: "test_table_2", primaryKey: "id", columns: ["test_column_1", "test_column_2"], foreignKeys: [{
                name: "test_fk", columnName: "test_column_1", referenceTable: "test_table_2", referenceColumn: "test_column_2"
            }]
        })
        expect(tableCreate).toBe(false);
    })
    test("Should not create a table because there are duplicated fk columns", async () => {
        const tableCreate = await testDBInstance.createTable({
            tableName: "test_table_2", primaryKey: "id", foreignKeys: [
                {
                    name: "test_fk", columnName: "test_column_1", referenceTable: "test_table_2", referenceColumn: "test_column_2"
                },
                {
                    name: "test_fk", columnName: "test_column_1", referenceTable: "test_table_3", referenceColumn: "test_column_3"
                }
            ]
        })
        expect(tableCreate).toBe(false);
    })
    test("Should not create a table because the name is in use", async () => {
        const tableCreate = await testDBInstance.createTable({ tableName: "test_table_1", primaryKey: "id", columns: ["test_column_1", "test_column_2"] })
        expect(tableCreate[0][0]).toEqual("EXCEPTION ENCOUNTER");
    })
    test("Should not create a table because the name is a keyword", async () => {
        const tableCreate = await testDBInstance.createTable({ tableName: "EXCEPTION ENCOUNTER", primaryKey: "id", columns: ["test_column_1", "test_column_2"] })
        expect(tableCreate[0][0]).toEqual("EXCEPTION ENCOUNTER");
    })
    test("Should create a table with any conflicts", async () => {
        const tableCreate = await testDBInstance.createTable({ tableName: "test_table_2", primaryKey: "id", columns: ["test_column_1", "test_column_2"] })
        expect(tableCreate).toBe(true);
    })
})



describe("Insert on table test", () => {
    test("Should insert on table", async ()=>{
        const tableInsert = await testDBInstance.insert({tableName: "test_table_1", values: ["test_value_1", "test_value_2", "test_value_3"]});
        expect(tableInsert).toBe(true)
    })
    test("Should not insert on table because table doesn\'t exist", async ()=>{
        const tableInsert = await testDBInstance.insert({tableName: "table_test_1", values: ["test_value_1", "test_value_2", "test_value_3"]});
        expect(tableInsert[0][0]).toEqual("EXCEPTION ENCOUNTER");
    })
})

describe("Delete one element from table test", ()=>{
    test("Should delete on table", async ()=>{
        // test element
        await testDBInstance.insert({tableName: "test_table_1", values: ["test_value_1", "test_value_2", "test_value_3"]});
        const tableDelete = await testDBInstance.delete({tableName: "test_table_1", condition: "id", operator: "=", conditionValue: 0})
        expect(tableDelete).toBe(true);
    })
    test("Should not delete on table because the element doesn\'t exist", async ()=>{
        const tableDelete = await testDBInstance.delete({tableName: "test_table_1", condition: "id", operator: "=", conditionValue: 1})
        expect(tableDelete).toBe(false);
    })
    test("Should not delete on table because a column is invalid", async ()=>{
        const tableDelete = await testDBInstance.delete({tableName: "test_table_1", condition: "invented_column", operator: "=", conditionValue: "value"})
        expect(tableDelete[0][0]).toEqual("EXCEPTION ENCOUNTER");
    })
    test("Should not delete on table because the table doesn\'t exist", async ()=>{
        const tableDelete = await testDBInstance.delete({tableName: "invented_table", condition: "id", operator: "=", conditionValue: 0})
        expect(tableDelete[0][0]).toEqual("EXCEPTION ENCOUNTER");
    })
})
