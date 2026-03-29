package Test;

import java.awt.Component;
import javax.swing.JButton;
import javax.swing.JTable;
import javax.swing.table.TableCellRenderer;

public class ButtonRenderer extends JButton implements TableCellRenderer {

    private final StudentWindowGUI parent;

    public ButtonRenderer(StudentWindowGUI parent) {
        this.parent = parent;
        setOpaque(true);
    }

    @Override
    public Component getTableCellRendererComponent(JTable table, Object value,
                                                   boolean isSelected, boolean hasFocus,
                                                   int row, int column) {
        if (parent.isDeleteMode()) {
            setText("Delete");
        } else {
            setText("Edit");
        }
        return this;
    }
}