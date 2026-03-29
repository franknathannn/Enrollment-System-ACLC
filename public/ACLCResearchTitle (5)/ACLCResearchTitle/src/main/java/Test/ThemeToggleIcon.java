package Test;

import com.formdev.flatlaf.extras.FlatSVGIcon;
import com.formdev.flatlaf.ui.FlatUIUtils;
import com.formdev.flatlaf.util.AnimatedIcon;
import com.formdev.flatlaf.util.ColorFunctions;
import com.formdev.flatlaf.util.UIScale;

import java.awt.AlphaComposite;
import java.awt.Color;
import java.awt.Component;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Rectangle;
import java.awt.geom.RoundRectangle2D;
import javax.swing.AbstractButton;
import javax.swing.Icon;
import javax.swing.JComponent;

public class ThemeToggleIcon implements AnimatedIcon {

    private int iconGap = 3;
    private int centerSpace = 5;

    private Icon darkIcon  = new FlatSVGIcon("dark.svg", 16, 16);

    private Icon lightIcon = new FlatSVGIcon("light.svg", 16, 16);

    private Color darkColor = new Color(80, 80, 80);
    private Color lightColor = new Color(230, 230, 230);

    private float getBorderArc(Component c) {
        if (c instanceof JComponent jc) {
            return FlatUIUtils.getBorderArc(jc);
        }
        return 0f;
    }

    @Override
    public int getAnimationDuration() {
        return 500;
    }

    @Override
    public void paintIconAnimated(Component c, Graphics g, int x, int y, float animatedValue) {
        Graphics2D g2 = (Graphics2D) g.create();
        FlatUIUtils.setRenderingHints(g2);

        Color color = ColorFunctions.mix(darkColor, lightColor, animatedValue);

        int size = getIconHeight();
        int width = getIconWidth();
        float arc = Math.min(getBorderArc(c), size);
        float animatedX = x + (width - size) * animatedValue;

        g2.setColor(color);
        g2.fill(new RoundRectangle2D.Float(animatedX, y, size, size, arc, arc));

        float darkY = y - size + animatedValue * size;
        float lightY = y + animatedValue * size;

        g2.setClip(new Rectangle(x, y, width, size));

        paintIcon(c, (Graphics2D) g2.create(), animatedX, darkY, darkIcon, animatedValue);
        paintIcon(c, (Graphics2D) g2.create(), animatedX, lightY, lightIcon, 1f - animatedValue);

        g2.dispose();
    }

    private void paintIcon(Component c, Graphics2D g, float x, float y, Icon icon, float alpha) {
        int gap = UIScale.scale(iconGap);
        g.translate(x, y);
        g.setComposite(AlphaComposite.SrcOver.derive(alpha));
        icon.paintIcon(c, g, gap, gap);
        g.dispose();
    }

    @Override
    public float getValue(Component c) {
        if (c instanceof AbstractButton btn) {
            return btn.isSelected() ? 1f : 0f;
        }
        return 0f;
    }

    @Override
    public int getIconWidth() {
        return darkIcon.getIconWidth()
                + lightIcon.getIconWidth()
                + UIScale.scale(centerSpace)
                + UIScale.scale(iconGap) * 4;
    }

    @Override
    public int getIconHeight() {
        return Math.max(
                darkIcon.getIconHeight(),
                lightIcon.getIconHeight()
        ) + UIScale.scale(iconGap) * 2;
    }
}