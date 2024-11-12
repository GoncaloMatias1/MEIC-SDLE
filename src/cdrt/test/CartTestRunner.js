// FILEPATH: /home/joca/SDLE/project/src/cdrt/test/CartTestRunner.js
const Cart = require('../Cart.js');

function testMakeId() {
  const cart = new Cart();
  const length = 10;
  const id = cart.makeid(length);
  console.assert(id.length === length, `Expected length ${length}, but got ${id.length}`);
  
  const validCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let char of id) {
    console.assert(validCharacters.includes(char), `Invalid character ${char} in ID`);
  }

  const id1 = cart.makeid(length);
  const id2 = cart.makeid(length);
  console.assert(id1 !== id2, 'Expected unique IDs, but got duplicates');
}

function testAddItem() {
  const cart = new Cart('joca');
  const id = cart.createList('joca')
  cart.addItemToList(id, 'apple', 3);
  cart.addItemToList(id, 'banana', 2);
  console.log(cart.lists.get(id).dk.toString())
}

function testRemoveItem() {
  const cart = new Cart();
  const id = cart.createList('joca')
  cart.addItemToList(id, 'apple', 3);
  cart.addItemToList(id, 'banana', 2);
  cart.removeItemFromList(id, 'apple', 3);
  console.log(cart.lists.get(id).dk.toString())
}   
function testUpdateItem(){
  const cart = new Cart();
  const id = cart.createList('joca')
  cart.addItemToList(id, 'apple', 3);
  cart.updateItemQuantity(id, 'apple', 3, 5);
  console.log(cart.lists.get(id).dk.toString())

}
function testJson(){
  const cart = new Cart();
  const id = cart.createList('joca')
  cart.addItemToList(id, 'apple', 3);
  cart.addItemToList(id, 'banana', 2);
  console.log("cart->" + cart.createJsonFromList(id))
}
function testMerge(){
  const cart1 = new Cart();
  const cart2 = new Cart();
  const id1 = cart1.createList('joca')
  const id2 = cart2.createListWithId('joca', id1)
  cart1.addItemToList(id1, 'apple', 3);
  cart2.addItemToList(id1, 'banana', 2);
  cart2.addItemToList(id2, 'apple', 3);
  let json_to_merge = cart2.createJsonFromList(id2)

  let id = cart1.merge(json_to_merge)
  console.log("merged->" + cart1.lists.get(id).dk.toString())
  
}

function main() {
  console.log("Tests started!")
  testMakeId();
  testAddItem();
  testRemoveItem();
  testUpdateItem();
  testMerge();
  testJson();
  console.log("Tests ended!")
}

main();