
document.addEventListener('DOMContentLoaded', function() {
  displayNotes();
});

//displayNotes()
function displayNotes() {

  // Retrieve notes from localStorage and parse them as JSON
  const notes = JSON.parse(localStorage.getItem('notes')) || [];
  console.log('Notes from local storage:', notes);

  // Select the container for displaying notes
  const notesList = document.querySelector('.saved-notes-list');

  // Clear existing notes
  notesList.innerHTML = ''; 

  // Iterate through each note and process it
  notes.forEach((note, index) => {
  console.log('Processing note:', note);

  // Create a list item for the note
  const listItem = document.createElement('li');
  listItem.classList.add('note-list-item');

  // Create a link for the note
  const noteLink = document.createElement('a');
  noteLink.href = `#note${index}`;

  // Create a div to hold the note content
  const noteContent = document.createElement('div');
  noteContent.innerHTML = `
    <h3>${note.title}</h3>
    <p>${note.content ? note.content.substring(0, 100) + "..." : ""}</p>
    ${note.image ? `<img src="${note.image}" alt="${note.title} Image" style="max-width: 100%; border-radius: 8px;">` : ''}
  `;

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

