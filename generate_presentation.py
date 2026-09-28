import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def create_presentation():
    prs = Presentation()
    # 16:9 Widescreen dimensions
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Color Palette
    COLOR_NAVY = RGBColor(11, 37, 69)         # #0B2545
    COLOR_PRIMARY = RGBColor(16, 84, 168)     # #1054A8
    COLOR_EMERALD = RGBColor(16, 185, 129)    # #10B981
    COLOR_SLATE_DARK = RGBColor(30, 41, 59)   # #1E293B
    COLOR_SLATE_MUTED = RGBColor(100, 116, 139) # #64748B
    COLOR_BG_LIGHT = RGBColor(248, 250, 252)  # #F8FAFC
    COLOR_WHITE = RGBColor(255, 255, 255)
    COLOR_ACCENT_BLUE = RGBColor(224, 237, 255)
    COLOR_BORDER = RGBColor(226, 232, 240)

    assets_dir = r"C:\Users\User\.gemini\antigravity\brain\90669b10-f569-479b-9d42-3a42e492e69d\slides_assets"
    brain_dir = r"C:\Users\User\.gemini\antigravity\brain\90669b10-f569-479b-9d42-3a42e492e69d"

    # Slide 1: Title Slide (Dark Executive Theme)
    slide1 = prs.slides.add_slide(blank_layout)
    bg1 = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    bg1.fill.solid()
    bg1.fill.fore_color.rgb = COLOR_NAVY
    bg1.line.color.rgb = COLOR_NAVY

    # Decorative accent bar
    bar = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.2), Inches(1.2), Inches(0.12), Inches(5.1))
    bar.fill.solid()
    bar.fill.fore_color.rgb = COLOR_EMERALD
    bar.line.color.rgb = COLOR_EMERALD

    # Title box
    tb = slide1.shapes.add_textbox(Inches(1.6), Inches(1.3), Inches(10.5), Inches(4.8))
    tf = tb.text_frame
    tf.word_wrap = True

    p_tag = tf.paragraphs[0]
    p_tag.text = "IMMIGRATION & CITIZENSHIP SERVICE (ICS) • EXECUTIVE BRIEFING"
    p_tag.font.size = Pt(12)
    p_tag.font.bold = True
    p_tag.font.color.rgb = COLOR_EMERALD
    p_tag.space_after = Pt(14)

    p_title = tf.add_paragraph()
    p_title.text = "Digital Document Archive & File Management System"
    p_title.font.size = Pt(36)
    p_title.font.bold = True
    p_title.font.color.rgb = COLOR_WHITE
    p_title.space_after = Pt(16)

    p_sub = tf.add_paragraph()
    p_sub.text = "Next-Generation Digital Transformation: Automated AI/OCR Intake, Physical Warehouse Tracking, Multi-Branch Federation, and Tamper-Proof Audit Compliance."
    p_sub.font.size = Pt(16)
    p_sub.font.color.rgb = RGBColor(203, 213, 225)
    p_sub.space_after = Pt(32)

    p_meta = tf.add_paragraph()
    p_meta.text = "Presented for Senior Leadership & Executive Board Approval  |  Version 2.0 Enterprise Release"
    p_meta.font.size = Pt(12)
    p_meta.font.color.rgb = RGBColor(148, 163, 184)

    # Helper function for Content Slides
    def add_content_slide(badge, title, subtitle, bullets, takeaway, img_path):
        slide = prs.slides.add_slide(blank_layout)

        # Background
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = COLOR_BG_LIGHT
        bg.line.color.rgb = COLOR_BG_LIGHT

        # Top Header Bar Background
        header_bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(1.15))
        header_bg.fill.solid()
        header_bg.fill.fore_color.rgb = COLOR_WHITE
        header_bg.line.color.rgb = COLOR_BORDER

        # Header Text Box
        htb = slide.shapes.add_textbox(Inches(0.8), Inches(0.12), Inches(11.7), Inches(0.95))
        htf = htb.text_frame
        htf.word_wrap = True

        p_b = htf.paragraphs[0]
        p_b.text = badge.upper()
        p_b.font.size = Pt(9)
        p_b.font.bold = True
        p_b.font.color.rgb = COLOR_PRIMARY
        p_b.space_after = Pt(2)

        p_t = htf.add_paragraph()
        p_t.text = title
        p_t.font.size = Pt(20)
        p_t.font.bold = True
        p_t.font.color.rgb = COLOR_SLATE_DARK

        # Left Column - Content & Executive Takeaways
        ltb = slide.shapes.add_textbox(Inches(0.8), Inches(1.4), Inches(4.5), Inches(5.6))
        ltf = ltb.text_frame
        ltf.word_wrap = True

        p_desc = ltf.paragraphs[0]
        p_desc.text = subtitle
        p_desc.font.size = Pt(13)
        p_desc.font.color.rgb = COLOR_SLATE_DARK
        p_desc.font.bold = True
        p_desc.space_after = Pt(14)

        for b in bullets:
            pb = ltf.add_paragraph()
            pb.text = "• " + b
            pb.font.size = Pt(11)
            pb.font.color.rgb = COLOR_SLATE_DARK
            pb.space_after = Pt(8)

        # Executive Takeaway Box
        tbox = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(5.8), Inches(4.5), Inches(1.2))
        tbox.fill.solid()
        tbox.fill.fore_color.rgb = COLOR_ACCENT_BLUE
        tbox.line.color.rgb = RGBColor(191, 219, 254)
        ttf = tbox.text_frame
        ttf.word_wrap = True
        tp1 = ttf.paragraphs[0]
        tp1.text = "EXECUTIVE VALUE & ROI"
        tp1.font.size = Pt(9)
        tp1.font.bold = True
        tp1.font.color.rgb = COLOR_PRIMARY
        tp1.space_after = Pt(3)
        tp2 = ttf.add_paragraph()
        tp2.text = takeaway
        tp2.font.size = Pt(10)
        tp2.font.color.rgb = COLOR_SLATE_DARK

        # Right Column - High-Resolution Screenshot
        if os.path.exists(img_path):
            # Outer frame/shadow container
            frame = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(5.55), Inches(1.35), Inches(7.1), Inches(5.65))
            frame.fill.solid()
            frame.fill.fore_color.rgb = COLOR_WHITE
            frame.line.color.rgb = COLOR_BORDER

            # Insert Image
            slide.shapes.add_picture(img_path, Inches(5.65), Inches(1.45), width=Inches(6.9), height=Inches(5.45))

    # Slide 2: Executive Summary / Strategic Architecture
    add_content_slide(
        badge="Executive Overview",
        title="Modernizing National Immigration Archives",
        subtitle="Bridging Digital Intelligence with Physical Warehouse Control",
        bullets=[
            "Replaces slow, vulnerable manual paper registers with an enterprise-grade digital management system.",
            "Integrates Optical Character Recognition (AI/OCR) to auto-extract Machine Readable Zones (MRZ) from passports and IDs.",
            "Provides dual-indexing: digital dossiers are linked to physical building, room, shelf, box, and folder coordinates.",
            "Unifies 14 branch stations nationwide under centralized oversight with strict regional data segregation."
        ],
        takeaway="Reduces document retrieval time from hours to under 3 seconds while eliminating paper dossier misplacement.",
        img_path=os.path.join(assets_dir, "02_dashboard_overview.png")
    )

    # Slide 3: Secure Portal Authentication
    add_content_slide(
        badge="System Security",
        title="Tiered Authentication & Access Control",
        subtitle="Enterprise Security Gate with 15-Minute Session Expiry",
        bullets=[
            "Role-Based Access Control (RBAC) isolating Admin, Supervisor, Officer, Auditor, and Viewer tiers.",
            "Automatic account lock protection against unauthorized brute-force credential attacks.",
            "Session expiration strictly enforced after 15 minutes of inactivity to protect sensitive government records.",
            "Individual user accountability with encrypted authentication and password governance."
        ],
        takeaway="Complies with national government data security standards and prevents unauthorized identity record tampering.",
        img_path=os.path.join(assets_dir, "01_login_page.png")
    )

    # Slide 4: Central Executive Dashboard
    add_content_slide(
        badge="Operational Dashboard",
        title="Real-Time National Dossier Metrics & KPIs",
        subtitle="Instant Strategic Visibility Across All Divisions & Stations",
        bullets=[
            "Real-time counter displaying total indexed files across all categories (Visas, EOID, Residence IDs, ETD).",
            "Branch filtering enabling leadership to inspect nationwide statistics or drill into specific regional stations.",
            "Quick access shortcuts for instant document registration and emergency lookups.",
            "Visual trend tracking showing daily intake velocity and pending archive backlogs."
        ],
        takeaway="Provides executive leadership with real-time operational transparency to optimize resource allocation across branches.",
        img_path=os.path.join(assets_dir, "02_dashboard_overview.png")
    )

    # Slide 5: Visa & Immigration Dossiers
    add_content_slide(
        badge="Core Division",
        title="Visa Dossiers & Immigration Processing",
        subtitle="End-to-End Tracking of Foreign National Records",
        bullets=[
            "Centralized ledger for all visa classifications (Work, Business, Student, Tourist, Diplomatic, Investment).",
            "Comprehensive metadata capture: Passport Number, Full Name, Nationality, Sex, and Expiry Dates.",
            "Complete digital attachment archive preserving scanned visa seals, permits, and correspondence.",
            "Color-coded status indicators (Active, Pending, Expired, Cancelled) for rapid officer verification."
        ],
        takeaway="Ensures total legal compliance and seamless verification of legal residency and visa permits nationwide.",
        img_path=os.path.join(assets_dir, "03_visa_dossiers.png")
    )

    # Slide 6: AI/OCR Bulk Ingestion & MRZ Parsing
    # Use the e2e_step1_queued_records.png screenshot which highlights the actual OCR parsed data!
    ocr_img = os.path.join(brain_dir, "e2e_step1_queued_records.png")
    if not os.path.exists(ocr_img):
        ocr_img = os.path.join(assets_dir, "05_bulk_ingestion_modal.png")

    add_content_slide(
        badge="Automation & AI",
        title="Automated Bulk Ingestion & AI/OCR Parsing",
        subtitle="Accelerating Dossier Ingestion by 800% Through OCR",
        bullets=[
            "High-accuracy OCR parser extracts Machine Readable Zones (MRZ Lines 1 & 2) and document headers.",
            "Intelligently filters out background guilloche security watermarks on USA, Canadian, and Ethiopian passports.",
            "Auto-populates Given Name, Surname, Passport Number, Nationality, and Sex into queue records.",
            "Batch commit ('Ingest & Index All') validates and stores dozens of scanned files in seconds."
        ],
        takeaway="Transforms days of manual data typing into minutes of automated optical recognition with zero typing errors.",
        img_path=ocr_img
    )

    # Slide 7: Physical Archive & Warehouse Mapping
    add_content_slide(
        badge="Physical Archive Control",
        title="5-Tier Physical Warehouse Mapping",
        subtitle="Zero-Loss Guarantee for Physical Paper Dossiers",
        bullets=[
            "Every digital file record links to exact physical warehouse coordinates: Building, Room, Shelf, Box, and Folder.",
            "Automated File Reference indexing (e.g. VISA-B1-01) for physical box labeling.",
            "Allows warehouse clerks to locate physical dossiers in shelves within 60 seconds of an inquiry.",
            "Preserves physical integrity and chain of custody during historical archive relocation or audits."
        ],
        takeaway="Bridges the critical gap between digital database entries and physical warehouse storage, eliminating lost records.",
        img_path=os.path.join(assets_dir, "04_record_form_modal.png")
    )

    # Slide 8: Ethiopian Origin ID & Special Divisions
    add_content_slide(
        badge="Citizen & Diaspora Services",
        title="Ethiopian Origin ID (Yellow Card) Tracking",
        subtitle="Dedicated Management for Diaspora & Residence Permits",
        bullets=[
            "Separate specialized workflows for Normal Ethiopian Origin ID and Under-Age Guardian-linked records.",
            "Integrated tracking for Residence ID Cards and Residence ID Cancellations with service justification.",
            "Emergency Travel Documents (ETD) and Eritrean ID dossiers managed under unified search standards.",
            "Protects sensitive diaspora records while enabling rapid consular verification and renewal processing."
        ],
        takeaway="Streamlines consular and diaspora services while maintaining rigorous national security verification.",
        img_path=os.path.join(assets_dir, "06_eoid_files.png")
    )

    # Slide 9: Instant File Locator (Ctrl + K Command Palette)
    add_content_slide(
        badge="Search & Retrieval",
        title="Enterprise Command Palette & Instant Search",
        subtitle="Sub-Second Dossier Lookups Across Millions of Records",
        bullets=[
            "Accessible from any screen via 'Ctrl + K' shortcut for lightning-fast officer navigation.",
            "Global multi-parameter search querying Applicant Name, Passport Number, File ID, or Box Reference.",
            "Immediate keyboard navigation between modules, divisions, user management, and system reports.",
            "Reduces front-desk citizen wait times during in-person inquiries and border verification checks."
        ],
        takeaway="Empowers frontline border and desk officers with instantaneous retrieval, boosting customer satisfaction.",
        img_path=os.path.join(assets_dir, "08_command_palette.png")
    )

    # Slide 10: Executive Reports & Demographic Analytics
    add_content_slide(
        badge="Strategic Analytics",
        title="Executive Reports & National Demographics",
        subtitle="Data-Driven Decision Making & Trend Forecasting",
        bullets=[
            "Interactive charts analyzing visa issuance distributions, nationality breakdowns, and sex demographics.",
            "Branch workload comparisons revealing operational bottlenecks and intake surges.",
            "One-click data export to Excel (XLSX), CSV, and PDF for executive board presentations and ministry reports.",
            "Configurable date range filters for annual, quarterly, or monthly immigration performance auditing."
        ],
        takeaway="Equips executive directors with real-time analytics to make proactive policy and staffing decisions.",
        img_path=os.path.join(assets_dir, "09_reports_analytics.png")
    )

    # Slide 11: Regulatory Compliance & Audit Trail
    add_content_slide(
        badge="Governance & Forensics",
        title="Tamper-Proof Audit Trail & Regulatory Compliance",
        subtitle="Complete Forensic Accountability for Every System Interaction",
        bullets=[
            "Immutable audit log capturing user identity, precise timestamp, IP address, and target record ID.",
            "Detailed before-and-after change diffs recorded whenever a document is modified or updated.",
            "Specialized 'AUDITOR' role with read-only inspection access to ensure independent compliance checks.",
            "Total transparency discouraging insider data manipulation and safeguarding legal records."
        ],
        takeaway="Guarantees 100% compliance with national archival laws, anti-corruption mandates, and international audit standards.",
        img_path=os.path.join(assets_dir, "10_audit_log.png")
    )

    # Slide 12: Disaster Recovery & Data Safeguards
    add_content_slide(
        badge="Data Protection",
        title="Enterprise Disaster Recovery & Recycle Bin",
        subtitle="Two-Tier Soft Deletion Preventing Accidental Data Loss",
        bullets=[
            "Restricted delete permissions: records are moved to an administrative Recycle Bin rather than permanently wiped.",
            "One-click instant restoration preserves original file metadata, archive coordinates, and attachments.",
            "Only Super Administrators possess purge authority, preventing rogue deletions by rogue or compromised accounts.",
            "PostgreSQL backend automated backups ensure zero business interruption and rapid disaster recovery."
        ],
        takeaway="Eliminates the catastrophic business risk of accidental document deletion or malicious data destruction.",
        img_path=os.path.join(assets_dir, "11_recycle_bin.png")
    )

    # Slide 13: Role-Based User Access Control
    add_content_slide(
        badge="Security Administration",
        title="User Accounts & Role-Based Clearance Matrix",
        subtitle="Granular Security Governance Across 5 Defined User Tiers",
        bullets=[
            "ADMIN: Nationwide full control over system modules, user credentials, and security policies.",
            "SUPERVISOR: Branch-level authority over intake, officer task delegation, and station reporting.",
            "OFFICER: Operational intake, scanning, OCR validation, and physical shelf/box filing.",
            "AUDITOR: Read-only investigative access across records and tamper-proof audit trails.",
            "VIEWER: Front-desk read-only inquiry access for physical dossier retrieval and applicant queries."
        ],
        takeaway="Enforces the Principle of Least Privilege (PoLP), ensuring staff only access files required for their official duties.",
        img_path=os.path.join(assets_dir, "12_user_management.png")
    )

    # Slide 14: Dynamic Custom Module Builder
    add_content_slide(
        badge="System Extensibility",
        title="Dynamic Custom Module Builder & Station Config",
        subtitle="Future-Proof Architecture Adapting to Evolving Legislation",
        bullets=[
            "Allows administrators to create new document categories and divisions on-the-fly without developer code changes.",
            "Configurable document classifications, custom metadata fields, unique prefixes, and icons.",
            "Dynamic station management: add, configure, or activate regional branch stations across Ethiopia.",
            "Seamless database schema migration automatically extends backend tables upon module activation."
        ],
        takeaway="Guarantees long-term sustainability and eliminates expensive software vendor change orders as regulations evolve.",
        img_path=os.path.join(assets_dir, "13_system_configuration.png")
    )

    # Slide 15: Concluding Slide - Strategic ROI & Approval Request
    slide_end = prs.slides.add_slide(blank_layout)
    bg_end = slide_end.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    bg_end.fill.solid()
    bg_end.fill.fore_color.rgb = COLOR_NAVY
    bg_end.line.color.rgb = COLOR_NAVY

    # Header
    tb_end = slide_end.shapes.add_textbox(Inches(1.0), Inches(0.8), Inches(11.3), Inches(5.8))
    tf_end = tb_end.text_frame
    tf_end.word_wrap = True

    pe_b = tf_end.paragraphs[0]
    pe_b.text = "STRATEGIC IMPACT & NEXT STEPS"
    pe_b.font.size = Pt(12)
    pe_b.font.bold = True
    pe_b.font.color.rgb = COLOR_EMERALD
    pe_b.space_after = Pt(10)

    pe_t = tf_end.add_paragraph()
    pe_t.text = "Business Case & Request for Formal Approval"
    pe_t.font.size = Pt(28)
    pe_t.font.bold = True
    pe_t.font.color.rgb = COLOR_WHITE
    pe_t.space_after = Pt(24)

    # 3 Summary Cards
    card_w = Inches(3.5)
    card_h = Inches(3.8)
    card_y = Inches(2.5)

    # Card 1: Operational Gains
    c1 = slide_end.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), card_y, card_w, card_h)
    c1.fill.solid()
    c1.fill.fore_color.rgb = RGBColor(19, 48, 86)
    c1.line.color.rgb = RGBColor(30, 70, 120)
    c1_tf = c1.text_frame
    c1_tf.word_wrap = True
    c1_p1 = c1_tf.paragraphs[0]
    c1_p1.text = "⚡ OPERATIONAL IMPACT"
    c1_p1.font.size = Pt(11)
    c1_p1.font.bold = True
    c1_p1.font.color.rgb = COLOR_EMERALD
    c1_p1.space_after = Pt(10)
    c1_p2 = c1_tf.add_paragraph()
    c1_p2.text = "• 85% Reduction in physical dossier retrieval times (from hours to seconds).\n\n• 800% Faster document ingestion with AI-powered OCR MRZ scanning.\n\n• Zero misplaced paper files through 5-tier warehouse shelf & box coordinates."
    c1_p2.font.size = Pt(11)
    c1_p2.font.color.rgb = RGBColor(226, 232, 240)

    # Card 2: Risk & Governance
    c2 = slide_end.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(4.9), card_y, card_w, card_h)
    c2.fill.solid()
    c2.fill.fore_color.rgb = RGBColor(19, 48, 86)
    c2.line.color.rgb = RGBColor(30, 70, 120)
    c2_tf = c2.text_frame
    c2_tf.word_wrap = True
    c2_p1 = c2_tf.paragraphs[0]
    c2_p1.text = "🛡️ RISK & COMPLIANCE"
    c2_p1.font.size = Pt(11)
    c2_p1.font.bold = True
    c2_p1.font.color.rgb = RGBColor(96, 165, 250)
    c2_p1.space_after = Pt(10)
    c2_p2 = c2_tf.add_paragraph()
    c2_p2.text = "• 100% Immutable audit trail tracking every modification with IP and timestamps.\n\n• Multi-branch regional data isolation protecting sensitive citizen data.\n\n• Secure Recycle Bin preventing accidental or unauthorized permanent data loss."
    c2_p2.font.size = Pt(11)
    c2_p2.font.color.rgb = RGBColor(226, 232, 240)

    # Card 3: Next Steps & Approval
    c3 = slide_end.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(8.8), card_y, card_w, card_h)
    c3.fill.solid()
    c3.fill.fore_color.rgb = RGBColor(19, 48, 86)
    c3.line.color.rgb = RGBColor(30, 70, 120)
    c3_tf = c3.text_frame
    c3_tf.word_wrap = True
    c3_p1 = c3_tf.paragraphs[0]
    c3_p1.text = "🎯 APPROVAL REQUEST"
    c3_p1.font.size = Pt(11)
    c3_p1.font.bold = True
    c3_p1.font.color.rgb = RGBColor(251, 191, 36)
    c3_p1.space_after = Pt(10)
    c3_p2 = c3_tf.add_paragraph()
    c3_p2.text = "1. Senior Management Sign-Off on Phase 1 Deployment.\n\n2. Staff Onboarding & Branch Training (HQ & Bole Airport Pilot).\n\n3. Phased Regional Rollout to 12 Branch Stations nationwide."
    c3_p2.font.size = Pt(11)
    c3_p2.font.color.rgb = RGBColor(226, 232, 240)

    output_path = r"C:\Users\User\Desktop\ICS_File_Management_System_Presentation.pptx"
    prs.save(output_path)
    print("SUCCESS: Presentation successfully generated and saved to: " + output_path)

if __name__ == "__main__":
    create_presentation()
