"""
Invoice Creator - Etsy Listing Main Image Generator v2
Enhanced professional 2000x2000 PNG for Etsy listings
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
import math

# Canvas dimensions
WIDTH = 2000
HEIGHT = 2000

# Color palette - Digital Precision
BG_PRIMARY = (13, 17, 23)  # #0d1117 - deep void
BG_SECONDARY = (22, 27, 34)  # #161b22
BG_TERTIARY = (33, 38, 45)  # #21262d
BG_ELEVATED = (40, 46, 56)
ACCENT_BLUE = (88, 166, 255)  # #58a6ff
ACCENT_BLUE_DIM = (56, 139, 253)
ACCENT_GREEN = (63, 185, 80)  # #3fb950
ACCENT_YELLOW = (210, 153, 34)  # #d29922
ACCENT_RED = (248, 81, 73)
TEXT_PRIMARY = (230, 237, 243)  # #e6edf3
TEXT_SECONDARY = (139, 148, 158)  # #8b949e
TEXT_MUTED = (110, 118, 129)
BORDER_COLOR = (48, 54, 61)  # #30363d

# Font paths
FONT_DIR = r"C:\Users\BlueLineScannables\.claude\plugins\cache\anthropic-agent-skills\example-skills\69c0b1a06741\skills\canvas-design\canvas-fonts"

def load_font(name, size):
    """Load a font with fallback"""
    try:
        return ImageFont.truetype(os.path.join(FONT_DIR, name), size)
    except:
        return ImageFont.load_default()

def draw_rounded_rect(draw, xy, radius, fill=None, outline=None, width=1):
    """Draw a rounded rectangle"""
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

def add_shadow_layer(base_img, xy, radius, blur=30, offset=(8, 8), opacity=80):
    """Add drop shadow to a rounded rectangle area"""
    shadow = Image.new('RGBA', base_img.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    x1, y1, x2, y2 = xy
    shadow_draw.rounded_rectangle(
        (x1 + offset[0], y1 + offset[1], x2 + offset[0], y2 + offset[1]),
        radius=radius,
        fill=(0, 0, 0, opacity)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    return Image.alpha_composite(base_img, shadow)

def draw_monitor_mockup(img, draw, x, y, width, height):
    """Draw a modern monitor with stand"""
    # Add shadow first
    img = add_shadow_layer(img, (x, y, x + width, y + height - 60), radius=20, blur=40, offset=(0, 20), opacity=100)
    draw = ImageDraw.Draw(img)

    # Monitor bezel
    bezel = 14
    draw_rounded_rect(draw, (x, y, x + width, y + height - 60), radius=16, fill=(45, 50, 60), outline=(70, 75, 85), width=2)

    # Screen area
    screen_xy = (x + bezel, y + bezel, x + width - bezel, y + height - 60 - bezel)
    draw_rounded_rect(draw, screen_xy, radius=8, fill=BG_PRIMARY)

    # Camera dot
    draw.ellipse((x + width//2 - 4, y + 5, x + width//2 + 4, y + 13), fill=(30, 35, 42))

    # Stand neck
    neck_w = 80
    neck_h = 35
    neck_x = x + width//2 - neck_w//2
    neck_y = y + height - 60
    draw.polygon([
        (neck_x + 10, neck_y),
        (neck_x + neck_w - 10, neck_y),
        (neck_x + neck_w, neck_y + neck_h),
        (neck_x, neck_y + neck_h)
    ], fill=(40, 45, 55))

    # Stand base
    base_w = 200
    base_h = 18
    base_x = x + width//2 - base_w//2
    base_y = y + height - 25
    draw_rounded_rect(draw, (base_x, base_y, base_x + base_w, base_y + base_h), radius=8, fill=(45, 50, 60), outline=(60, 65, 75), width=1)

    # Return screen area for content
    return img, (screen_xy[0] + 15, screen_xy[1] + 15, screen_xy[2] - screen_xy[0] - 30, screen_xy[3] - screen_xy[1] - 30)

def draw_app_interface(draw, x, y, w, h, fonts):
    """Draw realistic Invoice Creator interface"""

    # Navigation bar
    nav_h = 50
    draw_rounded_rect(draw, (x, y, x + w, y + nav_h), radius=0, fill=BG_SECONDARY)

    # App name with icon
    draw.ellipse((x + 12, y + 16, x + 24, y + 34), fill=ACCENT_BLUE)
    draw.text((x + 32, y + 13), "Invoice Creator", font=fonts['nav_title'], fill=TEXT_PRIMARY)

    # Nav items
    nav_items = ["Dashboard", "Invoices", "Clients", "Items", "Settings"]
    nav_x = x + 200
    for item in nav_items:
        is_active = item == "Dashboard"
        color = TEXT_PRIMARY if is_active else TEXT_SECONDARY
        if is_active:
            bbox = draw.textbbox((0, 0), item, font=fonts['nav_item'])
            item_w = bbox[2] - bbox[0]
            draw_rounded_rect(draw, (nav_x - 8, y + 10, nav_x + item_w + 8, y + 40), radius=6, fill=BG_ELEVATED)
        draw.text((nav_x, y + 15), item, font=fonts['nav_item'], fill=color)
        nav_x += 90

    # Quick stats in nav
    stats_x = x + w - 180
    draw_rounded_rect(draw, (stats_x, y + 10, stats_x + 165, y + 40), radius=6, fill=BG_TERTIARY)
    draw.text((stats_x + 10, y + 14), "$9,875", font=fonts['mono_sm'], fill=ACCENT_GREEN)
    draw.text((stats_x + 85, y + 18), "collected", font=fonts['tiny'], fill=TEXT_MUTED)

    content_y = y + nav_h + 20

    # Main content area
    draw.text((x + 20, content_y), "Dashboard", font=fonts['page_title'], fill=TEXT_PRIMARY)
    content_y += 50

    # Stats cards - 4 columns
    card_gap = 15
    card_w = (w - 40 - card_gap * 3) // 4
    card_h = 90

    stats_data = [
        ("Total Billed", "$12,450", "all time", ACCENT_BLUE, None),
        ("Collected", "$9,875", "+$2,340 this month", ACCENT_GREEN, "▲"),
        ("Outstanding", "$2,575", "3 invoices", ACCENT_YELLOW, None),
        ("Overdue", "$425", "1 invoice", ACCENT_RED, "!"),
    ]

    for i, (label, value, sub, color, icon) in enumerate(stats_data):
        cx = x + 20 + i * (card_w + card_gap)

        # Card background
        draw_rounded_rect(draw, (cx, content_y, cx + card_w, content_y + card_h), radius=10, fill=BG_SECONDARY, outline=BORDER_COLOR, width=1)

        # Accent line at top
        draw.rectangle((cx + 15, content_y + 8, cx + 45, content_y + 11), fill=color)

        # Label
        draw.text((cx + 15, content_y + 20), label, font=fonts['card_label'], fill=TEXT_SECONDARY)

        # Value with icon
        if icon:
            draw.text((cx + 15, content_y + 42), icon, font=fonts['small'], fill=color)
            draw.text((cx + 32, content_y + 40), value, font=fonts['card_value'], fill=color)
        else:
            draw.text((cx + 15, content_y + 40), value, font=fonts['card_value'], fill=color)

        # Sub text
        draw.text((cx + 15, content_y + 68), sub, font=fonts['tiny'], fill=TEXT_MUTED)

    content_y += card_h + 25

    # Recent Invoices section
    section_w = w * 0.62 - 30

    draw_rounded_rect(draw, (x + 20, content_y, x + 20 + section_w, content_y + 280), radius=10, fill=BG_SECONDARY, outline=BORDER_COLOR, width=1)

    draw.text((x + 35, content_y + 15), "Recent Invoices", font=fonts['section_title'], fill=TEXT_PRIMARY)

    # Table header
    table_y = content_y + 50
    header_items = [("Invoice", 0), ("Client", 110), ("Date", 250), ("Amount", 340), ("Status", 420)]
    for label, offset in header_items:
        draw.text((x + 35 + offset, table_y), label, font=fonts['table_header'], fill=TEXT_MUTED)

    table_y += 28
    draw.line([(x + 35, table_y), (x + 20 + section_w - 15, table_y)], fill=BORDER_COLOR, width=1)
    table_y += 10

    # Invoice rows
    invoices = [
        ("INV-2025-042", "Smith & Co.", "Jan 22", "$1,250.00", "Paid", ACCENT_GREEN),
        ("INV-2025-041", "Tech Solutions LLC", "Jan 20", "$3,400.00", "Paid", ACCENT_GREEN),
        ("INV-2025-040", "Design Studio", "Jan 18", "$875.00", "Pending", ACCENT_YELLOW),
        ("INV-2025-039", "Local Bakery", "Jan 15", "$425.00", "Overdue", ACCENT_RED),
        ("INV-2025-038", "Metro Services", "Jan 12", "$2,100.00", "Paid", ACCENT_GREEN),
    ]

    for inv_num, client, date, amount, status, status_color in invoices:
        # Row hover effect (subtle)
        if status == "Overdue":
            draw.rectangle((x + 25, table_y - 2, x + 20 + section_w - 10, table_y + 32), fill=(248, 81, 73, 8))

        draw.text((x + 35, table_y + 6), inv_num, font=fonts['mono_table'], fill=ACCENT_BLUE)
        draw.text((x + 145, table_y + 6), client[:16], font=fonts['table_cell'], fill=TEXT_PRIMARY)
        draw.text((x + 285, table_y + 6), date, font=fonts['table_cell'], fill=TEXT_SECONDARY)
        draw.text((x + 375, table_y + 6), amount, font=fonts['mono_table'], fill=TEXT_PRIMARY)

        # Status badge
        badge_x = x + 455
        draw_rounded_rect(draw, (badge_x, table_y + 4, badge_x + 60, table_y + 26), radius=12, fill=(*status_color, 30))
        draw.text((badge_x + 8, table_y + 6), status, font=fonts['badge'], fill=status_color)

        table_y += 40

    # Quick Actions panel
    actions_x = x + 20 + section_w + 15
    actions_w = w - section_w - 55

    draw_rounded_rect(draw, (actions_x, content_y, actions_x + actions_w, content_y + 130), radius=10, fill=BG_SECONDARY, outline=BORDER_COLOR, width=1)

    draw.text((actions_x + 15, content_y + 15), "Quick Actions", font=fonts['section_title'], fill=TEXT_PRIMARY)

    actions = [
        ("+ New Invoice", ACCENT_BLUE),
        ("+ Add Client", ACCENT_GREEN),
        ("+ Add Item", TEXT_SECONDARY),
    ]

    btn_y = content_y + 50
    for label, color in actions:
        draw_rounded_rect(draw, (actions_x + 15, btn_y, actions_x + actions_w - 15, btn_y + 30), radius=6, fill=BG_TERTIARY, outline=color, width=1)
        draw.text((actions_x + 25, btn_y + 6), label, font=fonts['button'], fill=color)
        btn_y += 38

    # Low Stock Alert
    alert_y = content_y + 145
    draw_rounded_rect(draw, (actions_x, alert_y, actions_x + actions_w, alert_y + 135), radius=10, fill=BG_SECONDARY, outline=ACCENT_YELLOW, width=1)

    draw.text((actions_x + 15, alert_y + 12), "Low Stock Alert", font=fonts['section_title'], fill=ACCENT_YELLOW)

    low_items = [
        ("Blank Knives", "3 left", "reorder: 5"),
        ("Gift Boxes", "2 left", "reorder: 10"),
    ]

    item_y = alert_y + 45
    for name, qty, reorder in low_items:
        draw.text((actions_x + 15, item_y), name, font=fonts['small'], fill=TEXT_PRIMARY)
        draw.text((actions_x + 15, item_y + 18), qty, font=fonts['tiny'], fill=ACCENT_YELLOW)
        draw.text((actions_x + 70, item_y + 18), reorder, font=fonts['tiny'], fill=TEXT_MUTED)
        item_y += 45

def create_image():
    """Create the main Etsy listing image"""

    # Create base image
    img = Image.new('RGBA', (WIDTH, HEIGHT), BG_PRIMARY)
    draw = ImageDraw.Draw(img)

    # Subtle gradient background
    for y in range(HEIGHT):
        # Top glow
        if y < 400:
            alpha = int(20 * (1 - y / 400))
            for x in range(WIDTH):
                dist_from_center = abs(x - WIDTH // 2) / (WIDTH // 2)
                pixel_alpha = int(alpha * (1 - dist_from_center * 0.7))
                if pixel_alpha > 0:
                    draw.point((x, y), fill=(*ACCENT_BLUE[:3], pixel_alpha))

    # Load fonts
    fonts = {
        'hero': load_font('BigShoulders-Bold.ttf', 140),
        'tagline': load_font('InstrumentSans-Regular.ttf', 38),
        'nav_title': load_font('InstrumentSans-Bold.ttf', 18),
        'nav_item': load_font('InstrumentSans-Regular.ttf', 14),
        'page_title': load_font('InstrumentSans-Bold.ttf', 28),
        'section_title': load_font('InstrumentSans-Bold.ttf', 16),
        'card_label': load_font('InstrumentSans-Regular.ttf', 12),
        'card_value': load_font('JetBrainsMono-Bold.ttf', 24),
        'table_header': load_font('InstrumentSans-Bold.ttf', 11),
        'table_cell': load_font('InstrumentSans-Regular.ttf', 13),
        'mono_table': load_font('JetBrainsMono-Regular.ttf', 12),
        'mono_sm': load_font('JetBrainsMono-Bold.ttf', 14),
        'small': load_font('InstrumentSans-Regular.ttf', 13),
        'tiny': load_font('InstrumentSans-Regular.ttf', 10),
        'badge': load_font('InstrumentSans-Bold.ttf', 10),
        'button': load_font('InstrumentSans-Regular.ttf', 12),
        'feature': load_font('InstrumentSans-Bold.ttf', 22),
        'feature_desc': load_font('InstrumentSans-Regular.ttf', 14),
    }

    # Hero title
    title = "INVOICE CREATOR"
    bbox = draw.textbbox((0, 0), title, font=fonts['hero'])
    title_w = bbox[2] - bbox[0]
    title_x = (WIDTH - title_w) // 2
    title_y = 70

    # Title glow
    glow_layer = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    glow_draw.text((title_x, title_y), title, font=fonts['hero'], fill=(*ACCENT_BLUE[:3], 60))
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(15))
    img = Image.alpha_composite(img, glow_layer)
    draw = ImageDraw.Draw(img)

    draw.text((title_x, title_y), title, font=fonts['hero'], fill=TEXT_PRIMARY)

    # Tagline
    tagline = "Professional Invoice Management for Small Business"
    bbox = draw.textbbox((0, 0), tagline, font=fonts['tagline'])
    tag_w = bbox[2] - bbox[0]
    draw.text(((WIDTH - tag_w) // 2, 220), tagline, font=fonts['tagline'], fill=TEXT_SECONDARY)

    # Monitor with app
    monitor_w = 1500
    monitor_h = 950
    monitor_x = (WIDTH - monitor_w) // 2
    monitor_y = 300

    img, screen_area = draw_monitor_mockup(img, draw, monitor_x, monitor_y, monitor_w, monitor_h)
    draw = ImageDraw.Draw(img)

    # Draw app interface
    draw_app_interface(draw, screen_area[0], screen_area[1], screen_area[2], screen_area[3], fonts)

    # Feature cards at bottom
    features = [
        ("Invoice Management", "Create & track invoices", ACCENT_BLUE),
        ("Client Database", "Store client info", ACCENT_GREEN),
        ("Inventory Control", "Track stock levels", ACCENT_YELLOW),
    ]

    feature_y = 1350
    card_w = 380
    card_h = 80
    total_w = len(features) * card_w + (len(features) - 1) * 30
    start_x = (WIDTH - total_w) // 2

    for i, (title, desc, color) in enumerate(features):
        fx = start_x + i * (card_w + 30)

        # Card with accent border
        draw_rounded_rect(draw, (fx, feature_y, fx + card_w, feature_y + card_h), radius=12, fill=BG_SECONDARY, outline=color, width=2)

        # Icon circle
        draw.ellipse((fx + 18, feature_y + 22, fx + 54, feature_y + 58), fill=(*color, 40))
        draw.ellipse((fx + 24, feature_y + 28, fx + 48, feature_y + 52), fill=color)

        # Checkmark
        check_points = [(fx + 31, feature_y + 40), (fx + 36, feature_y + 46), (fx + 44, feature_y + 36)]
        draw.line(check_points[:2], fill=BG_PRIMARY, width=3)
        draw.line(check_points[1:], fill=BG_PRIMARY, width=3)

        # Text
        draw.text((fx + 70, feature_y + 18), title, font=fonts['feature'], fill=TEXT_PRIMARY)
        draw.text((fx + 70, feature_y + 48), desc, font=fonts['feature_desc'], fill=TEXT_SECONDARY)

    # Bottom tagline
    tagline2 = "Simple. Professional. Powerful."
    bbox = draw.textbbox((0, 0), tagline2, font=fonts['tagline'])
    tag_w = bbox[2] - bbox[0]
    draw.text(((WIDTH - tag_w) // 2, 1480), tagline2, font=fonts['tagline'], fill=TEXT_MUTED)

    # Digital Download badge (top right)
    badge_font = load_font('InstrumentSans-Bold.ttf', 14)
    badge_text = "DIGITAL DOWNLOAD"
    bbox = draw.textbbox((0, 0), badge_text, font=badge_font)
    badge_w = bbox[2] - bbox[0] + 24
    badge_x = WIDTH - badge_w - 60
    badge_y = 60
    draw_rounded_rect(draw, (badge_x, badge_y, badge_x + badge_w, badge_y + 32), radius=16, fill=ACCENT_GREEN)
    draw.text((badge_x + 12, badge_y + 6), badge_text, font=badge_font, fill=BG_PRIMARY)

    # Footer info
    footer_font = load_font('InstrumentSans-Regular.ttf', 14)
    mono_font = load_font('JetBrainsMono-Regular.ttf', 13)

    draw.text((60, HEIGHT - 60), "Windows 10+", font=footer_font, fill=TEXT_MUTED)

    brand = "Blue Line Scannables"
    bbox = draw.textbbox((0, 0), brand, font=footer_font)
    draw.text(((WIDTH - (bbox[2] - bbox[0])) // 2, HEIGHT - 60), brand, font=footer_font, fill=TEXT_SECONDARY)

    draw.text((WIDTH - 100, HEIGHT - 60), "v1.3.3", font=mono_font, fill=TEXT_MUTED)

    # Decorative corner elements
    for cx, cy in [(40, 40), (WIDTH - 70, 40), (40, HEIGHT - 100), (WIDTH - 70, HEIGHT - 100)]:
        for i in range(3):
            for j in range(3):
                alpha = 40 - (i + j) * 8
                draw.ellipse((cx + i*12, cy + j*12, cx + i*12 + 4, cy + j*12 + 4), fill=(*ACCENT_BLUE[:3], max(alpha, 10)))

    # Convert to RGB
    final = Image.new('RGB', (WIDTH, HEIGHT), BG_PRIMARY)
    final.paste(img, mask=img.split()[3] if img.mode == 'RGBA' else None)

    return final

if __name__ == "__main__":
    output_dir = r"C:\Users\BlueLineScannables\Desktop\Invoice Creator\etsy-assets"
    os.makedirs(output_dir, exist_ok=True)

    print("Creating enhanced Etsy listing image...")
    img = create_image()

    output_path = os.path.join(output_dir, "etsy-listing-main.png")
    img.save(output_path, "PNG", optimize=True)
    print(f"Saved to: {output_path}")

    file_size = os.path.getsize(output_path)
    print(f"File size: {file_size / 1024 / 1024:.2f} MB")
    print(f"Dimensions: {img.size[0]}x{img.size[1]}")
