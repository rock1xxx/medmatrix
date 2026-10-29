package com.medmatrix.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import org.junit.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.xml.parsers.DocumentBuilderFactory;

/**
 * Guards the two rules that decide whether a home screen widget can be inflated at all.
 *
 * <p>1. Every view class in a widget layout must be annotated
 * {@code @android.widget.RemoteViews.RemoteView}. {@code RemoteViews} inflates widget
 * layouts through a {@code LayoutInflater} whose filter is literally
 * {@code clazz.isAnnotationPresent(RemoteViews.RemoteView.class)}, and a rejected class
 * throws {@code InflateException: Class not allowed to be inflated ...} inside the
 * launcher. The user sees "Couldn't add widget" or "Problem loading widget" and the
 * widget never renders. A bare {@code <View>} is the classic offender: it is not
 * annotated, so it breaks the entire widget even when it is only used as a 1dp divider.
 *
 * <p>2. Every id the providers touch must exist in the layout being inflated, otherwise
 * {@code RemoteViews} silently drops the action and the widget renders placeholder text.
 *
 * <p>This is a plain JVM test: it needs no Android SDK, no emulator and no Robolectric,
 * so it runs in CI on every push.
 */
public class WidgetLayoutCompatibilityTest {

    /**
     * Classes RemoteViews is allowed to inflate, from the {@code @RemoteView} annotation and
     * the supported-view list in {@link android.widget.RemoteViews}. Anything not listed
     * here makes the launcher reject the whole layout.
     */
    private static final Set<String> REMOTE_VIEW_CLASSES = new HashSet<>(Arrays.asList(
            // layouts
            "FrameLayout", "LinearLayout", "RelativeLayout", "GridLayout",
            "AdapterViewFlipper", "GridView", "ListView", "StackView", "ViewFlipper",
            // widgets
            "TextView", "ImageView", "Button", "ImageButton", "ProgressBar",
            "Chronometer", "AnalogClock", "TextClock",
            // API 31+
            "CheckBox", "RadioButton", "RadioGroup", "Switch"));

    private static final Pattern DRAWABLE_REF =
            Pattern.compile("@drawable/([A-Za-z0-9_]+)");
    private static final Pattern LAYOUT_REF =
            Pattern.compile("@layout/([A-Za-z0-9_]+)");

    @Test
    public void widgetLayoutsOnlyUseRemoteViewsClasses() throws Exception {
        List<String> problems = new ArrayList<>();

        for (File layout : widgetLayouts()) {
            Document document = parse(layout);
            checkElementTree(document.getDocumentElement(), layout.getName(), problems);
        }

        if (!problems.isEmpty()) {
            fail("Widget layouts contain views RemoteViews cannot inflate. In the launcher "
                    + "this throws InflateException and the widget shows "
                    + "\"Couldn't add widget\". Use ImageView/FrameLayout instead of a bare "
                    + "<View> for dividers and background layers.\n  - "
                    + String.join("\n  - ", problems));
        }
    }

    @Test
    public void everyDrawableReferencedByAWidgetLayoutExists() throws Exception {
        File res = new File(layoutDir(), "..");
        List<String> problems = new ArrayList<>();

        for (File layout : widgetLayouts()) {
            Matcher matcher = DRAWABLE_REF.matcher(read(layout));
            while (matcher.find()) {
                String name = matcher.group(1);
                if (!drawableExists(res, name)) {
                    problems.add(layout.getName() + " references @drawable/" + name
                            + ", which does not exist");
                }
            }
        }

        assertTrue(String.join("\n", problems), problems.isEmpty());
    }

    @Test
    public void everyWidgetInfoPointsAtARealInitialLayout() throws Exception {
        File xmlDir = new File(layoutDir(), "../xml");
        File[] infos = xmlDir.listFiles((dir, name) -> name.endsWith("_info.xml"));
        assertNotNull("No appwidget-provider xml files found in " + xmlDir, infos);
        assertTrue("No appwidget-provider xml files found in " + xmlDir, infos.length > 0);

        Set<String> knownLayouts = new HashSet<>();
        for (File layout : widgetLayouts()) {
            knownLayouts.add(layout.getName().replace(".xml", ""));
        }

        for (File info : infos) {
            Matcher matcher = LAYOUT_REF.matcher(read(info));
            assertTrue(info.getName() + " has no android:initialLayout", matcher.find());
            String layoutName = matcher.group(1);
            assertTrue(info.getName() + " points at @layout/" + layoutName
                            + ", which does not exist",
                    knownLayouts.contains(layoutName));
        }
    }

