from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
import threading
import logging
import os

app = Flask(__name__)
CORS(app)

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load the TrOCR model
try:
    processor = TrOCRProcessor.from_pretrained('microsoft/trocr-large-handwritten')
    model = VisionEncoderDecoderModel.from_pretrained('microsoft/trocr-large-handwritten')
    logger.info("Model and processor loaded successfully")
except Exception as e:
    logger.error(f"Failed to load model: {str(e)}")
    raise

lock = threading.Lock()

@app.route('/process_drawing', methods=['POST'])
def process_drawing():
    logger.debug("Received request")

    if 'image' not in request.files:
        logger.error("No image file in request")
        return jsonify({'error': 'No image file uploaded'}), 400

    images = request.files.getlist('image')
    responses = []

    with lock:
        for image_file in images:
            try:
                logger.debug(f"Processing file: {image_file.filename}")
                
                # Verify file has content
                if image_file.content_length == 0:
                    logger.error("Empty file received")
                    responses.append({'filename': image_file.filename, 'error': 'Empty file'})
                    continue

                # Save the image temporarily to verify its content
                image_path = os.path.join('uploads', image_file.filename)
                image_file.save(image_path)
                logger.debug(f"Image saved to: {image_path}")

                # Open and process image
                image = Image.open(image_path).convert("RGB")
                logger.debug(f"Image size: {image.size}")

                # OCR processing
                pixel_values = processor(images=image, return_tensors="pt").pixel_values
                logger.debug(f"Pixel values shape: {pixel_values.shape}")
                
                generated_ids = model.generate(
                    pixel_values,
                    max_length=50,
                    num_beams=4,
                    early_stopping=True
                )
                generated_text = processor.decode(generated_ids[0], skip_special_tokens=True)
                logger.debug(f"Generated text: {generated_text}")

                if generated_text == "0 0":
                    logger.warning("Model returned '0 0' - possible recognition issue")

                responses.append({
                    'filename': image_file.filename,
                    'text': generated_text
                })
            except Exception as e:
                logger.error(f"Error processing {image_file.filename}: {str(e)}")
                responses.append({
                    'filename': image_file.filename,
                    'error': str(e)
                })

            # Clean up the saved file
            os.remove(image_path)

    return jsonify(responses), 200

if __name__ == '__main__':
    os.makedirs('uploads', exist_ok=True)
    app.run(debug=True, port=2999)
