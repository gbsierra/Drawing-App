
/*

  My Note Taking App

  Main Script 

*/

//-------------------------------------------    SETUP     -------------------------------------------
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
let isTyping = false;
let selectedRect; // selecting Rect
let startX, startY, currentX, currentY; //vars for rect

// resize screen on load.
resizeAndHandle();
// disable finger touch
canvas.style.touchAction = 'none';



//---------------------------------------    DRAWING FUNCTIONS    ---------------------------------------
// handle the right mouse click
function handleRightClick(event) {
    console.log('Right mouse button clicked!', event);
    if(currentTool !== 'eraser'){
        lastTool = currentTool;
    }
    currentTool = 'eraser'; // Change the tool to eraser on right click
}
// handle the right mouse release
function handleRightClickRelease(event) {
    console.log('Right mouse button released!', event);
    if (currentTool === 'eraser') {
        currentTool=lastTool;
    }
}
// handle pointer down
function handlePointerDown(event) {
    isPointerDown = true;
    startX = event.offsetX;
    startY = event.offsetY;

    if (currentTool === 'selector') {
        console.log('pointerdown:', { startX, startY });
        selectedRect = {
            width: currentX - startX,
            height: currentY - startY,
            x: startX,
            y: startY
        };
        drawing = false; // Disable drawing for the selector tool
        isSelecting = true;
        return; // Exit the function early for the selector tool
    }

    if (event.pointerType === 'pen' || event.pointerType === 'mouse' || event.pointerType === 'eraser') {
        drawing = true;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        lastX = (event.clientX - rect.left) * scaleX;
        lastY = (event.clientY - rect.top + notebookContainer.scrollTop) * scaleY;

        if (event.buttons === 2) {
            erasing = true;
            currentTool = 'eraser'; // Change the tool to eraser on right click
            context.globalCompositeOperation = 'destination-out';
        } else {
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
// handle pointer up
function handlePointerUp(event) {
    if(!isPointerDown){
        return;
    }
    isPointerDown = false;

    if (currentTool === 'selector') {
        const startX = selectedRect.x;
        const startY = selectedRect.y;
        const endX = selectedRect.x + selectedRect.width;
        const endY = selectedRect.y + selectedRect.height;


        console.log('pointerup:', { endX, endY });

        // Send dimensions to backend
        sendSelectedAreaToBackend(startX, startY, endX, endY);
        currentTool=lastTool;

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
// handle pointer moving
function handlePointerMove(event) {
    if (isPointerDown && !isTyping) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        // Update the global currentX and currentY variables
        currentX = (event.clientX - rect.left) * scaleX;
        currentY = (event.clientY - rect.top + notebookContainer.scrollTop) * scaleY;

        if (isSelecting && currentTool === 'selector') {
            selectedRect.width = Math.abs(currentX - startX);
            selectedRect.height = Math.abs(currentY - startY);
            selectedRect.x = Math.min(startX, currentX);
            selectedRect.y = Math.min(startY, currentY);
        } else if (drawing && (event.pointerType === 'pen' || event.pointerType === 'mouse' || event.pointerType === 'eraser')) {
            event.preventDefault();
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
}

//---------------------------------------     CANVAS FUNCTIONS     ---------------------------------------
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
//handling textbox creation
function handleTextboxCreation() {
    isTyping = true; // Assuming this is a global flag you’re using
    const textButton = document.getElementById('textButton');
    
    // Show prompt, toggle button active state
    textButton.classList.add('active'); // Visual feedback (e.g., color change)
    const textValue = prompt('Enter text to place on the screen:');
    
    // If no input or canceled, reset and exit
    if (!textValue) {
        textButton.classList.remove('active');
        return;
    }

    // Change cursor to indicate placement mode
    document.body.style.cursor = 'crosshair';

    // Place text on next click
    function placeTextbox(event) {
        event.stopPropagation();
        
        // Get canvas-relative coordinates
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Draw text on the canvas
        context.font = '16px Arial'; // Set font (customize as needed)
        context.fillStyle = 'black'; // Set text color (customize as needed)
        context.fillText(textValue, x, y);

        // Reset button state and cursor
        textButton.classList.remove('active');
        document.body.style.cursor = 'default';
        isTyping = false;
    }

    // Delay to avoid button click interference
    setTimeout(() => {
        canvas.addEventListener('click', placeTextbox, { once: true });
    }, 10);
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
// check for empty canvas
function canvasHasContent(canvas) {
    const context = canvas.getContext('2d');
    const pixelData = context.getImageData(0, 0, canvas.width, canvas.height).data;

    for (let i = 0; i < pixelData.length; i++) {
        if (pixelData[i] !== 0) {
            return true;
        }
    }
    return false;
}



//---------------------------------     SAVE/LOAD FUNCTIONS (session and local storage)    ---------------------------------
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
    if(canvasHasContent(canvas)){    
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
    else{
        alert(`Canvas empty. Get to work!`);
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

//---------------------------------------     PREDICTION BUTTON     ---------------------------------------
// keydown 's' shortcut
/*document.addEventListener('keydown', (event) => {
    if (event.key === 's') {
        currentTool = 'selector';
        console.log('Selector tool activated');
    }
}); */
function predictionButtonSelect() {
    currentTool = 'selector';
    document.body.style.cursor = 'crosshair';
    console.log('Selector tool activated');

}
async function sendSelectedAreaToBackend(x1, y1, x2, y2) {
    document.body.style.cursor = 'wait';
    // Get the canvas element by its ID
    const canvas = document.getElementById('drawingCanvas');
    if (!canvas) {
        console.error('Canvas element not found.');
        return;
    }

    // Get the 2D context of the canvas
    const context = canvas.getContext('2d');
    if (!context) {
        console.error('Failed to get 2D context.');
        return;
    }

    // Calculate the width and height of the selected area
    const width = x2 - x1;
    const height = y2 - y1;

    // Validate the selected area dimensions
    if (width <= 0 || height <= 0) {
        console.error('Invalid selection area. Please select a valid area:', x1, y1, x2, y2);
        return;
    }

    // Create a temporary canvas to copy the selected area
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempContext = tempCanvas.getContext('2d');
    
    // Set the background color of the temporary canvas to white
    tempContext.fillStyle = 'white';
    tempContext.fillRect(0, 0, width, height);

    // Copy the selected area from the original canvas to the temporary canvas
    tempContext.drawImage(canvas, x1, y1, width, height, 0, 0, width, height);

    try {
        // Convert the temporary canvas to a blob
        const blob = await new Promise((resolve, reject) => {
            tempCanvas.toBlob(blob => {
                if (blob) resolve(blob);
                else reject(new Error('Failed to create blob.'));
            }, 'image/png');
        });

        // Validate the blob
        if (!blob || blob.size === 0) {
            console.error('Failed to create image blob or blob is empty.');
            return;
        }

        console.log(`Blob created successfully. Size: ${blob.size} bytes`);

        // Create a File object from the blob
        const file = new File([blob], 'selected_area.png', { type: 'image/png' });

        // Create a FormData object and append the File object to it
        const formData = new FormData();
        formData.append('image', file);

        // Send the FormData object to the backend server
        const response = await fetch('http://127.0.0.1:2999/process_drawing', {
            method: 'POST',
            body: formData,
        });

        // Handle the backend response
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend response error: ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Server response:', data);
        document.body.style.cursor = 'default';
        // Open a new window to display the received image and results
        const imgWindow = window.open('', '_blank', `width=${width},height=${height + 100}`);
        if (imgWindow && imgWindow.document) {
            imgWindow.document.write(`
                <h3>Received Image and Results</h3>
                <img src="data:image/png;base64,${data.image_base64}" alt="Received Image" style="max-width:100%;"/>
                <p>Processed Text: ${data.text_processed}</p>
                <p>Raw Text: ${data.text_raw}</p>
            `);
        } else {
            console.warn('Popup blocked or failed, check console for results');
            console.log('Image Base64:', data.image_base64.substring(0, 50) + '...');
            console.log('Processed Text:', data.text_processed);
            console.log('Raw Text:', data.text_raw);
        }
    } catch (error) {
        console.error('Error processing request:', error);
    }
}



//--------------------------------------------     EVENT LISTENERS     --------------------------------------------
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
            [canvas, linesCanvas, ].forEach(el => {
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
document.getElementById('textButton').addEventListener('click', handleTextboxCreation);
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

document.getElementById('predictionButton').addEventListener('click', predictionButtonSelect);


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
