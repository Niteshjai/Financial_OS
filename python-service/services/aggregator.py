import pandas as pd
from typing import List, Dict

def aggregate_net_worth(snapshots: List[Dict]) -> Dict:
    if not snapshots:
        return {
            'total_net_worth': 0.0,
            'by_category': [],
            'asset_count': 0,
            'institution_count': 0,
            'last_updated': None
        }

    df = pd.DataFrame(snapshots)

    summary = (
        df.groupby('fi_type')['balance']
        .sum()
        .reset_index()
        .rename(columns={'fi_type': 'category', 'balance': 'value'})
    )

    return {
        'total_net_worth': round(float(df['balance'].sum()), 2),
        'by_category': summary.to_dict(orient='records'),
        'asset_count': len(df),
        'institution_count': df['institution_name'].nunique() if 'institution_name' in df.columns else 0,
        'last_updated': df['fetched_at'].max().isoformat() if 'fetched_at' in df.columns else None
    }
