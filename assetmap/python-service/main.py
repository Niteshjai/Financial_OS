from fastapi import FastAPI
from routers import reports, analytics

app = FastAPI(title="AssetMap Python Service", docs_url=None, redoc_url=None)

app.include_router(reports.router, prefix="/internal/reports")
app.include_router(analytics.router, prefix="/internal/analytics")
