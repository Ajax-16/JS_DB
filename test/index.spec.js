import { DB, describeDatabase } from "../index.js"
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

describe("Get one table test", () => {
    test("Should get the specified table", () => {
        const getTable = testDBInstance.getOneTable("test_table_1")
        expect(getTable[1]).toEqual(expect.arrayContaining(["test_column_1"]))
    })
    test("Should not get the specified table because it doesn\'t exist", () => {
        const getTable = testDBInstance.getOneTable("fake_table")
        expect(getTable[0][0]).toEqual("EXCEPTION ENCOUNTER");
    })
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
    test("Should create a table with id as default primary key when undefined value on primaryKey", async () => {
        const tableCreate = await testDBInstance.createTable({ tableName: "test_table_2", columns: ["test_column_1", "test_column_2"] })
        expect(tableCreate).toBe(true);
        const createdTable = testDBInstance.getOneTable("test_table_2")
        // posicion de la primary key siempre
        expect(createdTable[1][0]).toEqual("id")
    })
    test("Should create a table with reference keys", async () => {
        const tableCreate = await testDBInstance.createTable({ tableName: "test_fk_table", primaryKey: "id", columns: ["test_column_1", "test_column_2"], foreignKeys: [{ name: "fk_1", columnName: "test_fk_column_1", referenceTable: "test_table_2", referenceColumn: "test_column_1" }, { name: "fk_1", columnName: "test_fk_column_2", referenceTable: "test_table_2", referenceColumn: "test_column_2" }] })
        expect(tableCreate).toBe(true);
    })
})

describe("Drop table test", () => {
    test("Should drop the table", async () => {
        const tableDrop = await testDBInstance.dropTable("test_table_1");
        expect(tableDrop).toBe(true)
    })
    test("Should not drop the table", async () => {
        const tableDrop = await testDBInstance.dropTable("fake_table");
        expect(tableDrop).toBe(false)
    })
})

describe("Describe table test", () => {
    test("Should describe one table", () => {
        const tableDescription = testDBInstance.describeOneTable("test_table_1")
        expect(tableDescription[1][0]).toBe("id")
        expect(tableDescription[1][1]).toBe("test_column_1")
        expect(tableDescription[1][2]).toBe("test_column_2")
        expect(tableDescription[1][3]).toBe("test_column_3")
    })
    test("Should describe one table", () => {
        const tableDescription = testDBInstance.describeOneTable("fake_table")
        expect(tableDescription[0][0]).toBe("EXCEPTION ENCOUNTER")
    })
})

describe("Insert on table test", () => {
    test("Should insert on table", async () => {
        const tableInsert = await testDBInstance.insert({ tableName: "test_table_1", values: ["test_value_1", "test_value_2", "test_value_3"] });
        expect(tableInsert).toBe(true)
    })
    test("Should not insert on table because table doesn\'t exist", async () => {
        const tableInsert = await testDBInstance.insert({ tableName: "fake_table", values: ["test_value_1", "test_value_2", "test_value_3"] });
        expect(tableInsert[0][0]).toEqual("EXCEPTION ENCOUNTER");
    })
})

