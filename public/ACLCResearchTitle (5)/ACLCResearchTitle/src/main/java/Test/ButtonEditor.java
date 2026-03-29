package Test;

import java.awt.Component;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import javax.swing.AbstractCellEditor;
import javax.swing.JButton;
import javax.swing.JTable;
import javax.swing.table.TableCellEditor;

public class ButtonEditor extends AbstractCellEditor implements TableCellEditor {
    private final JButton button;
    private final StudentWindowGUI parent;
    private int row;

    public ButtonEditor(JTable table, StudentWindowGUI parent) {
        this.parent = parent;
        this.button = new JButton();

        button.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                fireEditingStopped();
                if (parent.isDeleteMode()) {
                    parent.deleteRow(row);
                } else {
                    parent.editRow(row);
                }
            }
        });
    }

    @Override
    public Component getTableCellEditorComponent(JTable table, Object value, boolean isSelected, int row, int column) {
        this.row = row;
        button.setText(parent.isDeleteMode() ? "Delete" : "Edit");
        return button;
    }

    @Override
    public Object getCellEditorValue() {
        return null;
    }
}