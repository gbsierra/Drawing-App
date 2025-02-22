/*
My Note Taking App

Main C++

*/

#include <iostream>
#include <fstream>
#include <string>
#include <cpprest/http_listener.h>
#include <cpprest/json.h>
#include <sqlite3.h>
using namespace web; //helps with creating and managing web-based applications
using namespace web::http; //working with hhtp protocol
using namespace web::http::experimental::listener; //necessary for handling incoming HTTP requests

//--------------------
// Functions
//--------------------
//database initialization
sqlite3* db;
void initDatabase() {
    // connect to db
    sqlite3_open("notebook.db", &db);
    // prepare SQL statement
    const char* createTableSQL = "CREATE TABLE IF NOT EXISTS Pages (Id INTEGER PRIMARY KEY, ImageData TEXT);";
    // execute SQL statement
    sqlite3_exec(db, createTableSQL, nullptr, nullptr, nullptr);
}
//saving to database
void saveDataToDatabase(const std::string& dataUrl) {
    // Connect to db
    connectToDatabase("notebook.db");
    // Prepare the SQL statement
    std::string insertSQL = "INSERT INTO Pages (ImageData) VALUES ('" + dataUrl + "');";
    // Execute the SQL statement 
    executeSQL(insertSQL);
    // Disconnect from the db
    disconnectFromDatabase();
}
//deleting from database
void deleteDataFromDatabase() {
    const char* deleteSQL = "DELETE FROM Pages;";
    sqlite3_exec(db, deleteSQL, nullptr, nullptr, nullptr);
}

//processes incoming HTTP POST requests
void handle_post(http_request request) {
    // Decode the request URI to get the path
    std::string path = uri::decode(request.relative_uri().path());

    // Check if the path is "/save"
    if (path == "/save") {
        // Extract the JSON body from the request synchronously
        auto json = request.extract_json().get();
        // Get the dataUrl from the JSON
        std::string dataUrl = json[U("dataUrl")].as_string();
        // Save the dataUrl to the database
        saveDataToDatabase(dataUrl);
        // Reply to the client with a status code of 200 OK and a "Saved" message
        request.reply(status_codes::OK, "Saved");
    } 
    // Check if the path is "/delete"
    else if (path == "/delete") {
        // Delete data from the database
        deleteDataFromDatabase();
        // Reply to the client with a status code of 200 OK and a "Deleted" message
        request.reply(status_codes::OK, "Deleted");
    } 
    // If the path is neither "/save" nor "/delete"
    else {
        // Reply to the client with a status code of 404 Not Found and a "Not Found" message
        request.reply(status_codes::NotFound, "Not Found");
    }
}


//--------------------
// Main Function
//--------------------
int main() {
    // Initialize db
    initDatabase();
    
    // Set up the HTTP listener
    http_listener listener(U("http://localhost:3001"));
    
    // Support POST requests using the handle_post function
    listener.support(methods::POST, handle_post);

    // Try to open the listener and start listening
    try {
        listener.open().then([]() {
            std::cout << "Starting to listen" << std::endl;
        }).wait();
        // Keeps program running
        std::cin.get();
    } catch (const std::exception& e) {
        std::cout << "Exception: " << e.what() << std::endl;
    }

    // Close db
    sqlite3_close(db);

    return 0;
}