describe("retrieve row indexes successfully test", () => {
    test("Should retrieve all row indexes", async () => {
        // Test data on table for this tests
        for (let i = 0; i < 5; i++) {
            await testDBInstance.insert({ tableName: "test_table_1", values: [`test_value_${i}`, `test_value_${i + 1}`, `test_value_${i + 2}`] });
        }

        const { columnIndex, rows, success, errorMessage } = testDBInstance.retrieveRowIndexes({ table: testDBInstance.getOneTable("test_table_1"), condition: undefined, operator: undefined, conditionValue: undefined })
        expect(rows).toEqual(expect.not.arrayContaining([0, 1]));
        expect(rows).toEqual(expect.arrayContaining([2, 3, 4, 5, 6]));
        expect(success).toBe(true);
        expect(columnIndex).toBeFalsy();
        expect(errorMessage).toBeFalsy();

    })
    test("Should retrieve row index using '=' operator", async () => {
        // Test data on table for this tests
        for (let i = 0; i < 5; i++) {
            await testDBInstance.insert({ tableName: "test_table_1", values: [`test_value_${i}`, `test_value_${i + 1}`, `test_value_${i + 2}`] });
        }

        const { columnIndex, rows, success, errorMessage } = testDBInstance.retrieveRowIndexes({ table: testDBInstance.getOneTable("test_table_1"), condition: "test_column_1", operator: "=", conditionValue: "test_value_1" })
        expect(rows).toEqual(expect.not.arrayContaining([0, 1]));
        expect(rows).toEqual(expect.arrayContaining([3]));
        expect(rows).toEqual(expect.not.arrayContaining([3, 4]));
        expect(rows).toEqual(expect.not.arrayContaining([2, 6]));
        expect(rows).toEqual(expect.not.arrayContaining([2, 3]));
        expect(success).toBe(true);
        expect(columnIndex).toBe(1);
        expect(errorMessage).toBeFalsy();

    })
    test("Should retrieve row indexes using '!=' operator", async () => {
        // Test data on table for this tests
        for (let i = 0; i < 5; i++) {
            await testDBInstance.insert({ tableName: "test_table_1", values: [`test_value_${i}`, `test_value_${i + 1}`, `test_value_${i + 2}`] });
        }

        const { columnIndex, rows, success, errorMessage } = testDBInstance.retrieveRowIndexes({ table: testDBInstance.getOneTable("test_table_1"), condition: "id", operator: "!=", conditionValue: 2 })
        expect(rows).toEqual(expect.not.arrayContaining([0, 1]));
        expect(rows).toEqual(expect.arrayContaining([2, 3, 5, 6]));
        expect(success).toBe(true);
        expect(columnIndex).toBe(0);
        expect(errorMessage).toBeFalsy();

    })
    test("Should retrieve row indexes using '>' operator", async () => {
        // Test data on table for this tests
        for (let i = 0; i < 5; i++) {
            await testDBInstance.insert({ tableName: "test_table_1", values: [`test_value_${i}`, `test_value_${i + 1}`, `test_value_${i + 2}`] });
        }

        const { columnIndex, rows, success, errorMessage } = testDBInstance.retrieveRowIndexes({ table: testDBInstance.getOneTable("test_table_1"), condition: "id", operator: ">", conditionValue: 0 })
        expect(rows).toEqual(expect.not.arrayContaining([0, 1]));
        expect(rows).toEqual(expect.arrayContaining([3, 4, 5, 6]));
        expect(rows).toEqual(expect.not.arrayContaining([2]));
        expect(success).toBe(true);
        expect(columnIndex).toBe(0);
        expect(errorMessage).toBeFalsy();

    })
    test("Should retrieve row indexes using '>=' operator", async () => {
        // Test data on table for this tests
        for (let i = 0; i < 5; i++) {
            await testDBInstance.insert({ tableName: "test_table_1", values: [`test_value_${i}`, `test_value_${i + 1}`, `test_value_${i + 2}`] });
        }

        const { columnIndex, rows, success, errorMessage } = testDBInstance.retrieveRowIndexes({ table: testDBInstance.getOneTable("test_table_1"), condition: "id", operator: ">=", conditionValue: 0 })
        expect(rows).toEqual(expect.not.arrayContaining([0, 1]));
        expect(rows).toEqual(expect.arrayContaining([2, 3, 4, 5, 6]));
        expect(success).toBe(true);
        expect(columnIndex).toBe(0);
        expect(errorMessage).toBeFalsy();

    })
    test("Should retrieve row indexes using '<' operator", async () => {
        // Test data on table for this tests
        for (let i = 0; i < 5; i++) {
            await testDBInstance.insert({ tableName: "test_table_1", values: [`test_value_${i}`, `test_value_${i + 1}`, `test_value_${i + 2}`] });
        }

        const { columnIndex, rows, success, errorMessage } = testDBInstance.retrieveRowIndexes({ table: testDBInstance.getOneTable("test_table_1"), condition: "id", operator: "<", conditionValue: 4 })
        expect(rows).toEqual(expect.not.arrayContaining([0, 1]));
        expect(rows).toEqual(expect.arrayContaining([2, 3, 4, 5]));
        expect(rows).toEqual(expect.not.arrayContaining([6]));
        expect(success).toBe(true);
        expect(columnIndex).toBe(0);
        expect(errorMessage).toBeFalsy();

    })
    test("Should retrieve row indexes using '<=' operator", async () => {
        // Test data on table for this tests
        for (let i = 0; i < 5; i++) {
            await testDBInstance.insert({ tableName: "test_table_1", values: [`test_value_${i}`, `test_value_${i + 1}`, `test_value_${i + 2}`] });
        }

        const { columnIndex, rows, success, errorMessage } = testDBInstance.retrieveRowIndexes({ table: testDBInstance.getOneTable("test_table_1"), condition: "id", operator: "<=", conditionValue: 4 })
        expect(rows).toEqual(expect.not.arrayContaining([0, 1]));
        expect(rows).toEqual(expect.arrayContaining([2, 3, 4, 5, 6]));
        expect(success).toBe(true);
        expect(columnIndex).toBe(0);
        expect(errorMessage).toBeFalsy();

    })
    test("Should retrieve row indexes using 'LIKE' operator", async () => {
        // Test data on table for this tests
        for (let i = 0; i < 5; i++) {
            await testDBInstance.insert({ tableName: "test_table_1", values: [`test_value_${i}`, `test_value_${i + 1}`, `test_value_${i + 2}`] });
        }

        const { columnIndex, rows, success, errorMessage } = testDBInstance.retrieveRowIndexes({ table: testDBInstance.getOneTable("test_table_1"), condition: "test_column_1", operator: "LIKE", conditionValue: 'test_value_%' })
        expect(rows).toEqual(expect.not.arrayContaining([0, 1]));
        expect(rows).toEqual(expect.arrayContaining([2, 3, 4, 5, 6]));
        expect(success).toBe(true);
        expect(columnIndex).toBe(1);
        expect(errorMessage).toBeFalsy();

    })
    test("Should retrieve row indexes using 'NOT LIKE' operator", async () => {
        // Test data on table for this tests
        for (let i = 0; i < 5; i++) {
            await testDBInstance.insert({ tableName: "test_table_1", values: [`test_value_${i}`, `test_value_${i + 1}`, `test_value_${i + 2}`] });
        }

        const { columnIndex, rows, success, errorMessage } = testDBInstance.retrieveRowIndexes({ table: testDBInstance.getOneTable("test_table_1"), condition: "test_column_1", operator: "NOT LIKE", conditionValue: 'test_value_%' })
        expect(rows).toEqual([]);
        expect(rows).toEqual(expect.not.arrayContaining([0, 1, 2, 3, 4, 5, 6]));
        expect(success).toBe(true);
        expect(columnIndex).toBe(1);
        expect(errorMessage).toBeFalsy();

    })
    test("Should retrieve row indexes using 'IN' operator", async () => {
        // Test data on table for this tests
        for (let i = 0; i < 5; i++) {
            await testDBInstance.insert({ tableName: "test_table_1", values: [`test_value_${i}`, `test_value_${i + 1}`, `test_value_${i + 2}`] });
        }

        const { columnIndex, rows, success, errorMessage } = testDBInstance.retrieveRowIndexes({ table: testDBInstance.getOneTable("test_table_1"), condition: "id", operator: "IN", conditionValue: [0, 2, 4] })
        expect(rows).toEqual(expect.not.arrayContaining([0, 1]));
        expect(rows).toEqual(expect.not.arrayContaining([3, 5]));
        expect(rows).toEqual(expect.arrayContaining([2, 4, 6]));
        expect(success).toBe(true);
        expect(columnIndex).toBe(0);
        expect(errorMessage).toBeFalsy();

    })
    test("Should retrieve row indexes using 'NOT IN' operator", async () => {
        // Test data on table for this tests
        for (let i = 0; i < 5; i++) {
            await testDBInstance.insert({ tableName: "test_table_1", values: [`test_value_${i}`, `test_value_${i + 1}`, `test_value_${i + 2}`] });
        }

        const { columnIndex, rows, success, errorMessage } = testDBInstance.retrieveRowIndexes({ table: testDBInstance.getOneTable("test_table_1"), condition: "id", operator: "NOT IN", conditionValue: [0, 2, 4] })
        expect(rows).toEqual(expect.not.arrayContaining([0, 1]));
        expect(rows).toEqual(expect.not.arrayContaining([2, 4, 6]));
        expect(rows).toEqual(expect.arrayContaining([3, 5]));
        expect(success).toBe(true);
        expect(columnIndex).toBe(0);
        expect(errorMessage).toBeFalsy();

    })

})

