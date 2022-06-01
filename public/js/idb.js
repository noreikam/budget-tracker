// create variable to hold db connection
let db;
// establish a connection to IndexedDB called 'transaction_tracker' and set to version 1
const request = indexedDB.open('transaction_tracker', 1);

// this event will emit if the database version changes (nonexistant to version 1, version 1 to version 2, etc)
request.onupgradeneeded = function(event) {
  // save a reference to the database
  const db = event.target.result;
  // create an object to store (table) called `new_transaction`, set it to have an auto incrementing primary key of sorts
  db.createObjectStore('new_transaction', { autoIncrement: true });
};

// upon a successful
request.onsuccess = function(event) {
  // when db is successfully created with its object store (from onupgradeneeded event above) or simply established a connection, save reference to db in global variable
  db = event.target.result;

  // check if app is online, if yes run uploadtransaction() function to send all local db data to api
  if (navigator.online) {
    // temp
    uploadTransaction();
  }
};

request.onerror = function(event) {
  // log error
  console.log(event.target.errorCode);
};

// this function will execute if we attempt to submit a new transaction and there's no internet connection
function saveRecord(record) {
  // open new transaction within the database with read and write permissions
  const transaction = db.transaction(['new_transaction'], 'readwrite');

  // access the object store for `new transaction`
  const transactionObjectStore = transaction.objectStore('new_transaction');

  // add record to your store with add method
  transactionObjectStore.add(record);
};

function uploadTransaction() {
  // open a transaction on your db
  const transaction = db.transaction(['new_transaction'], 'readwrite');

  // access object store
  const transactionObjectStore = transaction.objectStore('new_transaction');

  // get all records from store and set to a variable
  const getAll = transactionObjectStore.getAll();

  // upon a successful .getAll() execution, run this function
  getAll.onsuccess = function() {
    // if there was data in indexedDB's store, send to the api server
    if (getAll.result.length > 0) {
      fetch('/api/transaction', {
        method: 'POST', 
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        }
      })
        .then(response => response.json())
        .then(serverResponse => {
          if (serverResponse.message) {
            throw new Error(serverResponse);
          }
          // open one more transaction
          const transaction = db.transaction(['new_transaction'], 'readwrite');
          // access the new_transaction object store
          const transactionObjectStore = transaction.objectStore('new_transaction');
          // clear all items in store
          transactionObjectStore.clear();

          alert('All saved transaction have been submitted!');
        })
        .catch(err => {
          console.log(err);
        });
    }
  };
};

// listen for app coming back online
window.addEventListener('online', uploadTransaction);