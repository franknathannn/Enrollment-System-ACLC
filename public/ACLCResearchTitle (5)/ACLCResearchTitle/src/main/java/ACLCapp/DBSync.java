package ACLCapp;

import java.sql.*;

public class DBSync {

    public static void syncResearchTitles() {
        Connection mysql = DBConnection.getMySQLConnection();
        Connection sqlite = DBConnection.getSQLiteConnection();

        if (sqlite == null) {
            System.err.println("[Sync] SQLite connection failed - aborting sync.");
            return;
        }
        if (mysql == null) {
            System.err.println("[Sync] MySQL connection failed - skipping MySQL -> SQLite sync.");
            return;
        }

        try {
            // ✅ Ensure SQLite table exists before any operations
            ensureTableExists(sqlite);

            // Step 1: MySQL -> SQLite
            System.out.println("[Sync] Syncing MySQL -> SQLite...");
            Statement mysqlStmt = mysql.createStatement();
            ResultSet rs = mysqlStmt.executeQuery("SELECT * FROM research_titles");

            PreparedStatement sqliteInsert = sqlite.prepareStatement(
                "INSERT OR REPLACE INTO research_titles " +
                "(`ID`, `Research Title`, `SY-YR`, `Status`, `Applied`, `Strand`, `Software`, `Webpage`) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            );

            while (rs.next()) {
                sqliteInsert.setInt(1, rs.getInt("ID"));
                sqliteInsert.setString(2, rs.getString("Research Title"));
                sqliteInsert.setString(3, rs.getString("SY-YR"));
                sqliteInsert.setString(4, rs.getString("Status"));
                sqliteInsert.setString(5, rs.getString("Applied"));
                sqliteInsert.setString(6, rs.getString("Strand"));
                sqliteInsert.setString(7, rs.getString("Software"));
                sqliteInsert.setString(8, rs.getString("Webpage"));
                sqliteInsert.executeUpdate();
            }

            rs.close();
            mysqlStmt.close();
            sqliteInsert.close();
            System.out.println("[Sync] MySQL -> SQLite complete.");

            // Step 2: SQLite -> MySQL
            System.out.println("[Sync] Syncing SQLite -> MySQL...");
            Statement sqliteStmt = sqlite.createStatement();
            ResultSet rsLocal = sqliteStmt.executeQuery("SELECT * FROM research_titles");

            PreparedStatement mysqlInsert = mysql.prepareStatement(
                "INSERT INTO research_titles " +
                "(`ID`, `Research Title`, `SY-YR`, `Status`, `Applied`, `Strand`, `Software`, `Webpage`) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?) " +
                "ON DUPLICATE KEY UPDATE " +
                "`Research Title`=VALUES(`Research Title`), " +
                "`SY-YR`=VALUES(`SY-YR`), " +
                "`Status`=VALUES(`Status`), " +
                "`Applied`=VALUES(`Applied`), " +
                "`Strand`=VALUES(`Strand`), " +
                "`Software`=VALUES(`Software`), " +
                "`Webpage`=VALUES(`Webpage`)"
            );

            while (rsLocal.next()) {
                mysqlInsert.setInt(1, rsLocal.getInt("ID"));
                mysqlInsert.setString(2, rsLocal.getString("Research Title"));
                mysqlInsert.setString(3, rsLocal.getString("SY-YR"));
                mysqlInsert.setString(4, rsLocal.getString("Status"));

                String applied = rsLocal.getString("Applied");
                if (applied != null && applied.length() > 50) {
                    applied = applied.substring(0, 50);
                }
                mysqlInsert.setString(5, applied);
                mysqlInsert.setString(6, rsLocal.getString("Strand"));
                mysqlInsert.setString(7, rsLocal.getString("Software"));
                mysqlInsert.setString(8, rsLocal.getString("Webpage"));
                mysqlInsert.executeUpdate();
            }

            rsLocal.close();
            sqliteStmt.close();
            mysqlInsert.close();
            System.out.println("[Sync] SQLite -> MySQL complete.");

        } catch (Exception e) {
            System.err.println("[Sync] Error syncing: " + e.getMessage());
            e.printStackTrace();
        } finally {
            try { if (mysql != null) mysql.close(); } catch (Exception ignored) {}
            try { if (sqlite != null) sqlite.close(); } catch (Exception ignored) {}
        }
    }

    // Helper method to create the SQLite table if it doesn't exist
    private static void ensureTableExists(Connection sqlite) throws SQLException {
        String sql = "CREATE TABLE IF NOT EXISTS research_titles (" +
                     "`ID` INTEGER PRIMARY KEY, " +
                     "`Research Title` TEXT, " +
                     "`SY-YR` TEXT, " +
                     "`Status` TEXT, " +
                     "`Applied` TEXT, " +
                     "`Strand` TEXT, " +
                     "`Software` TEXT, " +
                     "`Webpage` TEXT)";
        try (Statement stmt = sqlite.createStatement()) {
            stmt.execute(sql);
            System.out.println("[SQLite] Table 'research_titles' ensured.");
        }
    }

    public static void insertTestDataIfEmpty() {
        try (Connection sqlite = DBConnection.getSQLiteConnection()) {
            if (sqlite == null) {
                System.err.println("[TestData] SQLite connection failed.");
                return;
            }

            // ✅ Ensure table exists before checking count
            ensureTableExists(sqlite);

            try (Statement stmt = sqlite.createStatement();
                 ResultSet rs = stmt.executeQuery("SELECT COUNT(*) AS count FROM research_titles")) {
                if (rs.next() && rs.getInt("count") == 0) {
                    System.out.println("[TestData] No records found. Inserting sample data...");
                    try (PreparedStatement insert = sqlite.prepareStatement(
                            "INSERT INTO research_titles " +
                            "(`ID`, `Research Title`, `SY-YR`, `Status`, `Applied`, `Strand`, `Software`, `Webpage`) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)")) {
                        insert.setInt(1, 1);
                        insert.setString(2, "Sample Research Title");
                        insert.setString(3, "2024-2025");
                        insert.setString(4, "Pending");
                        insert.setString(5, "Yes");
                        insert.setString(6, "ICT");
                        insert.setString(7, "None");
                        insert.setString(8, "http://example.com");
                        insert.executeUpdate();
                        System.out.println("[TestData] Sample data inserted.");
                    }
                } else {
                    System.out.println("[TestData] SQLite already has data. Skipping sample insert.");
                }
            }
        } catch (Exception e) {
            System.err.println("[TestData] Error inserting test data: " + e.getMessage());
            e.printStackTrace();
        }
    }
}