from fastapi import APIRouter
from fastapi.responses import Response
from services.pdf_generator import generate_asset_report

router = APIRouter()

@router.post("/generate")
async def generate_report(data: dict):
    pdf_bytes = generate_asset_report(data)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=asset-report.pdf"}
    )
