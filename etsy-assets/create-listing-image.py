"""
Invoice Creator - Etsy Listing Main Image Generator
Creates a professional 2000x2000 PNG for Etsy listings
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

# Canvas dimensions
WIDTH = 2000
HEIGHT = 2000

# Color palette - Digital Precision
BG_PRIMARY = (13, 17, 23)  # #0d1117 - deep void
BG_SECONDARY = (22, 27, 34)  # #161b22
BG_TERTIARY = (33, 38, 45)  # #21262d
ACCENT_BLUE = (88, 166, 255)  # #58a6ff
ACCENT_GREEN = (63, 185, 80)  # #3fb950
ACCENT_YELLOW = (210, 153, 34)  # #d29922
TEXT_PRIMARY = (230, 237, 243)  # #e6edf3
TEXT_SECONDARY = (139, 148, 158)  # #8b949e
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
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

def draw_glow(img, xy, radius, color, blur_radius=20):
    """Add a subtle glow effect"""
    glow = Image.new('RGBA', img.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    x1, y1, x2, y2 = xy
    # Draw multiple layers for glow
    for i in range(3):
        alpha = 30 - i * 10
        glow_draw.rounded_rectangle(
            (x1 - i*5, y1 - i*5, x2 + i*5, y2 + i*5),
            radius=radius + i*5,
            fill=(*color[:3], alpha)
        )
    glow = glow.filter(ImageFilter.GaussianBlur(blur_radius))
    return Image.alpha_composite(img, glow)

def create_laptop_mockup(draw, x, y, width, height):
    """Draw a minimalist laptop frame"""
    # Screen bezel
    bezel_thickness = 12
    screen_x = x + bezel_thickness
    screen_y = y + bezel_thickness
    screen_w = width - bezel_thickness * 2
    screen_h = height - bezel_thickness * 2 - 30  # Leave room for base

    # Outer laptop frame
    draw_rounded_rect(draw, (x, y, x + width, y + height - 30), radius=15, fill=(40, 44, 52), outline=(60, 65, 75), width=2)

    # Screen area (will be filled with UI)
    draw_rounded_rect(draw, (screen_x, screen_y, screen_x + screen_w, screen_y + screen_h), radius=8, fill=BG_PRIMARY)

    # Laptop base
    base_y = y + height - 30
    draw.polygon([
        (x - 40, base_y + 30),
        (x + 20, base_y),
        (x + width - 20, base_y),
        (x + width + 40, base_y + 30)
    ], fill=(35, 39, 47))

    # Trackpad hint
    draw_rounded_rect(draw, (x + width//2 - 60, base_y + 8, x + width//2 + 60, base_y + 22), radius=3, fill=(45, 50, 58))

    return (screen_x + 10, screen_y + 10, screen_w - 20, screen_h - 20)

def draw_dashboard_ui(draw, x, y, w, h, fonts):
    """Draw the Invoice Creator dashboard interface"""

    # Header bar
    header_h = 45
    draw_rounded_rect(draw, (x, y, x + w, y + header_h), radius=6, fill=BG_SECONDARY)

    # App title in header
    draw.text((x + 15, y + 10), "Invoice Creator", font=fonts['title_sm'], fill=TEXT_PRIMARY)

    # Nav dots (traffic lights style)
    for i, color in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        draw.ellipse((x + w - 80 + i*22, y + 15, x + w - 65 + i*22, y + 30), fill=color)

    content_y = y + header_h + 15
    content_x = x + 15
    content_w = w - 30

    # Dashboard title
    draw.text((content_x, content_y), "Dashboard", font=fonts['heading'], fill=TEXT_PRIMARY)
    content_y += 40

    # Stats cards row
    card_w = (content_w - 30) // 4
    card_h = 70

    stats = [
        ("Total Billed", "$12,450.00", ACCENT_BLUE),
        ("Collected", "$9,875.00", ACCENT_GREEN),
        ("This Month", "$2,340.00", ACCENT_GREEN),
        ("Unpaid", "$2,575.00", ACCENT_YELLOW),
    ]

    for i, (label, value, color) in enumerate(stats):
        cx = content_x + i * (card_w + 10)
        draw_rounded_rect(draw, (cx, content_y, cx + card_w, content_y + card_h), radius=8, fill=BG_SECONDARY, outline=BORDER_COLOR, width=1)
        draw.text((cx + 10, content_y + 8), label, font=fonts['small'], fill=TEXT_SECONDARY)
        draw.text((cx + 10, content_y + 30), value, font=fonts['mono_lg'], fill=color)

    content_y += card_h + 20

    # Recent Invoices section
    draw.text((content_x, content_y), "Recent Invoices", font=fonts['subheading'], fill=TEXT_PRIMARY)
    content_y += 30

    # Invoice table header
    draw_rounded_rect(draw, (content_x, content_y, content_x + content_w, content_y + 28), radius=4, fill=BG_TERTIARY)

    cols = ["Invoice #", "Client", "Amount", "Status"]
    col_positions = [content_x + 10, content_x + 120, content_x + 280, content_x + 380]
    for col, pos in zip(cols, col_positions):
        draw.text((pos, content_y + 6), col, font=fonts['small_bold'], fill=TEXT_SECONDARY)

    content_y += 35

    # Invoice rows
    invoices = [
        ("INV-2025-042", "Smith & Co.", "$1,250.00", "Paid", ACCENT_GREEN),
        ("INV-2025-041", "Tech Solutions", "$3,400.00", "Paid", ACCENT_GREEN),
        ("INV-2025-040", "Design Studio", "$875.00", "Pending", ACCENT_YELLOW),
        ("INV-2025-039", "Local Bakery", "$425.00", "Pending", ACCENT_YELLOW),
    ]

    for inv_num, client, amount, status, status_color in invoices:
        draw_rounded_rect(draw, (content_x, content_y, content_x + content_w, content_y + 32), radius=4, fill=BG_SECONDARY)
        draw.text((col_positions[0], content_y + 8), inv_num, font=fonts['mono'], fill=ACCENT_BLUE)
        draw.text((col_positions[1], content_y + 8), client, font=fonts['body'], fill=TEXT_PRIMARY)
        draw.text((col_positions[2], content_y + 8), amount, font=fonts['mono'], fill=TEXT_PRIMARY)

        # Status badge
        badge_x = col_positions[3]
        badge_w = 65
        draw_rounded_rect(draw, (badge_x, content_y + 5, badge_x + badge_w, content_y + 26), radius=10, fill=(*status_color, 40))
        draw.text((badge_x + 10, content_y + 7), status, font=fonts['small'], fill=status_color)

        content_y += 38

def create_image():
    """Create the main Etsy listing image"""

    # Create base image with gradient background
    img = Image.new('RGBA', (WIDTH, HEIGHT), BG_PRIMARY)
    draw = ImageDraw.Draw(img)

    # Subtle radial gradient overlay
    for i in range(HEIGHT):
        alpha = int(25 * (1 - i / HEIGHT))
        draw.line([(0, i), (WIDTH, i)], fill=(*ACCENT_BLUE[:3], alpha))

    # Load fonts
    fonts = {
        'title': load_font('BigShoulders-Bold.ttf', 120),
        'title_sm': load_font('InstrumentSans-Bold.ttf', 22),
        'subtitle': load_font('InstrumentSans-Regular.ttf', 42),
        'heading': load_font('InstrumentSans-Bold.ttf', 26),
        'subheading': load_font('InstrumentSans-Bold.ttf', 18),
        'body': load_font('InstrumentSans-Regular.ttf', 14),
        'small': load_font('InstrumentSans-Regular.ttf', 11),
        'small_bold': load_font('InstrumentSans-Bold.ttf', 10),
        'mono': load_font('JetBrainsMono-Regular.ttf', 13),
        'mono_lg': load_font('JetBrainsMono-Bold.ttf', 20),
        'features': load_font('InstrumentSans-Regular.ttf', 28),
        'tagline': load_font('InstrumentSans-Italic.ttf', 32),
    }

    # Main title at top
    title_text = "INVOICE CREATOR"
    # Calculate text width for centering
    bbox = draw.textbbox((0, 0), title_text, font=fonts['title'])
    title_w = bbox[2] - bbox[0]
    title_x = (WIDTH - title_w) // 2

    # Title with glow effect
    # Draw glow layers
    for offset in range(8, 0, -2):
        alpha = 15
        glow_color = (*ACCENT_BLUE[:3], alpha)
        draw.text((title_x, 100), title_text, font=fonts['title'], fill=glow_color)

    draw.text((title_x, 100), title_text, font=fonts['title'], fill=TEXT_PRIMARY)

    # Subtitle
    subtitle = "Professional Invoice Management"
    bbox = draw.textbbox((0, 0), subtitle, font=fonts['subtitle'])
    sub_w = bbox[2] - bbox[0]
    draw.text(((WIDTH - sub_w) // 2, 230), subtitle, font=fonts['subtitle'], fill=TEXT_SECONDARY)

    # Laptop mockup with dashboard
    laptop_w = 1400
    laptop_h = 900
    laptop_x = (WIDTH - laptop_w) // 2
    laptop_y = 320

    # Draw laptop frame
    screen_area = create_laptop_mockup(draw, laptop_x, laptop_y, laptop_w, laptop_h)

    # Draw dashboard UI inside screen
    draw_dashboard_ui(draw, screen_area[0], screen_area[1], screen_area[2], screen_area[3], fonts)

    # Feature highlights at bottom
    features = [
        ("Invoice Management", ACCENT_BLUE),
        ("Client Tracking", ACCENT_GREEN),
        ("Inventory Control", ACCENT_YELLOW),
    ]

    feature_y = 1320
    total_width = len(features) * 350 - 50
    start_x = (WIDTH - total_width) // 2

    for i, (feature, color) in enumerate(features):
        fx = start_x + i * 350

        # Feature card
        draw_rounded_rect(draw, (fx, feature_y, fx + 300, feature_y + 70), radius=12, fill=BG_SECONDARY, outline=color, width=2)

        # Checkmark circle
        draw.ellipse((fx + 15, feature_y + 20, fx + 45, feature_y + 50), fill=color)
        draw.text((fx + 22, feature_y + 22), "✓", font=fonts['body'], fill=BG_PRIMARY)

        # Feature text
        draw.text((fx + 60, feature_y + 22), feature, font=fonts['features'], fill=TEXT_PRIMARY)

    # Bottom tagline
    tagline = "Simple. Professional. Powerful."
    bbox = draw.textbbox((0, 0), tagline, font=fonts['tagline'])
    tag_w = bbox[2] - bbox[0]
    draw.text(((WIDTH - tag_w) // 2, 1450), tagline, font=fonts['tagline'], fill=TEXT_SECONDARY)

    # Decorative elements - subtle grid pattern in corners
    for corner_x, corner_y in [(50, 50), (WIDTH - 150, 50), (50, HEIGHT - 150), (WIDTH - 150, HEIGHT - 150)]:
        for i in range(3):
            for j in range(3):
                dot_alpha = 30 - (i + j) * 5
                draw.ellipse(
                    (corner_x + i*30, corner_y + j*30, corner_x + i*30 + 6, corner_y + j*30 + 6),
                    fill=(*ACCENT_BLUE[:3], max(dot_alpha, 10))
                )

    # Add subtle vignette
    vignette = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    vignette_draw = ImageDraw.Draw(vignette)
    for i in range(50):
        alpha = int(2 * i)
        margin = 50 - i
        vignette_draw.rectangle(
            [margin, margin, WIDTH - margin, HEIGHT - margin],
            outline=(0, 0, 0, alpha)
        )
    img = Image.alpha_composite(img, vignette)

    # "Digital Download" badge
    badge_text = "DIGITAL DOWNLOAD"
    badge_font = fonts['small_bold']
    bbox = draw.textbbox((0, 0), badge_text, font=badge_font)
    badge_w = bbox[2] - bbox[0] + 30
    badge_h = 30
    badge_x = WIDTH - badge_w - 80
    badge_y = 80

    draw = ImageDraw.Draw(img)
    draw_rounded_rect(draw, (badge_x, badge_y, badge_x + badge_w, badge_y + badge_h), radius=15, fill=ACCENT_GREEN)
    draw.text((badge_x + 15, badge_y + 8), badge_text, font=badge_font, fill=BG_PRIMARY)

    # Bottom branding
    brand_text = "Blue Line Scannables"
    bbox = draw.textbbox((0, 0), brand_text, font=fonts['small'])
    brand_w = bbox[2] - bbox[0]
    draw.text(((WIDTH - brand_w) // 2, HEIGHT - 60), brand_text, font=fonts['small'], fill=TEXT_SECONDARY)

    # Windows compatible badge
    win_text = "Windows 10+"
    bbox = draw.textbbox((0, 0), win_text, font=fonts['small'])
    draw.text((80, HEIGHT - 60), win_text, font=fonts['small'], fill=TEXT_SECONDARY)

    # Version
    ver_text = "v1.3.3"
    draw.text((WIDTH - 120, HEIGHT - 60), ver_text, font=fonts['mono'], fill=TEXT_SECONDARY)

    # Convert to RGB for PNG (remove alpha)
    final = Image.new('RGB', (WIDTH, HEIGHT), BG_PRIMARY)
    final.paste(img, mask=img.split()[3] if img.mode == 'RGBA' else None)

    return final

if __name__ == "__main__":
    output_dir = r"C:\Users\BlueLineScannables\Desktop\Invoice Creator\etsy-assets"
    os.makedirs(output_dir, exist_ok=True)

    print("Creating Etsy listing image...")
    img = create_image()

    output_path = os.path.join(output_dir, "etsy-listing-main.png")
    img.save(output_path, "PNG", quality=95)
    print(f"Saved to: {output_path}")

    # Verify file size
    file_size = os.path.getsize(output_path)
    print(f"File size: {file_size / 1024 / 1024:.2f} MB")