describe("retrive row indexes unsuccessfully test", () => {
    test("Should not retrive rows because condition column doesn\'t exist", async () => {
        // Test data on table for this tests
        for (let i = 0; i < 5; i++) {
            await testDBInstance.insert({ tableName: "test_table_1", values: [`test_value_${i}`, `test_value_${i + 1}`, `test_value_${i + 2}`] });
        }

        const { columnIndex, rows, success, errorMessage } = testDBInstance.retrieveRowIndexes({ table: testDBInstance.getOneTable("test_table_1"), condition: "fake_condition_column", operator: "=", conditionValue: "fake_value" })
        expect(rows).toEqual([]);
        expect(rows).toEqual(expect.not.arrayContaining([0, 1, 2, 3, 4, 5, 6]));
        expect(success).toBe(false);
        expect(columnIndex).toBeFalsy();
        expect(errorMessage).toEqual(expect.stringContaining("CONDITION COLUMN"));
        expect(errorMessage).toEqual(expect.stringContaining("DOESN\'T EXIST ON TABLE"));

    })
    test("Should not retrive rows because condition column doesn\'t exist", async () => {
        // Test data on table for this tests
        for (let i = 0; i < 5; i++) {
            await testDBInstance.insert({ tableName: "test_table_1", values: [`test_value_${i}`, `test_value_${i + 1}`, `test_value_${i + 2}`] });
        }

        const { columnIndex, rows, success, errorMessage } = testDBInstance.retrieveRowIndexes({ table: testDBInstance.getOneTable("test_table_1"), condition: "fake_condition_column", operator: "=", conditionValue: "fake_value" })
        expect(rows).toEqual([]);
        expect(rows).toEqual(expect.not.arrayContaining([0, 1, 2, 3, 4, 5, 6]));
        expect(success).toBe(false);
        expect(columnIndex).toBeFalsy();
        expect(errorMessage).toEqual(expect.stringContaining("CONDITION COLUMN"));
        expect(errorMessage).toEqual(expect.stringContaining("DOESN\'T EXIST ON TABLE"));
        
    })
})

