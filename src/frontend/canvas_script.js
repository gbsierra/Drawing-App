
/*

  My Note Taking App

  Main Script 

*/

//-------------------------------------------    SETUP     -------------------------------------------
// Get DOM (Document Object Model) elements
const canvas = document.getElementById('drawingCanvas'); // Initial canvas for drawing
const context = canvas.getContext('2d', {willReadFrequently: true}); // 2D rendering context
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
let undoStack = [];
let redoStack = [];
let isPdf = false;


// disable finger touch
canvas.style.touchAction = 'none';
addCanvasEventListeners(canvas); // Add event listeners to the canvas



//---------------------------------------    DRAWING FUNCTIONS    ---------------------------------------
// handle the right mouse click
function handleRightClick(event, canvas) {
    console.log('Right mouse button clicked!', event);
    if(currentTool !== 'eraser'){
        lastTool = currentTool;
    }
    currentTool = 'eraser'; // Change the tool to eraser on right click
}
// handle the right mouse release
function handleRightClickRelease(event, canvas) {
    console.log('Right mouse button released!', event);
    if (currentTool === 'eraser') {
        currentTool = lastTool;
    }
}
// handle pointer down
function handlePointerDown(event, canvas) {
    isPointerDown = true;
    startX = event.offsetX;
    startY = event.offsetY;

    const context = canvas.getContext('2d'); // Get context for this specific canvas
    undoStack.push(context.getImageData(0, 0, canvas.width, canvas.height));

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

        // Save the current canvas state to the undo stack
        //undoStack.push(context.getImageData(0, 0, canvas.width, canvas.height));
        redoStack = []; // Clear the redo stack
    }
}
// handle pointer up
function handlePointerUp(event, canvas) {
    if (!isPointerDown) {
        return;
    }
    isPointerDown = false;

    const context = canvas.getContext('2d'); // Get context for this specific canvas

    if (currentTool === 'selector') {
        const startX = selectedRect.x;
        const startY = selectedRect.y;
        const endX = selectedRect.x + selectedRect.width;
        const endY = selectedRect.y + selectedRect.height;

        console.log('pointerup:', { endX, endY });

        // Send dimensions to backend
        sendSelectedAreaToBackend(startX, startY, endX, endY);
        currentTool = lastTool;
    }

    if (event.pointerType === 'pen' || event.pointerType === 'mouse' || event.pointerType === 'eraser') {
        drawing = false;
        const currentImageData = context.getImageData(0, 0, canvas.width, canvas.height);
        redoStack = []; // Clear the redo stack
        if (event.button === 2) {
            handleRightClickRelease(event, canvas); // Handle right-click release
        }
        context.closePath();
        context.globalAlpha = 1.0; // Reset transparency
        context.globalCompositeOperation = 'source-over'; // Reset to default drawing mode
        notebookContainer.style.touchAction = 'auto'; // Re-enable touch scrolling
    }

    // Handle tool switch if eraser was used
    if (currentTool === 'eraser' && lastTool !== 'eraser') {
        setTool(lastTool); // Restore the last tool after eraser is used
    }

    isSelecting = false;
}
// Modify the eraser functionality
function handlePointerMove(event, canvas) {
    if (isPointerDown && !isTyping) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        // Update the global currentX and currentY variables
        currentX = (event.clientX - rect.left) * scaleX;
        currentY = (event.clientY - rect.top + notebookContainer.scrollTop) * scaleY;

        const context = canvas.getContext('2d'); // Get context for this specific canvas

        if (isSelecting && currentTool === 'selector') {
            selectedRect.width = Math.abs(currentX - startX);
            selectedRect.height = Math.abs(currentY - startY);
            selectedRect.x = Math.min(startX, currentX);
            selectedRect.y = Math.min(startY, currentY);
        } else if (drawing && (event.pointerType === 'pen' || event.pointerType === 'mouse' || event.pointerType === 'eraser')) {
            event.preventDefault();
            const pressure = event.pressure * 1.6 || 1; // Stylus pressure (default 1 if unsupported)
            if(currentTool === 'eraser'){
                context.lineWidth = toolWidth * 8.5 * pressure; // Dynamic width based on pressure
                context.globalCompositeOperation = 'destination-out'; // Erase instead of draw
            }
            else {
                context.lineWidth = toolWidth * 1.2 * pressure; // Dynamic width based on pressure
                context.globalCompositeOperation = 'source-over'; // Draw normally
                context.strokeStyle = toolColor; // Set the stroke color
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

// Undo function
function undo() {
    if (undoStack.length === 0) return;

    const context = drawingCanvas.getContext('2d');  // Get the context of the current drawing canvas

    // Save the current canvas state to the redo stack before applying the undo
    const currentImageData = context.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);

    // Retrieve the last saved state from the undo stack
    const imageData = undoStack.pop();

    if (imageData instanceof ImageData) {
        // Restore the previous state
        context.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        context.putImageData(imageData, 0, 0);

        // Only push the current state to redoStack if we successfully undid
        redoStack.push(currentImageData);
    }
}
// Redo function
function redo() {
    if (redoStack.length === 0) return;

    const context = drawingCanvas.getContext('2d');  // Get the context of the current drawing canvas

    // Save the current canvas state to the undo stack before applying the redo
    const currentImageData = context.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);

    // Retrieve the last saved state from the redo stack
    const imageData = redoStack.pop();

    if (imageData instanceof ImageData) {
        // Restore the previous state
        context.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        context.putImageData(imageData, 0, 0);

        // Only push the current state to undoStack if we successfully redid
        undoStack.push(currentImageData);
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
// handling textbox creation
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
        
        // Get canvas-relative coordinates, taking zoom into account
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;

        // Draw text on the canvas
        context.font = '26px Verdana'; // Set font
        context.fillStyle = toolColor; // Set text color
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
function resizeAndHandle() {
    if (!notebookContainer || !canvas || !context) {
        console.error('Required elements not found.');
        return;
    }

    const dpr = window.devicePixelRatio || 1;
    const containerWidth = notebookContainer.clientWidth;
    const containerHeight = notebookContainer.clientHeight;

    if (containerWidth === 0 || containerHeight === 0) {
        console.error('Invalid container dimensions.');
        return;
    }

    const newWidth = containerWidth * dpr;
    const newHeight = containerHeight * dpr;

    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;

    if (canvas.width !== newWidth || canvas.height !== newHeight) {
        let imageData = null;
        if (canvas.width && canvas.height) {
            try {
                imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            } catch (err) {
                console.error('Error saving canvas image data:', err);
            }
        }

        canvas.width = newWidth;
        canvas.height = newHeight;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);

        if (imageData) {
            context.putImageData(imageData, 0, 0);
        }

        console.log('Canvas resized successfully.');
    }
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
// saving to local storage
function savePageLocally() {
    const notes = JSON.parse(localStorage.getItem('user-saved-notes')) || [];
    
    const noteTitle = prompt('Enter the title of your note:');
    
    if (!noteTitle) {
        alert('Title is required to save the note.');
        return;
    }

    const currentNote = {
        title: noteTitle,
        image: canvas.toDataURL(),  // Save the image from the canvas
        lastModified: new Date().toISOString(),
        isPdf: isPdf  // Save the 'isPdf' flag
    };

    notes.push(currentNote);  // Add the new note to the list
    localStorage.setItem('user-saved-notes', JSON.stringify(notes));  // Save to localStorage

    console.log('Note saved:', currentNote);
    alert('Note saved successfully.');
}
// check flag upon loading page, calls loadPageLocally ( for loading in notes )
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
// loading from local storage
function loadPageLocally(noteIndex = null, clear = false) {
    const notes = JSON.parse(localStorage.getItem('user-saved-notes')) || [];
    if (notes.length === 0) {
        alert('No saved notes found.');
        return;
    }
    let selectedNoteIndex = noteIndex;
    
    // Prompt for selection if no index provided
    if (selectedNoteIndex === null) {
        let notesList = 'Select a note to load:\n      Title:              Last Modified:\n';
        notes.forEach((note, index) => {
            notesList += `${index + 1}.   ${note.title.padEnd(15)} - ${new Date(note.lastModified).toLocaleString()}\n`;
        });
        
        const input = prompt(notesList + '\nEnter the number of the note you want to load:');
        selectedNoteIndex = parseInt(input) - 1;
    }
    // Validate selected index
    if (isNaN(selectedNoteIndex) || selectedNoteIndex < 0 || selectedNoteIndex >= notes.length) {
        alert('Invalid selection.');
        return;
    }

    const selectedNote = notes[selectedNoteIndex];
    console.log(`Loading note:\nTitle: ${selectedNote.title}\nLast Modified: ${selectedNote.lastModified}\n is file: ${selectedNote.isPdf}\n`);

    // Load the saved composite image data
    const img = new Image();
    img.src = selectedNote.image; // Load image from saved note

    img.onload = function() {
        // Ensure the canvas is cleared if the `clear` flag is set
        if (clear && typeof clearCanvas === 'function') {
            clearCanvas();
        }

        const container = canvas.parentElement;

        // Check if the saved note is a PDF
        if (selectedNote.isPdf) {
            // Apply the grey background for PDF notes
            //container.style.backgroundColor = '#d3d3d3'; // Grey background for PDF notes
            //console.log('PDF note');
            linesCanvas.style.display = 'none';
            // Resize canvas to match image dimensions
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.style.width = `${img.width}px`;
            canvas.style.height = `${img.height}px`;
            // Container styling
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.alignItems = 'center';
            container.style.padding = '10px';
            container.style.overflowY = 'auto';
            container.style.overflowX = 'auto';
            container.style.height = 'auto';
            container.style.width = '100%';
            container.style.minHeight = '100vh';

        } 
        else {
            // Apply the default background for regular image notes
            //container.style.backgroundColor = '#ffffff'; // Light grey background for regular notes
            //console.log('regular note');
        }
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);  // Clear any existing content
        context.drawImage(img, 0, 0);

        console.log(`success!`);
    };
    img.onerror = function() {
        console.error('Error loading image:', selectedNote.image);
        alert('Failed to load the note image.');
    };
}
// function to get type of load selection
function getLoadSelection() {
    const loadOption = prompt("Where do you want to load the note from?\n1. Local Storage\n2. PC File");
    
    switch (loadOption) {
        case '1':
            loadPageLocally();
            break;
        case '2':
            const fileInput = document.getElementById('fileInput');
            if (fileInput) {
                fileInput.click();
            } else {
                console.error('File input element not found');
                alert('Error: File input not available');
            }
            break;
        default:
            alert("Invalid selection. Please enter '1' or '2'.");
    }
}
// loading from PC file
async function loadFromPCFile(event) {
    undoStack = [];
    redoStack = [];

    const file = event.target.files[0];
    if (!file) return;

    const fileReader = new FileReader();

    fileReader.onload = async function (e) {
        const arrayBuffer = e.target.result;

        linesCanvas.style.display = 'none';
        const container = canvas.parentElement;
        //container.style.backgroundColor = '#d3d3d3'; // Set container background color

        if (file.name.toLowerCase().endsWith('.pdf')) {
            isPdf = true;
            if (typeof pdfjsLib === 'undefined') {
                alert('PDF.js library not loaded. Please include it in your HTML.');
                return;
            }

            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js';

            try {
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                console.log('PDF loaded:', file.name, 'Pages:', pdf.numPages);
                alert(`PDF Loaded from PC:\nFile: ${file.name}\nPages: ${pdf.numPages}`);

                container.innerHTML = '';
                container.appendChild(canvas);
                
                container.style.display = 'flex';
                container.style.flexDirection = 'column';
                container.style.alignItems = 'center';
                container.style.padding = '10px';
                container.style.overflowY = 'auto';
                container.style.overflowX = 'auto';
                container.style.height = 'auto';
                container.style.width = '100%';
                container.style.minHeight = '100vh';

                const SCALE = 1.5; // Zoom factor (1.5x original size, adjust as needed)
                const GAP = 20; // Increased gap between pages (was 10px)
                const context = canvas.getContext('2d');
                let totalHeight = 0;
                let maxWidth = 0;
                const pageCanvases = [];

                // Step 1: Render each page to an offscreen canvas with zoom
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const viewport = page.getViewport({ scale: SCALE });

                    const offscreenCanvas = document.createElement('canvas');
                    offscreenCanvas.width = viewport.width;
                    offscreenCanvas.height = viewport.height;
                    const offscreenContext = offscreenCanvas.getContext('2d');

                    const renderContext = {
                        canvasContext: offscreenContext,
                        viewport: viewport
                    };

                    await page.render(renderContext).promise;
                    pageCanvases.push(offscreenCanvas);
                    totalHeight += viewport.height + (pageNum > 1 ? GAP : 0);
                    maxWidth = Math.max(maxWidth, viewport.width);
                    console.log(`Page ${pageNum} rendered offscreen: ${viewport.width}x${viewport.height}`);
                }

                // Step 2: Set up main canvas with zoomed dimensions
                canvas.width = maxWidth;
                canvas.height = totalHeight;
                canvas.style.width = `${maxWidth}px`;
                canvas.style.height = `${totalHeight}px`;
                context.clearRect(0, 0, canvas.width, canvas.height); // Ensure canvas is clear

                const canvasState = [];
                let currentYPosition = 0;

                // Step 3: Composite all pages
                for (let i = 0; i < pageCanvases.length; i++) {
                    const xOffset = (maxWidth - pageCanvases[i].width) / 2;
                    context.drawImage(pageCanvases[i], xOffset, currentYPosition);
                    currentYPosition += pageCanvases[i].height + GAP;

                    const currentImageData = context.getImageData(0, 0, canvas.width, canvas.height);
                    canvasState.push(currentImageData);
                    console.log(`Page ${i + 1} composited at y=${currentYPosition - pageCanvases[i].height - GAP}, width=${pageCanvases[i].width}`);
                }

                undoStack.push(...canvasState);
                redoStack = [];

                // Do NOT save to localStorage; just render or use the note in the current session
                const note = {
                    title: file.name,
                    image: canvas.toDataURL(),  // Save image data
                    lastModified: Date.now(),
                    isPdf: true // Flag for PDF files
                };

                // If you want to render it, show a message or do something with the note
                console.log('PDF rendered, note not saved:', note);
                // If you want to store the note temporarily in memory, do it here without saving to localStorage

                // Optional: For example, displaying the title and PDF info in the UI
                const noteDisplay = document.createElement('div');
                noteDisplay.innerHTML = `
                    <h2>${note.title}</h2>
                    <p>Last modified: ${new Date(note.lastModified).toLocaleString()}</p>
                    <p>PDF note rendered successfully.</p>
                `;
                container.appendChild(noteDisplay);

                addCanvasEventListeners(canvas);
                
                container.scrollTop = 0;
                console.log(`Rendering complete. Canvas size: ${maxWidth}x${totalHeight}`);

            } catch (error) {
                console.error('Error loading PDF:', error);
                alert('Error: Invalid PDF file');
            }
        }
    };

    fileReader.onerror = function () {
        alert('Error reading the file.');
    };

    fileReader.readAsArrayBuffer(file);
}



//---------------------------------------     PREDICTION BUTTON     ---------------------------------------
//selecting prediction button
function predictionButtonSelect() {
    currentTool = 'selector';
    document.body.style.cursor = 'crosshair';
    console.log('Selector tool activated');

}
//sending to backend for prediction
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
function addCanvasEventListeners(canvas) {
    canvas.addEventListener('pointerdown', function(event) {
        handlePointerDown(event, canvas);
    });
    canvas.addEventListener('pointermove', function(event) {
        handlePointerMove(event, canvas);
    });
    canvas.addEventListener('pointerup', function(event) {
        handlePointerUp(event, canvas);
    });
    canvas.addEventListener('mouseup', function(event) {
        handlePointerUp(event, canvas); 
    });
    canvas.addEventListener('pointerout', function(event) {
        handlePointerUp(event, canvas);
    });
    canvas.addEventListener('contextmenu', function (event) {
        event.preventDefault();  // Prevent the default right-click context menu
        //console.log('Right mouse button context menu event prevented!');
    });
    canvas.addEventListener('mousedown', function(event) { //right click
        if (event.button === 2) {  // Check if it's the right mouse button (button 2 corresponds to right-click)
            event.preventDefault();  // Prevent the default context menu
            handleRightClick(event, canvas);
        }
    });
}

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

// Undo button
document.getElementById('undoButton').addEventListener('click', function() {
    undo();  // Call undo for the active canvas
});
// Redo button
document.getElementById('redoButton').addEventListener('click', function() {
    redo();  // Call redo for the active canvas
});
// Keyboard for undo (Ctrl + Z)
document.addEventListener('keydown', function(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault();  // Prevent default browser undo action
        undo();  // Call undo for the active canvas
    }
});
// Keyboard for redo (Ctrl + Shift + Z)
document.addEventListener('keydown', function(event) {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z') {
        event.preventDefault();  // Prevent default browser redo action
        redo();  // Call redo for the active canvas
    }
});
// Keyboard 's' shortcut
/*document.addEventListener('keydown', (event) => {
    if (event.key === 's') {
        currentTool = 'selector';
        console.log('Selector tool activated');
    }
}); */

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

        // Add double-click event listener to delete the note
        li.addEventListener('dblclick', () => {
            notesList.removeChild(li); // Remove the list item from the DOM
            savedNotes = savedNotes.filter(note => note !== noteText); // Remove the note from the array
            localStorage.setItem('user-current-toDo', JSON.stringify(savedNotes)); // Update localStorage
        });
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

            // Add double-click event listener to delete the note
            li.addEventListener('dblclick', () => {
                notesList.removeChild(li); // Remove the list item from the DOM
                savedNotes = savedNotes.filter(note => note !== noteText); // Remove the note from the array
                localStorage.setItem('user-current-toDo', JSON.stringify(savedNotes)); // Update localStorage
            });

            savedNotes.push(noteText); // Add the note text to the array of saved notes
            localStorage.setItem('user-current-toDo', JSON.stringify(savedNotes)); // Save the updated notes array to localStorage

            noteInput.value = ''; // Clear the input field
        }
    });

    // Add keydown event listener to noteInput to handle Enter key
    noteInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent default behavior (new line)
            noteForm.dispatchEvent(new Event('submit')); // Trigger form submission
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
window.addEventListener('load', resizeAndHandle); // Resize the canvas on load
window.onload = checkForLoadPageFlag; // check for flag (coming from menu.html?)



