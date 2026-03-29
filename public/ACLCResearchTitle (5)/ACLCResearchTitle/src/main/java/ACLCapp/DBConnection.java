package ACLCapp;

import java.sql.Connection;
import java.sql.DriverManager;

public class DBConnection {

    // --- MySQL Configuration ---
    private static final String MYSQL_HOST = "100.82.88.102";
    private static final String MYSQL_PORT = "3306";
    private static final String MYSQL_DB = "aclcdb";
    private static final String MYSQL_USER = "myuser";
    private static final String MYSQL_PASSWORD = "mypassword";

    private static final String MYSQL_URL =
            "jdbc:mysql://" + MYSQL_HOST + ":" + MYSQL_PORT + "/" + MYSQL_DB
            + "?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true";

    // --- SQLite Configuration ---
    private static final String SQLITE_URL = "jdbc:sqlite:aclcsqlitedb.db";

    private static Connection mysqlConnection = null;
    private static Connection sqliteConnection = null;

    // --- MySQL Connection ---
    public static Connection getMySQLConnection() {
        try {
            if (mysqlConnection == null || mysqlConnection.isClosed()) {
                Class.forName("com.mysql.cj.jdbc.Driver");
                mysqlConnection = DriverManager.getConnection(MYSQL_URL, MYSQL_USER, MYSQL_PASSWORD);
                System.out.println("[MySQL] Connected to remote MySQL server.");
            }
        } catch (Exception e) {
            System.err.println("[MySQL] Connection failed: " + e.getMessage());
            mysqlConnection = null;
        }
        return mysqlConnection;
    }

    // --- SQLite Connection ---
    public static Connection getSQLiteConnection() {
        try {
            if (sqliteConnection == null || sqliteConnection.isClosed()) {
                Class.forName("org.sqlite.JDBC");
                sqliteConnection = DriverManager.getConnection(SQLITE_URL);
                System.out.println("[SQLite] Connected to local SQLite database (aclcsqlitedb.db).");
            }
        } catch (Exception e) {
            System.err.println("[SQLite] Connection failed: " + e.getMessage());
            sqliteConnection = null;
        }
        return sqliteConnection;
    }

    public static void closeConnections() {
        try {
            if (mysqlConnection != null && !mysqlConnection.isClosed()) {
                mysqlConnection.close();
                System.out.println("[MySQL] Connection closed.");
            }
        } catch (Exception e) {
            System.err.println("[MySQL] Closing connection error: " + e.getMessage());
        }

        try {
            if (sqliteConnection != null && !sqliteConnection.isClosed()) {
                sqliteConnection.close();
                System.out.println("[SQLite] Connection closed.");
            }
        } catch (Exception e) {
            System.err.println("[SQLite] Closing connection error: " + e.getMessage());
        }
    }
}