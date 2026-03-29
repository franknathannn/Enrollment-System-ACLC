package ACLCapp;

import Test.StudentWindowGUI;
import javax.swing.SwingUtilities;
import java.sql.Connection;

public class Main {
    public static void main(String[] args) {
        try (Connection mysqlConn = DBConnection.getMySQLConnection();
             Connection sqliteConn = DBConnection.getSQLiteConnection()) {

            if (mysqlConn != null) {
                System.out.println("✅ Connected to remote MySQL database.");
            }
            if (sqliteConn != null) {
                System.out.println("✅ Connected to local SQLite database.");
            }

            DBSync.insertTestDataIfEmpty();
            DBSync.syncResearchTitles();

            // 🚀 Initialize the self-learning similarity system after syncing both DBs
            SimilarityUtil.initializeFromDatabases();

        } catch (Exception e) {
            System.err.println("❌ Database sync error: " + e.getMessage());
            e.printStackTrace();
        }

        SwingUtilities.invokeLater(() -> {
            try {
                StudentWindowGUI window = new StudentWindowGUI();
                window.setDefaultCloseOperation(javax.swing.JFrame.EXIT_ON_CLOSE);
                window.pack();
                window.setLocationRelativeTo(null);
                window.setVisible(true);
            } catch (Exception e) {
                System.err.println("❌ GUI initialization error: " + e.getMessage());
                e.printStackTrace();
            }
        });
    }
}