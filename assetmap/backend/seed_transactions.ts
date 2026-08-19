import { Pool } from 'pg'
import { transactionClassifier } from './src/classifier/transactionClassifier'
import { randomUUID } from 'crypto'

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  
  // Get first user
  const uRes = await pool.query('SELECT id FROM users LIMIT 1')
  if (!uRes.rows[0]) return console.log('No user')
  const userId = uRes.rows[0].id

  const accountId = randomUUID()

  // Insert mock account
  await pool.query(`
    INSERT INTO accounts (id, user_id, institution_name, type, masked_account_number)
    VALUES ($1, $2, 'HDFC Bank', 'SAVINGS', 'XXXX1234')
  `, [accountId, userId])

  const transactions = [
    { narration: "UPI/123/SWIGGY/ORDER", amount: 540, type: "DEBIT" },
    { narration: "NEFT/SALARY/TCS", amount: 150000, type: "CREDIT" },
    { narration: "NACH/LIC PREMIUM", amount: 12000, type: "DEBIT" },
    { narration: "NETFLIX", amount: 649, type: "DEBIT" },
    { narration: "POS DMART MUMBAI", amount: 3200, type: "DEBIT" },
    { narration: "PAYTM INSIDER/CONCERT", amount: 2000, type: "DEBIT" },
    { narration: "HDFC HL EMI", amount: 45000, type: "DEBIT" },
    { narration: "ATM CASH WITHDRAWAL", amount: 10000, type: "DEBIT" }
  ]

  let i = 0
  for (const tx of transactions) {
    await pool.query(`
      INSERT INTO transactions (id, account_id, user_id, date, narration, type, amount, currency)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'INR')
    `, [randomUUID(), accountId, userId, new Date(Date.now() - i * 86400000).toISOString(), tx.narration, tx.type, tx.amount])
    i++
  }

  console.log('Inserted mock bank account and transactions')

  // Trigger classification
  const res = await transactionClassifier.processUserTransactions(pool, userId)
  console.log('Classification result:', res)

  const summary = await pool.query('SELECT * FROM monthly_spend_summary WHERE user_id = $1', [userId])
  console.log('Summary:', summary.rows)

  process.exit(0)
}

run().catch(console.error)
