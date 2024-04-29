export const nueOrm = ({ table, rows, rmap, columns, join }) => {
    const obj = {};
    for (const [key, subKey] of table[1].map(element => element.split("."))) {
        if (!obj[key]) {
            obj[key] = [];
        }
        
    }
    
    console.log(obj);
};