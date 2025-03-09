from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image, ImageEnhance
import io
import base64
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
import torch
import logging

# Suppress transformers logging, too many errors for now
logging.getLogger("transformers").setLevel(logging.ERROR)

app = Flask(__name__)  # Flask application instance
CORS(app)  # Enable Cross-Origin Resource Sharing (CORS)

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s ')
logger = logging.getLogger(__name__) #Logger instance

# Load pre-trained TrOCR model and processor
processor = TrOCRProcessor.from_pretrained('microsoft/trocr-large-handwritten')
model = VisionEncoderDecoderModel.from_pretrained('microsoft/trocr-large-handwritten')

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")  # Use GPU if available, otherwise use CPU
model.to(device)  # Move the model to the selected device
model.eval()  # Set the model to evaluation mode

# process drawing route
@app.route('/process_drawing', methods=['POST'])
def process_drawing():
    logger.info("Received request to /process_drawing")

    #check for image in request
    if 'image' not in request.files:
        logger.error("No image file in request")
        return jsonify({'error': 'No image file uploaded'}), 400

    # process image
    image_file = request.files['image']
    logger.info(f"Received file: {image_file.filename}, Content-Type: {image_file.content_type}, Size: {image_file.content_length or 'unknown'} bytes")

    # validate content is image
    if not image_file.content_type.startswith('image'):
        logger.error(f"Invalid content type: {image_file.content_type}")
        return jsonify({'error': 'Uploaded file is not a valid image'}), 400

    try:
        #open image, convert to RGB format
        with Image.open(image_file.stream).convert('RGB') as image:
            #log dimensions
            logger.info(f"Image loaded: {image.size[0]}x{image.size[1]} pixels")

            # Convert image to base64
            buffered = io.BytesIO()
            image.save(buffered, format="PNG")
            image_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
            logger.info("Image converted to base64")

            # Preprocess the image
            grayscale_image = image.convert('L')  # Convert image to grayscale
            threshold = 150  # Threshold value for binarization
            binarized_image = grayscale_image.point(lambda p: 255 if p > threshold else 0)  # Binarize the image
            binarized_image_rgb = binarized_image.convert('RGB')  # Convert grayscaled image back to RGB format 
            enhanced_image = ImageEnhance.Contrast(binarized_image_rgb).enhance(1.2)  # Enhance contrast
            if max(enhanced_image.size) > 1024:  # Resize the image if it's too large
                enhanced_image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
                logger.info(f"Image resized to: {enhanced_image.size[0]}x{enhanced_image.size[1]} pixels")

            # Inference function
            def perform_inference(img):
                pixel_values = processor(images=img, return_tensors="pt").pixel_values.to(device)  # Preprocess the image
                with torch.no_grad():  # Disable gradient calculation
                    generated_ids = model.generate(pixel_values, max_length=512, num_beams=4, early_stopping=True)  # Generate text from image
                return processor.batch_decode(generated_ids, skip_special_tokens=True)[0]  # Decode the generated text

            processed_text = perform_inference(enhanced_image)  # Perform inference on the enhanced image
            raw_text = perform_inference(image)  # Perform inference on the raw image

            #log prediction
            logger.info(f"Generated Text (processed): '{processed_text}'")
            logger.info(f"Generated Text (regular): '{raw_text}'")
            
            #return for front-end
            return jsonify({
                'message': 'Image processed successfully',
                'text_processed': processed_text,
                'text_raw': raw_text,
                'image_base64': image_base64
            }), 200
    except Exception as e:
        logger.error(f"Processing error: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error processing the image: {str(e)}'}), 500


if __name__ == '__main__':
    logger.info("Starting application...")
    app.run(port=2999, debug=True)  # Run the application on port 2999 in debug mode
