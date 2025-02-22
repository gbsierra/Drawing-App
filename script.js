/*
My Note Taking App

Main Script - More Efficient Version
*/

//----------------------------------------------------------------------
//                            SETUP
//----------------------------------------------------------------------
// Get DOM (Document Object Model) elements
const canvas = document.getElementById('drawingCanvas'); // Visible canvas for drawing
const context = canvas.getContext('2d'); // 2D rendering context
const notebookContainer = document.getElementById('notebookContainer'); // Container for scrolling

// Drawing state and tool settings
let drawing = false; // Tracks if user is actively drawing
let currentTool = 'pen'; // Current tool (pen or highlighter)
let toolColor = 'black'; // Current tool color
let toolWidth = 2; // Current tool line width
let lastX, lastY; // Last coordinates for continuous lines

// Set initial canvas resolution and display size
canvas.width = 1920; // Fixed internal width
canvas.height = 1080; // Fixed internal height
canvas.style.width = `${notebookContainer.clientWidth}px`; // Match container width
canvas.style.height = `${notebookContainer.clientHeight}px`; // Match container height
// Initial setup
drawNotebookLines(); // Draw initial notebook lines
setTool('pen'); // Set default tool

// Event listeners
canvas.addEventListener('pointerdown', handlePointerDown);
canvas.addEventListener('pointermove', handlePointerMove);
canvas.addEventListener('pointerup', handlePointerUp);
canvas.addEventListener('pointerout', handlePointerUp);
document.getElementById('penButton').addEventListener('click', () => setTool('pen'));
document.getElementById('highlighterButton').addEventListener('click', () => setTool('highlighter'));
document.getElementById('saveButton').addEventListener('click', savePageLocally);
document.getElementById('loadButton').addEventListener('click', loadPageLocally);



//----------------------------------------------------------------------
//                        CANVAS MANAGEMENT
//----------------------------------------------------------------------
// Resize handler: Adjusts display size without clearing content
function handleResize() {
    canvas.style.width = `${notebookContainer.clientWidth}px`; // Scale to container width
    canvas.style.height = `${notebookContainer.clientHeight}px`; // Scale to container height
    // No redraw needed—content persists due to fixed canvas.width/height
}

// Draw notebook lines for visual effect
function drawNotebookLines() {
    context.strokeStyle = '#ddd'; // Light gray lines
    context.lineWidth = 1; // Thin lines
    for (let y = 0; y < canvas.height; y += 30) { // Lines every 30px
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(canvas.width, y);
        context.stroke();
        context.closePath();
    }
}
// clear notebook lines *needs work, removes drawings as well*
function clearNotebookLines() {
    // Clear the lines layer
    context.clearRect(0, 0, linesCanvas.width, linesCanvas.height);
    // Redraw the main canvas without clearing it
    context.drawImage(linesCanvas, 0, 0); // Draw the empty lines canvas to the main canvas, effectively removing the lines
}
//event listener for toggling lines
document.getElementById('toggleLinesButton').addEventListener('click', function() {
    const isLinesVisible = canvas.classList.toggle('lines-visible');

    if (isLinesVisible) {
        drawNotebookLines(context, canvas.width, canvas.height);
    } else {
        clearNotebookLines();
    }
});



//----------------------------------------------------------------------
//                      DRAWING HANDLERS
//----------------------------------------------------------------------
// Start drawing with stylus or mouse
function handlePointerDown(event) {
    if (event.pointerType === 'pen' || event.pointerType === 'mouse') {
        event.preventDefault(); // Prevent default actions (e.g., scrolling)
        drawing = true;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width; // Scale factor for X
        const scaleY = canvas.height / rect.height; // Scale factor for Y
        lastX = (event.clientX - rect.left) * scaleX; // Adjusted X coordinate
        lastY = (event.clientY - rect.top + notebookContainer.scrollTop) * scaleY; // Adjusted Y with scroll
        context.globalAlpha = currentTool === 'highlighter' ? 0.4 : 1.0; // Transparency for highlighter
        context.strokeStyle = toolColor;
        context.beginPath();
        context.moveTo(lastX, lastY);
        notebookContainer.style.touchAction = 'none'; // Disable touch scrolling
    }
}

