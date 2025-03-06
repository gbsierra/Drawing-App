
/*

  My Note Taking App

  Main Script 

*/

//------------------------------------------------------------
//                         SETUP
//------------------------------------------------------------
// Get DOM (Document Object Model) elements
const canvas = document.getElementById('drawingCanvas'); // Visible canvas for drawing
const context = canvas.getContext('2d'); // 2D rendering context
const notebookContainer = document.getElementById('notebookContainer'); // Container for scrolling

// Drawing state and tool settings
let drawing = false; // is actively drawing?
let erasing = false; 
let currentTool = 'pen'; // current tool
let lastTool = 'pen'; // initialize lastTool with the default tool
let toolColor = 'black'; // current tool color
let toolWidth = 2; // current tool width
let lastX, lastY; // Last coordinates for continuous lines
let isSelecting = false;
let isPointerDown = false;

// resize screen on load.
resizeAndHandle();
// disable finger touch
canvas.style.touchAction = 'none';



//----------------------------------------------------------------------
//                       DRAWING FUNCTIONS
//----------------------------------------------------------------------
// Function to handle the right mouse click
function handleRightClick(event) {
    console.log('Right mouse button clicked!', event);
    if(currentTool !== 'eraser'){
        lastTool = currentTool;
    }
    currentTool = 'eraser'; // Change the tool to eraser on right click
}
// Function to handle the right mouse release
function handleRightClickRelease(event) {
    console.log('Right mouse button released!', event);
    if (currentTool === 'eraser') {
        currentTool=lastTool;
    }
}
// Define necessary variables
let selectedRect;
let startX, startY, currentX, currentY;

function handlePointerDown(event) {
    isPointerDown = true;
    startX = event.offsetX;
    startY = event.offsetY;
    console.log('pointerdown:', { startX, startY });

    if (currentTool === 'selector') {
        selectedRect = {
            width: currentX - startX,
            height: currentY - startY,
            x: startX,
            y: startY
        };
        console.log('Selector tool activated');
        drawing = false; // Disable drawing for the selector tool
        isSelecting = true;
    }
    if (event.pointerType === 'pen' || event.pointerType === 'mouse' || event.pointerType === 'eraser') {
        drawing = true;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        lastX = (event.clientX - rect.left) * scaleX;
        lastY = (event.clientY - rect.top + notebookContainer.scrollTop) * scaleY;

        if (currentTool === 'selector') {
            drawing = false; // Disable drawing for the selector tool
            isSelecting = true;
        }
        else if (event.buttons === 2) {
            erasing = true;
            currentTool = 'eraser'; // Change the tool to eraser on right click
            context.globalCompositeOperation = 'destination-out';
        }
        else {
            erasing = false;
            currentTool = lastTool;
            context.globalCompositeOperation = 'source-over';
        }

        context.globalAlpha = (currentTool === 'highlighter') ? 0.4 : 1.0;
        context.strokeStyle = toolColor;
        context.beginPath();
        context.moveTo(lastX, lastY);
        notebookContainer.style.touchAction = 'none';
    }
}

