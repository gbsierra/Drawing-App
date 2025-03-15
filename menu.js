/*

My Note Taking App

Menu Script

*/


//------------------------------------------    MENU FUNCTIONS    ------------------------------------------
//displayListType()
function displayListType(view) {
  const notesList = document.getElementById('notesListType');

  // Remove all view classes first
  notesList.classList.remove('regular-view', 'grid-view', 'list-view');

  // Add the selected view class
  notesList.classList.add(`${view}-view`);
}
function displayNotes() {
  // Retrieve notes from localStorage, parse as JSON
  const notes = JSON.parse(localStorage.getItem('user-saved-notes')) || [];
  console.log('Notes loaded from local storage:', notes);

  // Select container to display notes
  const notesList = document.querySelector('.saved-notes-list');
  
  // Clear existing notes
  notesList.innerHTML = ''; 

  // For every note,
  notes.forEach((note, index) => {
    console.log('Processing note:', note);

    // Create a list item
    const listItem = document.createElement('li');
    listItem.classList.add('note-list-item');

    // Create a div to hold the note content
    const noteContent = document.createElement('div');
    noteContent.classList.add('note-content'); // Add a class for styling
    noteContent.innerHTML = `
      <h3>${note.title}</h3>
      <p>${note.content ? note.content.substring(0, 100) + "..." : ""}</p>
      ${note.image ? `<img src="${note.image}" alt="${note.title} Image" style="max-width: 100%; border-radius: 8px;">` : ''}
    `;

    // Create the "X" button to delete the note
    const deleteButton = document.createElement('button');
    deleteButton.classList.add('delete-button'); // Add a class for styling
    deleteButton.textContent = 'X';
    
    // Position the "X" button in the top-right corner
    deleteButton.style.position = 'absolute';
    deleteButton.style.top = '10px';
    deleteButton.style.right = '10px';
    
    // Event listener for deleting the note
    deleteButton.addEventListener('click', (event) => {
      event.stopPropagation(); // Prevent the note link click event from triggering
      event.preventDefault(); // Prevent the link from being followed when clicking on "X" button

      // Remove the note from the array
      notes.splice(index, 1); 
      
      // Update localStorage
      localStorage.setItem('user-saved-notes', JSON.stringify(notes));
      
      // Re-render the notes
      displayNotes();
    });

    // Append the "X" button to the note content
    noteContent.appendChild(deleteButton);

    // Create a link element for the note title, which is separate from the delete button
    const noteLink = document.createElement('a');
    noteLink.href = '../'; // Link to go back or to the next page
    noteLink.addEventListener('click', (event) => {
      // Save the note index to localStorage before navigating
      localStorage.setItem('loadingPageFlag', 'true');
      localStorage.setItem('noteIndex', index);
    });

    // Append the note content to the link
    noteLink.appendChild(noteContent);

    // Append the link to the list item
    listItem.appendChild(noteLink);

    // Create an aside element for the last modified date
    const aside = document.createElement('aside');
    aside.innerHTML = `<span>Last modified: ${note.lastModified}</span>`;
    // Append the aside to the list item
    listItem.appendChild(aside);

    // Append the list item to the notes list container
    notesList.appendChild(listItem);
  });
}


// Function to open the note detail
function openNoteDetail(index) {
  const notes = JSON.parse(localStorage.getItem('user-saved-notes')) || [];
  const note = notes[index];
  alert(`   Opening note: ${note.title}\n`);
}

//---------------------------------------    INDEXED DB FUNCTIONS    ---------------------------------------
//setup
const request = indexedDB.open("NotesDatabase", 1);
request.onupgradeneeded = function(event) {
  const db = event.target.result;
  console.log("Upgrading database...");
  // Create object store with keyPath "id" and autoIncrement
  const objectStore = db.createObjectStore("notes", { keyPath: "id", autoIncrement: true });
  // Create an index on the "title" property, which must be unique
  objectStore.createIndex("title", "title", { unique: true });

  console.log("Object store and index created");
}
request.onerror = function(event) {
  console.error("Database error: ", event.target.error);
}
request.onsuccess = function(event) {
  const db = event.target.result;
  console.log("Indexed Database opened successfully");
}
// Save/Load to database
function saveToIndexedDB() {
  const localStorageKey = "user-saved-notes";
  const notes = JSON.parse(localStorage.getItem(localStorageKey));

  if (notes) {
    const dbRequest = indexedDB.open("NotesDatabase", 1);

    dbRequest.onsuccess = function(event) {
      const db = event.target.result;
      const transaction = db.transaction(["notes"], "readwrite");
      const objectStore = transaction.objectStore("notes");

      notes.forEach(note => {
        const titleIndex = objectStore.index("title");
        const getRequest = titleIndex.get(note.title);

        getRequest.onsuccess = function(event) {
          if (!event.target.result) {
            objectStore.add(note);
            alert(`Note '${note.title}' has been added to IndexedDB.`);
          } else {
            alert(`Note '${note.title}' already exists in Database.`);
          }
        };

        getRequest.onerror = function(event) {
          console.error("Get request error: ", event.target.error);
        };
      });

      transaction.oncomplete = function() {
        console.log("All notes have been checked and saved to IndexedDB.");
      };

      transaction.onerror = function(event) {
        console.error("Transaction error: ", event.target.error);
      };
    };

    dbRequest.onerror = function(event) {
      console.error("Database error: ", event.target.error);
    };
  } else {
    console.log("No notes found in localStorage.");
  }
}
function getNotesFromIndexedDB() {
  const dbRequest = indexedDB.open("NotesDatabase", 1);
  //on DB success
  dbRequest.onsuccess = function(event) {
    const db = event.target.result;
    const transaction = db.transaction(["notes"], "readonly");
    const objectStore = transaction.objectStore("notes");
    const notesRequest = objectStore.getAll();

    //on notes success
    notesRequest.onsuccess = function(event) {
      const notes = event.target.result;
      console.log("Retrieved notes:", notes);

      // Update localStorage with custom key
      localStorage.setItem("user-saved-notes", JSON.stringify(notes));

      // Display notes in the console or on the page
      notes.forEach(note => {
        console.log(`Note ID: ${note.id}, Content: ${note.content}`);
      });
      location.reload();
    };
    //on notes error
    notesRequest.onerror = function(event) {
      console.error("Failed to retrieve notes: ", event.target.error);
    };
  };
  //on DB error
  dbRequest.onerror = function(event) {
    console.error("Database error: ", event.target.error);
  };
}



//--------------------------------------------     EVENT LISTENERS     --------------------------------------------
document.getElementById("saveButton").addEventListener("click", saveToIndexedDB);
document.getElementById("retrieveButton").addEventListener("click", getNotesFromIndexedDB);
document.getElementById("saveButton").addEventListener("click", saveToIndexedDB);

document.addEventListener('DOMContentLoaded', function() {
  displayListType('regularViewButton');
  displayNotes();
});
document.getElementById('regularViewButton').addEventListener('click', function() {
  displayListType('regular');
});
document.getElementById('gridViewButton').addEventListener('click', function() {
  displayListType('grid');
});
document.getElementById('listViewButton').addEventListener('click', function() {
  displayListType('list');
});