// Continue drawing as pointer moves
function handlePointerMove(event) {
    if (drawing && (event.pointerType === 'pen' || event.pointerType === 'mouse')) {
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const currentX = (event.clientX - rect.left) * scaleX;
        const currentY = (event.clientY - rect.top + notebookContainer.scrollTop) * scaleY;

        const pressure = event.pressure || 1; // Stylus pressure (default 1 if unsupported)
        context.lineWidth = toolWidth * pressure; // Dynamic width based on pressure

        context.lineTo(currentX, currentY);
        context.stroke();
        context.beginPath();
        context.moveTo(currentX, currentY); // Start new segment

        lastX = currentX;
        lastY = currentY;
    }
}

// Stop drawing on pointer release
function handlePointerUp(event) {
    if (event.pointerType === 'pen' || event.pointerType === 'mouse') {
        drawing = false;
        context.closePath();
        context.globalAlpha = 1.0; // Reset transparency
        notebookContainer.style.touchAction = 'auto'; // Re-enable touch scrolling
    }
}



//----------------------------------------------------------------------
//                        TOOL MANAGEMENT
//----------------------------------------------------------------------
// Set the active tool and its properties
function setTool(tool) {
    currentTool = tool;
    toolColor = tool === 'pen' ? 'black' : 'yellow'; // Pen: black, Highlighter: yellow
    toolWidth = tool === 'pen' ? 2 : 10; // Pen: thin, Highlighter: thick
    document.querySelectorAll('.tool-button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${tool}Button`).classList.add('active'); // Highlight active button
}
//clearCanvas
function clearCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawNotebookLines(); // Redraw notebook lines after clearing the canvas
    console.log('Canvas cleared.');
}
document.getElementById('clearButton').addEventListener('click', function() {
    clearCanvas();
});



//----------------------------------------------------------------------
//                        SAVE/LOAD FEATURES
//----------------------------------------------------------------------
// Save/Load canvas to local storage
function savePageLocally() {
    try {
        const dataUrl = canvas.toDataURL('image/png'); // Convert to PNG data URL
        localStorage.setItem('savedPage', dataUrl);

        // Save the note details to local storage
        const notes = JSON.parse(localStorage.getItem('notes')) || [];
        const noteTitle = prompt('Enter the note title:');

        const note = {
            title: noteTitle,
            lastModified: new Date().toLocaleString(),
            image: dataUrl
        };
        notes.push(note);
        localStorage.setItem('notes', JSON.stringify(notes));

        alert('Page saved locally.');
        console.log('Page saved locally.');
    } catch (error) {
        console.error('Error saving page:', error);
        alert('Failed to save page.');
    }
}

function loadPageLocally() {
    const dataUrl = localStorage.getItem('savedPage');

    if (dataUrl) {
        const img = new Image();
        img.src = dataUrl;

        img.onload = function() {
            clearCanvas();
            context.drawImage(img, 0, 0); // Draw loaded image
            alert('Page loaded successfully.');
            console.log('Page loaded successfully.');
        };

        img.onerror = function() {
            console.error('Error loading image.');
            alert('Failed to load saved page.');
        };
    } else {
        alert('No saved page found.');
    }
}



//----------------------------------------------------------------------
//                        TO-DO LIST FEATURES
//----------------------------------------------------------------------
// Wait for the DOM to fully load
document.addEventListener('DOMContentLoaded', () => {
    const noteForm = document.getElementById('newNoteFeature'); // Form for new notes
    const noteInput = document.getElementById('noteInput'); // Input field for new notes
    const notesList = document.getElementById('notesList'); // Display list for notes
    const clearButton = document.getElementById('clearToDoList'); // Button to clear the to-do list

    // Load existing notes from localStorage
    let savedNotes = JSON.parse(localStorage.getItem('toDo-notes')) || [];
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
            localStorage.setItem('toDo-notes', JSON.stringify(savedNotes)); // Save the updated notes array to localStorage

            noteInput.value = ''; // Clear the input field
        }
    });

    // Clear the to-do list on button click
    clearButton.addEventListener('click', () => {
        notesList.innerHTML = ''; // Clear list display
        savedNotes = []; // Empty the saved notes array
        localStorage.removeItem('toDo-notes'); // Remove notes from localStorage
    });
});


document.addEventListener("DOMContentLoaded", function() {
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




//----------------------------------------------------------------------
//                        FUTURE FEATURES
//----------------------------------------------------------------------
// Placeholder for additional features (e.g., undo/redo, page navigation)
// Add functions here as needed, leveraging the stable canvas setup