describe("Delete element from table test", () => {
    test("Should delete on table", async () => {
        // test element
        await testDBInstance.insert({ tableName: "test_table_1", values: ["test_value_1", "test_value_2", "test_value_3"] });
        const tableDelete = await testDBInstance.delete({ tableName: "test_table_1", condition: "id", operator: "=", conditionValue: 0 })
        const deletedElementIndex = testDBInstance.retrieveRowIndexes({table: testDBInstance.getOneTable("test_table_1"), condition: "id", operator: "=", conditionValue: 0}) 
        expect(tableDelete).toBe(true);
        expect(deletedElementIndex.rows).toEqual([])
        expect(deletedElementIndex.rows).toEqual(expect.not.arrayContaining([0, 1, 2, 3]))
    })
    test("Should not delete on table because the element doesn\'t exist", async () => {
        const tableDelete = await testDBInstance.delete({ tableName: "test_table_1", condition: "id", operator: "=", conditionValue: 1 })
        expect(tableDelete).toBe(false);
    })
    test("Should not delete on table because a column is invalid", async () => {
        const tableDelete = await testDBInstance.delete({ tableName: "test_table_1", condition: "fake_column", operator: "=", conditionValue: "value" })
        expect(tableDelete[0][0]).toEqual("EXCEPTION ENCOUNTER");
    })
    test("Should not delete on table because the table doesn\'t exist", async () => {
        const tableDelete = await testDBInstance.delete({ tableName: "fake_table", condition: "id", operator: "=", conditionValue: 0 })
        expect(tableDelete[0][0]).toEqual("EXCEPTION ENCOUNTER");
    })
})

describe("Update element from table test", ()=>{
    test("Should update one column value on table", async ()=>{
        await testDBInstance.insert({ tableName: "test_table_1", values: [`test_value_1`, `test_value_2`, `test_value_3`] });
        const updateTable = await testDBInstance.update({tableName: "test_table_1", set: ["test_column_1"], setValues: ["new_value"], condition: "id", operator: "=", conditionValue: 0})
        expect(updateTable).toBe(true);
    })
})