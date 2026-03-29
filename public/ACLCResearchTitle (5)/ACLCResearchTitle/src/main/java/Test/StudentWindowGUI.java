
package Test;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import javax.swing.ImageIcon;
import javax.swing.table.DefaultTableModel;
import textfield.SearchOptinEvent;
import textfield.SearchOption;
import ACLCapp.DBConnection;
import java.awt.event.KeyAdapter;
import java.awt.event.KeyEvent;
import java.util.HashSet;
import java.util.Set;
import javax.swing.*;
import ACLCapp.SimilarityUtil;
import com.formdev.flatlaf.FlatLightLaf;
import com.formdev.flatlaf.FlatDarkLaf;


    public class StudentWindowGUI extends javax.swing.JFrame {
        private boolean showEditButton = false;
        private boolean deleteMode = false;
        private int selectedId = -1;
        private String column = "Research Title"; // default search column

    // popup for suggestions (you already declared jPopupMenu1 in the form; we use it)

    public boolean isShowEditButton() {
        return showEditButton;
    }

    public void setShowEditButton(boolean showEditButton) {
        this.showEditButton = showEditButton;
    }
    
    public boolean isDeleteMode() {
        return deleteMode;
    }

    public void setDeleteMode(boolean deleteMode) {
        this.deleteMode = deleteMode;
    }

    public StudentWindowGUI() {
        try {
            FlatLightLaf.setup(); // default light theme
            // FlatDarkLaf.setup(); // uncomment for dark theme
        } catch (Exception ex) {
            System.err.println("Failed to initialize FlatLaf: " + ex.getMessage());
        }

        initComponents();

        if (jPopupMenu1 == null) {
            jPopupMenu1 = new JPopupMenu();
        }
        try {
            Connection conn = DBConnection.getMySQLConnection();
            if (conn == null) {
                System.err.println("Failed to connect to MySQL database.");
            } else {
                System.out.println("Connected to MySQL database.");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        txt.addEventOptionSelected(new SearchOptinEvent() {
            @Override
            public void optionSelected(SearchOption option, int index) {
                txt.setHint("Search by " + option.getName() + "...");
            }
        });

        txt.addOption(new SearchOption("Research Title", new ImageIcon(getClass().getClassLoader().getResource("user.png"))));
        txt.addOption(new SearchOption("SY-YR", new ImageIcon(getClass().getClassLoader().getResource("email.png"))));
        txt.addOption(new SearchOption("Strand", new ImageIcon(getClass().getClassLoader().getResource("Strand.png"))));
        txt.setSelectedIndex(0);

        loadResearchTitles("");

        txt.addKeyListener(new KeyAdapter() {
            @Override
            public void keyReleased(KeyEvent e) {
                String text = txt.getText() != null ? txt.getText().trim() : "";
                if (text.length() > 0) {
                    showSuggestions(text);
                } else {
                    jPopupMenu1.setVisible(false);
                }
            }
        });

        table.addMouseListener(new java.awt.event.MouseAdapter() {
            @Override
            public void mouseClicked(java.awt.event.MouseEvent evt) {
                int row = table.getSelectedRow();
                if (row != -1) {
                    selectedId = (int) table.getValueAt(row, 0); // Column 0 is ID
                    System.out.println("Selected ID: " + selectedId);
                }
            }
        });
    }

    private boolean isValidResearchTitle(String title) {
        if (title == null) return false;

        title = title.trim();

        if (title.length() < 10 || title.length() > 255) {
            JOptionPane.showMessageDialog(this,
                "Research Title must be between 10 and 255 characters.");
            return false;
        }

        if (!title.matches("[A-Za-z0-9 ,:()\\-]+")) {
            JOptionPane.showMessageDialog(this,
            "Research Title contains invalid characters.");
            return false;
        }

        return true;
    }

    private boolean isValidSchoolYear(String syyr) {
        if (syyr == null) return false;

        syyr = syyr.trim();

        if (!syyr.matches("\\d{4}-\\d{4}")) {
            JOptionPane.showMessageDialog(this,
                "SY-YR must be in format YYYY-YYYY.");
            return false;
        }

        String[] parts = syyr.split("-");
        int start = Integer.parseInt(parts[0]);
        int end = Integer.parseInt(parts[1]);

        if (end != start + 1) {
            JOptionPane.showMessageDialog(this,
                "End year must be start year + 1.");
            return false;
        }

        return true;
    }
    
    private boolean looksLikeAResearchTitle(String title) {
        title = title.trim().toLowerCase();


        String[] words = title.split("\\s+");
        if (words.length < 5) {
            JOptionPane.showMessageDialog(this,
                "Research Title is too short to be valid.");
            return false;
        }

        if (!title.matches(".*[a-zA-Z].*")) {
            JOptionPane.showMessageDialog(this,
                "Research Title must contain words, not just numbers.");
            return false;
        }

        return true;
    }
    private void loadResearchTitles(String filter) {
        DefaultTableModel model = (DefaultTableModel) table.getModel();
        model.setRowCount(0);

        String sql = "SELECT `ID`, `Research Title`, `SY-YR`, `Status`, `Applied`, `Strand`, `Software`, `Webpage` FROM research_titles";
        boolean hasFilter = filter != null && !filter.isEmpty();
        if (filter != null && !filter.isEmpty() && column != null) {
            String col = getSafeColumn();
            sql += " WHERE `" + col + "` LIKE ?";
        }

        try (Connection con = DBConnection.getMySQLConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {

            if (hasFilter) {
                ps.setString(1, "%" + filter + "%");
            }


            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                model.addRow(new Object[]{
                    rs.getInt("ID"),
                    rs.getString("Research Title"),
                    rs.getString("SY-YR"),
                    rs.getString("Status"),
                    rs.getString("Applied"),
                    rs.getString("Strand"),
                    rs.getString("Software"),
                    rs.getString("Webpage"),
                    ""
                });
            }
            rs.close();

            table.getColumnModel().getColumn(8).setCellRenderer(new ButtonRenderer(this));
            table.getColumnModel().getColumn(8).setCellEditor(new ButtonEditor(table, this));
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
    
    private boolean confirmIfSimilarTitle(String newTitle, int currentId) {
        try (Connection con = ACLCapp.DBConnection.getMySQLConnection();
             PreparedStatement ps = con.prepareStatement(
                 "SELECT ID, `Research Title` FROM research_titles"
             )) {

            ResultSet rs = ps.executeQuery();

            while (rs.next()) {
                int dbId = rs.getInt("ID");
                if (dbId == currentId) continue;

                String existingTitle = rs.getString("Research Title");

                double similarity = SimilarityUtil.calculateSimilarity(
                    newTitle.toLowerCase(),
                    existingTitle.toLowerCase()
                );

            if (similarity >= 0.80) {
                int choice = JOptionPane.showConfirmDialog(
                    this,
                    "This title is very similar to an existing research title:\n\n"
                    + existingTitle + "\n\n"
                    + "Similarity: " + (int)(similarity * 100) + "%\n\n"
                    + "Do you want to continue editing?",
                    "Similar Research Title Detected",
                    JOptionPane.YES_NO_OPTION,
                    JOptionPane.WARNING_MESSAGE
                );

                    return choice == JOptionPane.YES_OPTION;
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return true;
    }

    /**
     * Show up to 5 suggestions for the currently selected column.
     * This method is required so the call showSuggestions(text) compiles.
     */
    private String getSafeColumn() {
        switch (column) {
            case "Research Title":
                return "Research Title";
            case "SY-YR":
                return "SY-YR";
            case "Strand":
                return "Strand";
            default:
                return "Research Title";
        }
    }
    private void showSuggestions(String text) {
        jPopupMenu1.setFocusable(false);

       jPopupMenu1.removeAll();

        Set<String> seen = new HashSet<>();

        // wrap column in backticks for safety
        String col = getSafeColumn();
        String sql = "SELECT `" + col + "` FROM research_titles WHERE `" + col + "` LIKE ? LIMIT 5";

        try (Connection con = DBConnection.getMySQLConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setString(1, "%" + text + "%");
            ResultSet rs = ps.executeQuery();

            boolean hasResults = false;
            while (rs.next()) {
                String suggestion = rs.getString(1);
                if (suggestion == null) continue;
                if (seen.contains(suggestion)) continue;
                seen.add(suggestion);

                hasResults = true;
                JMenuItem item = new JMenuItem(suggestion);
                // popup should NOT steal focus
                item.setFocusable(false);

                item.addActionListener(e -> {
                    txt.setText(suggestion);
                    jPopupMenu1.setVisible(false);
                    loadResearchTitles(suggestion);
                });

                jPopupMenu1.add(item);
            }
            rs.close();

            if (hasResults) {
                // let text field keep focus for typing
                txt.requestFocusInWindow();
                jPopupMenu1.show(txt, 0, txt.getHeight());
            } else {
                jPopupMenu1.setVisible(false);
            }
        } catch (SQLException ex) {
            ex.printStackTrace();
            jPopupMenu1.setVisible(false);
        }
    }
    /**
     * This method is called from within the constructor to initialize the form.
     * WARNING: Do NOT modify this code. The content of this method is always
     * regenerated by the Form Editor.
     */
    @SuppressWarnings("unchecked")
    // <editor-fold defaultstate="collapsed" desc="Generated Code">//GEN-BEGIN:initComponents
    private void initComponents() {

        jFrame1 = new javax.swing.JFrame();
        jPopupMenu1 = new javax.swing.JPopupMenu();
        txt = new textfield.TextFieldSearchOption();
        jScrollPane1 = new javax.swing.JScrollPane();
        table = new javax.swing.JTable();
        Delete = new javax.swing.JButton();
        Edit = new javax.swing.JButton();
        Add = new javax.swing.JButton();
        Settings = new javax.swing.JButton();

        javax.swing.GroupLayout jFrame1Layout = new javax.swing.GroupLayout(jFrame1.getContentPane());
        jFrame1.getContentPane().setLayout(jFrame1Layout);
        jFrame1Layout.setHorizontalGroup(
            jFrame1Layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
            .addGap(0, 400, Short.MAX_VALUE)
        );
        jFrame1Layout.setVerticalGroup(
            jFrame1Layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
            .addGap(0, 300, Short.MAX_VALUE)
        );

        setDefaultCloseOperation(javax.swing.WindowConstants.EXIT_ON_CLOSE);

        txt.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                txtActionPerformed(evt);
            }
        });

        jScrollPane1.setOpaque(false);

        table.setModel(new javax.swing.table.DefaultTableModel(
            new Object [][] {

            },
            new String [] {
                "ID", "Research Title", "SY-YR", "Status", "Applied", "Strand", "Software", "Webpage", "Provided"
            }
        ));
        jScrollPane1.setViewportView(table);
        if (table.getColumnModel().getColumnCount() > 0) {
            table.getColumnModel().getColumn(0).setMinWidth(0);
            table.getColumnModel().getColumn(0).setPreferredWidth(0);
            table.getColumnModel().getColumn(0).setMaxWidth(0);
        }

        Delete.setIcon(new javax.swing.ImageIcon(getClass().getResource("/Delete-button.png"))); // NOI18N
        Delete.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                DeleteActionPerformed(evt);
            }
        });

        Edit.setIcon(new javax.swing.ImageIcon(getClass().getResource("/Edit-button.png"))); // NOI18N
        Edit.setInheritsPopupMenu(true);
        Edit.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                EditActionPerformed(evt);
            }
        });

        Add.setIcon(new javax.swing.ImageIcon(getClass().getResource("/add-button.png"))); // NOI18N
        Add.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                AddActionPerformed(evt);
            }
        });

        Settings.setIcon(new javax.swing.ImageIcon(getClass().getResource("/settings.jpg"))); // NOI18N
        Settings.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                SettingsActionPerformed(evt);
            }
        });

        javax.swing.GroupLayout layout = new javax.swing.GroupLayout(getContentPane());
        getContentPane().setLayout(layout);
        layout.setHorizontalGroup(
            layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
            .addGroup(layout.createSequentialGroup()
                .addContainerGap()
                .addComponent(Settings, javax.swing.GroupLayout.PREFERRED_SIZE, 43, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.RELATED, javax.swing.GroupLayout.DEFAULT_SIZE, Short.MAX_VALUE)
                .addComponent(Add, javax.swing.GroupLayout.PREFERRED_SIZE, 32, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addGap(18, 18, 18)
                .addComponent(Edit, javax.swing.GroupLayout.PREFERRED_SIZE, 32, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addGap(18, 18, 18)
                .addComponent(Delete, javax.swing.GroupLayout.PREFERRED_SIZE, 32, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addGap(18, 18, 18)
                .addComponent(txt, javax.swing.GroupLayout.PREFERRED_SIZE, 181, javax.swing.GroupLayout.PREFERRED_SIZE))
            .addComponent(jScrollPane1, javax.swing.GroupLayout.Alignment.TRAILING, javax.swing.GroupLayout.DEFAULT_SIZE, 632, Short.MAX_VALUE)
        );
        layout.setVerticalGroup(
            layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
            .addGroup(layout.createSequentialGroup()
                .addGroup(layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
                    .addComponent(Add, javax.swing.GroupLayout.DEFAULT_SIZE, javax.swing.GroupLayout.DEFAULT_SIZE, Short.MAX_VALUE)
                    .addComponent(Delete, javax.swing.GroupLayout.DEFAULT_SIZE, javax.swing.GroupLayout.DEFAULT_SIZE, Short.MAX_VALUE)
                    .addGroup(layout.createSequentialGroup()
                        .addGroup(layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
                            .addComponent(Edit, javax.swing.GroupLayout.PREFERRED_SIZE, 36, javax.swing.GroupLayout.PREFERRED_SIZE)
                            .addComponent(txt, javax.swing.GroupLayout.PREFERRED_SIZE, javax.swing.GroupLayout.DEFAULT_SIZE, javax.swing.GroupLayout.PREFERRED_SIZE))
                        .addGap(0, 0, Short.MAX_VALUE))
                    .addComponent(Settings, javax.swing.GroupLayout.Alignment.TRAILING, javax.swing.GroupLayout.DEFAULT_SIZE, javax.swing.GroupLayout.DEFAULT_SIZE, Short.MAX_VALUE))
                .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.RELATED)
                .addComponent(jScrollPane1, javax.swing.GroupLayout.DEFAULT_SIZE, 395, Short.MAX_VALUE))
        );

        pack();
    }// </editor-fold>//GEN-END:initComponents

    private void txtActionPerformed(java.awt.event.ActionEvent evt) {//GEN-FIRST:event_txtActionPerformed
        if (txt.isSelected()) {
            String selected = txt.getSelectedOption().getName();
            if (selected != null && !selected.isEmpty()) {
                if (selected.equals("Research Title")) {
                    column = "Research Title";
                } else if (selected.equals("SY-YR")) {
                    column = "SY-YR";
                } else if (selected.equals("Strand")) {
                    column = "Strand";
                } else {
                    column = "Research Title"; // fallback
                }
                loadResearchTitles(txt.getText());
            }
        }
    }//GEN-LAST:event_txtActionPerformed

    private void AddActionPerformed(java.awt.event.ActionEvent evt) {//GEN-FIRST:event_AddActionPerformed
        javax.swing.JTextField titleField = new javax.swing.JTextField();
        javax.swing.JTextField syyrField = new javax.swing.JTextField();

        String[] statusOptions = {"Denied", "Pending", "Approved"};
        javax.swing.JComboBox<String> statusBox = new javax.swing.JComboBox<>(statusOptions);

        String[] appliedOptions = {"Yes", "Not Yet", "No"};
        javax.swing.JComboBox<String> appliedBox = new javax.swing.JComboBox<>(appliedOptions);

        String[] strands = {"ICT", "GAS"};
        javax.swing.JComboBox<String> strandBox = new javax.swing.JComboBox<>(strands);

        String[] checkOptions = {"✔", "✘"};
        javax.swing.JComboBox<String> softwareBox = new javax.swing.JComboBox<>(checkOptions);
        javax.swing.JComboBox<String> webpageBox = new javax.swing.JComboBox<>(checkOptions);

        Object[] message = {
            "Research Title:", titleField,
            "SY-YR:", syyrField,
            "Status:", statusBox,
            "Applied:", appliedBox,
            "Strand:", strandBox,
            "Software:", softwareBox,
            "Webpage:", webpageBox
        };

        javax.swing.ImageIcon amaIcon = new javax.swing.ImageIcon(getClass().getResource("/AMA.png"));
        int option = javax.swing.JOptionPane.showConfirmDialog(
            this,
            message,
            "Add Research Title",
            javax.swing.JOptionPane.OK_CANCEL_OPTION,
            javax.swing.JOptionPane.PLAIN_MESSAGE,
            amaIcon
        );

        if (option == javax.swing.JOptionPane.OK_OPTION) {
            String title = titleField.getText().trim();
            String syyr = syyrField.getText().trim();
            
            if (!isValidResearchTitle(title)
                    || !looksLikeAResearchTitle(title)
                    || !isValidSchoolYear(syyr)) {
                return;
            }
            
            String status = (String) statusBox.getSelectedItem();
            String applied = (String) appliedBox.getSelectedItem();
            String strand = (String) strandBox.getSelectedItem();
            String software = (String) softwareBox.getSelectedItem();
            String webpage = (String) webpageBox.getSelectedItem();

            if (title.isEmpty()) {
                javax.swing.JOptionPane.showMessageDialog(this, "Research Title cannot be empty!");
                return;
            }

            String[] bannedWords = {"warren sarap sarap"};
            for (String bad : bannedWords) {
                if (title.toLowerCase().contains(bad)) {
                    javax.swing.JOptionPane.showMessageDialog(this,
                        "Your title contains inappropriate or invalid words. Please rename it.");
                    return;
                }
            }

            try (Connection con = ACLCapp.DBConnection.getMySQLConnection()) {
                if (con == null) {
                    javax.swing.JOptionPane.showMessageDialog(this, "Database connection failed!");
                    return;
                }

                java.sql.Statement st = con.createStatement();
                java.sql.ResultSet rs = st.executeQuery("SELECT `Research Title` FROM research_titles");

                boolean tooSimilar = false;
                String similarTo = "";
                double highestSim = 0.0;

                while (rs.next()) {
                    String existing = rs.getString("Research Title");
                    double sim = SimilarityUtil.similarityScore(title, existing);
                    if (sim > highestSim) {
                        highestSim = sim;
                        similarTo = existing;
                    }
                    if (sim >= 0.7) {
                        tooSimilar = true;
                    }
                }
                rs.close();
                st.close();

                double percent = highestSim * 100.0;
                String msg = String.format("Highest similarity: %.2f%%\nMost similar title:\n\"%s\"", percent, similarTo);

            // --- Confirmation before adding ---
                if (tooSimilar) {
                    int confirm = javax.swing.JOptionPane.showConfirmDialog(
                        this,
                        msg + "\n\n⚠️ This title is " + (int)percent + "% similar to an existing one.\nDo you still want to add it?",
                        "Possible Duplicate",
                        javax.swing.JOptionPane.YES_NO_OPTION,
                        javax.swing.JOptionPane.WARNING_MESSAGE
                    );

                    if (confirm != javax.swing.JOptionPane.YES_OPTION) {
                        javax.swing.JOptionPane.showMessageDialog(this, "Add operation cancelled.");
                        return;
                    }
                } else {
                    javax.swing.JOptionPane.showMessageDialog(this,
                        msg + "\n\n✅ Your title is unique enough. Proceeding to add.");
                }

            // --- Insert only after confirmation ---
                String sql = "INSERT INTO research_titles (`Research Title`, `SY-YR`, Status, Applied, Strand, Software, Webpage) VALUES (?, ?, ?, ?, ?, ?, ?)";
                PreparedStatement ps = con.prepareStatement(sql);
                ps.setString(1, title);
                ps.setString(2, syyr);
                ps.setString(3, status);
                ps.setString(4, applied);
                ps.setString(5, strand);
                ps.setString(6, software);
                ps.setString(7, webpage);
                ps.executeUpdate();
                ps.close();

                javax.swing.JOptionPane.showMessageDialog(this, "✅ Research Title added successfully!");
                loadResearchTitles("");

            } catch (Exception e) {
                e.printStackTrace();
                javax.swing.JOptionPane.showMessageDialog(this, "Error adding research title: " + e.getMessage());
            }
        }
    }//GEN-LAST:event_AddActionPerformed

    private void EditActionPerformed(java.awt.event.ActionEvent evt) {//GEN-FIRST:event_EditActionPerformed
        setDeleteMode(false); 
        table.repaint();
        javax.swing.JOptionPane.showMessageDialog(this, "Switched to EDIT mode. Click row buttons to edit.");
    }//GEN-LAST:event_EditActionPerformed
 
    private void DeleteActionPerformed(java.awt.event.ActionEvent evt) {//GEN-FIRST:event_DeleteActionPerformed
        setDeleteMode(true); // Skibidi Moralidad.
        table.repaint();
        JOptionPane.showMessageDialog(this, "Switched to DELETE mode. Click row buttons to delete."); 
    }//GEN-LAST:event_DeleteActionPerformed

    private void SettingsActionPerformed(java.awt.event.ActionEvent evt) {//GEN-FIRST:event_SettingsActionPerformed
        new SettingsFrame().setVisible(true);
    }//GEN-LAST:event_SettingsActionPerformed
    public void editRow(int row) {
        if (row == -1) {
            javax.swing.JOptionPane.showMessageDialog(this, "Please select a row to edit.");
            return;
        }

        int id = Integer.parseInt(table.getValueAt(row, 0).toString());

        String currentTitle = table.getValueAt(row, 1).toString();
        String currentSY = table.getValueAt(row, 2).toString();
        String currentStatus = table.getValueAt(row, 3).toString();
        String currentApplied = table.getValueAt(row, 4).toString();
        String currentStrand = table.getValueAt(row, 5).toString();
        String currentSoftware = table.getValueAt(row, 6).toString();
        String currentWebpage = table.getValueAt(row, 7).toString();

        JTextField titleField = new JTextField(currentTitle);
        JTextField syyrField = new JTextField(currentSY);

        JComboBox<String> statusBox = new JComboBox<>(new String[]{"Denied", "Pending", "Approved"});
        statusBox.setSelectedItem(currentStatus);

        JComboBox<String> appliedBox = new JComboBox<>(new String[]{"Yes", "Not Yet", "No"});
        appliedBox.setSelectedItem(currentApplied);

        JComboBox<String> strandBox = new JComboBox<>(new String[]{"ICT", "GAS"});
        strandBox.setSelectedItem(currentStrand);

        JComboBox<String> softwareBox = new JComboBox<>(new String[]{"✔", "✘"});
        softwareBox.setSelectedItem(currentSoftware);

        JComboBox<String> webpageBox = new JComboBox<>(new String[]{"✔", "✘"});
        webpageBox.setSelectedItem(currentWebpage);


        Object[] message = {
            "Research Title:", titleField,
            "SY-YR:", syyrField,
            "Status:", statusBox,
            "Applied:", appliedBox,
            "Strand:", strandBox,
            "Software:", softwareBox,
            "Webpage:", webpageBox
        };

        ImageIcon amaIcon = new ImageIcon(getClass().getResource("/AMA.png"));
        int option = JOptionPane.showConfirmDialog(
            this,
            message,
            "Edit Research Title",
            JOptionPane.OK_CANCEL_OPTION,
            JOptionPane.PLAIN_MESSAGE,
            amaIcon
        );

        
        if (option == JOptionPane.OK_OPTION) {
            String title = titleField.getText().trim();
            String syyr = syyrField.getText().trim();

            if (title.isEmpty()) {
                JOptionPane.showMessageDialog(this, "Research Title cannot be empty!");
                return;
            }
            
            if (!looksLikeAResearchTitle(title)) {
                return;
            }

            if (!syyr.matches("\\d{4}-\\d{4}")) {
                JOptionPane.showMessageDialog(this, "SY-YR must be in format YYYY-YYYY");
                return;
            }
            
            if (!confirmIfSimilarTitle(title, id)) {
                return;
            }

            String[] years = syyr.split("-");
            int start = Integer.parseInt(years[0]);
            int end = Integer.parseInt(years[1]);

            if (end != start + 1) {
                JOptionPane.showMessageDialog(this,
                    "SY-YR must be consecutive (e.g., 2024-2025)");
                return;
            }

            try (Connection con = ACLCapp.DBConnection.getMySQLConnection();
                 PreparedStatement ps = con.prepareStatement(
                     "UPDATE research_titles SET `Research Title`=?, `SY-YR`=?, Status=?, Applied=?, Strand=?, Software=?, Webpage=? WHERE ID=?"
                 )) {

                ps.setString(1, title);
                ps.setString(2, syyr);
                ps.setString(3, (String) statusBox.getSelectedItem());
                ps.setString(4, (String) appliedBox.getSelectedItem());
                ps.setString(5, (String) strandBox.getSelectedItem());
                ps.setString(6, (String) softwareBox.getSelectedItem());
                ps.setString(7, (String) webpageBox.getSelectedItem());
                ps.setInt(8, id);

                ps.executeUpdate();
                JOptionPane.showMessageDialog(this, "Research Title updated successfully!");
                loadResearchTitles("");

            } catch (Exception e) {
                e.printStackTrace();
                JOptionPane.showMessageDialog(this, "Error updating research title: " + e.getMessage());
            }
        }
    }
    public void deleteRow(int row) {
        try {
            int id = Integer.parseInt(table.getValueAt(row, 0).toString());
            int confirm = JOptionPane.showConfirmDialog(this, "Are you sure you want to delete this research title?", "Confirm Deletion", JOptionPane.YES_NO_OPTION, JOptionPane.WARNING_MESSAGE);
            if (confirm == JOptionPane.YES_OPTION) {
                try (Connection mysqlCon = ACLCapp.DBConnection.getMySQLConnection();
                    Connection sqliteCon = ACLCapp.DBConnection.getSQLiteConnection()) {

                    String sql = "DELETE FROM research_titles WHERE ID=?";
                    PreparedStatement mysqlPs = mysqlCon.prepareStatement(sql);
                    mysqlPs.setInt(1, id);
                    mysqlPs.executeUpdate();
                    mysqlPs.close();

                    PreparedStatement sqlitePs = sqliteCon.prepareStatement(sql);
                    sqlitePs.setInt(1, id);
                    sqlitePs.executeUpdate();
                    sqlitePs.close();

                    JOptionPane.showMessageDialog(this, "Research Title deleted successfully!");
                    loadResearchTitles("");
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            JOptionPane.showMessageDialog(this, "Error deleting research title: " + e.getMessage());
        }
    }
    /**
     * @param args the command line arguments
     */
    public static void main(String args[]) {
        
        try {
            for (javax.swing.UIManager.LookAndFeelInfo info : javax.swing.UIManager.getInstalledLookAndFeels()) {
                if ("Nimbus".equals(info.getName())) {
                    javax.swing.UIManager.setLookAndFeel(info.getClassName());
                    break;
                }
            }
        } catch (ClassNotFoundException ex) {
            java.util.logging.Logger.getLogger(StudentWindowGUI.class.getName()).log(java.util.logging.Level.SEVERE, null, ex);
        } catch (InstantiationException ex) {
            java.util.logging.Logger.getLogger(StudentWindowGUI.class.getName()).log(java.util.logging.Level.SEVERE, null, ex);
        } catch (IllegalAccessException ex) {
            java.util.logging.Logger.getLogger(StudentWindowGUI.class.getName()).log(java.util.logging.Level.SEVERE, null, ex);
        } catch (javax.swing.UnsupportedLookAndFeelException ex) {
            java.util.logging.Logger.getLogger(StudentWindowGUI.class.getName()).log(java.util.logging.Level.SEVERE, null, ex);
        }
        

        
        java.awt.EventQueue.invokeLater(new Runnable() {
            public void run() {
                new StudentWindowGUI().setVisible(true);
            }
        });
    }
    // Variables declaration - do not modify//GEN-BEGIN:variables
    private javax.swing.JButton Add;
    private javax.swing.JButton Delete;
    private javax.swing.JButton Edit;
    private javax.swing.JButton Settings;
    private javax.swing.JFrame jFrame1;
    private javax.swing.JPopupMenu jPopupMenu1;
    private javax.swing.JScrollPane jScrollPane1;
    private javax.swing.JTable table;
    private textfield.TextFieldSearchOption txt;
    // End of variables declaration//GEN-END:variables
}
