from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
import io

def generate_asset_report(data: dict) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []

    # Cover heading
    elements.append(Paragraph(f"Asset Report — {data.get('name', 'User')}", styles['Title']))
    elements.append(Paragraph(f"Generated: {data.get('generated_at', 'Unknown')}", styles['Normal']))

    # Net worth summary table
    summary_data = [['Asset class', 'Value (INR)']]
    for item in data.get('summary', []):
        summary_data.append([item.get('category', ''), f"₹{item.get('value', 0):,.0f}"])

    table = Table(summary_data, colWidths=[300, 150])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#185FA5')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f5f5f5')]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cccccc')),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(table)
    doc.build(elements)
    return buffer.getvalue()