function handlePointerUp(event) {
    if(!isPointerDown){
        return;
    }
    isPointerDown = false;

    if (currentTool === 'selector') {
        const x1 = selectedRect.x;
        const y1 = selectedRect.y;
        const x2 = selectedRect.x + selectedRect.width;
        const y2 = selectedRect.y + selectedRect.height;


        console.log('pointerup:', { x2, y2 });

        // Send dimensions to backend
        sendSelectedAreaToBackend(x1, y1, x2, y2);
    }
    if (event.pointerType === 'pen' || event.pointerType === 'mouse' || event.pointerType === 'eraser') {
        drawing = false;
        if (event.button === 2) {
            handleRightClickRelease(event); // Handle right-click release
        }
        context.closePath();
        context.globalAlpha = 1.0; // Reset transparency
        context.globalCompositeOperation = 'source-over'; // Reset to default drawing mode
        notebookContainer.style.touchAction = 'auto'; // Re-enable touch scrolling
    }
    if (currentTool === 'eraser' && lastTool !== 'eraser') {
        setTool(lastTool);
    }
    isSelecting = false;
}
// Continue drawing as pointer moves
function handlePointerMove(event) {
    if (drawing && (event.pointerType === 'pen' || event.pointerType === 'mouse' || event.pointerType === 'eraser')) {
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        // Update the global currentX and currentY variables
        currentX = (event.clientX - rect.left) * scaleX;
        currentY = (event.clientY - rect.top + notebookContainer.scrollTop) * scaleY;

        const pressure = event.pressure * 1.6 || 1; // Stylus pressure (default 1 if unsupported)
        context.lineWidth = toolWidth * 1.2 * pressure; // Dynamic width based on pressure

        if (currentTool === 'eraser') {
            context.globalCompositeOperation = 'destination-out'; // Erase instead of draw
        } else {
            context.globalCompositeOperation = 'source-over'; // Draw normally
        }

        context.lineTo(currentX, currentY);
        context.stroke();
        context.beginPath();
        context.moveTo(currentX, currentY); // Start new segment

        lastX = currentX;
        lastY = currentY;
    }
}


function canvasHasContent() {
    const emptyCanvas = document.createElement('canvas');
    emptyCanvas.width = canvas.width;
    emptyCanvas.height = canvas.height;
    
    return canvas.toDataURL() !== emptyCanvas.toDataURL();
}



// MATH BUTTON STUFF
// Add an event listener for switching tools
document.addEventListener('keydown', (event) => {
    if (event.key === 's') {
        currentTool = 'selector';
        handleSelectorTool();
    }
});

function getUserSelection() {
    currentTool = 'selector';

}
async function sendSelectedAreaToBackend(x1, y1, x2, y2) {
    if (!canvas || !context) {
        console.error('Canvas or context is not available.');
        return;
    }

    // Create a temporary canvas to extract the selected area
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = x2 - x1;
    tempCanvas.height = y2 - y1;
    const tempContext = tempCanvas.getContext('2d');
    tempContext.drawImage(canvas, x1, y1, x2 - x1, y2 - y1, 0, 0, x2 - x1, y2 - y1);

    try {
        // Convert canvas to Blob (PNG format)
        const blob = await new Promise((resolve) => tempCanvas.toBlob(resolve, 'image/png'));
        if (!blob || blob.size === 0) {
            console.error('Failed to create image blob or blob is empty.');
            return;
        }
        console.log(`Blob size: ${blob.size}`); // Log the size of the blob

        // Create FormData and append the blob
        const formData = new FormData();
        formData.append('image', blob, 'selected_area.png');

        // Log FormData entries
        for (let pair of formData.entries()) {
            console.log(`${pair[0]}: ${pair[1]}`);
        }

        // Convert blob to Base64 string
        const base64String = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        // Display the image in a small popup window
        const imgWindow = window.open('', '_blank', 'width=400,height=400');
        imgWindow.document.write(`<img src="${base64String}" alt="Selected Area"/>`);

        // Send the image to the backend using Fetch API
        const response = await fetch('http://127.0.0.1:2999/process_drawing', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend response error: ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Server response:', data);
    } catch (error) {
        console.error('Error processing request:', error);
    }
}




















//----------------------------------------------------------------------
//                        CANVAS FUNCTIONS
//----------------------------------------------------------------------
// sets current tool
function setTool(tool) {
    console.log(`'${tool}' tool selected.`);
    currentTool = tool;
    lastTool = tool;
    toolColor = tool === 'pen' ? document.getElementById('colorPicker').value : 'yellow';
    toolWidth = tool === 'pen' ? 2 : 16.5; 
    document.querySelectorAll('.tool-button').forEach(btn => btn.classList.remove('active')); 
    document.getElementById(`${tool}Button`).classList.add('active'); 
}
// clears current canvas
function clearCanvas() {
    if (confirm("Are you sure you want to clear the current the canvas?")) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        console.log('Canvas cleared.');
    } else {
        console.log('Canvas clearing canceled.');
    }
}
// change canvas size to screen size
function resizeAndHandle() {
    const containerWidth = notebookContainer.clientWidth;
    const containerHeight = notebookContainer.clientHeight;

    // Set canvas width and height to match container size
    canvas.width = containerWidth;
    canvas.height = containerHeight;

    // Adjust display size without clearing content
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;
}


