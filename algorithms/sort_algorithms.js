import arrayMethods from "ajaxdb-core/algorithms/array_methods.js";

export function bubbleSort(array){
    
    let arrayCopy = [...array];

    for(let i = 0; i < arrayCopy.length; i++){
    
        for(let j = 0; j < arrayCopy.length; j++){
    
            if(arrayCopy[i]<arrayCopy[j]){
                let larger = arrayCopy[i];
                let smaller = arrayCopy[j];
                arrayCopy[j] = larger;
                arrayCopy[i] = smaller;
            }

        }
    
    }

    return arrayCopy;

}

export function quickSort(array, asc = true) {

    if (array.length <= 1) {
        return [...array];
    }

    const pivotIndex = Math.floor(array.length / 2);
    const pivot = array[pivotIndex];

    const leftPart = [];
    const rightPart = [];

    for (let i = 0; i < array.length; i++) {
        if (i !== pivotIndex) {
            if ((asc && array[i] < pivot) || (!asc && array[i] > pivot)) {
                arrayMethods.insert(leftPart, array[i]);
            } else {
                arrayMethods.insert(rightPart, array[i]);
            }
        }
    }

    if (asc) {
        return [...quickSort(leftPart, asc), pivot, ...quickSort(rightPart, asc)];
    } else {
        return [...quickSort(rightPart, asc), pivot, ...quickSort(leftPart, asc)];
    }
}