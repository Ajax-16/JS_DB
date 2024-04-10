import arrayMethods from "./array_methods.js";

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

    let arrayCopy = [...array];
    
    if (arrayCopy.length <= 1) {
        return arrayCopy;
    }

    const pivot = arrayCopy[0];

    const menores = [];
    const mayores = [];

    for (let i = 0; i < arrayCopy.length; i++) {
        if (i !== arrayCopy.indexOf(pivot)) {
            if (arrayCopy[i] <= pivot) {
                arrayMethods.insert(menores, arrayCopy[i]);
            } else {
                arrayMethods.insert(mayores, arrayCopy[i]);
            }
        }
    }

    if (asc) {
        // Orden ascendente
        return [...quickSort(menores, asc), pivot, ...quickSort(mayores, asc)];
    } else {
        // Orden descendente
        return [...quickSort(mayores, asc), pivot, ...quickSort(menores, asc)];
    }
}