//----------------------------------------------------------------------
//                   SAVE/LOAD CANVAS FUNCTIONS
//----------------------------------------------------------------------
// Save/Load canvas to session storage (handles orientation and resizing)
function savePageToSession() {
    try {
        // Save the note details to session storage
        const notes = JSON.parse(sessionStorage.getItem('session-saved-notes')) || [];
        
        // Assuming you have a way to get the canvas image data
        const image = canvas.toDataURL(); // Get the canvas image data

        const note = {
            title: 'sessionSave',
            lastModified: new Date().toLocaleString(),
            image: image // Add the image data to the note
        };
        notes.push(note);
        sessionStorage.setItem('session-saved-notes', JSON.stringify(notes));

        console.log(`Note '${note.title}' saved to session storage.`);
    } catch (error) {
        console.error('Error saving note:', error);
    }
}
function loadPageFromSession() {
    try {
        savePageToSession();
        const notes = JSON.parse(sessionStorage.getItem('session-saved-notes')) || [];
        
        if (notes.length === 0) {
            console.log('No notes found in session storage.');
            return;
        }

        // Assuming you have a way to display the notes, such as populating a canvas
        const lastNote = notes[notes.length - 1]; // Load the most recently saved note
        const image = new Image();
        image.src = lastNote.image;
        image.onload = () => {
            context.drawImage(image, 0, 0);
        };
        console.log(`Note '${lastNote.title}' loaded from session storage.`);
    } catch (error) {
        console.error('Error loading note:', error);
    }
}
// Save canvas to local storage
function savePageLocally() {
    try {
        // Save the note details to local storage
        const notes = JSON.parse(localStorage.getItem('user-saved-notes')) || [];
        const noteTitle = prompt('   Enter the note title:');
        
        // Assuming you have a way to get the canvas image data
        const image = canvas.toDataURL(); // Get the canvas image data

        const note = {
            title: noteTitle,
            lastModified: new Date().toLocaleString(),
            image: image // Add the image data to the note
        };
        notes.push(note);
        localStorage.setItem('user-saved-notes', JSON.stringify(notes));

        alert(`Note '${note.title}' saved locally.`);
        console.log(`Note '${note.title}' saved locally.`);
    } catch (error) {
        console.error('Error saving note:', error);
        alert('Failed to save note.');
    }
}
// check flag upon loading page, calls loadPageLocally
function checkForLoadPageFlag() {
    const loadPageFlag = localStorage.getItem('loadingPageFlag');
    const noteIndex = localStorage.getItem('noteIndex'); // Retrieve note index if set
  
    if (loadPageFlag === 'true') {
      // Call loadPageLocally function with the optional parameter
      loadPageLocally(noteIndex !== null ? parseInt(noteIndex, 10) : null, false);
      // Clear the flag and note index
      localStorage.removeItem('loadingPageFlag');
      localStorage.removeItem('noteIndex');
    }
}
// load the page locally with optional parameters (node index, clear current canvas?)
function loadPageLocally(noteIndex = null, clear = false) {
    //set notes to amount of notes saved
    const notes = JSON.parse(localStorage.getItem('user-saved-notes')) || [];
    //if theres notes saved
    if (notes.length > 0) {
        let selectedNoteIndex = noteIndex;

        // Only prompt for selection if noteIndex is null
        if (selectedNoteIndex === null) {
            let notesList = 'Select a note to load:\n      Title:              Last Modified: \n';
            notes.forEach((note, index) => {
                notesList += `${index + 1}.   ${note.title},  -  ${note.lastModified}\n`;
            });
            selectedNoteIndex = prompt(notesList + '\nEnter the number of the note you want to load:') - 1;
        }

        // Check if the selected index is valid
        if (selectedNoteIndex >= 0 && selectedNoteIndex < notes.length) {
            const selectedNote = notes[selectedNoteIndex];
            alert(`   Loading selected note..\n\n        Title: ${selectedNote.title}\n  Last Modified: ${selectedNote.lastModified}`);
            console.log(`Note loaded locally. \nTitle: ${selectedNote.title}\nLast Modified: ${selectedNote.lastModified}`);
            
            const img = new Image();
            img.src = selectedNote.image;
            
            img.onload = function() {
                if (clear) {
                    clearCanvas(); // Function to clear the canvas if needed
                }
                context.drawImage(img, 0, 0); // Draw the loaded image on the canvas
            };
            
            img.onerror = function() {
                console.error('Error loading image.');
                alert('Failed to load the image associated with the note.');
            };
        } else {
            alert('Invalid selection.');
        }
    } else {
        alert('No saved notes found.');
    }
}
// Gets user input for loadPageLocally
function getLoadSelection() {
    const notes = JSON.parse(localStorage.getItem('user-saved-notes')) || [];
  
    if (notes.length > 0) {
      let notesList = 'Select a note to load:\n  Title:              Last Modified: \n';
      notes.forEach((note, index) => {
        notesList += `${index + 1}.   ${note.title},  -  ${new Date(note.lastModified).toLocaleString()}\n`;
      });
  
      const userSelectedIndex = parseInt(prompt(notesList + '\nEnter the number of the note you want to load:'), 10) - 1;
  
      if (!isNaN(userSelectedIndex) && userSelectedIndex >= 0 && userSelectedIndex < notes.length) {
        loadPageLocally(userSelectedIndex, true);
        return userSelectedIndex;
      } else {
        alert('Invalid selection. Please enter a valid number corresponding to the note.');
        return null;
      }
    } else {
      alert('No saved notes found.');
      return null;
    }
}    