    @Test
    public void fourByOneLayoutsExposeEveryIdTheProviderSets() throws Exception {
        // Every id build4x1Views() touches. A missing one leaves the widget on its
        // placeholder text with no error shown to the user.
        String[] shared = {
                "widget_container", "widget_bg", "widget_row",
                "widget_label_left", "widget_label_right",
                "widget_center_divider",
                "widget_mcq_ch1", "widget_mcq_ch2",
                "widget_video_ch1", "widget_video_ch2",
        };

        for (String name : new String[]{
                "widget_4x1_layout", "widget_4x1_typo_layout", "widget_4x1_dense_layout"}) {
            Document document = parse(new File(layoutDir(), name + ".xml"));

            for (String id : shared) {
                assertNotNull(name + " is missing @id/" + id, findById(document, id));
            }

            // The dense design prints a third row per half.
            if ("widget_4x1_dense_layout".equals(name)) {
                assertNotNull(name + " is missing @id/widget_mcq_ch3",
                        findById(document, "widget_mcq_ch3"));
                assertNotNull(name + " is missing @id/widget_video_ch3",
                        findById(document, "widget_video_ch3"));
            }
        }
    }

    @Test
    public void backgroundAndDividerAreNotBareViews() throws Exception {
        // Regression guard: these two were plain <View> elements, which broke only the
        // 4x1 widget on the device while every other size kept working.
        for (String name : new String[]{
                "widget_4x1_layout", "widget_4x1_typo_layout", "widget_4x1_dense_layout"}) {
            Document document = parse(new File(layoutDir(), name + ".xml"));

            assertEquals(name + ": widget_bg must stay an ImageView",
                    "ImageView", tagOf(findById(document, "widget_bg")));
            assertEquals(name + ": widget_center_divider must stay an ImageView",
                    "ImageView", tagOf(findById(document, "widget_center_divider")));
        }
    }

    // ---------------------------------------------------------------- helpers

    private static void checkElementTree(Element element, String fileName, List<String> problems) {
        String tag = tagOf(element);
        if (!REMOTE_VIEW_CLASSES.contains(tag)) {
            problems.add(fileName + ": <" + tag + "> is not a @RemoteView class"
                    + (element.hasAttribute("android:id")
                    ? " (id " + element.getAttribute("android:id") + ")" : ""));
        }

        NodeList children = element.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Node child = children.item(i);
            if (child.getNodeType() == Node.ELEMENT_NODE) {
                checkElementTree((Element) child, fileName, problems);
            }
        }
    }

    private static String tagOf(Element element) {
        if (element == null) return null;
        String tag = element.getTagName();
        int dot = tag.lastIndexOf('.');
        return dot >= 0 ? tag.substring(dot + 1) : tag;
    }

    private static Element findById(Document document, String id) {
        NodeList all = document.getElementsByTagName("*");
        for (int i = 0; i < all.getLength(); i++) {
            Element element = (Element) all.item(i);
            NamedNodeMap attributes = element.getAttributes();
            for (int a = 0; a < attributes.getLength(); a++) {
                Node attribute = attributes.item(a);
                String value = attribute.getNodeValue();
                if (value != null && value.equals("@+id/" + id)) {
                    return element;
                }
            }
        }
        return null;
    }

    private static boolean drawableExists(File res, String name) {
        File[] dirs = res.listFiles((dir, fileName) ->
                fileName.equals("drawable") || fileName.startsWith("drawable-"));
        if (dirs == null) return false;

        for (File dir : dirs) {
            File[] hits = dir.listFiles((d, fileName) ->
                    fileName.equals(name + ".xml")
                            || fileName.equals(name + ".png")
                            || fileName.equals(name + ".webp")
                            || fileName.equals(name + ".jpg"));
            if (hits != null && hits.length > 0) return true;
        }
        return false;
    }

    private static List<File> widgetLayouts() {
        File[] files = layoutDir().listFiles((dir, name) ->
                name.startsWith("widget_") && name.endsWith(".xml"));
        assertNotNull("Could not list layouts in " + layoutDir(), files);

        List<File> layouts = new ArrayList<>(Arrays.asList(files));
        Collections.sort(layouts, (a, b) -> a.getName().compareTo(b.getName()));
        assertTrue("No widget_*.xml layouts found in " + layoutDir(), !layouts.isEmpty());
        return layouts;
    }

    /**
     * Gradle runs unit tests with the module directory as the working directory, but this
     * also tolerates being run from the repository root.
     */
    private static File layoutDir() {
        File module = new File("src/main/res/layout");
        if (module.isDirectory()) return module;

        File repoRoot = new File("android/app/src/main/res/layout");
        if (repoRoot.isDirectory()) return repoRoot;

        File walk = new File("").getAbsoluteFile();
        for (int depth = 0; depth < 6 && walk != null; depth++) {
            File candidate = new File(walk, "android/app/src/main/res/layout");
            if (candidate.isDirectory()) return candidate;
            walk = walk.getParentFile();
        }

        throw new IllegalStateException(
                "Could not locate src/main/res/layout from " + new File("").getAbsolutePath());
    }

    private static String read(File file) throws Exception {
        try (java.io.InputStream in = new java.io.FileInputStream(file)) {
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int len;
            while ((len = in.read(buffer)) != -1) out.write(buffer, 0, len);
            return new String(out.toByteArray(), java.nio.charset.StandardCharsets.UTF_8);
        }
    }

    private static Document parse(File file) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(false);
        return factory.newDocumentBuilder().parse(file);
    }
}
