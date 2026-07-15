export const sandboxFixtures: Record<string, any> = {
  law_firm: {
    estateValue: {
      totalNetWorthPaise: 850000000,
      movableAssetsPaise: 320000000,
      immovableAssetsPaise: 450000000,
      listedSecuritiesPaise: 120000000,
      retirementAssetsPaise: 80000000,
      insuranceCoverPaise: 200000000,
      unclaimedAssetsPaise: 15000000,
      lastUpdated: new Date().toISOString()
    },
    bankAccounts: [
      {
        institutionName: "HDFC Bank",
        accountType: "SAVINGS",
        hasNominee: true,
        nomineeName: "Priya Sharma",
        approximateValue: "₹10L–₹50L",
        status: "active",
        isDormant: false
      }
    ]
  },
  wealth_manager: {
    netWorth: {
      totalPaise: 850000000,
      liquidPaise: 120000000,
      investedPaise: 280000000,
      illiquidPaise: 450000000,
      lastSnapshotDate: new Date().toISOString()
    }
  },
  nbfc: {
    creditProfile: {
      assetMapScore: 742,
      decision: "APPROVE",
      maxEligiblePaise: 3500000000,
      confidenceLevel: "high"
    }
  },
  insurance_company: {
    coverageProfile: {
      hasLifeInsurance: true,
      totalLifeCoverPaise: 20000000,
      existingPoliciesCount: 3
    }
  },
  hr_payroll: {
    employmentProfile: {
      salaryCreditsDetected: true,
      averageMonthlySalaryPaise: 18500000,
      salaryRangeLabel: "₹1.5L–₹5L/month"
    }
  }
}
