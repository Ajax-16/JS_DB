import { quickSort } from "./sort_algorithms.js";
import { treeSearch } from "./tree_search.js";

export default {
    insert: function (array, ...elements) {
        for (let i = 0; i < elements.length; i++) {
            array[array.length] = elements[i];
        }
        return true;
    },
    deleteByIndex: function (array, index) {
        if (index >= 0 && index < array.length) {
            for (let i = index; i < array.length - 1; i++) {
                array[i] = array[i + 1];
            }
            array.length = array.length - 1;
            return true;
        }
        return false;
    },
    deleteByContent: function (array, content) {
        let result = smthDelByContent(array, content, this.deleteByIndex);
        return result;
    },
    deleteAllByContent: function (array, content) {
        let element = treeSearch(array, content);
        let result = false;
        while (element !== -1) {
            smthDelByContent(array, content, this.deleteByIndex)
            element = treeSearch(array, content);
            result = true;
        }
        return result;
    },
    hasDuplicity: function (array) {
        let arraySet = new Set([...array]);
        if (arraySet.size < array.length) {
            return true;
        } else {
            return false;
        }
    },
    editByIndex: function (array, index, newElement) {
        if (index >= 0 && index < array.length) {
            array[index] = newElement;
            return true;
        } else {
            return false;
        }
    },
    editByContent: function (array, content, newElement) {
        let result = smthEditByContent(array, content, newElement, this.editByIndex);
        return result;
    },
    editAllByContent: function (array, content, newElement) {
        let element = treeSearch(array, content);
        let result = false;
        while (element !== -1) {
            result = smthEditByContent(array, content, newElement, this.editByIndex)
            element = treeSearch(array, content);
        }
        return result;
    },
    sort: function (array, asc) {
        array = quickSort(array, asc);
    },
    deepCopy: function (arr) {
        if (!Array.isArray(arr)) {
            return arr;
        }
        const arrCopy = [];
        for (let i = 0; i < arr.length; i++) {
            if (Array.isArray(arr[i])) {
                arrCopy[i] = this.deepCopy(arr[i]);
            } else {
                arrCopy[i] = arr[i]
            }
        }
        return arrCopy;
    }

}

// LOCAL

function smthDelByContent(array, content, cb) {
    let element = treeSearch(array, content);
    if (element != -1) {
        cb(array, element);
        return true;
    } else {
        return false;
    }
}

function smthEditByContent(array, content, newElement, cb) {
    let element = treeSearch(array, content);
    if (element != -1) {
        cb(array, element, newElement);
        return true;
    } else {
        return false;
    }
}