//  -- Event listeners --
//-------------------------------

window.addEventListener('orientationchange', loadPageFromSession); //handle orientationchange
window.addEventListener('resize', loadPageFromSession); //handle webpage resizing

canvas.addEventListener('pointerdown', handlePointerDown);
canvas.addEventListener('pointermove', handlePointerMove);
canvas.addEventListener('pointerup', handlePointerUp);
canvas.addEventListener('mouseup', handlePointerUp);
canvas.addEventListener('pointerout', handlePointerUp);
canvas.addEventListener('contextmenu', function(event) {  //right click
    event.preventDefault();
    handleRightClick(event);
});
document.addEventListener('DOMContentLoaded', () => { // double tap
    const linesCanvas = document.getElementById('linesCanvas');
    
    function handleDoubleTap(canvas, linesCanvas) {
        let isZoomed = false;
        let lastX = 0;
        let lastY = 0;

        // Function to apply zoom
        function applyZoom(scale, x, y) {
            [canvas, linesCanvas].forEach(el => {
                if (el) {  // Check if element exists
                    el.style.transition = "transform 0.3s ease"; // Smooth transition
                    if (scale !== 1) {
                        el.style.transformOrigin = `${x}px ${y}px`; // Zoom from the double-tap location
                        lastX = x;
                        lastY = y;
                    } else {
                        el.style.transformOrigin = `${lastX}px ${lastY}px`; // Maintain transform origin when zooming out
                    }
                    el.style.transform = `scale(${scale})`;
                } else {
                    console.error('Element not found:', el);
                }
            });
        }

        canvas.addEventListener('dblclick', (event) => {
            console.log('Double click event detected'); // Log to verify event listener is working
            event.preventDefault(); // Prevent default behavior

            // Ensure dblclick event is from the canvas
            if (event.target !== canvas) {
                console.log('Event target is not canvas'); // Log to verify event target
                return;
            }

            // Get the click position relative to the canvas
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            // Toggle zoom
            isZoomed = !isZoomed;
            const scale = isZoomed ? 2 : 1;
            console.log(`Zoomed: ${isZoomed}, Scale: ${scale}`);
            applyZoom(scale, x, y);
        });
    }

    // Call the function with both elements
    handleDoubleTap(canvas, linesCanvas);
});

