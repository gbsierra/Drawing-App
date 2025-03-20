# 🎨 **Drawing App**

Welcome to my **Drawing App**!

---

## 📋 Table of Contents

- [🎯 Introduction](#introduction)
- [⚡ Features](#features)
- [📸 Screenshots](#screenshots)
- [🛠️ Installation](#installation)
- [🚀 Usage](#usage)
- [🤝 Contributing](CONTRIBUTING.md)

---

<h2 id="introduction">🎯 Introduction</h2>

This **Drawing App** is a personal project I built to practice my front-end and back-end skills. It's a simple application where you can be creative or be productive. The app features a clean, responsive canvas where you can use different drawing tools to let your ideas flow.


---

<h2 id="features">⚡ Features</h2>

- **Text Prediction**: Send your work to the back-end for prediction by pre-trained models!
- **Pen & Text Colors**: Choose from a variety of colors to create your masterpiece.
- **Undo & Redo**: Don't like your last stroke? Simply undo or redo it.
- **Save Your Art**: Save your drawing to local storage or indexed database for later use.
- **User-friendly Interface**: An easy-to-navigate interface for beginners to experienced artists.

<h2 id="screenshots">🛠️ Screenshots</h2>

- **Canvas in Action**:  
  ![Canvas in Action](/screenshots/canvas.png)  
- **Prediction Button**:  
  ![Model Predictions](/screenshots/prediction.png)


---

<h2 id="installation">📸 Installation</h2>

To get started with the **Drawing App**, follow these simple steps:

1. **Clone the Repository**  
    Clone the repo to your local machine:
    ```sh
    git clone https://github.com/gbsierra/Drawing-App.git
    ```

2. **Navigate to the Project Directory**  
    Go to the project folder:
    ```sh
    cd Drawing-App
    ```

3. **Install Back-End Dependencies**  
    Install the required dependencies using the following command (virtual python environment recommended):
    ```sh
    pip install -r requirements.txt
    ```

4. **Install Front-End Dependencies**  
    If you haven't already, install the necessary front-end dependencies for npm:
    ```sh
    npm install
    ```

---

<h2 id="usage">🚀 Usage</h2>

Once you've installed the necessary dependencies, you're ready to start the app.

### 1. **Start the Front-End**

To launch the front-end of the app, run the following command in your terminal:
```sh
cd src 
cd frontend
npm start
```

### 2. **Start the Back-End**

To launch the back-end of the app, run the following command in your terminal:
```sh
cd ../backend
python canvas_backend.py
```
