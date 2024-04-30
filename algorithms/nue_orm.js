export const nueOrm = ({ table, rows, rmap, columns, join }) => {
    const keyValues = [];
    for (const column of table[1]) {
        if (column.split(".")[1]) {
            keyValues.push(column.split("."));
        }
    }
    // EN PROCESO
    const obj = getObject(keyValues, table.slice(2))
    console.log(obj)

};

const getObject = (array, tableElements) => {
    const finalObj = {};
    for (let i = 0; i < tableElements.length; i++) {
        for (const [key, value] of array) {
            console.log(tableElements[i])
            if (!finalObj[key]) {
                finalObj[key] = [];
            }
            if (!finalObj[key][i]) {
                finalObj[key][i] = {};
            }

            finalObj[key][i][value] = tableElements[i].shift();
        }
    }

    return finalObj
};
