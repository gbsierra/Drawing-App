/*
My Note Taking App

Main C++ (working with indexed DB)
*/

#include <iostream>
#include <fstream>
#include <string>
#include <sqlite3.h>

//---------------------------------------    INDEXED DB FUNCTIONS    ---------------------------------------
// database initialization
sqlite3* db;
void initDatabase() {
    // connect to db
    sqlite3_open("notebook.db", &db);
    // prepare SQL statement
    const char* createTableSQL = "CREATE TABLE IF NOT EXISTS Pages (Id INTEGER PRIMARY KEY, ImageData TEXT);";
    // execute SQL statement
    sqlite3_exec(db, createTableSQL, nullptr, nullptr, nullptr);
}

void connectToDatabase(const std::string& dbName) {
    sqlite3_open(dbName.c_str(), &db);
}

void executeSQL(const std::string& sql) {
    sqlite3_exec(db, sql.c_str(), nullptr, nullptr, nullptr);
}

void disconnectFromDatabase() {
    sqlite3_close(db);
}

// saving to database
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

// deleting from database
void deleteDataFromDatabase() {
    connectToDatabase("notebook.db");
    const char* deleteSQL = "DELETE FROM Pages;";
    executeSQL(deleteSQL);
    disconnectFromDatabase();
}

//---------------------------------------     MAIN FUNCTION    ---------------------------------------
int main() {
    // Initialize db
    initDatabase();

    int choice;
    std::string dataUrl;

    while (true) {
        std::cout << "Menu:\n";
        std::cout << "1. Save Data\n";
        std::cout << "2. Delete Data\n";
        std::cout << "3. Exit\n";
        std::cout << "Enter your choice: ";
        std::cin >> choice;

        switch (choice) {
            case 1:
                std::cout << "Enter data URL to save: ";
                std::cin >> dataUrl;
                saveDataToDatabase(dataUrl);
                std::cout << "Data saved successfully.\n";
                break;

            case 2:
                deleteDataFromDatabase();
                std::cout << "Data deleted successfully.\n";
                break;

            case 3:
                // Close db and exit
                sqlite3_close(db);
                return 0;

            default:
                std::cout << "Invalid choice. Please try again.\n";
                break;
        }
    }

    // Close db
    sqlite3_close(db);

    return 0;
}
