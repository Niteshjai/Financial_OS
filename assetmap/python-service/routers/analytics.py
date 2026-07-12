from fastapi import APIRouter
from services.aggregator import aggregate_net_worth

router = APIRouter()

@router.post("/aggregate")
async def aggregate(snapshots: list):
    return aggregate_net_worth(snapshots)