document.getElementById('penButton').addEventListener('click', () => setTool('pen'));
document.getElementById('highlighterButton').addEventListener('click', () => setTool('highlighter'));
document.getElementById('eraserButton').addEventListener('click', () => setTool('eraser'));
document.addEventListener("DOMContentLoaded", function () {  //color picker
    const colorPicker = document.getElementById('colorPicker');
    if (colorPicker) {
        colorPicker.addEventListener('input', (event) => {
            toolColor = event.target.value;
            console.log(`Color selected: ${toolColor}`);
        });
    } else {
        console.log('Element with ID colorPicker not found.');
    }
});
document.getElementById('clearButton').addEventListener('click', function() { //clear canvas
    clearCanvas();
});

document.getElementById('saveButton').addEventListener('click', savePageLocally);
document.getElementById('loadButton').addEventListener('click', getLoadSelection);

document.getElementById('mathButton').addEventListener('click', getUserSelection);


document.addEventListener('DOMContentLoaded', () => {   // TO-DO LIST notes
    const noteForm = document.getElementById('newNoteFeature'); // Form for new notes
    const noteInput = document.getElementById('noteInput'); // Input field for new notes
    const notesList = document.getElementById('notesList'); // Display list for notes
    const clearButton = document.getElementById('clearToDoList'); // Button to clear the to-do list

    // Load existing notes from localStorage
    let savedNotes = JSON.parse(localStorage.getItem('user-current-toDo')) || [];
    savedNotes.forEach(noteText => {
        const li = document.createElement('li'); // Create a new list item
        li.textContent = noteText; // Set its text to the note text
        notesList.appendChild(li); // Add it to the notes list
    });

    // Add new note on form submit
    noteForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent default form submission

        const noteText = noteInput.value.trim(); // Get the note text and trim any whitespace

        if (noteText) { // If note text is not empty
            console.log("New Note: " + noteText); // Handle the note content (e.g., save it, display it, etc.)
            const li = document.createElement('li'); // Create a new list item element
            li.textContent = noteText; // Set the text of the list item to the note text
            notesList.appendChild(li); // Append the new list item to the notes list

            savedNotes.push(noteText); // Add the note text to the array of saved notes
            localStorage.setItem('user-current-toDo', JSON.stringify(savedNotes)); // Save the updated notes array to localStorage

            noteInput.value = ''; // Clear the input field
        }
    });

    // Clear the to-do list on button click
    clearButton.addEventListener('click', () => {
        notesList.innerHTML = ''; // Clear list display
        savedNotes = []; // Empty the saved notes array
        localStorage.removeItem('user-current-toDo'); // Remove notes from localStorage
    });
});
document.addEventListener("DOMContentLoaded", function() {  // TO-DO LIST toggle button
    var toggleButton = document.getElementById("toggleToDoSection");
    var toDoBar = document.getElementById("notesFeature");
    var icon = toggleButton.querySelector("i");

    toggleButton.addEventListener("click", function() {
        toDoBar.classList.toggle("collapsed");
        if (toDoBar.classList.contains("collapsed")) {
            icon.classList.remove("fa-angle-down");
            icon.classList.add("fa-angle-up");
        } else {
            icon.classList.remove("fa-angle-up");
            icon.classList.add("fa-angle-down");
        }
    });
});

window.addEventListener('resize', resizeAndHandle); // Resize the canvas when the window is resized
window.onload = checkForLoadPageFlag; // check for flag (coming from menu.html?)
