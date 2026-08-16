const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/pages/Dashboard.tsx');
let code = fs.readFileSync(file, 'utf8');

// 1. Add imports
code = code.replace(
  `import { ThemeToggle } from '../components/ui/ThemeToggle';`,
  `import { ThemeToggle } from '../components/ui/ThemeToggle';\nimport { ManualAssetCard } from '../components/manual/ManualAssetCard';\nimport { AddAssetFlow } from '../components/manual/AddAssetFlow';`
);

// 2. Update filters
code = code.replace(
  `type FilterKey = 'all' | 'DEPOSIT' | 'INSURANCE_POLICIES' | 'MUTUAL_FUND' | 'EQUITY' | 'NPS' | 'GSTN' | 'ALTERNATIVE';`,
  `type FilterKey = 'all' | 'MANUAL' | 'DEPOSIT' | 'INSURANCE_POLICIES' | 'MUTUAL_FUND' | 'EQUITY' | 'NPS' | 'GSTN' | 'ALTERNATIVE';`
);

code = code.replace(
  `  all: { label: 'All', icon: null },`,
  `  all: { label: 'All', icon: null },\n  MANUAL: { label: 'Manual Assets', icon: <Archive className="size-3" strokeWidth={2} /> },`
);

// 3. Update store destructuring
code = code.replace(
  `    user, summary, assets, landRecords,`,
  `    user, summary, assets, manualAssets, landRecords,`
);

// 4. Add state for modal
code = code.replace(
  `  const setActiveTab = (tab: typeof activeTab) => {\n    setSearchParams({ tab: tab as string });\n  };`,
  `  const setActiveTab = (tab: typeof activeTab) => {\n    setSearchParams({ tab: tab as string });\n  };\n  const [showAddManualAsset, setShowAddManualAsset] = useState(false);`
);

// 5. Update loadData
const loadDataFind = `      // 1. Fetch Core Data (Blocking) if needed
      if (needsCoreData) {
        const [s, a, l, c] = await Promise.all([
          getAssetSummary(), getFinancialAssets(), getLandRecords(), getConsents()
        ]);
        useAssetStore.setState({ summary: s, assets: a, landRecords: l, consents: c });
      }`;

const loadDataReplace = `      // 1. Fetch Core Data (Blocking) if needed
      if (needsCoreData) {
        const [s, a, l, c, manualRes] = await Promise.all([
          getAssetSummary(), getFinancialAssets(), getLandRecords(), getConsents(),
          api.get('/manual/assets').catch(() => ({ data: { data: [] } }))
        ]);
        useAssetStore.setState({ summary: s, assets: a, landRecords: l, consents: c, manualAssets: manualRes.data.data });
      }`;

code = code.replace(loadDataFind, loadDataReplace);

// 6. Update displayAssets and filteredAssets
const assetsLogicFind = `  const displayAssets = useMemo(() => assets, [assets]);

  const filteredAssets = useMemo(() => displayAssets.filter(a => {
    const matchesType = filter === 'all' || a.fiType === filter;
    const matchesQuery = !q || \`\${a.institutionName} \${a.accountRef} \${a.fiType}\`.toLowerCase().includes(q);
    return matchesType && matchesQuery;
  }), [displayAssets, filter, q]);

  // Group by fi_type
  const grouped = useMemo(() => {
    const g: Record<string, typeof assets> = {};
    for (const a of filteredAssets) {
      (g[a.fiType] ||= []).push(a);
    }
    return g;
  }, [filteredAssets]);`;

const assetsLogicReplace = `  const combinedAssets = useMemo(() => {
    const arr: any[] = [];
    if (assets) arr.push(...assets.map(a => ({ ...a, _isManual: false })));
    if (manualAssets) arr.push(...manualAssets.map(a => ({ ...a, _isManual: true })));
    return arr;
  }, [assets, manualAssets]);

  const filteredAssets = useMemo(() => combinedAssets.filter(a => {
    if (a._isManual) {
      const matchesType = filter === 'all' || filter === 'MANUAL';
      const matchesQuery = !q || \`\${a.name} \${a.category}\`.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    } else {
      const matchesType = filter === 'all' || a.fiType === filter;
      const matchesQuery = !q || \`\${a.institutionName} \${a.accountRef} \${a.fiType}\`.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    }
  }), [combinedAssets, filter, q]);

  // Group by fi_type or MANUAL
  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    for (const a of filteredAssets) {
      const key = a._isManual ? 'MANUAL' : a.fiType;
      (g[key] ||= []).push(a);
    }
    return g;
  }, [filteredAssets]);`;

code = code.replace(assetsLogicFind, assetsLogicReplace);

// 7. Wire up Add Asset button
code = code.replace(
  `onClick={() => alert('Manual asset addition coming soon')}`,
  `onClick={() => setShowAddManualAsset(true)}`
);

// 8. Update grid mapping
const gridFind = `                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5">
                  {filteredAssets.map((asset, i) => (
                    <AssetCard key={\`\${asset.accountRef}-\${i}\`} asset={asset} />
                  ))}
                </div>`;

const gridReplace = `                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5">
                  {filteredAssets.map((asset, i) => (
                    asset._isManual ? (
                      <ManualAssetCard 
                        key={\`manual-\${asset.id}\`} 
                        asset={asset} 
                        onUpdateValue={async (val) => { await api.patch(\`/manual/assets/\${asset.id}\`, { currentValuePaise: val }); loadData(); }}
                        onDelete={async () => { await api.delete(\`/manual/assets/\${asset.id}\`); loadData(); }}
                      />
                    ) : (
                      <AssetCard key={\`\${asset.accountRef}-\${i}\`} asset={asset} />
                    )
                  ))}
                </div>`;
code = code.replace(gridFind, gridReplace);

// 9. Render AddAssetFlow
const renderFind = `        </main>
      </div>

    </div>
  );
}`;

const renderReplace = `        </main>
      </div>

      {showAddManualAsset && (
        <AddAssetFlow
          onAdded={loadData}
          onClose={() => setShowAddManualAsset(false)}
        />
      )}
    </div>
  );
}`;

code = code.replace(renderFind, renderReplace);

fs.writeFileSync(file, code);
console.log('Dashboard.tsx updated successfully');
